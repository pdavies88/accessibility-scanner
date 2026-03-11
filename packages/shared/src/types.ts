export interface ScanResult {
  id: string;
  url: string;
  timestamp: Date;
  /**
   * metadata about the environment in which the page was scanned
   * (user agent, viewport, axe version, etc.)
   */
  environment?: {
    browser: string;
    viewport: string;
    axeVersion: string;
  };
  violations: AxeViolation[];
  /**
   * incomplete results returned by axe; the shape mirrors what the
   * scanner now produces when a check is incomplete.
   */
  incomplete: IncompleteResult[];
  /**
   * summary counts produced per-page (in addition to the global report
   * summary).  These are convenience values calculated by the scanner.
   */
  summary: {
    violationsCount: number;
    passesCount: number;
    incompleteCount: number;
    inapplicableCount: number;
  };
  /**
   * list of rule ids that passed on the page (for quick filtering)
   */
  passedRules: string[];
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
  level?: 'A' | 'AA' | 'AAA' | 'best-practice';
  nodes: ViolationNode[];
}

export interface ViolationNode {
  html: string;
  target: string[];
  failureSummary: string;
  /**
   * optional raw data field supplied by axe; may include rule-specific
   * information that can help debugging
   */
  data?: any;
  /**
   * additional nodes related to the primary target (e.g. <label> for a
   * form control)
   */
  relatedNodes?: {
    html: string;
    target: string[];
  }[];
}

export interface IncompleteResult {
  id: string;
  impact: 'minor' | 'moderate' | 'serious' | 'critical';
  description: string;
  help: string;
  nodes: {
    html: string;
    target: string[];
    explanation?: string;
  }[];
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

