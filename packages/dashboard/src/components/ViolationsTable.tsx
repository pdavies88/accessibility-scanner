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

interface ViolationsTableProps {
  report: ScanReport;
  initialImpactFilter?: string;
}

const IMPACT_LEVELS = ['critical', 'serious', 'moderate', 'minor'] as const;

const impactColors = {
  critical: 'destructive',
  serious: 'destructive',
  moderate: 'secondary',
  minor: 'outline',
} as const;

export function ViolationsTable({ report, initialImpactFilter = '' }: ViolationsTableProps) {
  const [impactFilter, setImpactFilter] = useState(initialImpactFilter);

  const allViolations = report.results.flatMap(result =>
    result.violations.map(violation => ({ violation, url: result.url }))
  );

  const groupedViolations = allViolations.reduce((acc, { violation, url }) => {
    if (!acc[violation.id]) {
      acc[violation.id] = { violation, urls: [], count: 0 };
    }
    acc[violation.id].urls.push(url);
    acc[violation.id].count++;
    return acc;
  }, {} as Record<string, { violation: AxeViolation; urls: string[]; count: number }>);

  const sortedViolations = Object.values(groupedViolations).sort((a, b) => {
    const order = { critical: 0, serious: 1, moderate: 2, minor: 3 };
    return order[a.violation.impact] - order[b.violation.impact];
  });

  const filtered = impactFilter
    ? sortedViolations.filter(v => v.violation.impact === impactFilter)
    : sortedViolations;

  const countByImpact = Object.values(groupedViolations).reduce((acc, { violation }) => {
    acc[violation.impact] = (acc[violation.impact] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={impactFilter === '' ? 'default' : 'outline'}
          onClick={() => setImpactFilter('')}
        >
          All ({sortedViolations.length})
        </Button>
        {IMPACT_LEVELS.map(level => {
          const count = countByImpact[level] || 0;
          if (count === 0) return null;
          return (
            <Button
              key={level}
              size="sm"
              variant={impactFilter === level ? 'default' : 'outline'}
              onClick={() => setImpactFilter(impactFilter === level ? '' : level)}
            >
              {level.charAt(0).toUpperCase() + level.slice(1)} ({count})
            </Button>
          );
        })}
      </div>

      <Table aria-label="Accessibility violations grouped by type">
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
          {filtered.map(({ violation, urls, count }) => (
            <TableRow key={violation.id}>
              <TableCell>
                <div>
                  <p className="font-medium">{violation.help}</p>
                  <p className="text-xs text-muted-foreground">{violation.id}</p>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={impactColors[violation.impact]}>{violation.impact}</Badge>
              </TableCell>
              <TableCell>
                {violation.level || violation.tags.find(t => /wcag/i.test(t)) || 'N/A'}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {violation.tags.filter(tag => tag.startsWith('wcag')).map(tag => (
                    <Badge key={tag} variant="default" className="text-xs">{tag}</Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell>{count}</TableCell>
              <TableCell>{new Set(urls).size}</TableCell>
              <TableCell>
                <Button
                  size="sm"
                  variant="default"
                  aria-label={`View details for violation: ${violation.help}`}
                  onClick={() =>
                    window.open(
                      `/reports/${report.id}/violation/${violation.id}`,
                      '_blank',
                      'noopener,noreferrer'
                    )
                  }
                >
                  Details<span className="sr-only"> (opens in new window)</span>
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {filtered.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                No {impactFilter} violations found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
