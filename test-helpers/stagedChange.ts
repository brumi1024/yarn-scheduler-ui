import type { StagedChange } from '~/types';

/**
 * Helper to create a test StagedChange object with defaults
 */
export function createTestStagedChange(overrides: Partial<StagedChange>): StagedChange {
  return {
    id: 'test-id',
    type: 'update',
    queuePath: 'root',
    property: 'test-property',
    oldValue: 'old',
    newValue: 'new',
    timestamp: Date.now(),
    validationErrors: [],
    ...overrides
  };
}