// Re-export all types from schemas
export type {
  Resources,
  QueueState,
  CapacityMode,
  CapacityValue,
  QueueConfig,
  QueueMetrics
} from './schemas/coreSchemas';

export type {
  PropertyChange,
  NodeLabelAssignment,
  ChangeType,
  ChangeSet
} from './schemas/changeSchemas';

// Additional store-specific types
export type CommitStatus = 'idle' | 'committing' | 'success' | 'error';

export interface StoreError {
  message: string;
  code?: string;
  timestamp: Date;
}