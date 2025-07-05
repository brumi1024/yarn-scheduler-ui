import { describe, it, expect, vi } from 'vitest';
import { createStagedChangesSlice } from './stagedChangesSlice';
import type { StagedChange } from '~/types';
import { businessValidation } from '~/utils/validation/businessRules/service';
import { getAffectedQueuesForValidation } from '~/utils/validation/affectedQueuesUtils';

// Mock dependencies
vi.mock('~/utils/validation/businessRules/service');
vi.mock('~/utils/validation/affectedQueuesUtils');
vi.mock('~/utils/validation/stagedChangesUtils', () => ({
  getMergedConfigData: vi.fn((configData) => configData),
}));

describe('stagedChangesSlice - validation refresh', () => {
  it('should refresh validation errors for all staged changes', () => {
    const state = {
      stagedChanges: [
        {
          id: '1',
          type: 'update' as const,
          queuePath: 'root.parent.child1',
          property: 'capacity',
          oldValue: '50%',
          newValue: '52%',
          timestamp: Date.now(),
        },
      ] as StagedChange[],
      configData: new Map([
        ['yarn.scheduler.capacity.legacy-queue-mode.enabled', 'true'],
        ['yarn.scheduler.capacity.root.parent.capacity', '100%'],
        ['yarn.scheduler.capacity.root.parent.child1.capacity', '50%'],
        ['yarn.scheduler.capacity.root.parent.child2.capacity', '50%'],
      ]),
      schedulerData: {
        type: 'capacityScheduler',
        capacity: 100,
        usedCapacity: 0,
        maxCapacity: 100,
        queueName: 'root',
        queues: { queue: [] },
      } as any,
    };

    const mockGet = vi.fn(() => state);
    const mockSet = vi.fn((fn) => fn(state as any));

    // Mock affected queues to include parent
    vi.mocked(getAffectedQueuesForValidation).mockReturnValue([
      'root.parent.child1',
      'root.parent',
    ]);

    // Mock validation to return capacity sum error for parent
    vi.mocked(businessValidation.validateQueue).mockImplementation((queuePath) => {
      if (queuePath === 'root.parent') {
        return {
          valid: false,
          errors: [
            {
              field: 'capacity',
              message: 'Child queue capacities must sum to 100%',
              severity: 'error',
              rule: 'child-capacity-sum',
            },
          ],
        };
      }
      return { valid: true, errors: [] };
    });

    const slice = createStagedChangesSlice(mockSet as any, mockGet as any, {} as any);

    // Call refreshValidationErrors directly
    slice.refreshValidationErrors();

    // Verify the staged change was updated with validation errors
    expect(mockSet).toHaveBeenCalled();
    const updatedChanges = state.stagedChanges;
    expect(updatedChanges[0].validationErrors).toBeDefined();
    expect(updatedChanges[0].validationErrors).toContainEqual(
      expect.objectContaining({
        field: 'capacity',
        message: 'Child queue capacities must sum to 100%',
        rule: 'child-capacity-sum',
      }),
    );
  });

  it('should clear validation errors when they are resolved', () => {
    const state = {
      stagedChanges: [
        {
          id: '1',
          type: 'update' as const,
          queuePath: 'root.parent.child1',
          property: 'capacity',
          oldValue: '50%',
          newValue: '50%',
          timestamp: Date.now(),
          validationErrors: [
            {
              field: 'capacity',
              message: 'Child queue capacities must sum to 100%',
              severity: 'error',
              rule: 'child-capacity-sum',
            },
          ],
        },
      ] as StagedChange[],
      configData: new Map([['yarn.scheduler.capacity.legacy-queue-mode.enabled', 'true']]),
      schedulerData: {
        type: 'capacityScheduler',
        capacity: 100,
        usedCapacity: 0,
        maxCapacity: 100,
        queueName: 'root',
        queues: { queue: [] },
      } as any,
    };

    const mockGet = vi.fn(() => state);
    const mockSet = vi.fn((fn) => fn(state as any));

    // Mock affected queues
    vi.mocked(getAffectedQueuesForValidation).mockReturnValue(['root.parent.child1']);

    // Mock validation to return no errors (issue resolved)
    vi.mocked(businessValidation.validateQueue).mockReturnValue({
      valid: true,
      errors: [],
    });

    const slice = createStagedChangesSlice(mockSet as any, mockGet as any, {} as any);

    // Call refreshValidationErrors
    slice.refreshValidationErrors();

    // Verify validation errors were cleared
    expect(mockSet).toHaveBeenCalled();
    const updatedChanges = state.stagedChanges;
    expect(updatedChanges[0].validationErrors).toBeUndefined();
  });

  it('should handle absolute resource validation', () => {
    const state = {
      stagedChanges: [
        {
          id: '1',
          type: 'update' as const,
          queuePath: 'root.parent.child1',
          property: 'capacity',
          oldValue: '[memory=1024,vcores=4]',
          newValue: '[memory=3000,vcores=4]',
          timestamp: Date.now(),
        },
      ] as StagedChange[],
      configData: new Map([
        ['yarn.scheduler.capacity.root.parent.capacity', '[memory=2048,vcores=8]'],
        ['yarn.scheduler.capacity.root.parent.child1.capacity', '[memory=1024,vcores=4]'],
      ]),
      schedulerData: {
        type: 'capacityScheduler',
        capacity: 100,
        usedCapacity: 0,
        maxCapacity: 100,
        queueName: 'root',
        queues: { queue: [] },
      } as any,
    };

    const mockGet = vi.fn(() => state);
    const mockSet = vi.fn((fn) => fn(state as any));

    // Mock affected queues
    vi.mocked(getAffectedQueuesForValidation).mockReturnValue([
      'root.parent.child1',
      'root.parent',
    ]);

    // Mock validation to return resource constraint warning
    vi.mocked(businessValidation.validateQueue).mockImplementation((queuePath) => {
      if (queuePath === 'root.parent.child1') {
        return {
          valid: false,
          errors: [
            {
              field: 'capacity',
              message:
                'Child queue memory allocation (3000) cannot exceed parent queue memory allocation (2048)',
              severity: 'warning',
              rule: 'parent-child-capacity-constraint',
            },
          ],
        };
      }
      return { valid: true, errors: [] };
    });

    const slice = createStagedChangesSlice(mockSet as any, mockGet as any, {} as any);

    // Call refreshValidationErrors
    slice.refreshValidationErrors();

    // Verify the validation warning was attached
    const updatedChanges = state.stagedChanges;
    expect(updatedChanges[0].validationErrors).toContainEqual(
      expect.objectContaining({
        message: expect.stringContaining('memory allocation (3000)'),
        rule: 'parent-child-capacity-constraint',
        severity: 'warning',
      }),
    );
  });
});
