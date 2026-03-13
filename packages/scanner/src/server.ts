import express from 'express';
import cors from 'cors';
import { EventEmitter } from 'events';
import { writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { DatabaseService } from './database.js';
import { Reporter } from './exporter.js';
import { SitemapScanner } from './scanner.js';
import { crawlSite } from './crawler.js';

const app = express();
const db = new DatabaseService();
const port = process.env.PORT || 3003;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ---------------------------------------------------------------------------
// In-memory job store for scan progress tracking
// ---------------------------------------------------------------------------

type JobStatus = 'pending' | 'crawling' | 'scanning' | 'complete' | 'error';

interface Job {
  emitter: EventEmitter;
  status: JobStatus;
  scanned: number;
  total: number;
  reportId?: string;
  error?: string;
}

const jobs = new Map<string, Job>();

function cleanupJob(jobId: string) {
  setTimeout(() => jobs.delete(jobId), 5 * 60 * 1000);
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

app.get('/api/reports', async (_req, res) => {
  const reports = await db.getReports();
  return res.json(reports);
});

app.get('/api/reports/:id', async (req, res) => {
  const report = await db.getReport(req.params.id);
  if (!report) {
    return res.status(404).json({ error: 'Report not found' });
  }
  return res.json(report);
});

app.delete('/api/reports', async (_req, res) => {
  try {
    await db.clearReports();
    return res.sendStatus(204);
  } catch (err) {
    console.error('Error clearing reports:', err);
    return res.status(500).json({ error: 'Failed to clear reports' });
  }
});

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

app.post('/api/reports/:id/export/csv', async (req, res) => {
  try {
    const report = await db.getReport(req.params.id);
    if (!report) return res.status(404).json({ error: 'Report not found' });
    const { selectedViolations, tasklistName } = req.body;
    const exporter = new Reporter();
    const csvData = exporter.exportToCsv(report, selectedViolations, tasklistName);
    res.header('Content-Type', 'text/csv');
    res.header('Content-Disposition', `attachment; filename="accessibility-export-${req.params.id}.csv"`);
    return res.send(csvData);
  } catch (error) {
    console.error('CSV export error:', error);
    return res.status(500).json({ error: 'CSV export failed' });
  }
});

app.post('/api/reports/:id/export/excel', async (req, res) => {
  try {
    const report = await db.getReport(req.params.id);
    if (!report) return res.status(404).json({ error: 'Report not found' });
    const { selectedViolations, tasklistName } = req.body;
    const exporter = new Reporter();
    const buffer = await exporter.exportToExcel(report, selectedViolations, tasklistName);
    res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.header('Content-Disposition', `attachment; filename="accessibility-export-${req.params.id}.xlsx"`);
    return res.send(buffer);
  } catch (error) {
    console.error('Excel export error:', error);
    return res.status(500).json({ error: 'Excel export failed' });
  }
});

// ---------------------------------------------------------------------------
// Scan — start a job and return its ID immediately
// ---------------------------------------------------------------------------

app.post('/api/scan', (req, res) => {
  const { sitemap, xmlContent, filename, crawlUrl, maxPages = 200, concurrent = 5 } = req.body;

  if (!sitemap && !xmlContent && !crawlUrl) {
    return res.status(400).json({ error: 'A sitemap URL, uploaded file, or crawl URL is required' });
  }

  if (crawlUrl) {
    try { new URL(crawlUrl); } catch {
      return res.status(400).json({ error: 'Invalid crawl URL' });
    }
  }

  const jobId = randomUUID();
  const emitter = new EventEmitter();
  const job: Job = { emitter, status: 'pending', scanned: 0, total: 0 };
  jobs.set(jobId, job);

  // Respond immediately so the client can open the SSE stream
  res.status(202).json({ jobId });

  // Run the scan asynchronously — intentionally not awaited
  void (async () => {
    let tempFile: string | null = null;

    try {
      let scannerOptions: Record<string, unknown> = {
        concurrent: String(concurrent),
        headless: true,
        onProgress: (scanned: number, total: number, url: string) => {
          job.scanned = scanned;
          job.total = total;
          emitter.emit('progress', { scanned, total, url });
        },
      };

      if (crawlUrl) {
        job.status = 'crawling';
        emitter.emit('crawling', {});

        const urls = await crawlSite(crawlUrl.trim(), { maxPages: Number(maxPages) });

        if (urls.length === 0) {
          job.status = 'error';
          job.error = 'No pages found when crawling that URL';
          emitter.emit('error', { message: job.error });
          return;
        }

        job.total = urls.length;
        scannerOptions = { ...scannerOptions, urls, label: crawlUrl.trim() };
      } else if (xmlContent) {
        const safeName = (filename || 'sitemap').replace(/[^a-z0-9._-]/gi, '_');
        tempFile = join(tmpdir(), `${randomUUID()}-${safeName}`);
        writeFileSync(tempFile, xmlContent, 'utf-8');
        scannerOptions = { ...scannerOptions, sitemap: tempFile };
      } else {
        scannerOptions = { ...scannerOptions, sitemap: sitemap.trim() };
      }

      job.status = 'scanning';
      emitter.emit('scanning', { total: job.total });

      const scanner = new SitemapScanner(scannerOptions);
      const report = await scanner.scan();
      await db.saveReport(report);

      job.status = 'complete';
      job.reportId = report.id;
      emitter.emit('complete', { reportId: report.id });
    } catch (err) {
      console.error('Scan error:', err);
      job.status = 'error';
      job.error = err instanceof Error ? err.message : 'Scan failed';
      emitter.emit('error', { message: job.error });
    } finally {
      if (tempFile) try { unlinkSync(tempFile); } catch { /* ignore */ }
      cleanupJob(jobId);
    }
  })();

  return;
});

// ---------------------------------------------------------------------------
// SSE — stream progress events for a running job
// ---------------------------------------------------------------------------

app.get('/api/scan/:jobId/events', (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (event: string, data: object) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  // Replay current state for late-connecting clients
  if (job.status === 'crawling') send('crawling', {});
  if (job.status === 'scanning') send('scanning', { total: job.total, scanned: job.scanned });
  if (job.status === 'complete') { send('complete', { reportId: job.reportId }); res.end(); return; }
  if (job.status === 'error')    { send('error', { message: job.error });         res.end(); return; }

  const onCrawling  = (d: object) => send('crawling', d);
  const onScanning  = (d: object) => send('scanning', d);
  const onProgress  = (d: object) => send('progress', d);
  const onComplete  = (d: object) => { send('complete', d); res.end(); };
  const onError     = (d: object) => { send('error', d);    res.end(); };

  job.emitter.on('crawling',  onCrawling);
  job.emitter.on('scanning',  onScanning);
  job.emitter.on('progress',  onProgress);
  job.emitter.on('complete',  onComplete);
  job.emitter.on('error',     onError);

  req.on('close', () => {
    job.emitter.off('crawling',  onCrawling);
    job.emitter.off('scanning',  onScanning);
    job.emitter.off('progress',  onProgress);
    job.emitter.off('complete',  onComplete);
    job.emitter.off('error',     onError);
  });

  return;
});

// ---------------------------------------------------------------------------

app.listen(port, () => {
  console.log(`API server running on port ${port}`);
});
