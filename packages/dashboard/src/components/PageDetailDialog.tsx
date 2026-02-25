import { useState } from 'react';
import { ScanResult, AxeViolation } from '@accessibility-scanner/shared';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

interface PageDetailDialogProps {
  page: ScanResult;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PageDetailDialog({
  page,
  open,
  onOpenChange,
}: PageDetailDialogProps) {
  const [selectedViolation, setSelectedViolation] =
    useState<AxeViolation | null>(null);

  const impactColors = {
    critical: 'destructive',
    serious: 'destructive',
    moderate: 'secondary',
    minor: 'outline',
  } as const;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="break-words">Page Details</DialogTitle>
          </DialogHeader>

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
              <Badge
                variant={
                  page.violations.length > 0 ? 'destructive' : 'secondary'
                }
              >
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
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {page.violations.map((v, idx) => (
                    <TableRow key={`${v.id}-${idx}`}> 
                      {/* idx added in case same id appears multiple times */}
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
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedViolation(v)}
                        >
                          Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedViolation && (
        <Dialog
          open={!!selectedViolation}
          onOpenChange={() => setSelectedViolation(null)}
        >
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedViolation.help}</DialogTitle>
            </DialogHeader>

            <Tabs defaultValue="details">
              <TabsList>
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="examples">Examples</TabsTrigger>
                <TabsTrigger value="fix">How to Fix</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Description</h4>
                  <p className="text-sm">
                    {selectedViolation.description}
                  </p>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Impact</h4>
                  <Badge variant={impactColors[selectedViolation.impact]}>
                    {selectedViolation.impact}
                  </Badge>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-1">
                    {selectedViolation.tags.map((tag) => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="examples" className="space-y-4">
                {selectedViolation.nodes.slice(0, 3).map((node, i) => (
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
                    href={selectedViolation.helpUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-sm"
                  >
                    {selectedViolation.helpUrl}
                  </a>
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
