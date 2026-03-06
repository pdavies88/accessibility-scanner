import express from 'express';
import cors from 'cors';
import { DatabaseService } from './database.js';
import { Reporter } from './exporter.js';

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

// CSV export endpoint
app.post('/api/reports/:id/export/csv', async (req, res) => {
  try {
    const report = await db.getReport(req.params.id);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const { selectedViolations } = req.body;
    const exporter = new Reporter();
    const csvData = exporter.exportToCsv(report, selectedViolations);

    res.header('Content-Type', 'text/csv');
    res.header('Content-Disposition', `attachment; filename="accessibility-export-${req.params.id}.csv"`);
    return res.send(csvData);
  } catch (error) {
    console.error('CSV export error:', error);
    return res.status(500).json({ error: 'CSV export failed' });
  }
});

// Excel export endpoint
app.post('/api/reports/:id/export/excel', async (req, res) => {
  try {
    const report = await db.getReport(req.params.id);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const { selectedViolations } = req.body;
    const exporter = new Reporter();
    const buffer = await exporter.exportToExcel(report, selectedViolations);

    res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.header('Content-Disposition', `attachment; filename="accessibility-export-${req.params.id}.xlsx"`);
    return res.send(buffer);
  } catch (error) {
    console.error('Excel export error:', error);
    return res.status(500).json({ error: 'Excel export failed' });
  }
});

app.listen(port, () => {
  console.log(`API server running on port ${port}`);
});