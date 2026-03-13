import { useState, useId, ChangeEvent } from 'react';
import { ScanResult } from '@accessibility-scanner/shared';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ExternalLink } from './ExternalLink';

interface PagesListProps {
  results: ScanResult[];
  reportId: string;
}

export function PagesList({ results, reportId }: PagesListProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'with-violations' | 'clean'>('all');
  const [sortBy, setSortBy] = useState<'url' | 'violations' | 'severity'>('violations');
  const searchId = useId();
  const filterId = useId();
  const sortId = useId();

  const filteredResults = results
    .filter(result => {
      if (search && !result.url.toLowerCase().includes(search.toLowerCase())) return false;
      if (filter === 'with-violations' && result.violations.length === 0) return false;
      if (filter === 'clean' && result.violations.length > 0) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'url': return a.url.localeCompare(b.url);
        case 'violations': return b.violations.length - a.violations.length;
        case 'severity': {
          const impactScore = (v: typeof a) => {
            const critical = v.violations.filter(x => x.impact === 'critical').length;
            const serious  = v.violations.filter(x => x.impact === 'serious').length;
            const moderate = v.violations.filter(x => x.impact === 'moderate').length;
            const minor    = v.violations.filter(x => x.impact === 'minor').length;
            return critical * 1000 + serious * 100 + moderate * 10 + minor;
          };
          return impactScore(b) - impactScore(a);
        }
        default: return 0;
      }
    });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex flex-col gap-1">
          <Label htmlFor={searchId}>Search URLs</Label>
          <Input
            id={searchId}
            placeholder="Search URLs..."
            value={search}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={filterId}>Filter pages</Label>
          <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
            <SelectTrigger id={filterId} className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Pages</SelectItem>
              <SelectItem value="with-violations">With Violations</SelectItem>
              <SelectItem value="clean">Clean Pages</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={sortId}>Sort by</Label>
          <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
            <SelectTrigger id={sortId} className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="violations">Sort by Violations</SelectItem>
              <SelectItem value="severity">Sort by Severity</SelectItem>
              <SelectItem value="url">Sort by URL</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border rounded-lg">
        <Table aria-label="Scanned pages with violation counts">
          <TableHeader>
            <TableRow>
              <TableHead>URL</TableHead>
              <TableHead>Violations</TableHead>
              <TableHead>Critical</TableHead>
              <TableHead>Serious</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredResults.map(result => {
              const criticalCount = result.violations.filter(v => v.impact === 'critical').length;
              const seriousCount = result.violations.filter(v => v.impact === 'serious').length;

              return (
                <TableRow key={result.id}>
                  <TableCell className="max-w-md">
                    <ExternalLink href={result.url} className="break-all text-sm">
                      {result.url}
                    </ExternalLink>
                  </TableCell>
                  <TableCell>
                    <Badge variant={result.violations.length > 0 ? 'destructive' : 'secondary'}>
                      {result.violations.length}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {criticalCount > 0 && <Badge variant="destructive">{criticalCount}</Badge>}
                  </TableCell>
                  <TableCell>
                    {seriousCount > 0 && <Badge variant="destructive">{seriousCount}</Badge>}
                  </TableCell>
                  <TableCell>
                    {result.violations.length === 0
                      ? <Badge variant="secondary">Clean</Badge>
                      : <Badge variant="destructive">Issues Found</Badge>}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="default"
                      aria-label={`View details for page: ${result.url}`}
                      onClick={() =>
                        window.open(
                          `/reports/${reportId}/page/${result.id}`,
                          '_blank',
                          'noopener,noreferrer'
                        )
                      }
                    >
                      Details<span className="sr-only"> (opens in new window)</span>
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
