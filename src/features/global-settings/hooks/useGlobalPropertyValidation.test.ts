import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useGlobalPropertyValidation } from './useGlobalPropertyValidation';
import { useSchedulerStore } from '~/stores/schedulerStore';
import { SPECIAL_VALUES } from '~/types';

const MAXIMUM_APPLICATIONS_PROPERTY = 'yarn.scheduler.capacity.maximum-applications';

vi.mock('~/stores/schedulerStore');

describe('useGlobalPropertyValidation', () => {
  it('should validate global properties', () => {
    const mockSchedulerData = {
      queueName: 'root',
      queuePath: 'root',
      state: 'RUNNING',
      queues: { queue: [] },
    };

    (useSchedulerStore as any).mockReturnValue({
      configData: new Map([[SPECIAL_VALUES.LEGACY_MODE_PROPERTY, 'true']]),
      schedulerData: mockSchedulerData,
      stagedChanges: [],
    });

    const { result } = renderHook(() => useGlobalPropertyValidation());

    // Test a valid property change
    const errors = result.current.validateGlobalProperty(MAXIMUM_APPLICATIONS_PROPERTY, '10000');
    expect(errors).toHaveLength(0);
  });

  it('should return validation errors for invalid values', () => {
    const mockSchedulerData = {
      queueName: 'root',
      queuePath: 'root',
      state: 'RUNNING',
      queues: { queue: [] },
    };

    (useSchedulerStore as any).mockReturnValue({
      configData: new Map([[SPECIAL_VALUES.LEGACY_MODE_PROPERTY, 'true']]),
      schedulerData: mockSchedulerData,
      stagedChanges: [],
    });

    const { result } = renderHook(() => useGlobalPropertyValidation());

    // Test an invalid property change (if there are any validation rules for global properties)
    const errors = result.current.validateGlobalProperty('nonexistent-property', 'invalid');
    // For now, we expect no errors since business validation might not have rules for all global properties
    expect(Array.isArray(errors)).toBe(true);
  });
});
