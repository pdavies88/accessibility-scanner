import { useState } from 'react';
import { ScanReport } from '@accessibility-scanner/shared';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Button,
} from '@/components/ui/button';
import {
  Checkbox,
} from '@/components/ui/checkbox';
import {
  Label,
} from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: ScanReport;
}

export function ExportDialog({ open, onOpenChange, report }: ExportDialogProps) {
  const [selectedViolations, setSelectedViolations] = useState<Set<string>>(new Set());
  const [exportFormat, setExportFormat] = useState<'jira' | 'csv' | 'json'>('jira');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      // Call the API to get the export data
      const response = await fetch(`/api/reports/${report.id}/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selectedViolations: Array.from(selectedViolations),
          format: exportFormat,
        })
      });

      const data = await response.json();
      
      if (exportFormat === 'jira') {
        // Download as JSON for Jira import
        const blob = new Blob([JSON.stringify(data, null, 2)], {
          type: 'application/json'
        });
        downloadFile(blob, `jira-export-${report.id}.json`);
      } else if (exportFormat === 'csv') {
        // Server returns CSV directly
        const csvResponse = await fetch(`/api/reports/${report.id}/export/csv`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            selectedViolations: Array.from(selectedViolations)
          })
        });
        
        const csvData = await csvResponse.text();
        const blob = new Blob([csvData], { type: 'text/csv' });
        downloadFile(blob, `accessibility-issues-${report.id}.csv`);
      }
      
      onOpenChange(false);
    } catch (error) {
      console.error('Export failed:', error);
      // You might want to show an error toast here
    } finally {
      setIsExporting(false);
    }
  };

  const downloadFile = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const violationTypes = Object.entries(report.summary.violationsByType).map(
    ([type, count]) => ({ type, count })
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Export Accessibility Issues</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label>Export Format</Label>
            <Select value={exportFormat} onValueChange={(v: any) => setExportFormat(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="jira">Jira Import (JSON)</SelectItem>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="json">Raw JSON</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-2 block">Select Violations to Export</Label>
            <div className="border rounded-md p-4 max-h-64 overflow-y-auto space-y-2">
              <div className="flex items-center space-x-2 pb-2 border-b">
                <Checkbox
                  checked={selectedViolations.size === violationTypes.length}
                  onCheckedChange={(checked: any) => {
                    if (checked) {
                      setSelectedViolations(new Set(violationTypes.map(v => v.type)));
                    } else {
                      setSelectedViolations(new Set());
                    }
                  }}
                />
                <Label className="font-medium">Select All</Label>
              </div>
              
              {violationTypes.map(({ type, count }) => (
                <div key={type} className="flex items-center space-x-2">
                  <Checkbox
                    checked={selectedViolations.has(type)}
                    onCheckedChange={(checked: any) => {
                      const newSet = new Set(selectedViolations);
                      if (checked) {
                        newSet.add(type);
                      } else {
                        newSet.delete(type);
                      }
                      setSelectedViolations(newSet);
                    }}
                  />
                  <Label className="flex-1 cursor-pointer">
                    {type} ({count} occurrences)
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleExport}
            disabled={selectedViolations.size === 0 || isExporting}
          >
            {isExporting ? 'Exporting...' : `Export ${selectedViolations.size} Issue Types`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}