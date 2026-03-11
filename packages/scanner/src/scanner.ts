import puppeteer, { Browser } from 'puppeteer';
import { AxePuppeteer } from '@axe-core/puppeteer';
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
    
    this.browser = await puppeteer.launch({
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
    const page = await this.browser!.newPage();
    
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      const axe = new AxePuppeteer(page);
      const results = await axe.analyze();

    // await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // const results = await new AxePuppeteer(page)
    //   .withTags([
    //     'wcag2a',     // WCAG 2.0 Level A
    //     'wcag2aa',    // WCAG 2.0 Level AA
    //     'wcag21a',    // WCAG 2.1 Level A
    //     'wcag21aa',   // WCAG 2.1 Level AA
    //     'wcag22a',    // WCAG 2.2 Level A (New)
    //     'wcag22aa',   // WCAG 2.2 Level AA (New)
    //     'wcag2aaa',   // WCAG Level AAA (Highest level)
    //     'best-practice' // Deque's recommended industry practices
    //   ])
    //   .analyze();
      
    return {
      id: uuidv4(),
      url,
      timestamp: new Date(),
      environment: {
        browser: results.testEnvironment.userAgent,
        viewport: `${results.testEnvironment.windowWidth}x${results.testEnvironment.windowHeight}`,
        axeVersion: results.testEngine.version,
      },
      violations: results.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        description: v.description,
        help: v.help,
        helpUrl: v.helpUrl,
        tags: v.tags,
        level: this.deriveLevel(v.tags),
        nodes: v.nodes.map((n) => ({
          html: n.html,
          target: n.target,
          failureSummary: n.failureSummary,
          data: n.data, 
          relatedNodes: n.relatedNodes?.map(rn => ({ target: rn.target, html: rn.html }))
        }))
      })),
      incomplete: results.incomplete.map((inc) => ({
        id: inc.id,
        impact: inc.impact,
        description: inc.description,
        help: inc.help,
        nodes: inc.nodes.map(n => ({
          html: n.html,
          target: n.target,
          explanation: n.any?.map(check => check.message).join(' ') 
        }))
      })),
      summary: {
        violationsCount: results.violations.length,
        passesCount: results.passes.length,
        incompleteCount: results.incomplete.length,
        inapplicableCount: results.inapplicable.length
      },
      passedRules: results.passes.map(p => p.id) 
    };
    } catch (error) {
      console.error(`Error scanning ${url}:`, error);
      // when an error occurs we still need to return a ScanResult that
      // satisfies the new interface.  fill arrays/summary with zero values.
      return {
        id: uuidv4(),
        url,
        timestamp: new Date(),
        violations: [],
        environment: { browser: '', viewport: '', axeVersion: '' },
        incomplete: [],
        summary: {
          violationsCount: 0,
          passesCount: 0,
          incompleteCount: 0,
          inapplicableCount: 0
        },
        passedRules: []
      };
    } finally {
      await page.close();
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

        const lvl = violation.level || 'best-practice';
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
   * 'A', 'AA', 'AAA' or 'best-practice'.
   */
  private deriveLevel(tags: string[]): 'A'|'AA'|'AAA'|'best-practice' {
    for (const t of tags) {
      const m = t.match(/wcag[0-9.]*([a]{1,3})$/i);
      if (m) {
        const suffix = m[1].toUpperCase();
        if (suffix === 'AAA' || suffix === 'AA' || suffix === 'A') {
          return suffix as 'A'|'AA'|'AAA';
        }
      }
    }
    return 'best-practice';
  }
}