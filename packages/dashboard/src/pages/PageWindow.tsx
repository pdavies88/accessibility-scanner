import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useReport } from '@/hooks/useReport';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ExternalLink } from '@/components/ExternalLink';

export function PageWindow() {
  const { id, pageId } = useParams<{ id: string; pageId: string }>();
  const { report, loading, error } = useReport(id);

  const page = report?.results.find(r => r.id === pageId) ?? null;

  useEffect(() => {
    if (page) {
      try {
        const label = new URL(page.url).pathname || page.url;
        document.title = `${label} — Page Detail`;
      } catch {
        document.title = `${page.url} — Page Detail`;
      }
    }
    return () => { document.title = 'Accessibility Scanner'; };
  }, [page]);

  if (loading) return <div className="p-6">Loading…</div>;
  if (error)   return <div className="p-6">Error: {error}</div>;
  if (!report) return <div className="p-6">Report not found.</div>;
  if (!page)   return <div className="p-6">Page not found in this report.</div>;

  const impactColors = {
    critical: 'destructive',
    serious: 'destructive',
    moderate: 'secondary',
    minor: 'outline',
  } as const;

  function wcagCriteria(tags: string[]): string[] {
    return tags
      .filter(t => /^wcag\d{3,}$/.test(t))
      .map(t => {
        const d = t.replace('wcag', '');
        return `${d[0]}.${d[1]}.${d.slice(2)}`;
      });
  }

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-5xl">
      <div>
        <p className="text-xs text-muted-foreground mb-1">Page URL</p>
        <h1 className="text-xl font-bold break-all">
          <ExternalLink href={page.url}>{page.url}</ExternalLink>
        </h1>
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Scanned</p>
          <p>{new Date(page.timestamp).toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Results</p>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant={page.violations.length > 0 ? 'destructive' : 'secondary'}>
              {page.violations.length} violations
            </Badge>
            <Badge variant="default">{page.passes} passes</Badge>
            <Badge variant="default">{page.incomplete} incomplete</Badge>
          </div>
        </div>
      </div>

      {page.violations.length > 0 ? (
        <div className="border rounded overflow-x-auto">
          <Table aria-label={`Violations found on ${page.url}`}>
            <TableHeader>
              <TableRow>
                <TableHead>Violation</TableHead>
                <TableHead>Impact</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>WCAG Criteria</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Summary</TableHead>
                <TableHead>HTML</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {page.violations.map((v, idx) => {
                const nodes = v.nodes.length
                  ? v.nodes
                  : [{ html: '', target: [], failureSummary: '' }];
                return nodes.map((n, nidx) => (
                  <TableRow key={`${v.id}-${idx}-${nidx}`}>
                    {nidx === 0 && (
                      <>
                        <TableCell rowSpan={nodes.length} className="min-w-[180px]">
                          <ExternalLink href={v.helpUrl} className="font-medium">
                            {[...wcagCriteria(v.tags), v.help].filter(Boolean).join(' — ')}
                          </ExternalLink>
                        </TableCell>
                        <TableCell rowSpan={nodes.length}>
                          <Badge variant={impactColors[v.impact]}>{v.impact}</Badge>
                        </TableCell>
                        <TableCell rowSpan={nodes.length}>
                          {v.level
                            ? <Badge variant="outline">{v.level}</Badge>
                            : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell rowSpan={nodes.length} className="min-w-[120px]">
                          <div className="flex flex-wrap gap-1">
                            {wcagCriteria(v.tags).length > 0
                              ? wcagCriteria(v.tags).map(c => (
                                  <Badge key={c} variant="outline" className="font-mono text-xs">{c}</Badge>
                                ))
                              : <span className="text-muted-foreground">—</span>}
                          </div>
                        </TableCell>
                      </>
                    )}
                    <TableCell className="min-w-[140px] text-xs">{n.target.join(' ')}</TableCell>
                    <TableCell className="min-w-[200px]">
                      <p className="text-xs break-words">{n.failureSummary}</p>
                    </TableCell>
                    <TableCell className="min-w-[200px]">
                      <pre className="text-xs break-words whitespace-pre-wrap">{n.html}</pre>
                    </TableCell>
                  </TableRow>
                ));
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="text-muted-foreground">No violations found on this page.</p>
      )}
    </div>
  );
}
