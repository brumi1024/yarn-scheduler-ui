import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useQueueValidation } from './useQueueValidation';
import { useSchedulerStore } from '~/stores/schedulerStore';
import type { StagedChange } from '~/types';
import { SPECIAL_VALUES } from '~/types';
import { createTestStagedChange } from '../../test-helpers/stagedChange';

vi.mock('~/stores/schedulerStore');

describe('useQueueValidation with staged changes', () => {
  const mockSchedulerData = {
    queueName: 'root',
    queuePath: 'root',
    capacity: 100,
    usedCapacity: 50,
    maxCapacity: 100,
    state: 'RUNNING',
    queues: {
      queue: [
        {
          queueName: 'prod',
          queuePath: 'root.prod',
          capacity: 60,
          queueType: 'parent' as const,
          state: 'RUNNING',
          queues: {
            queue: [
              {
                queueName: 'critical',
                queuePath: 'root.prod.critical',
                capacity: 70,
                queueType: 'leaf' as const,
                state: 'RUNNING',
              },
              {
                queueName: 'regular',
                queuePath: 'root.prod.regular',
                capacity: 30,
                queueType: 'leaf' as const,
                state: 'RUNNING',
              },
            ],
          },
        },
        {
          queueName: 'dev',
          queuePath: 'root.dev',
          capacity: 40,
          queueType: 'leaf' as const,
          state: 'RUNNING',
        },
      ],
    },
  };

  const baseConfigData = new Map([
    ['yarn.scheduler.capacity.legacy-queue-mode.enabled', 'true'],
    ['yarn.scheduler.capacity.root.capacity', '100'],
    ['yarn.scheduler.capacity.root.prod.capacity', '60'],
    ['yarn.scheduler.capacity.root.dev.capacity', '40'],
    ['yarn.scheduler.capacity.root.prod.critical.capacity', '70'],
    ['yarn.scheduler.capacity.root.prod.regular.capacity', '30'],
  ]);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should validate using original config when no staged changes', () => {
    (useSchedulerStore as any).mockReturnValue({
      configData: baseConfigData,
      schedulerData: mockSchedulerData,
      stagedChanges: [],
    });

    const { result } = renderHook(() => useQueueValidation({ queuePath: 'root' }));

    // With legacy mode enabled and child capacities summing to 100%, should be valid
    expect(result.current.businessErrors).toHaveLength(0);
    expect(result.current.isValid).toBe(true);
  });

  it('should validate using staged legacy mode change', () => {
    const stagedChanges: StagedChange[] = [
      createTestStagedChange({
        queuePath: SPECIAL_VALUES.GLOBAL_QUEUE_PATH,
        property: 'legacy-queue-mode.enabled',
        oldValue: 'true',
        newValue: 'false',
      }),
    ];

    (useSchedulerStore as any).mockReturnValue({
      configData: baseConfigData,
      schedulerData: mockSchedulerData,
      stagedChanges,
    });

    const { result } = renderHook(() => useQueueValidation({ queuePath: 'root' }));

    // With legacy mode disabled (staged), no validation errors expected
    expect(result.current.businessErrors).toHaveLength(0);
    expect(result.current.isValid).toBe(true);
  });

  it('should validate using staged capacity changes', async () => {
    const stagedChanges: StagedChange[] = [
      createTestStagedChange({
        queuePath: 'root.prod',
        property: 'capacity',
        oldValue: '60',
        newValue: '70', // This would make root children sum to 110%
      }),
    ];

    (useSchedulerStore as any).mockReturnValue({
      configData: baseConfigData,
      schedulerData: mockSchedulerData,
      stagedChanges,
    });

    const { result } = renderHook(() => useQueueValidation({ queuePath: 'root' }));

    // Need to trigger validation with the root queue's properties
    const rootProperties = {
      capacity: '100',
      queues: 'prod,dev',
    };

    let isValid;
    await act(async () => {
      isValid = await result.current.validateAll(rootProperties);
    });

    // With legacy mode enabled and children summing to 110%, should have error
    expect(isValid).toBe(false);
    const capacityErrors = result.current.businessErrors.filter(
      (e) => e.rule === 'child-capacity-sum',
    );
    expect(capacityErrors.length).toBeGreaterThan(0);
    expect(capacityErrors[0].message).toContain('must sum to 100%');
  });

  it('should combine multiple staged changes correctly', () => {
    const stagedChanges: StagedChange[] = [
      createTestStagedChange({
        queuePath: SPECIAL_VALUES.GLOBAL_QUEUE_PATH,
        property: 'legacy-queue-mode.enabled',
        oldValue: 'true',
        newValue: 'false', // Disable legacy mode
      }),
      createTestStagedChange({
        queuePath: 'root.prod',
        property: 'capacity',
        oldValue: '60',
        newValue: '70', // Would be invalid in legacy mode
      }),
    ];

    (useSchedulerStore as any).mockReturnValue({
      configData: baseConfigData,
      schedulerData: mockSchedulerData,
      stagedChanges,
    });

    const { result } = renderHook(() => useQueueValidation({ queuePath: 'root' }));

    // With legacy mode disabled, capacity sum over 100% should be allowed
    const capacityErrors = result.current.businessErrors.filter(
      (e) => e.rule === 'childCapacitySum',
    );
    expect(capacityErrors).toHaveLength(0);
    expect(result.current.isValid).toBe(true);
  });

  it('should handle deleted properties in staged changes', () => {
    const configWithMaxCapacity = new Map([
      ...baseConfigData,
      ['yarn.scheduler.capacity.root.prod.maximum-capacity', '100'],
    ]);

    const stagedChanges: StagedChange[] = [
      createTestStagedChange({
        queuePath: 'root.prod',
        property: 'maximum-capacity',
        oldValue: '100',
        newValue: '', // Empty value should delete the property
      }),
    ];

    (useSchedulerStore as any).mockReturnValue({
      configData: configWithMaxCapacity,
      schedulerData: mockSchedulerData,
      stagedChanges,
    });

    const { result } = renderHook(() => useQueueValidation({ queuePath: 'root.prod' }));

    // Should validate without considering the deleted property
    expect(result.current.isValid).toBe(true);
  });
});
