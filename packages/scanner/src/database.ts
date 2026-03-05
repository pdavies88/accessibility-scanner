import fs from 'fs/promises';
import path from 'path';
import { ScanReport } from '@accessibility-scanner/shared';

// This service used to wrap lowdb, but we no longer need a real
// database.  Reports are stored in a single JSON file on disk; the
// class provides a tiny layer to read/update it and to clear the
// contents.  The React dashboard reads the same file via the API.


interface Schema {
  reports: ScanReport[];
}

export class DatabaseService {
  private file: string;

  constructor(filePath?: string) {
    this.file =
      filePath || path.join(process.cwd(), 'data', 'reports.json');
  }

  private async ensureFile(): Promise<void> {
    const dir = path.dirname(this.file);
    await fs.mkdir(dir, { recursive: true });

    try {
      await fs.access(this.file);
    } catch {
      await fs.writeFile(this.file, JSON.stringify({ reports: [] }, null, 2));
    }
  }

  private async read(): Promise<Schema> {
    await this.ensureFile();
    const raw = await fs.readFile(this.file, 'utf-8');
    return JSON.parse(raw) as Schema;
  }

  private async write(data: Schema): Promise<void> {
    await fs.writeFile(this.file, JSON.stringify(data, null, 2));
  }

  async saveReport(report: ScanReport): Promise<void> {
    const data = await this.read();
    data.reports.push(report);
    await this.write(data);
  }

  async getReports(): Promise<ScanReport[]> {
    const data = await this.read();
    return data.reports.map(this.normalizeReport);
  }

  async getReport(id: string): Promise<ScanReport | undefined> {
    const data = await this.read();
    const found = data.reports.find((r) => r.id === id);
    return found ? this.normalizeReport(found) : undefined;
  }

  /**
   * Removes all stored reports. Useful when you only need a
   * single snapshot and want to start fresh between runs.
   */
  async clearReports(): Promise<void> {
    await this.write({ reports: [] });
  }

  /**
   * Ensure older reports have the fields introduced later (standard,
   * violationsByLevel, per-violation `level`).  This keeps the API from
   * breaking when the JSON file was created with an earlier version.
   */
  private normalizeReport(report: any): ScanReport {
    // standard may be missing but that's fine; keep whatever is present

    // backfill violation level tags on each result
    report.results = report.results || [];
    report.results.forEach((res: any) => {
      res.violations = res.violations || [];
      res.violations.forEach((v: any) => {
        if (!v.level && Array.isArray(v.tags)) {
          v.level = this.deriveLevel(v.tags);
        }
      });
    });

    // ensure summary object exists
    report.summary = report.summary || {
      totalPages: report.results.length,
      totalViolations: report.results.reduce((s: number, r: any) => s + (r.violations?.length || 0), 0),
      violationsByImpact: {},
      violationsByType: {},
      violationsByLevel: {}
    };

    if (!report.summary.violationsByLevel) {
      const byLevel: Record<string, number> = {};
      report.results.forEach((res: any) => {
        (res.violations || []).forEach((v: any) => {
          const lvl = v.level || this.deriveLevel(v.tags || []);
          byLevel[lvl] = (byLevel[lvl] || 0) + 1;
        });
      });
      report.summary.violationsByLevel = byLevel;
    }

    return report;
  }

  private deriveLevel(tags: string[]): 'A'|'AA'|'AAA'|'unknown' {
    for (const t of tags) {
      const m = t.match(/wcag[0-9.]*([a]{1,3})$/i);
      if (m) {
        const suffix = m[1].toUpperCase();
        if (suffix === 'AAA' || suffix === 'AA' || suffix === 'A') {
          return suffix as 'A'|'AA'|'AAA';
        }
      }
    }
    return 'unknown';
  }
}
