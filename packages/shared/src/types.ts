export interface ScanResult {
  id: string;
  url: string;
  timestamp: Date;
  violations: AxeViolation[];
  passes: number;
  incomplete: number;
  inapplicable: number;
}

export interface AxeViolation {
  id: string;
  impact: 'minor' | 'moderate' | 'serious' | 'critical';
  description: string;
  help: string;
  helpUrl: string;
  tags: string[];
  /**
   * Convenience field derived from `tags` that normalizes the
   * WCAG level (A / AA / AAA) for display and summarization.
   * May be undefined if the scanner didn't compute it.
   */
  level?: 'A' | 'AA' | 'AAA' | 'unknown';
  nodes: ViolationNode[];
}

export interface ViolationNode {
  html: string;
  target: string[];
  failureSummary: string;
}

export interface ScanReport {
  id: string;
  sitemap: string;
  startTime: Date;
  endTime: Date;
  results: ScanResult[];
  summary: {
    totalPages: number;
    totalViolations: number;
    violationsByImpact: Record<string, number>;
    violationsByType: Record<string, number>;
    /** aggregated counts by WCAG level (A/AA/AAA) */
    violationsByLevel: Record<string, number>;
  };
}

