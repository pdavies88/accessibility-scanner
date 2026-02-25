import express from 'express';
import cors from 'cors';
import type { ScanResult, AxeViolation } from '@accessibility-scanner/shared';
import { DatabaseService } from './database.js';
import { JiraExporter } from './jira-exporter.js';

const app = express();
const db = new DatabaseService();
const port = process.env.PORT || 3003;

app.use(cors());
app.use(express.json());

// Get all reports
// `_req` is unused but required by Express typings.
app.get('/api/reports', async (_req, res) => {
  const reports = await db.getReports();
  return res.json(reports);
});

// Get single report
app.get('/api/reports/:id', async (req, res) => {
  const report = await db.getReport(req.params.id);
  if (!report) {
    return res.status(404).json({ error: 'Report not found' });
  }
  return res.json(report);
});

// Remove all reports (useful when data is only a transient snapshot)
app.delete('/api/reports', async (_req, res) => {
  try {
    await db.clearReports();
    return res.sendStatus(204);
  } catch (err) {
    console.error('Error clearing reports:', err);
    return res.status(500).json({ error: 'Failed to clear reports' });
  }
});

// Export endpoint for Jira
app.post('/api/reports/:id/export', async (req, res) => {
  try {
    const report = await db.getReport(req.params.id);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    const { selectedViolations } = req.body;
    const exporter = new JiraExporter();
    
    // Filter report to only include selected violations if provided
    const filteredReport = selectedViolations?.length > 0 ? {
      ...report,
      results: report.results.map((result: ScanResult) => ({
        ...result,
        violations: result.violations.filter((v: AxeViolation) => 
          selectedViolations.includes(v.id)
        )
      }))
    } : report;
    
    const exports = exporter.exportReport(filteredReport);
    return res.json(exports);
  } catch (error) {
    console.error('Export error:', error);
    return res.status(500).json({ error: 'Export failed' });
  }
});

// CSV export endpoint
app.post('/api/reports/:id/export/csv', async (req, res) => {
  try {
    const report = await db.getReport(req.params.id);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    const { selectedViolations } = req.body;
    const exporter = new JiraExporter();
    const csvData = exporter.exportToCsv(report, selectedViolations);
    
    res.header('Content-Type', 'text/csv');
    res.header('Content-Disposition', `attachment; filename="accessibility-export-${req.params.id}.csv"`);
    return res.send(csvData);
  } catch (error) {
    console.error('CSV export error:', error);
    return res.status(500).json({ error: 'CSV export failed' });
  }
});

app.listen(port, () => {
  console.log(`API server running on port ${port}`);
});