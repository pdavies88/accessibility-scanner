import { useState, ChangeEvent } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { PageDetailDialog } from './PageDetailDialog';

interface PagesListProps {
  results: ScanResult[];
}

export function PagesList({ results }: PagesListProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'with-violations' | 'clean'>('all');
  const [sortBy, setSortBy] = useState<'url' | 'violations' | 'timestamp'>('violations');
  const [selectedPage, setSelectedPage] = useState<ScanResult | null>(null);

  const filteredResults = results
    .filter(result => {
      if (search && !result.url.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      if (filter === 'with-violations' && result.violations.length === 0) {
        return false;
      }
      if (filter === 'clean' && result.violations.length > 0) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'url':
          return a.url.localeCompare(b.url);
        case 'violations':
          return b.violations.length - a.violations.length;
        case 'timestamp':
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        default:
          return 0;
      }
    });

  return (
    <>
      <div className="space-y-4">
        <div className="flex gap-4">
          <Input
            placeholder="Search URLs..."
            value={search}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            className="max-w-sm"
          />
          <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Pages</SelectItem>
              <SelectItem value="with-violations">With Violations</SelectItem>
              <SelectItem value="clean">Clean Pages</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="violations">Sort by Violations</SelectItem>
              <SelectItem value="url">Sort by URL</SelectItem>
              <SelectItem value="timestamp">Sort by Scan Time</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>URL</TableHead>
                <TableHead>Violations</TableHead>
                <TableHead>Critical</TableHead>
                <TableHead>Serious</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Scanned</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredResults.map((result) => {
                const criticalCount = result.violations.filter(v => v.impact === 'critical').length;
                const seriousCount = result.violations.filter(v => v.impact === 'serious').length;
                
                return (
                  <TableRow key={result.id}>
                    <TableCell className="max-w-md truncate">
                      {result.url}
                    </TableCell>
                    <TableCell>
                      <Badge variant={result.violations.length > 0 ? 'destructive' : 'secondary'}>
                        {result.violations.length}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {criticalCount > 0 && (
                        <Badge variant="destructive">{criticalCount}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {seriousCount > 0 && (
                        <Badge variant="destructive">{seriousCount}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {result.violations.length === 0 ? (
                        <Badge variant="secondary">Clean</Badge>
                      ) : (
                        <Badge variant="destructive">Issues Found</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {new Date(result.timestamp).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedPage(result)}
                      >
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {selectedPage && (
        <PageDetailDialog
          page={selectedPage}
          open={!!selectedPage}
          onOpenChange={() => setSelectedPage(null)}
        />
      )}
    </>
  );
}