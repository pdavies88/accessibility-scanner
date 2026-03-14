import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useReport } from '@/hooks/useReport';
import { useManualAudit } from '@/hooks/useManualAudit';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ManualAuditTab } from '@/components/ManualAuditTab';
import { ExternalLink } from '@/components/ExternalLink';
import { X, ArrowLeft } from 'lucide-react';

export function PageWindow() {
  const { id, pageId } = useParams<{ id: string; pageId: string }>();
  const { report, loading, error } = useReport(id);
  const navigate = useNavigate();

  const page = report?.results.find(r => r.id === pageId) ?? null;

  const { audit, updateCheck, updateNotes, updateEvidence, addCustomCheck, deleteCustomCheck, updateAuditorNotes } =
    useManualAudit(id ?? '', pageId ?? '', page?.manualAudit);

  const [activeTab, setActiveTab] = useState('automated');

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

  const manualFailCount = audit.checks.filter(c => c.status === 'fail').length;
  const manualNotTestedCount = audit.checks.filter(c => c.status === 'not-tested').length;

  const manualTabLabel =
    manualFailCount > 0
      ? `Manual Audit (${manualFailCount} fail / ${manualNotTestedCount} not tested)`
      : `Manual Audit (${audit.checks.length - manualNotTestedCount} checked)`;

  return (
    <div className="container mx-auto p-6 space-y-6 text-base">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/reports/${id}?tab=pages`)}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back to report
        </Button>
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <h1 className="text-xl font-bold break-all">
        <ExternalLink href={page.url}>{page.url}</ExternalLink>
      </h1>

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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="border-b w-full justify-start rounded-none pb-0 mb-4">
          <TabsTrigger value="automated">
            Automated Issues ({page.violations.length})
          </TabsTrigger>
          <TabsTrigger value="manual">
            {manualTabLabel}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="automated">
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
        </TabsContent>

        <TabsContent value="manual">
          <ManualAuditTab
            audit={audit}
            onStatusChange={updateCheck}
            onNotesChange={updateNotes}
            onEvidenceChange={updateEvidence}
            onAddCustomCheck={addCustomCheck}
            onDeleteCustomCheck={deleteCustomCheck}
            onAuditorNotesChange={updateAuditorNotes}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
