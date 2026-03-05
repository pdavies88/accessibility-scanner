import { useNavigate } from 'react-router-dom';
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

interface ViolationsTableProps {
  report: ScanReport;
}

export function ViolationsTable({ report }: ViolationsTableProps) {
  const navigate = useNavigate();

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
            <TableHead>Level</TableHead>
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
                  {violation.level ||
                    violation.tags.find(t => /wcag/i.test(t)) ||
                    'N/A'}
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
                    onClick={() => {
                      navigate('/violation', {
                        state: { violation, url: urls[0], reportId: report.id },
                      });
                    }}
                  >
                    Details
                  </Button>
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>

    </>
  );
}