import path from 'path';
import fs from 'fs';
import { ScanReport } from '@accessibility-scanner/shared';
import { JSONFilePreset } from 'lowdb/node';

interface DatabaseSchema {
  reports: ScanReport[];
}

export class DatabaseService {
  private db?: Awaited<ReturnType<typeof JSONFilePreset<DatabaseSchema>>>;

  constructor(private dbPath?: string) {}

  private async ensureDb() {
    if (this.db) return;

    const file =
      this.dbPath || path.join(process.cwd(), 'data', 'reports.json');
    const dir = path.dirname(file);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const defaultData: DatabaseSchema = { reports: [] };
    this.db = await JSONFilePreset<DatabaseSchema>(file, defaultData);
  }

  async saveReport(report: ScanReport): Promise<void> {
    await this.ensureDb();
    const stored: any = {
      ...report,
      startTime: report.startTime.toISOString(),
      endTime: report.endTime.toISOString(),
      results: report.results.map((r) => ({
        ...r,
        timestamp: r.timestamp.toISOString(),
      })),
    };

    await this.db!.update((data) => {
      data.reports.push(stored as any);
      return data;
    });
  }

  async getReports(): Promise<ScanReport[]> {
    await this.ensureDb();
    return this.db!.data.reports.map(this.deserializeReport);
  }

  async getReport(id: string): Promise<ScanReport | undefined> {
    await this.ensureDb();
    const found = this.db!.data.reports.find((r) => r.id === id);
    return found ? this.deserializeReport(found) : undefined;
  }

  /**
   * Removes all stored reports. Useful when you only need a
   * single snapshot and want to start fresh between runs.
   */
  async clearReports(): Promise<void> {
    await this.ensureDb();
    this.db!.data.reports = [];
    await this.db!.write();
  }

  private deserializeReport(raw: any): ScanReport {
    return {
      ...raw,
      startTime: new Date(raw.startTime),
      endTime: new Date(raw.endTime),
      results: raw.results.map((r: any) => ({
        ...r,
        timestamp: new Date(r.timestamp),
      })),
    };
  }
}
