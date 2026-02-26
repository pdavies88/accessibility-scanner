import { useState } from 'react';
import { ScanReport } from '@accessibility-scanner/shared';
import {
  Button,
} from '@/components/ui/button';
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

interface ExportDataProps {
  report: ScanReport;
}

export function ExportData({ report }: ExportDataProps) {

  const [selectedViolation, setSelectedViolation] = useState<string | null>(null);
  const [exportFormat, setExportFormat] = useState<'jira' | 'csv' | 'json'>('jira');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (types: string[]) => {
    setIsExporting(true);
    try {
      const response = await fetch(`/api/reports/${report.id}/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selectedViolations: types,
          format: exportFormat,
        }),
      });
      const data = await response.json();

      if (exportFormat === 'jira') {
        const blob = new Blob([JSON.stringify(data, null, 2)], {
          type: 'application/json',
        });
        downloadFile(blob, `jira-export-${report.id}.json`);
      } else if (exportFormat === 'csv') {
        const csvResponse = await fetch(`/api/reports/${report.id}/export/csv`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            selectedViolations: types,
          }),
        });
        const csvData = await csvResponse.text();
        const blob = new Blob([csvData], { type: 'text/csv' });
        downloadFile(blob, `accessibility-issues-${report.id}.csv`);
      }
    } catch (error) {
      console.error('Export failed:', error);
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
    <div className="max-w-2xl p-6 border rounded-lg bg-background">
      <h2 className="text-lg font-semibold mb-4">Export Accessibility Issues</h2>
      <div className="space-y-4">
          <div>
            <Label>Export Format</Label>
            <Select
              value={exportFormat}
              onValueChange={(v: string) => setExportFormat(v as 'jira'|'csv'|'json')}
            >
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
                  {violationTypes.map(({ type, count }) => (
                <div key={type} className="flex items-center space-x-2">
                  <input
                    id={type}
                    name="violation"
                    type="radio"
                    className="h-4 w-4"
                    checked={selectedViolation === type}
                    onChange={() => setSelectedViolation(type)}
                  />
                  <Label htmlFor={type} className="flex-1 cursor-pointer">
                    {type} ({count} occurrences)
                  </Label>
                </div>
              ))}
            </div>
          </div>
      </div>
      <div className="flex space-x-4 mt-4">
        <Button
          onClick={() => handleExport(violationTypes.map(v => v.type))}
          disabled={isExporting}
        >
          {isExporting ? 'Exporting...' : 'Export All Issue Types'}
        </Button>
        <Button
          onClick={() => selectedViolation && handleExport([selectedViolation])}
          disabled={!selectedViolation || isExporting}
        >
          {isExporting
            ? 'Exporting...'
            : selectedViolation
            ? `Export ${selectedViolation}`
            : 'Select a violation'}
        </Button>
      </div>
    </div>
  );
}