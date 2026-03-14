import { useState } from 'react';
import { ScanReport } from '@accessibility-scanner/shared';
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

interface ExportDataProps {
  report: ScanReport;
}

export function ExportData({ report }: ExportDataProps) {

  const [selectedViolation, setSelectedViolation] = useState<string | null>(null);
  const [exportFormat, setExportFormat] = useState<'csv' | 'excel'>('excel');
  const [tasklistName, setTasklistName] = useState('');
  const [fileName, setFileName] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (types: string[]) => {
    setIsExporting(true);
    try {
      if (exportFormat === 'csv') {
        const response = await fetch(`/api/reports/${report.id}/export/csv`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            selectedViolations: types,
            tasklistName: tasklistName.trim() || undefined,
          }),
        });
        const csvData = await response.text();
        const blob = new Blob([csvData], { type: 'text/csv' });
        const name = fileName.trim() || `accessibility-issues-${report.id}`;
        downloadFile(blob, `${name}.csv`);
      } else {
        // excel
        const response = await fetch(`/api/reports/${report.id}/export/excel`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            selectedViolations: types,
            tasklistName: tasklistName.trim() || undefined,
          }),
        });
        const arrayBuffer = await response.arrayBuffer();
        const blob = new Blob([arrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const name = fileName.trim() || `accessibility-issues-${report.id}`;
        downloadFile(blob, `${name}.xlsx`);
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
            <Label htmlFor="export-format">Export Format</Label>
            <Select
              value={exportFormat}
              onValueChange={(v: string) => setExportFormat(v as 'csv'|'excel')}
            >
              <SelectTrigger id="export-format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="excel">Teamwork (.xlsx)</SelectItem>
                <SelectItem value="csv">CSV (.csv)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="tasklist-name">Tasklist Name</Label>
            <Input
              id="tasklist-name"
              type="text"
              value={tasklistName}
              onChange={e => setTasklistName(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="file-name">File Name</Label>
            <Input
              id="file-name"
              type="text"
              value={fileName}
              onChange={e => setFileName(e.target.value)}
            />
          </div>

          <fieldset>
            <legend className="text-sm font-medium mb-2">Select Violations to Export</legend>
            <div className="border rounded-md p-4 max-h-64 overflow-y-auto space-y-2">
              {violationTypes.map(({ type, count }) => (
                <div key={type} className="flex items-center space-x-2">
                  <input
                    id={`violation-${type}`}
                    name="violation"
                    type="radio"
                    className="h-4 w-4"
                    checked={selectedViolation === type}
                    onChange={() => setSelectedViolation(type)}
                  />
                  <Label htmlFor={`violation-${type}`} className="flex-1 cursor-pointer">
                    {type} ({count} occurrences)
                  </Label>
                </div>
              ))}
            </div>
          </fieldset>
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