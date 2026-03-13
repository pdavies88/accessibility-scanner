import { ScanResult } from '@accessibility-scanner/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ExternalLink } from './ExternalLink';

interface PageDetailPanelProps {
  page: ScanResult;
  onClose: () => void;
}

const impactColors = {
  critical: 'destructive',
  serious: 'destructive',
  moderate: 'secondary',
  minor: 'outline',
} as const;

export function PageDetailPanel({ page, onClose }: PageDetailPanelProps) {
  return (
    <Card className="mt-4 border-l-4 border-l-primary">
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <CardTitle className="text-lg break-all">
          <ExternalLink href={page.url} className="font-normal text-base">
            {page.url}
          </ExternalLink>
        </CardTitle>
        <Button size="sm" variant="outline" onClick={onClose} className="ml-4 shrink-0">Close</Button>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">

        <div className="flex flex-wrap gap-3">
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

        {page.violations.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-2">Violations</p>
            <div className="border rounded overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Violation</TableHead>
                    <TableHead>Impact</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Summary</TableHead>
                    <TableHead>HTML</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {page.violations.map((v, idx) => {
                    const nodes = v.nodes.length ? v.nodes : [{ html: '', target: [], failureSummary: '' }];
                    return nodes.map((n, nidx) => (
                      <TableRow key={`${v.id}-${idx}-${nidx}`}>
                        {nidx === 0 && (
                          <>
                            <TableCell rowSpan={nodes.length} className="min-w-[180px]">
                              <ExternalLink href={v.helpUrl} className="font-medium">
                                {v.help}
                              </ExternalLink>
                            </TableCell>
                            <TableCell rowSpan={nodes.length}>
                              <Badge variant={impactColors[v.impact]}>{v.impact}</Badge>
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
          </div>
        )}

        {page.violations.length === 0 && (
          <p className="text-muted-foreground">No violations found on this page.</p>
        )}

      </CardContent>
    </Card>
  );
}
