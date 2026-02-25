import { useState } from 'react';
import { ScanReport, AxeViolation } from '@accessibility-scanner/shared';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

interface ViolationsTableProps {
  report: ScanReport;
}

export function ViolationsTable({ report }: ViolationsTableProps) {
  const [selectedViolation, setSelectedViolation] = useState<{
    violation: AxeViolation;
    url: string;
  } | null>(null);

  // Flatten all violations with their URLs
  const allViolations = report.results.flatMap(result =>
    result.violations.map(violation => ({
      violation,
      url: result.url
    }))
  );

  // Group by violation ID
  const groupedViolations = allViolations.reduce((acc, { violation, url }) => {
    if (!acc[violation.id]) {
      acc[violation.id] = {
        violation,
        urls: [],
        count: 0
      };
    }
    acc[violation.id].urls.push(url);
    acc[violation.id].count++;
    return acc;
  }, {} as Record<string, { violation: AxeViolation; urls: string[]; count: number }>);

  const impactColors = {
    critical: 'destructive',
    serious: 'destructive',
    moderate: 'secondary',
    minor: 'outline'
  } as const;

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Violation</TableHead>
            <TableHead>Impact</TableHead>
            <TableHead>WCAG</TableHead>
            <TableHead>Occurrences</TableHead>
            <TableHead>Pages Affected</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Object.values(groupedViolations)
            .sort((a, b) => {
              const impactOrder = { critical: 0, serious: 1, moderate: 2, minor: 3 };
              return impactOrder[a.violation.impact] - impactOrder[b.violation.impact];
            })
            .map(({ violation, urls, count }) => (
              <TableRow key={violation.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{violation.help}</p>
                    <p className="text-sm text-gray-500">{violation.id}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={impactColors[violation.impact]}>
                    {violation.impact}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {violation.tags
                      .filter(tag => tag.startsWith('wcag'))
                      .map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                  </div>
                </TableCell>
                <TableCell>{count}</TableCell>
                <TableCell>{new Set(urls).size}</TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedViolation({ violation, url: urls[0] })}
                  >
                    Details
                  </Button>
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>

      <Dialog 
        open={!!selectedViolation} 
        onOpenChange={() => setSelectedViolation(null)}
      >
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedViolation?.violation.help}</DialogTitle>
          </DialogHeader>
          
          {selectedViolation && (
            <Tabs defaultValue="details">
              <TabsList>
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="examples">Examples</TabsTrigger>
                <TabsTrigger value="fix">How to Fix</TabsTrigger>
              </TabsList>
              
              <TabsContent value="details" className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Description</h4>
                  <p className="text-sm">{selectedViolation.violation.description}</p>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Impact</h4>
                  <Badge variant={impactColors[selectedViolation.violation.impact]}>
                    {selectedViolation.violation.impact}
                  </Badge>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-1">
                    {selectedViolation.violation.tags.map(tag => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="examples" className="space-y-4">
                {selectedViolation.violation.nodes.slice(0, 3).map((node, i) => (
                  <div key={i} className="space-y-2">
                    <h4 className="font-medium">Example {i + 1}</h4>
                    <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
                      <code>{node.html}</code>
                    </pre>
                    <p className="text-sm text-gray-600">
                      Target: {node.target.join(' > ')}
                    </p>
                    <p className="text-sm">{node.failureSummary}</p>
                  </div>
                ))}
              </TabsContent>
              
              <TabsContent value="fix">
                <div className="space-y-4">
                  <p className="text-sm">
                    For detailed information on how to fix this issue, visit:
                  </p>
                  <a
                    href={selectedViolation.violation.helpUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-sm"
                  >
                    {selectedViolation.violation.helpUrl}
                  </a>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}