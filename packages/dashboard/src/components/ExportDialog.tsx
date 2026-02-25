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
import {
  Textarea,
} from '@/components/ui/textarea';
import { JiraExporter } from '@/lib/jira-exporter';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: ScanReport;
}

export function ExportDialog({ open, onOpenChange, report }: ExportDialogProps) {
  const [selectedViolations, setSelectedViolations] = useState<Set<string>>(new Set());
  const [exportFormat, setExportFormat] = useState<'jira' | 'csv' | 'json'>('jira');
  const [customTemplate, setCustomTemplate] = useState('');

  const handleExport = async () => {
    const exporter = new JiraExporter();
    const exports = exporter.exportReport(report, Array.from(selectedViolations));
    
        if (exportFormat === 'jira') {
      // Download as JSON for Jira import
      const blob = new Blob([JSON.stringify(exports, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `jira-export-${report.id}.json`;
      a.click();
    } else if (exportFormat === 'csv') {
      // Convert to CSV
      const csv = convertToCSV(exports);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `accessibility-issues-${report.id}.csv`;
      a.click();
    }
    
    onOpenChange(false);
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
                  onCheckedChange={(checked) => {
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
                    onCheckedChange={(checked) => {
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

          {exportFormat === 'jira' && (
            <div>
              <Label>Custom Jira Template (Optional)</Label>
              <Textarea
                placeholder="Use variables: {{summary}}, {{description}}, {{impact}}, etc."
                value={customTemplate}
                onChange={(e) => setCustomTemplate(e.target.value)}
                rows={4}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleExport}
            disabled={selectedViolations.size === 0}
          >
            Export {selectedViolations.size} Issue Types
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function convertToCSV(data: any[]): string {
  if (data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const csvHeaders = headers.join(',');
  
    const csvRows = data.map(row => 
    headers.map(header => {
      const value = row[header];
      // Escape quotes and wrap in quotes if contains comma
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',')
  );
  
  return [csvHeaders, ...csvRows].join('\n');
}