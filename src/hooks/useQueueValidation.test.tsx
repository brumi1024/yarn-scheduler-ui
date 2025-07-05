import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useQueueValidation } from './useQueueValidation';
import { useSchedulerStore } from '~/stores/schedulerStore';
import { z } from 'zod';

// Mock the store
vi.mock('~/stores/schedulerStore');

const mockSchedulerData = {
  queueName: 'root',
  queuePath: 'root',
  queues: {
    queue: [
      { queuePath: 'root.a', queueName: 'a', state: 'RUNNING' },
      { queuePath: 'root.b', queueName: 'b', state: 'RUNNING' },
    ],
  },
};

describe('useQueueValidation', () => {
  beforeEach(() => {
    (useSchedulerStore as any).mockReturnValue({
      configData: new Map([
        ['yarn.scheduler.capacity.legacy-queue-mode.enabled', 'true'],
        ['yarn.scheduler.capacity.root.a.capacity', '50%'],
        ['yarn.scheduler.capacity.root.b.capacity', '50%'],
        ['yarn.scheduler.capacity.root.capacity', '100%'],
      ]),
      schedulerData: mockSchedulerData,
      stagedChanges: [], // Add empty staged changes array
    });
  });

  it('should initialize with no errors', () => {
    const { result } = renderHook(() =>
      useQueueValidation({
        queuePath: 'root.a',
        schema: z.object({ capacity: z.string() }),
      }),
    );

    expect(result.current.businessErrors).toEqual([]);
    // Form might not be valid initially if no default values are set
    expect(result.current.hasWarnings).toBe(false);
  });

  it('should validate business rules on field blur', async () => {
    const { result } = renderHook(() =>
      useQueueValidation({
        queuePath: 'root.a',
        schema: z.object({ capacity: z.string() }),
      }),
    );

    // Change capacity to invalid value
    act(() => {
      result.current.handleBlur('maximum-capacity', '30%');
    });

    // Should have business error
    expect(result.current.businessErrors.length).toBeGreaterThan(0);
    expect(result.current.businessErrors[0].rule).toBe('max-capacity-minimum');
  });

  it('should clear business errors on queuePath change', () => {
    const { result, rerender } = renderHook(
      ({ queuePath }) =>
        useQueueValidation({
          queuePath,
          schema: z.object({ capacity: z.string() }),
        }),
      {
        initialProps: { queuePath: 'root.a' },
      },
    );

    // Add some errors
    act(() => {
      result.current.handleBlur('maximum-capacity', '30%');
    });

    expect(result.current.businessErrors.length).toBeGreaterThan(0);

    // Change queue path
    rerender({ queuePath: 'root.b' });

    // Errors should be cleared
    expect(result.current.businessErrors).toEqual([]);
  });

  it('should get field errors combining Zod and business errors', () => {
    // Configure mock to have invalid maximum capacity
    (useSchedulerStore as any).mockReturnValue({
      configData: new Map([
        ['yarn.scheduler.capacity.legacy-queue-mode.enabled', 'true'],
        ['yarn.scheduler.capacity.root.a.capacity', '50%'],
        ['yarn.scheduler.capacity.root.a.maximum-capacity', '30%'], // Invalid: less than capacity
      ]),
      schedulerData: mockSchedulerData,
      stagedChanges: [], // Add empty staged changes array
    });

    const { result } = renderHook(() =>
      useQueueValidation({
        queuePath: 'root.a',
        schema: z.object({
          'maximum-capacity': z.string().min(1, 'Maximum capacity is required'),
        }),
      }),
    );

    // Add business error by triggering validation with invalid data
    act(() => {
      result.current.handleBlur('maximum-capacity', '30%');
    });

    // Get field errors
    const errors = result.current.getFieldErrors('maximum-capacity');
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should get field warnings', () => {
    // Update mock data to trigger warning with absolute resources
    (useSchedulerStore as any).mockReturnValue({
      configData: new Map([
        ['yarn.scheduler.capacity.legacy-queue-mode.enabled', 'true'],
        ['yarn.scheduler.capacity.root.capacity', '[memory=10000,vcores=100]'], // Parent has absolute capacity
      ]),
      schedulerData: {
        queueName: 'root',
        queuePath: 'root',
        state: 'RUNNING',
        queues: {
          queue: [{ queuePath: 'root.a', queueName: 'a', state: 'RUNNING' }],
        },
      },
      stagedChanges: [], // Add empty staged changes array
    });

    const { result } = renderHook(() =>
      useQueueValidation({
        queuePath: 'root.a',
        schema: z.object({ capacity: z.string() }),
      }),
    );

    act(() => {
      result.current.handleBlur('capacity', '[memory=20000,vcores=200]'); // Child has more than parent
    });

    const warnings = result.current.getFieldWarnings('capacity');
    expect(warnings.length).toBeGreaterThan(0);
  });

  it('should validate all fields', async () => {
    const { result } = renderHook(() =>
      useQueueValidation({
        queuePath: 'root.a',
        schema: z.object({
          capacity: z.string(),
          'maximum-capacity': z.string(),
        }),
      }),
    );

    const data = {
      capacity: '50%',
      'maximum-capacity': '30%', // Invalid: less than capacity
    };

    let isValid;
    await act(async () => {
      isValid = await result.current.validateAll(data);
    });

    expect(isValid).toBe(false);
    expect(result.current.businessErrors.length).toBeGreaterThan(0);
  });

  it('should handle legacy mode disabled', () => {
    (useSchedulerStore as any).mockReturnValue({
      configData: new Map([
        ['yarn.scheduler.capacity.legacy-queue-mode.enabled', 'false'],
        ['yarn.scheduler.capacity.root.a.capacity', '50%'],
        ['yarn.scheduler.capacity.root.b.capacity', '2w'], // Different type allowed
      ]),
      schedulerData: mockSchedulerData,
      stagedChanges: [], // Add empty staged changes array
    });

    const { result } = renderHook(() =>
      useQueueValidation({
        queuePath: 'root.a',
        schema: z.object({ capacity: z.string() }),
      }),
    );

    act(() => {
      result.current.handleBlur('capacity', '50%');
    });

    // Should not have capacity type consistency error
    expect(result.current.businessErrors).toEqual([]);
  });

  it('should validate business rules without schema', () => {
    const { result } = renderHook(() =>
      useQueueValidation({
        queuePath: 'root.a',
      }),
    );

    act(() => {
      result.current.handleBlur('maximum-capacity', '30%');
    });

    expect(result.current.businessErrors.length).toBeGreaterThan(0);
    expect(result.current.isValid).toBe(false);
  });

  it('should clear business errors manually', () => {
    const { result } = renderHook(() =>
      useQueueValidation({
        queuePath: 'root.a',
        schema: z.object({ capacity: z.string() }),
      }),
    );

    // Add error
    act(() => {
      result.current.handleBlur('maximum-capacity', '30%');
    });

    expect(result.current.businessErrors.length).toBeGreaterThan(0);

    // Clear errors
    act(() => {
      result.current.clearBusinessErrors();
    });

    expect(result.current.businessErrors).toEqual([]);
  });
});
