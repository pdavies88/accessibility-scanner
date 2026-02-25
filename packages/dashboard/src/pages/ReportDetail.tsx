import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ScanReport, ScanResult } from '@accessibility-scanner/shared';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Badge,
  Progress
} from '@/components/ui';
import { ViolationsTable } from '@/components/ViolationsTable';
import { ImpactChart } from '@/components/ImpactChart';
import { PagesList } from '@/components/PagesList';
import { ExportDialog } from '@/components/ExportDialog';

export function ReportDetail() {
  const { id } = useParams();
  const [exportOpen, setExportOpen] = useState(false);
  
  const { data: report, isLoading } = useQuery<ScanReport>({
    queryKey: ['report', id],
    queryFn: () => fetch(`/api/reports/${id}`).then(res => res.json())
  });

  if (isLoading) return <div>Loading...</div>;
  if (!report) return <div>Report not found</div>;

  const impactData = Object.entries(report.summary.violationsByImpact).map(
    ([impact, count]) => ({ impact, count })
  );

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold mb-2">
            {new URL(report.sitemap).hostname}
          </h1>
          <p className="text-gray-500">
            Scanned on {new Date(report.startTime).toLocaleString()}
          </p>
        </div>
        <Button onClick={() => setExportOpen(true)}>
          Export for Jira
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Pages Scanned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{report.summary.totalPages}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
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
            <CardTitle className="text-sm font-medium text-gray-500">
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
            <CardTitle className="text-sm font-medium text-gray-500">
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
                      <span className="text-sm text-gray-500 w-12 text-right">
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

      <ExportDialog 
        open={exportOpen} 
        onOpenChange={setExportOpen}
        report={report}
      />
    </div>
  );
}