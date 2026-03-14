import fetch from 'node-fetch';

const SKIP_EXTENSIONS = /\.(png|jpg|jpeg|gif|svg|webp|ico|css|js|woff2?|ttf|eot|pdf|zip|gz|mp4|mp3|xml)(\?.*)?$/i;
const LINK_REGEX = /href=["']([^"'#?][^"']*?)["']/gi;

export interface CrawlOptions {
  maxPages?: number;
  onProgress?: (url: string, count: number) => void;
  signal?: AbortSignal;
}

export async function crawlSite(rootUrl: string, options: CrawlOptions = {}): Promise<string[]> {
  const { maxPages = 200, onProgress, signal } = options;

  const root = new URL(rootUrl);
  const origin = root.origin;
  // Ensure basePath always ends with '/' so prefix-matching is exact per segment.
  // e.g. /en-us/microsoft-cloud/blog/ — only crawl pages under blog/
  const basePath = root.pathname.endsWith('/') ? root.pathname : root.pathname + '/';

  const visited = new Set<string>();
  const queue: string[] = [normalizeUrl(rootUrl)];

  while (queue.length > 0 && visited.size < maxPages && !signal?.aborted) {
    const url = queue.shift()!;
    if (visited.has(url)) continue;
    visited.add(url);
    onProgress?.(url, visited.size);

    let html: string;
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'accessibility-scanner/1.0' },
        redirect: 'follow',
        signal: signal as any,
      });

      const contentType = res.headers.get('content-type') ?? '';
      if (!contentType.includes('text/html')) continue;

      html = await res.text();
    } catch (err: any) {
      if (err?.name === 'AbortError' || signal?.aborted) break;
      continue;
    }

    for (const href of extractLinks(html, url, origin, basePath)) {
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

function extractLinks(html: string, base: string, origin: string, basePath: string): string[] {
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
      // Only follow links at or below the starting path
      const pathname = resolved.pathname.endsWith('/')
        ? resolved.pathname
        : resolved.pathname + '/';
      if (!pathname.startsWith(basePath)) continue;

      found.push(normalizeUrl(resolved.toString()));
    } catch {
      // invalid URL — skip
    }
  }

  return found;
}
