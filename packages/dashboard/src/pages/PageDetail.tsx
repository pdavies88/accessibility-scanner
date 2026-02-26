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
        <Button variant="outline" onClick={() => navigate(-1)}>
          Back
        </Button>
      </div>

      <div className="space-y-4">
        <div>
          <p className="font-medium">URL</p>
          <p className="text-sm text-gray-700 break-words">{page.url}</p>
        </div>

        <div>
          <p className="font-medium">Scanned</p>
          <p className="text-sm text-gray-500">
            {new Date(page.timestamp).toLocaleString()}
          </p>
        </div>

        <div className="flex gap-2 items-center">
          <Badge variant={page.violations.length > 0 ? 'destructive' : 'secondary'}>
            {page.violations.length} Violations
          </Badge>
          <Badge variant="outline">{page.passes} passes</Badge>
          <Badge variant="outline">{page.incomplete} incomplete</Badge>
          <Badge variant="outline">{page.inapplicable} inapplicable</Badge>
        </div>

        <div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Violation</TableHead>
                <TableHead>Impact</TableHead>
                <TableHead>WCAG</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {page.violations.map((v, idx) => (
                <TableRow key={`${v.id}-${idx}`}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{v.help}</p>
                      <p className="text-sm text-gray-500">{v.id}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={impactColors[v.impact]}>
                      {v.impact}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {v.tags
                        .filter((tag) => tag.startsWith('wcag'))
                        .map((tag) => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className="text-xs"
                          >
                            {tag}
                          </Badge>
                        ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
