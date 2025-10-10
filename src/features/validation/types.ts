export type CapacityType = 'percentage' | 'weight' | 'absolute';

export interface ParsedCapacity {
  type: CapacityType;
  value: number;
  resources?: Record<string, number>;
  rawValue: string;
}

export interface ValidationIssue {
  queuePath: string;
  field: string;
  message: string;
  severity: 'error' | 'warning';
  rule: string;
}
