import { useLocation, useNavigate } from 'react-router-dom';
import { ScanResult } from '@accessibility-scanner/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface LocationState {
  page: ScanResult;
}

export function PageDetail() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState | null;

  if (!state || !state.page) {
    navigate(-1);
    return null;
  }

  const { page } = state;
  const impactColors = {
    critical: 'destructive',
    serious: 'destructive',
    moderate: 'secondary',
    minor: 'outline',
  } as const;

  return (
    <div className="container mx-auto p-6">
      <div className="mb-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Page Details</h1>
        <Button variant="default" onClick={() => navigate(-1)}>
          Back
        </Button>
      </div>

      <div className="space-y-4">
        <div>
          <p className="font-medium">URL</p>
          <p className="text-sm  break-words">
            <a href={page.url} target="_blank" rel="noopener noreferrer" className="text-purple-300 hover:underline break-words">
              {page.url}
            </a>
          </p>
        </div>

        <div>
          <p className="font-medium">Scanned</p>
          <p className="text-sm ">
            {new Date(page.timestamp).toLocaleString()}
          </p>
        </div>

        <div className="flex gap-2 items-center">
          <Badge variant={page.violations.length > 0 ? 'destructive' : 'secondary'}>
            {page.violations.length} Violations
          </Badge>
          <Badge variant="default">{page.passes} passes</Badge>
          <Badge variant="default">{page.incomplete} incomplete</Badge>
          <Badge variant="default">{page.inapplicable} inapplicable</Badge>
        </div>

        <div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px]">Violation</TableHead>
                <TableHead className="min-w-[200px]">Impact</TableHead>
                <TableHead className="min-w-[200px]">Location</TableHead>
                <TableHead className="min-w-[200px]">Failure Summary</TableHead>
                <TableHead className="min-w-[200px]">HTML</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {page.violations.map((v, idx) => {
                const nodes = v.nodes.length ? v.nodes : [{
                  html: '',
                  target: [],
                  failureSummary: ''
                }];

                return nodes.map((n, nidx) => (
                  <TableRow key={`${v.id}-${idx}-${nidx}`}>
                    {nidx === 0 && (
                      <>
                        <TableCell rowSpan={nodes.length} className="min-w-[200px]">
                          <div>
                            <p className="font-medium">
                              <a
                                href={v.helpUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-purple-300 hover:underline"
                              >
                                {v.help}
                              </a>
                            </p>
                          </div>
                        </TableCell>
                        <TableCell rowSpan={nodes.length} className="min-w-[200px]">
                          <Badge variant={impactColors[v.impact]}>
                            {v.impact}
                          </Badge>
                        </TableCell>
                      </>
                    )}
                    <TableCell className="min-w-[200px]">
                      {n.target.join(' ')}
                    </TableCell>
                    <TableCell className="min-w-[200px]">
                      <p className="text-xs break-words">
                        {n.failureSummary}
                      </p>
                    </TableCell>
                    <TableCell className="min-w-[200px]">
                      <pre className="text-xs break-words">
                        {n.html}
                      </pre>
                    </TableCell>
                  </TableRow>
                ));
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
