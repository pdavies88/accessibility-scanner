import { useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useCurrentReport } from '@/context/CurrentReportContext';
import { useReport } from '@/hooks/useReport';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Progress
} from '@/components/ui';
import { ViolationsTable } from '@/components/ViolationsTable';
import { ImpactChart } from '@/components/ImpactChart';
import { LevelChart } from '@/components/LevelChart';
import { PagesList } from '@/components/PagesList';
import { ExportData } from '@/components/ExportData';

export function ReportDetail() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = searchParams.get('tab') || 'overview';
  const activeImpact = searchParams.get('impact') || '';

  function handleTabChange(tab: string) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('tab', tab);
      if (tab !== 'violations') next.delete('impact');
      return next;
    });
  }

  const { report, loading, error } = useReport(id);
  const { setCurrentReport } = useCurrentReport();

  useEffect(() => {
    if (report) {
      const label = report.sitemap.startsWith('http')
        ? new URL(report.sitemap).hostname
        : report.sitemap;
      document.title = `${label} — Accessibility Report`;
      setCurrentReport(report.id, label);
    }
    return () => { document.title = 'Accessibility Scanner'; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!report) return <div>Report not found</div>;

  const impactData = Object.entries(report.summary.violationsByImpact || {}).map(
    ([impact, count]) => ({ impact, count })
  );

  // Build a lookup from violation ID → violation object for display enrichment
  const violationMeta = report.results
    .flatMap(r => r.violations)
    .reduce((acc, v) => {
      if (!acc[v.id]) acc[v.id] = v;
      return acc;
    }, {} as Record<string, import('@accessibility-scanner/shared').AxeViolation>);

  function wcagCriteria(tags: string[]): string[] {
    return tags
      .filter(t => /^wcag\d{3,}$/.test(t))
      .map(t => { const d = t.replace('wcag', ''); return `${d[0]}.${d[1]}.${d.slice(2)}`; });
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold mb-2">
            {report.sitemap.startsWith('http') ? new URL(report.sitemap).hostname : report.sitemap}
          </h1>
          <p className="">
            Scanned on {new Date(report.startTime).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <button
          onClick={() => handleTabChange('pages')}
          className="rounded-xl border border-border bg-card text-card-foreground shadow text-left hover:border-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-colors cursor-pointer"
          aria-label={`${report.summary.totalPages} pages scanned — view Pages tab`}
        >
          <div className="flex flex-col space-y-1.5 p-6 pb-2">
            <p className="text-sm font-medium">Pages Scanned</p>
          </div>
          <div className="p-6 pt-0">
            <p className="text-2xl font-bold underline decoration-dotted">
              {report.summary.totalPages}
            </p>
          </div>
        </button>

        <button
          onClick={() => handleTabChange('violations')}
          className="rounded-xl border border-border bg-card text-card-foreground shadow text-left hover:border-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-colors cursor-pointer"
          aria-label={`${report.summary.totalViolations} total violations — view Violations tab`}
        >
          <div className="flex flex-col space-y-1.5 p-6 pb-2">
            <p className="text-sm font-medium">Total Violations</p>
          </div>
          <div className="p-6 pt-0">
            <p className="text-2xl font-bold text-red-400 underline decoration-dotted">
              {report.summary.totalViolations}
            </p>
          </div>
        </button>

        <button
          onClick={() => handleTabChange('violations')}
          className="rounded-xl border border-border bg-card text-card-foreground shadow text-left hover:border-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-colors cursor-pointer"
          aria-label={`${(report.summary.totalViolations / report.summary.totalPages).toFixed(1)} violations per page on average — view Violations tab`}
        >
          <div className="flex flex-col space-y-1.5 p-6 pb-2">
            <p className="text-sm font-medium">Avg per Page</p>
          </div>
          <div className="p-6 pt-0">
            <p className="text-2xl font-bold underline decoration-dotted">
              {(report.summary.totalViolations / report.summary.totalPages).toFixed(1)}
            </p>
          </div>
        </button>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Scan Duration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {Math.round(
                (new Date(report.endTime).getTime() -
                 new Date(report.startTime).getTime()) / 1000
              )}s
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="violations">Violations</TabsTrigger>
          <TabsTrigger value="pages">Pages</TabsTrigger>
          <TabsTrigger
            value="export"
            className="ml-auto rounded-md bg-primary text-primary-foreground shadow hover:bg-primary/90 hover:text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background px-4 py-2 border-b-0"
          >
            Export
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Violations by Impact</CardTitle>
            </CardHeader>
            <CardContent>
              <ImpactChart data={impactData} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Violations by WCAG Level</CardTitle>
            </CardHeader>
            <CardContent>
              <LevelChart
                data={Object.entries(report.summary.violationsByLevel || {}).map(
                  ([level, count]) => ({ level, count })
                )}
              />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Top Violation Types</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(report.summary.violationsByType)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 10)
                  .map(([type, count]) => {
                    const meta = violationMeta[type];
                    const criteria = meta ? wcagCriteria(meta.tags) : [];
                    const level = meta?.level ?? null;
                    const label = meta ? meta.help : type;
                    const suffix = criteria.length > 0
                      ? `${criteria.join(', ')} ${level && level !== 'best-practice' ? level : 'Best Practice'}`
                      : level && level !== 'best-practice' ? level : 'Best Practice';
                    return (
                      <div key={type} className="flex items-center gap-2">
                        <div className="flex-1">
                          <div className="flex items-baseline gap-2 mb-0.5">
                            <p className="text-sm font-medium">{label}</p>
                            <span className="text-xs text-muted-foreground font-mono shrink-0">{suffix}</span>
                          </div>
                          <Progress
                            value={(count / report.summary.totalViolations) * 100}
                            className="h-2"
                          />
                        </div>
                        <span className="text-sm w-12 text-right">{count}</span>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="violations">
          <ViolationsTable
            report={report}
            initialImpactFilter={activeImpact}
          />
        </TabsContent>

        <TabsContent value="pages">
          <PagesList results={report.results} reportId={report.id} />
        </TabsContent>

        <TabsContent value="export">
          <ExportData report={report} />
        </TabsContent>
      </Tabs>
    </div>
  );
}