import type { ValidationIssue } from '~/features/validation/types';

export type StagedChangeType = 'add' | 'update' | 'remove';

export type StagedChange = {
  id: string;
  type: StagedChangeType;
  queuePath: string | 'global';
  property: string;
  oldValue?: string;
  newValue?: string;
  timestamp: number;
  label?: string; // Used for node label changes
  // Validation errors associated with this change
  validationErrors?: ValidationIssue[];
};
