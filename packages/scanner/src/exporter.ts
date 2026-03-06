import { ScanReport, AxeViolation } from '@accessibility-scanner/shared';
import ExcelJS from 'exceljs';

/**
 * Export helpers that produce CSV/Excel payloads matching the layout
 * expected by the customer.  The sheet/CSV is deliberately modeled after
 * the sample that was attached to the original request:
 *
 *   TASKLIST,TASK,DESCRIPTION,ASSIGN TO,START DATE,DUE DATE,PRIORITY,
 *   ESTIMATED TIME,TAGS,STATUS
 *
 * The exporter will produce one row per violation type; each row contains
 * markdown-friendly text in the description column so that callers can
 * import the file into a system that understands markdown (Teamwork, etc.)
 *
 */
export class Reporter {
  /**
   * Return a CSV string that can be written to disk or streamed to the
   * client.  The output is quoted so that fields containing commas or
   * newlines are preserved; description text may contain Markdown and
   * will typically span multiple lines.
   */
  exportToCsv(report: ScanReport, selectedViolations?: string[]): string {
    const rows: string[][] = [];

    // header row matching sample file
    rows.push([
      'TASKLIST',
      'TASK',
      'DESCRIPTION',
      'ASSIGN TO',
      'START DATE',
      'DUE DATE',
      'PRIORITY',
      'ESTIMATED TIME',
      'TAGS',
      'STATUS'
    ]);

    const violationGroups = new Map<string, { violation: AxeViolation; pages: string[]; count: number }>();

    report.results.forEach(result => {
      result.violations
        .filter(v => !selectedViolations || selectedViolations.includes(v.id))
        .forEach(violation => {
          if (!violationGroups.has(violation.id)) {
            violationGroups.set(violation.id, {
              violation,
              pages: [],
              count: 0
            });
          }
          const group = violationGroups.get(violation.id)!;
          group.pages.push(result.url);
          group.count++;
        });
    });

    violationGroups.forEach(({ violation, pages, count }) => {
      const uniquePages = [...new Set(pages)];
      const descriptionMarkdown = this.buildDescriptionMarkdown(
        violation,
        uniquePages,
        count
      );

      rows.push([
        'Accessibility', // arbitrary task list name
        violation.help,
        descriptionMarkdown.replace(/"/g, '""'), // escape quotes for CSV
        '', // assign to
        '', // start date
        '', // due date
        this.mapImpactToPriority(violation.impact),
        '', // estimated time
        violation.tags.join('; '),
        'Active'
      ]);
    });

    return rows
      .map(row =>
        row
          .map(cell =>
            cell.includes(',') || cell.includes('"') || cell.includes('\n')
              ? `"${cell}"`
              : cell
          )
          .join(',')
      )
      .join('\n');
  }

  /**
   * Produce an xlsx workbook buffer suitable for writing to disk or
   * streaming back to an HTTP client.  The sheet uses the same headers
   * as the CSV export and leaves all styling up to the caller (no fancy
   * formatting is performed).
   */
  async exportToExcel(report: ScanReport, selectedViolations?: string[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Accessibility');

    // header row
    sheet.addRow([
      'TASKLIST',
      'TASK',
      'DESCRIPTION',
      'ASSIGN TO',
      'START DATE',
      'DUE DATE',
      'PRIORITY',
      'ESTIMATED TIME',
      'TAGS',
      'STATUS'
    ]);

    const csvString = this.exportToCsv(report, selectedViolations);
    // reuse csv export for row generation: skip header line
    const lines = csvString.split('\n').slice(1);
    lines.forEach(line => {
      // naive CSV parsing, since we know we just produced it
      const cells = [] as string[];
      let current = '';
      let inQuote = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQuote && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuote = !inQuote;
          }
        } else if (ch === ',' && !inQuote) {
          cells.push(current);
          current = '';
        } else {
          current += ch;
        }
      }
      cells.push(current);
      sheet.addRow(cells);
    });

    // exceljs returns a Uint8Array/Buffer-like object; normalize to Node Buffer
    const buf = await workbook.xlsx.writeBuffer();
    return Buffer.from(buf as ArrayBuffer);
  }

  private buildDescriptionMarkdown(
    violation: AxeViolation,
    pages: string[],
    totalInstances: number
  ): string {
    return `## Accessibility Violation

**Description:** ${violation.description}

**Help:** ${violation.help}

**Impact:** ${violation.impact}

**Total Instances:** ${totalInstances}

**WCAG Tags:** ${violation.tags.join(', ')}

**More Information:** ${violation.helpUrl}

## Affected Pages (${pages.length})

${pages.map(p => `- ${p}`).join('\n')}

`;
  }

  private mapImpactToPriority(impact: string): string {
    const mapping: Record<string, string> = {
      critical: 'Highest',
      serious: 'High',
      moderate: 'Medium',
      minor: 'Low'
    };
    return mapping[impact] || 'Medium';
  }
}
