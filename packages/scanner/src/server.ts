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
import { createDefaultChecks, ManualAudit, ManualAuditStatus, ManualCheckResult } from '@accessibility-scanner/shared';

const app = express();
const db = new DatabaseService();
const port = process.env.PORT || 3003;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ---------------------------------------------------------------------------
// In-memory job store for scan progress tracking
// ---------------------------------------------------------------------------

type JobStatus = 'pending' | 'crawling' | 'scanning' | 'complete' | 'error' | 'aborted';

interface Job {
  emitter: EventEmitter;
  status: JobStatus;
  scanned: number;
  total: number;
  reportId?: string;
  error?: string;
  abortController: AbortController;
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

app.delete('/api/reports/:id', async (req, res) => {
  try {
    const deleted = await db.deleteReport(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Report not found' });
    return res.sendStatus(204);
  } catch (err) {
    console.error('Error deleting report:', err);
    return res.status(500).json({ error: 'Failed to delete report' });
  }
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
// Manual Audit
// ---------------------------------------------------------------------------

function initManualAudit(): ManualAudit {
  return {
    lastUpdated: new Date().toISOString(),
    checks: createDefaultChecks(),
  };
}

// PATCH /api/reports/:reportId/pages/:pageId/manual-audit/checks/:checkId
app.patch('/api/reports/:reportId/pages/:pageId/manual-audit/checks/:checkId', async (req, res) => {
  try {
    const report = await db.getReport(req.params.reportId);
    if (!report) return res.status(404).json({ error: 'Report not found' });

    const page = report.results.find(r => r.id === req.params.pageId);
    if (!page) return res.status(404).json({ error: 'Page not found' });

    if (!page.manualAudit) page.manualAudit = initManualAudit();

    const { status, notes } = req.body as { status: ManualAuditStatus; notes?: string };
    const check = page.manualAudit.checks.find(c => c.id === req.params.checkId);
    if (check) {
      check.status = status;
      if (notes !== undefined) check.notes = notes;
      check.updatedAt = new Date().toISOString();
    }
    page.manualAudit.lastUpdated = new Date().toISOString();

    await db.updateReport(report);
    return res.json({ manualAudit: page.manualAudit });
  } catch (err) {
    console.error('Manual audit update error:', err);
    return res.status(500).json({ error: 'Failed to update check' });
  }
});

// POST /api/reports/:reportId/pages/:pageId/manual-audit/checks
app.post('/api/reports/:reportId/pages/:pageId/manual-audit/checks', async (req, res) => {
  try {
    const report = await db.getReport(req.params.reportId);
    if (!report) return res.status(404).json({ error: 'Report not found' });

    const page = report.results.find(r => r.id === req.params.pageId);
    if (!page) return res.status(404).json({ error: 'Page not found' });

    if (!page.manualAudit) page.manualAudit = initManualAudit();

    const { title, description, impact, status, notes } = req.body as Partial<ManualCheckResult>;
    if (!title) return res.status(400).json({ error: 'title is required' });

    const newCheck: ManualCheckResult = {
      id: randomUUID(),
      type: 'custom',
      title,
      description,
      impact,
      status: status ?? 'not-tested',
      notes,
      updatedAt: new Date().toISOString(),
    };
    page.manualAudit.checks.push(newCheck);
    page.manualAudit.lastUpdated = new Date().toISOString();

    await db.updateReport(report);
    return res.status(201).json({ manualAudit: page.manualAudit });
  } catch (err) {
    console.error('Add custom check error:', err);
    return res.status(500).json({ error: 'Failed to add custom check' });
  }
});

// DELETE /api/reports/:reportId/pages/:pageId/manual-audit/checks/:checkId
app.delete('/api/reports/:reportId/pages/:pageId/manual-audit/checks/:checkId', async (req, res) => {
  try {
    const report = await db.getReport(req.params.reportId);
    if (!report) return res.status(404).json({ error: 'Report not found' });

    const page = report.results.find(r => r.id === req.params.pageId);
    if (!page || !page.manualAudit) return res.status(404).json({ error: 'Page or audit not found' });

    const check = page.manualAudit.checks.find(c => c.id === req.params.checkId);
    if (!check) return res.status(404).json({ error: 'Check not found' });
    if (check.type !== 'custom') return res.status(400).json({ error: 'Only custom checks can be deleted' });

    page.manualAudit.checks = page.manualAudit.checks.filter(c => c.id !== req.params.checkId);
    page.manualAudit.lastUpdated = new Date().toISOString();

    await db.updateReport(report);
    return res.sendStatus(204);
  } catch (err) {
    console.error('Delete custom check error:', err);
    return res.status(500).json({ error: 'Failed to delete check' });
  }
});

// PATCH /api/reports/:reportId/pages/:pageId/manual-audit
app.patch('/api/reports/:reportId/pages/:pageId/manual-audit', async (req, res) => {
  try {
    const report = await db.getReport(req.params.reportId);
    if (!report) return res.status(404).json({ error: 'Report not found' });

    const page = report.results.find(r => r.id === req.params.pageId);
    if (!page) return res.status(404).json({ error: 'Page not found' });

    if (!page.manualAudit) page.manualAudit = initManualAudit();

    const { auditorNotes } = req.body as { auditorNotes?: string };
    page.manualAudit.auditorNotes = auditorNotes;
    page.manualAudit.lastUpdated = new Date().toISOString();

    await db.updateReport(report);
    return res.json({ manualAudit: page.manualAudit });
  } catch (err) {
    console.error('Auditor notes update error:', err);
    return res.status(500).json({ error: 'Failed to update auditor notes' });
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
  const abortController = new AbortController();
  const job: Job = { emitter, status: 'pending', scanned: 0, total: 0, abortController };
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
        signal: abortController.signal,
        onProgress: (scanned: number, total: number, url: string) => {
          job.scanned = scanned;
          job.total = total;
          emitter.emit('progress', { scanned, total, url });
        },
      };

      if (crawlUrl) {
        job.status = 'crawling';
        emitter.emit('crawling', {});

        const urls = await crawlSite(crawlUrl.trim(), {
          maxPages: Number(maxPages),
          onProgress: (url, count) => emitter.emit('crawl-progress', { url, count }),
          signal: abortController.signal,
        });

        if (abortController.signal.aborted) {
          job.status = 'aborted';
          emitter.emit('aborted', {});
          return;
        }

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

      if (abortController.signal.aborted) {
        job.status = 'aborted';
        emitter.emit('aborted', {});
        return;
      }

      await db.saveReport(report);
      job.status = 'complete';
      job.reportId = report.id;
      emitter.emit('complete', { reportId: report.id });
    } catch (err) {
      if (abortController.signal.aborted) {
        job.status = 'aborted';
        emitter.emit('aborted', {});
      } else {
        console.error('Scan error:', err);
        job.status = 'error';
        job.error = err instanceof Error ? err.message : 'Scan failed';
        emitter.emit('error', { message: job.error });
      }
    } finally {
      if (tempFile) try { unlinkSync(tempFile); } catch { /* ignore */ }
      cleanupJob(jobId);
    }
  })();

  return;
});

// ---------------------------------------------------------------------------
// Abort a running job
// ---------------------------------------------------------------------------

app.delete('/api/scan/:jobId', (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  job.abortController.abort();
  return res.sendStatus(204);
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
  if (job.status === 'aborted')  { send('aborted', {});                          res.end(); return; }
  if (job.status === 'error')    { send('error', { message: job.error });         res.end(); return; }

  const onCrawling      = (d: object) => send('crawling', d);
  const onCrawlProgress = (d: object) => send('crawl-progress', d);
  const onScanning      = (d: object) => send('scanning', d);
  const onProgress      = (d: object) => send('progress', d);
  const onComplete      = (d: object) => { send('complete', d); res.end(); };
  const onAborted       = (d: object) => { send('aborted', d);  res.end(); };
  const onError         = (d: object) => { send('error', d);    res.end(); };

  job.emitter.on('crawling',       onCrawling);
  job.emitter.on('crawl-progress', onCrawlProgress);
  job.emitter.on('scanning',       onScanning);
  job.emitter.on('progress',       onProgress);
  job.emitter.on('complete',       onComplete);
  job.emitter.on('aborted',        onAborted);
  job.emitter.on('error',          onError);

  req.on('close', () => {
    job.emitter.off('crawling',       onCrawling);
    job.emitter.off('crawl-progress', onCrawlProgress);
    job.emitter.off('scanning',       onScanning);
    job.emitter.off('progress',       onProgress);
    job.emitter.off('complete',       onComplete);
    job.emitter.off('aborted',        onAborted);
    job.emitter.off('error',          onError);
  });

  return;
});

// ---------------------------------------------------------------------------

app.listen(port, () => {
  console.log(`API server running on port ${port}`);
});
