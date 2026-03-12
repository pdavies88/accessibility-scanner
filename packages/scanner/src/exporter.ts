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
    const rows = this.buildRows(report, selectedViolations);

    return rows
      .map((row: string[]) =>
        row
          .map((cell: string) =>
            cell.includes(',') || cell.includes('"') || cell.includes('\n')
              ? `"${cell.replace(/"/g, '""')}"`
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

    const rows = this.buildRows(report, selectedViolations);
    rows.forEach((row: string[]) => {
      sheet.addRow(row);
    });

    // exceljs returns a Uint8Array/Buffer-like object; normalize to Node Buffer
    const buf = await workbook.xlsx.writeBuffer();
    return Buffer.from(buf as ArrayBuffer);
  }

  private buildRows(report: ScanReport, selectedViolations?: string[]): string[][] {
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

    // metadata row (row 2 in spreadsheet)
    rows.push([
      'Accessibility Updates',
      '',
      'Required Accessibility Updates',
      '',
      '',
      '',
      '',
      '',
      '',
      ''
    ]);

    // map violation ID to grouped data including html snippets
    const violationGroups = new Map<
      string,
      { violation: AxeViolation; pageNodes: string[]; count: number }
    >();

    report.results.forEach(result => {
      result.violations
        .filter(v => !selectedViolations || selectedViolations.includes(v.id))
        .forEach(violation => {
          if (!violationGroups.has(violation.id)) {
            violationGroups.set(violation.id, {
              violation,
              pageNodes: [],
              count: 0
            });
          }
          const group = violationGroups.get(violation.id)!;

          // each node represents a specific HTML snippet on the page
          violation.nodes.forEach(node => {
            group.pageNodes.push(`${result.url} - \`${node.html}\``);
            group.count++;
          });
        });
    });

    violationGroups.forEach(({ violation, pageNodes, count }) => {
      const uniqueEntries = [...new Set(pageNodes)];

      // if there are too many nodes, strip HTML and only keep urls
      const pagesForDescription =
        uniqueEntries.length > 100
          ? // keep only the URL portion (before the first ' - ')
            [...new Set(uniqueEntries.map(p => p.split(' - ')[0]))]
          : uniqueEntries;

      const descriptionMarkdown = this.buildDescriptionMarkdown(
        violation,
        pagesForDescription,
        count
      );

      const row: string[] = [];
      row[0] = ''; // column A blank for data rows
      row[1] = violation.help;
      row[2] = descriptionMarkdown;
      // D-H stay empty (indices 3..7)
      row[8] = 'Accessibility'; // column I
      row[9] = 'Active'; // column J

      rows.push(row);
    });

    return rows;
  }

  private buildDescriptionMarkdown(
    violation: AxeViolation,
    pages: string[],
    totalInstances: number
  ): string {
    // if there are too many pages, only list the first 200 and add a note
    const moreNote = pages.length > 200 ?
      '\n- **Please see dashboard for more URLs**' : '';

    const displayedPages = pages.length > 200 ? pages.slice(0, 200) : pages;

    return `## Accessibility Violation

**Description:** ${violation.description}

**Help:** ${violation.help}

**Impact:** ${violation.impact}

**Total Instances:** ${totalInstances}

**WCAG Tags:** ${violation.tags.join(', ')}

**More Information:** ${violation.helpUrl}

## Affected Pages (${pages.length})

${displayedPages.map(p => `- ${p}`).join('\n')}${moreNote}

`;
  }

}
