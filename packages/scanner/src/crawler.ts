import fetch from 'node-fetch';

const SKIP_EXTENSIONS = /\.(png|jpg|jpeg|gif|svg|webp|ico|css|js|woff2?|ttf|eot|pdf|zip|gz|mp4|mp3|xml)(\?.*)?$/i;
const LINK_REGEX = /href=["']([^"'#?][^"']*?)["']/gi;

export interface CrawlOptions {
  maxPages?: number;
}

export async function crawlSite(rootUrl: string, options: CrawlOptions = {}): Promise<string[]> {
  const { maxPages = 200 } = options;

  const origin = new URL(rootUrl).origin;
  const visited = new Set<string>();
  const queue: string[] = [normalizeUrl(rootUrl)];

  while (queue.length > 0 && visited.size < maxPages) {
    const url = queue.shift()!;
    if (visited.has(url)) continue;
    visited.add(url);

    let html: string;
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'accessibility-scanner/1.0' },
        redirect: 'follow',
      });

      const contentType = res.headers.get('content-type') ?? '';
      if (!contentType.includes('text/html')) continue;

      html = await res.text();
    } catch {
      continue;
    }

    for (const href of extractLinks(html, url, origin)) {
      if (!visited.has(href) && !queue.includes(href)) {
        queue.push(href);
      }
    }
  }

  return [...visited];
}

function normalizeUrl(href: string): string {
  const url = new URL(href);
  url.hash = '';
  url.search = '';
  return url.toString().replace(/\/$/, '') || '/';
}

function extractLinks(html: string, base: string, origin: string): string[] {
  const found: string[] = [];
  let match: RegExpExecArray | null;
  LINK_REGEX.lastIndex = 0;

  while ((match = LINK_REGEX.exec(html)) !== null) {
    const raw = match[1].trim();
    if (!raw || raw.startsWith('mailto:') || raw.startsWith('tel:') || raw.startsWith('javascript:')) continue;

    try {
      const resolved = new URL(raw, base);
      if (resolved.origin !== origin) continue;
      if (SKIP_EXTENSIONS.test(resolved.pathname)) continue;

      found.push(normalizeUrl(resolved.toString()));
    } catch {
      // invalid URL — skip
    }
  }

  return found;
}
