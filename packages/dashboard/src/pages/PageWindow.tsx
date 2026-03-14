import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
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
  const [impactFilter, setImpactFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('');

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
          {page.violations.length > 0 ? (() => {
            const IMPACT_ORDER = ['critical', 'serious', 'moderate', 'minor'] as const;
            const LEVEL_ORDER = ['A', 'AA', 'AAA', 'best-practice'] as const;

            const impactCounts = page.violations.reduce((acc, v) => {
              acc[v.impact] = (acc[v.impact] ?? 0) + 1;
              return acc;
            }, {} as Record<string, number>);

            const levelCounts = page.violations.reduce((acc, v) => {
              const key = v.level ?? 'best-practice';
              acc[key] = (acc[key] ?? 0) + 1;
              return acc;
            }, {} as Record<string, number>);

            const filteredViolations = page.violations.filter(v => {
              if (impactFilter && v.impact !== impactFilter) return false;
              if (levelFilter && (v.level ?? 'best-practice') !== levelFilter) return false;
              return true;
            });

            const segBtn = (active: boolean) => cn(
              'px-2.5 py-1 text-xs rounded font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
              active
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground cursor-pointer',
            );

            return (
              <div className="space-y-3">
                {/* Filter controls */}
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-0.5">
                    <span className="text-xs text-muted-foreground mr-2 shrink-0">Impact</span>
                    <div className="inline-flex items-center rounded-md border bg-muted p-0.5 gap-0.5" role="group" aria-label="Filter by impact">
                      <button type="button" onClick={() => setImpactFilter('')} aria-pressed={impactFilter === ''} className={segBtn(impactFilter === '')}>
                        All ({page.violations.length})
                      </button>
                      {IMPACT_ORDER.filter(i => impactCounts[i]).map(i => (
                        <button key={i} type="button" onClick={() => setImpactFilter(f => f === i ? '' : i)} aria-pressed={impactFilter === i} className={segBtn(impactFilter === i)}>
                          {i.charAt(0).toUpperCase() + i.slice(1)} ({impactCounts[i]})
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-0.5">
                    <span className="text-xs text-muted-foreground mr-2 shrink-0">Level</span>
                    <div className="inline-flex items-center rounded-md border bg-muted p-0.5 gap-0.5" role="group" aria-label="Filter by WCAG level">
                      <button type="button" onClick={() => setLevelFilter('')} aria-pressed={levelFilter === ''} className={segBtn(levelFilter === '')}>
                        All
                      </button>
                      {LEVEL_ORDER.filter(l => levelCounts[l]).map(l => (
                        <button key={l} type="button" onClick={() => setLevelFilter(f => f === l ? '' : l)} aria-pressed={levelFilter === l} className={segBtn(levelFilter === l)}>
                          {l === 'best-practice' ? 'Best Practice' : l} ({levelCounts[l]})
                        </button>
                      ))}
                    </div>
                  </div>

                  {(impactFilter || levelFilter) && (
                    <span className="text-xs text-muted-foreground">
                      Showing {filteredViolations.length} of {page.violations.length}
                    </span>
                  )}
                </div>

                {filteredViolations.length > 0 ? (
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
                        {filteredViolations.map((v, idx) => {
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
                                    <button
                                      type="button"
                                      onClick={() => setImpactFilter(f => f === v.impact ? '' : v.impact)}
                                      aria-label={`Filter by impact: ${v.impact}`}
                                      className="focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded"
                                    >
                                      <Badge variant={impactColors[v.impact]} className="cursor-pointer hover:opacity-75 transition-opacity">{v.impact}</Badge>
                                    </button>
                                  </TableCell>
                                  <TableCell rowSpan={nodes.length}>
                                    {v.level ? (
                                      <button
                                        type="button"
                                        onClick={() => setLevelFilter(f => f === v.level ? '' : (v.level ?? ''))}
                                        aria-label={`Filter by level: ${v.level}`}
                                        className="focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded"
                                      >
                                        <Badge variant="outline" className="cursor-pointer hover:opacity-75 transition-opacity">{v.level}</Badge>
                                      </button>
                                    ) : (
                                      <span className="text-muted-foreground">—</span>
                                    )}
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
                  <p className="text-muted-foreground">No violations match the current filters.</p>
                )}
              </div>
            );
          })() : (
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
