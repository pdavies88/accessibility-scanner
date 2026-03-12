import { useParams } from 'react-router-dom';
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
  
  const { report, loading, error } = useReport(id);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!report) return <div>Report not found</div>;

  const impactData = Object.entries(report.summary.violationsByImpact || {}).map(
    ([impact, count]) => ({ impact, count })
  );

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
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium ">
              Pages Scanned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{report.summary.totalPages}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium ">
              Total Violations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">
              {report.summary.totalViolations}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium ">
              Avg per Page
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {(report.summary.totalViolations / report.summary.totalPages).toFixed(1)}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium ">
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

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="violations">Violations</TabsTrigger>
          <TabsTrigger value="pages">Pages</TabsTrigger>
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
                  .map(([type, count]) => (
                    <div key={type} className="flex items-center gap-2">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{type}</p>
                        <Progress 
                          value={(count / report.summary.totalViolations) * 100} 
                          className="h-2"
                        />
                      </div>
                      <span className="text-sm  w-12 text-right">
                        {count}
                      </span>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="violations">
          <ViolationsTable report={report} />
        </TabsContent>
        
        <TabsContent value="pages">
          <PagesList results={report.results} />
        </TabsContent>
      </Tabs>

      <ExportData
        report={report}
      />
    </div>
  );
}