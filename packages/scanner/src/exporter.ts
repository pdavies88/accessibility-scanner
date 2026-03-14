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
  exportToCsv(report: ScanReport, selectedViolations?: string[], tasklistName?: string): string {
    const rows = this.buildRows(report, selectedViolations, tasklistName);

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
  async exportToExcel(report: ScanReport, selectedViolations?: string[], tasklistName?: string): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Accessibility');

    const rows = this.buildRows(report, selectedViolations, tasklistName);
    rows.forEach((row: string[]) => {
      sheet.addRow(row);
    });

    // exceljs returns a Uint8Array/Buffer-like object; normalize to Node Buffer
    const buf = await workbook.xlsx.writeBuffer();
    return Buffer.from(buf as ArrayBuffer);
  }

  private buildRows(report: ScanReport, selectedViolations?: string[], tasklistName?: string): string[][] {
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
      tasklistName?.trim() || 'Accessibility Updates',
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
      { violation: AxeViolation; pageNodes: Array<{ url: string; html: string }>; count: number }
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
            group.pageNodes.push({ url: result.url, html: node.html });
            group.count++;
          });
        });
    });

    violationGroups.forEach(({ violation, pageNodes, count }) => {
      // deduplicate by url+html
      const seen = new Set<string>();
      const uniqueEntries = pageNodes.filter(p => {
        const key = `${p.url}||${p.html}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      // if there are too many nodes, strip HTML and only keep unique urls
      const pagesForDescription: Array<{ url: string; html: string }> =
        uniqueEntries.length > 100
          ? [...new Set(uniqueEntries.map(p => p.url))].map(url => ({ url, html: '' }))
          : uniqueEntries;

      const firstSnippet = uniqueEntries[0]?.html ?? '';

      const descriptionMarkdown = this.buildDescriptionMarkdown(
        violation,
        pagesForDescription,
        count,
        firstSnippet
      );

      const resolvedTasklist = tasklistName?.trim() || 'Accessibility Updates';
      const wcagTags = this.wcagCriteriaTags(violation.tags);
      const severityTag = this.severityTag(violation.impact);
      const level = violation.level ?? 'best-practice';
      const levelTag = level !== 'best-practice' ? level : 'Best Practice';
      const tags = ['Accessibility', severityTag, levelTag, 'Automated'].join(', ');

      const firstCriterion = wcagTags[0]?.replace('WCAG ', '') ?? '';
      const taskName = firstCriterion
        ? `${firstCriterion} ${violation.help} | ${level !== 'best-practice' ? level : 'BP'}`
        : `${violation.help} | ${level !== 'best-practice' ? level : 'BP'}`;

      const row: string[] = [];
      row[0] = resolvedTasklist;
      row[1] = taskName;
      row[2] = descriptionMarkdown;
      // D-H stay empty (indices 3..7)
      row[8] = tags;    // column I
      row[9] = 'Active'; // column J

      rows.push(row);
    });

    return rows;
  }

  private wcagCriteriaTags(tags: string[]): string[] {
    return tags
      .filter(t => /^wcag\d{3,}$/.test(t))
      .map(t => {
        const d = t.replace('wcag', '');
        return `WCAG ${d[0]}.${d[1]}.${d.slice(2)}`;
      });
  }

  private severityTag(impact: AxeViolation['impact']): string {
    const map: Record<AxeViolation['impact'], string> = {
      critical: 'Critical Issue',
      serious:  'Major Issue',
      moderate: 'Medium Issue',
      minor:    'Minor Issue',
    };
    return map[impact] ?? 'Minor Issue';
  }

  private buildDescriptionMarkdown(
    violation: AxeViolation,
    pages: Array<{ url: string; html: string }>,
    totalInstances: number,
    firstSnippet: string = ''
  ): string {
    const moreNote = pages.length > 200
      ? '\n- **Please see dashboard for more URLs**'
      : '';
    const displayedPages = pages.length > 200 ? pages.slice(0, 200) : pages;

    const severity = this.severityTag(violation.impact);

    return `### 1. Describe the Issue

> to be completed by the **Auditor**

**a. Description of Issue**

> ${violation.description}

**b. Level of Severity**

> tag the task with level of severity: **${severity}**
> provide more detail for the level of severity decision

**c. Code Snippet**

> Add a code snippet for the section that is failing, if applicable.
> *Only one example is needed, as long as it conveys the issue appropriately.*

\`\`\`html
${firstSnippet || 'code snippet'}
\`\`\`

**d. Screenshot of Affected Area**

> Take a screenshot of the portion of the page that best demonstrates the issue.
> *Only one example is needed, as long as it conveys the issue appropriately.*

**e. Affected Pages (${totalInstances})**

${displayedPages.map(p => {
      if (!p.html) return `> ${p.url}`;
      return `> ${p.url}\n> \`\`\`html\n> ${p.html}\n> \`\`\``;
    }).join('\n\n')}${moreNote}

---

### 2. Remediation

> This can either be completed by the **Auditor** or the **Remediator**

> **${violation.help}**
>
> For more information: ${violation.helpUrl}
>
> *Replace with the steps it will take to fix this issue*

---

### 3. Steps to QA

> This is typically completed by the **Remediator**

> *Replace with steps on how to validate this issue has been resolved*

---

### 4. Recommend Assigning Remediation To

> *Select one or more*
> - [ ] Content
> - [ ] Design
> - [ ] Engineer
`;
  }

}
