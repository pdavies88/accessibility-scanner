import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ScanReport } from '@accessibility-scanner/shared';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge
} from '@/components/ui';

export function Dashboard() {
  const { data: reports, isLoading } = useQuery<ScanReport[]>({
    queryKey: ['reports'],
    queryFn: () => fetch('/api/reports').then(res => res.json())
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Accessibility Reports</h1>
      
      <div className="grid gap-6">
        {reports?.map(report => (
          <Card key={report.id}>
            <CardHeader>
              <CardTitle>
                <Link 
                  to={`/reports/${report.id}`}
                  className="hover:underline"
                >
                  {new URL(report.sitemap).hostname}
                </Link>
              </CardTitle>
              <p className="text-sm text-gray-500">
                Scanned on {new Date(report.startTime).toLocaleString()}
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-500">Total Pages</p>
                  <p className="text-2xl font-bold">{report.summary.totalPages}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Violations</p>
                  <p className="text-2xl font-bold text-red-600">
                    {report.summary.totalViolations}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Critical</p>
                  <p className="text-2xl font-bold text-red-700">
                    {report.summary.violationsByImpact.critical || 0}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Serious</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {report.summary.violationsByImpact.serious || 0}
                  </p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Badge variant="outline">
                  {Object.keys(report.summary.violationsByType).length} violation types
                </Badge>
                <Badge variant="outline">
                  Duration: {Math.round(
                    (new Date(report.endTime).getTime() - 
                     new Date(report.startTime).getTime()) / 1000
                  )}s
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}