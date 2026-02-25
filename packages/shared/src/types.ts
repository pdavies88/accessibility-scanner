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
  };
}

export interface JiraExport {
  summary: string;
  description: string;
  issueType: string;
  priority: string;
  labels: string[];
  customFields?: Record<string, any>;
}