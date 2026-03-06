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
    return data.reports;
  }

  async getReport(id: string): Promise<ScanReport | undefined> {
    const data = await this.read();
    return data.reports.find((r) => r.id === id);
  }

  /**
   * Removes all stored reports. Useful when you only need a
   * single snapshot and want to start fresh between runs.
   */
  async clearReports(): Promise<void> {
    await this.write({ reports: [] });
  }
}