import express from 'express';
import cors from 'cors';
import { DatabaseService } from './database';
import { JiraExporter } from './jira-exporter';

const app = express();
const db = new DatabaseService();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Get all reports
app.get('/api/reports', async (req, res) => {
  const reports = await db.getReports();
  res.json(reports);
});

// Get single report
app.get('/api/reports/:id', async (req, res) => {
  const report = await db.getReport(req.params.id);
  if (!report) {
    return res.status(404).json({ error: 'Report not found' });
  }
  res.json(report);
});

// Remove all reports (useful when data is only a transient snapshot)
app.delete('/api/reports', async (req, res) => {
  try {
    await db.clearReports();
    res.sendStatus(204);
  } catch (err) {
    console.error('Error clearing reports:', err);
    res.status(500).json({ error: 'Failed to clear reports' });
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
      results: report.results.map(result => ({
        ...result,
        violations: result.violations.filter(v => 
          selectedViolations.includes(v.id)
        )
      }))
    } : report;
    
    const exports = exporter.exportReport(filteredReport);
    res.json(exports);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Export failed' });
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
    res.send(csvData);
  } catch (error) {
    console.error('CSV export error:', error);
    res.status(500).json({ error: 'CSV export failed' });
  }
});

app.listen(port, () => {
  console.log(`API server running on port ${port}`);
});