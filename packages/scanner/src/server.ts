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

// Export report for Jira
app.post('/api/reports/:id/export', async (req, res) => {
  const report = await db.getReport(req.params.id);
  if (!report) {
    return res.status(404).json({ error: 'Report not found' });
  }
  
  const exporter = new JiraExporter();
  const exports = exporter.exportReport(report);
  res.json(exports);
});

app.listen(port, () => {
  console.log(`API server running on port ${port}`);
});