import fs from 'fs/promises';
import path from 'path';
import { ScanReport } from '@accessibility-scanner/shared';

export class ReportGenerator {
  /**
   * Writes the report to the provided output directory.  A JSON file
   * containing the raw report is always written.  A very basic HTML
   * summary is also generated so the results can be opened in a
   * browser without any additional tooling.
   */
  async generateReport(report: ScanReport, outputDir: string) {
    await fs.mkdir(outputDir, { recursive: true });

    const jsonPath = path.join(outputDir, `report-${report.id}.json`);
    await fs.writeFile(jsonPath, JSON.stringify(report, null, 2));

    const htmlContent = this.buildHtml(report);
    const htmlPath = path.join(outputDir, `report-${report.id}.html`);
    await fs.writeFile(htmlPath, htmlContent);
  }

  private buildHtml(report: ScanReport) {
    // trivial HTML that just dumps the JSON inside a <pre>.  It keeps the
    // output folder self‑contained and readable by anyone who just needs a
    // quick snapshot.
    const safeJson = JSON.stringify(report, null, 2).replace(/</g, '&lt;');

    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Accessibility Scan ${report.id}</title>
  <style>body{font-family:system-ui, sans-serif;margin:1rem;white-space:pre-wrap}</style>
</head>
<body>
  <h1>Scan Report</h1>
  <pre>${safeJson}</pre>
</body>
</html>`;
  }
}
