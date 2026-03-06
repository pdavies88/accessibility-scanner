import { chromium, Browser } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';
import { XMLParser } from 'fast-xml-parser';
import fetch from 'node-fetch';
import pLimit from 'p-limit';
import { v4 as uuidv4 } from 'uuid';
import { ScanResult, ScanReport } from '@accessibility-scanner/shared';

export class SitemapScanner {
  private browser: Browser | null = null;
  private options: any;

  constructor(options: any) {
    this.options = options;
  }

  async scan(): Promise<ScanReport> {
    const urls = await this.fetchSitemapUrls(this.options.sitemap);
    const limit = pLimit(parseInt(this.options.concurrent));
    
    this.browser = await chromium.launch({
      headless: this.options.headless,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const startTime = new Date();
    const results: ScanResult[] = [];

    const scanPromises = urls.map(url => 
      limit(async () => {
        const result = await this.scanPage(url);
        results.push(result);
        // eslint-disable-next-line no-console
        console.log(`Scanned: ${url}`);
        return result;
      })
    );

    await Promise.all(scanPromises);
    await this.browser.close();

    const endTime = new Date();
    
    return this.generateReport(results, startTime, endTime);
  }

  private async fetchSitemapUrls(sitemapUrl: string): Promise<string[]> {
    const response = await fetch(sitemapUrl);
    const xml = await response.text();
    
    const parser = new XMLParser();
    const sitemap = parser.parse(xml);
    
    const urls: string[] = [];
    
    // Handle both regular sitemaps and sitemap index files
    if (sitemap.sitemapindex) {
      // Sitemap index - fetch all child sitemaps
      const sitemaps = Array.isArray(sitemap.sitemapindex.sitemap) 
        ? sitemap.sitemapindex.sitemap 
        : [sitemap.sitemapindex.sitemap];
      
      for (const sm of sitemaps) {
        const childUrls = await this.fetchSitemapUrls(sm.loc);
        urls.push(...childUrls);
      }
    } else if (sitemap.urlset) {
      // Regular sitemap
      const urlEntries = Array.isArray(sitemap.urlset.url) 
        ? sitemap.urlset.url 
        : [sitemap.urlset.url];
      
      urls.push(...urlEntries.map((u: any) => u.loc));
    }
    
    return urls;
  }

  private async scanPage(url: string): Promise<ScanResult> {
    const context = await this.browser!.newContext();
    const page = await context.newPage();
    
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      // https://www.deque.com/axe/core-documentation/api-documentation/#axecore-tags
      const axe = new AxeBuilder({ page }).withTags([
        'wcag22aa'
      ]);
      const results = await axe.analyze();
      
      return {
        id: uuidv4(),
        url,
        timestamp: new Date(),
        violations: results.violations.map((v: any) => ({
          id: v.id,
          impact: v.impact as any,
          description: v.description,
          help: v.help,
          helpUrl: v.helpUrl,
          tags: v.tags,
          level: this.deriveLevel(v.tags),
          nodes: v.nodes.map((n: any) => ({
            html: n.html,
            target: n.target,
            failureSummary: n.failureSummary
          }))
        })),
        passes: results.passes.length,
        incomplete: results.incomplete.length,
        inapplicable: results.inapplicable.length
      };
    } catch (error) {
      console.error(`Error scanning ${url}:`, error);
      return {
        id: uuidv4(),
        url,
        timestamp: new Date(),
        violations: [],
        passes: 0,
        incomplete: 0,
        inapplicable: 0
      };
    } finally {
      await page.close();
      // close the context as well to free resources; page.close() is redundant but harmless
      await context.close();
    }
  }

  private generateReport(
    results: ScanResult[], 
    startTime: Date, 
    endTime: Date
  ): ScanReport {
    const summary = {
      totalPages: results.length,
      totalViolations: results.reduce((sum, r) => sum + r.violations.length, 0),
      violationsByImpact: {} as Record<string, number>,
      violationsByType: {} as Record<string, number>,
      violationsByLevel: {} as Record<string, number>
    };

    // Calculate violations by impact, type, and level
    results.forEach(result => {
      result.violations.forEach(violation => {
        summary.violationsByImpact[violation.impact] = 
          (summary.violationsByImpact[violation.impact] || 0) + 1;
        
        summary.violationsByType[violation.id] = 
          (summary.violationsByType[violation.id] || 0) + 1;

        const lvl = violation.level || 'unknown';
        summary.violationsByLevel[lvl] = (summary.violationsByLevel[lvl] || 0) + 1;
      });
    });

    return {
      id: uuidv4(),
      sitemap: this.options.sitemap,
      startTime,
      endTime,
      results,
      summary
    };
  }


  /**
   * Look for a wcag level indicator in the axe tags.  Returns
   * 'A', 'AA', 'AAA' or 'unknown'.
   */
  private deriveLevel(tags: string[]): 'A'|'AA'|'AAA'|'unknown' {
    for (const t of tags) {
      const m = t.match(/wcag[0-9.]*([a]{1,3})$/i);
      if (m) {
        const suffix = m[1].toUpperCase();
        if (suffix === 'AAA' || suffix === 'AA' || suffix === 'A') {
          return suffix as 'A'|'AA'|'AAA';
        }
      }
    }
    return 'unknown';
  }
}