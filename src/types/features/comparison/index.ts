/**
 * Types for queue comparison feature
 */

export interface QueueComparison {
  queuePaths: string[];
  properties: ComparisonProperty[];
  timestamp: number;
}

export interface ComparisonProperty {
  propertyName: string;
  values: Map<string, string | undefined>;
  isDifferent: boolean;
  category?: string;
}

export interface ComparisonResult {
  allProperties: Set<string>;
  differences: Map<string, ComparisonProperty>;
  commonProperties: Map<string, string>;
}

export type ComparisonView = 'all' | 'differences' | 'common';

export interface ComparisonExport {
  format: 'csv' | 'json';
  includeCommon: boolean;
  includeDifferences: boolean;
}

// Placeholder for future validators
export {};
