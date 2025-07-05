import type { QueueInfo as _QueueInfo, SchedulerInfo as _SchedulerInfo } from '~/types';

export type QueueInfo = _QueueInfo;
export type SchedulerInfo = _SchedulerInfo;

export interface BusinessValidationResult {
  valid: boolean;
  errors: BusinessValidationError[];
}

export interface BusinessValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
  rule: string;
}

export interface QueueValidationContext {
  queuePath: string;
  legacyModeEnabled: boolean;
  schedulerData?: SchedulerInfo;
  configData: Map<string, string>;
  parentQueue?: QueueInfo;
  siblingQueues?: QueueInfo[];
  field?: string;
}

export type BusinessValidator<T = unknown> = (
  value: T,
  context: QueueValidationContext
) => BusinessValidationResult;

export interface ValidationRule {
  name: string;
  field: string;
  validators: BusinessValidator[];
}

export type CapacityType = 'percentage' | 'weight' | 'absolute';

export interface ParsedCapacity {
  type: CapacityType;
  value: number;
  resources?: Record<string, number>;
  rawValue: string;
}