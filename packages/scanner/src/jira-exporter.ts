import { ScanReport, JiraExport, AxeViolation } from '@accessibility-scanner/shared';

export class JiraExporter {
  exportReport(report: ScanReport): JiraExport[] {
    const exports: JiraExport[] = [];
    
    // Group violations by type
    const violationGroups = new Map<string, AxeViolation[]>();
    
    report.results.forEach(result => {
      result.violations.forEach(violation => {
        if (!violationGroups.has(violation.id)) {
          violationGroups.set(violation.id, []);
        }
        violationGroups.get(violation.id)!.push(violation);
      });
    });

    // Create Jira tickets for each violation type
    violationGroups.forEach((violations, violationId) => {
      const firstViolation = violations[0];
      const affectedPages = report.results
        .filter(r => r.violations.some(v => v.id === violationId))
        .map(r => r.url);

      exports.push({
        summary: `Accessibility: ${firstViolation.help}`,
        description: this.generateDescription(
          firstViolation, 
          affectedPages, 
          violations.length
        ),
        issueType: 'Bug',
        priority: this.mapImpactToPriority(firstViolation.impact),
        labels: ['accessibility', 'a11y', ...firstViolation.tags],
        customFields: {
          violationId: violationId,
          impact: firstViolation.impact,
          affectedPages: affectedPages.length
        }
      });
    });

    return exports;
  }

  private generateDescription(
    violation: AxeViolation, 
    affectedPages: string[], 
    totalInstances: number
  ): string {
    return `
## Accessibility Violation

**Description:** ${violation.description}

**Help:** ${violation.help}

**Impact:** ${violation.impact}

**Total Instances:** ${totalInstances}

**WCAG Tags:** ${violation.tags.join(', ')}

**More Information:** ${violation.helpUrl}

## Affected Pages (${affectedPages.length})

${affectedPages.slice(0, 10).map(url => `- ${url}`).join('\n')}
${affectedPages.length > 10 ? `\n... and ${affectedPages.length - 10} more pages` : ''}

## Example HTML

\`\`\`html
${violation.nodes[0]?.html || 'No HTML example available'}
\`\`\`

## How to Fix

Please refer to the help URL above for detailed remediation guidance.
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

exportToCsv(report: ScanReport, selectedViolations?: string[]): string {
    const rows: string[][] = [];
    
    // Headers
    rows.push([
      'Issue Type',
      'Summary',
      'Description',
      'Impact',
      'WCAG Criteria',
      'Affected Pages',
      'Occurrences'
    ]);

    // Group violations by type
    const violationGroups = new Map<string, {
      violation: AxeViolation;
      pages: string[];
      count: number;
    }>();
    
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

    // Create CSV rows
    violationGroups.forEach(({ violation, pages, count }) => {
      rows.push([
        'Bug',
        violation.help,
        violation.description.replace(/"/g, '""'), // Escape quotes
        violation.impact,
        violation.tags.join('; '),
        `${[...new Set(pages)].length}`,
        count.toString()
      ]);
    });

    // Convert to CSV string
    return rows.map(row => 
      row.map(cell => 
        cell.includes(',') || cell.includes('"') || cell.includes('\n') 
          ? `"${cell}"` 
          : cell
      ).join(',')
    ).join('\n');
  }  
}