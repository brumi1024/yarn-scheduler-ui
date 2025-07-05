import { describe, it, expect } from 'vitest';
import {
  validateQueueStateTransition,
  validateQueueDeletion,
  validateQueueConversion,
} from './stateRules';
import type { QueueValidationContext, QueueInfo, SchedulerInfo } from './types';

const createMockContext = (overrides?: Partial<QueueValidationContext>): QueueValidationContext => ({
  queuePath: 'root.a',
  legacyModeEnabled: true,
  schedulerData: undefined,
  configData: new Map(),
  parentQueue: undefined,
  siblingQueues: [],
  ...overrides,
});

// Helper to create scheduler data with proper structure for findQueueByPath
const createSchedulerWithQueue = (queue: Partial<QueueInfo>): SchedulerInfo => ({
  queueName: 'root',
  queuePath: 'root',
  type: 'capacityScheduler' as const,
  capacity: 100,
  usedCapacity: 0,
  maxCapacity: 100,
  state: 'RUNNING',
  queues: {
    queue: [{
      queuePath: 'root.a',
      queueName: 'a',
      queueType: 'leaf',
      state: 'RUNNING',
      capacity: 100,
      usedCapacity: 0,
      maxCapacity: 100,
      absoluteCapacity: 100,
      absoluteMaxCapacity: 100,
      absoluteUsedCapacity: 0,
      numApplications: 0,
      numActiveApplications: 0,
      numPendingApplications: 0,
      resourcesUsed: { memory: 0, vCores: 0 },
      ...queue
    } as QueueInfo]
  }
});

describe('stateRules', () => {
  describe('validateQueueStateTransition', () => {
    it('should pass for valid state values', () => {
      const context = createMockContext();
      const result = validateQueueStateTransition('RUNNING', context);
      expect(result.valid).toBe(true);
    });

    it('should skip validation for invalid state values', () => {
      const context = createMockContext();
      const result = validateQueueStateTransition('INVALID', context);
      expect(result.valid).toBe(true); // Let Zod handle invalid values
    });

    it('should fail when setting to RUNNING with STOPPED parent', () => {
      const context = createMockContext({
        parentQueue: { state: 'STOPPED' } as unknown as QueueInfo,
      });

      const result = validateQueueStateTransition('RUNNING', context);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].rule).toBe('parent-state-dependency');
    });

    it('should pass when setting to RUNNING with RUNNING parent', () => {
      const context = createMockContext({
        parentQueue: { state: 'RUNNING' } as unknown as QueueInfo,
      });

      const result = validateQueueStateTransition('RUNNING', context);
      expect(result.valid).toBe(true);
    });

    it('should fail when stopping queue with running children', () => {
      const context = createMockContext({
        schedulerData: createSchedulerWithQueue({
          state: 'RUNNING',
          queues: {
            queue: [
              { 
                queuePath: 'root.a.child1',
                queueName: 'child1',
                state: 'RUNNING',
                queueType: 'leaf'
              } as QueueInfo,
              {
                queuePath: 'root.a.child2',
                queueName: 'child2',
                state: 'STOPPED',
                queueType: 'leaf'
              } as QueueInfo,
            ],
          },
        }),
      });

      const result = validateQueueStateTransition('STOPPED', context);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].rule).toBe('child-state-dependency');
      expect(result.errors[0].message).toContain('1 running child queue');
    });

    it('should pass when stopping queue with no running children', () => {
      const context = createMockContext({
        schedulerData: {
          queues: {
            queue: [{
              queuePath: 'root.a',
                queues: {
                  queue: [
                    { state: 'STOPPED', queueName: 'child1' } as unknown as QueueInfo,
                    { state: 'STOPPED', queueName: 'child2' } as unknown as QueueInfo,
                  ],
                },
              } as unknown as QueueInfo],
          },
        } as any,
      });

      const result = validateQueueStateTransition('STOPPED', context);
      expect(result.valid).toBe(true);
    });
  });

  describe('validateQueueDeletion', () => {
    it('should pass when queue is stopped and empty', () => {
      const context = createMockContext({
        schedulerData: {
          queues: {
            queue: [{
              queuePath: 'root.a',
                state: 'STOPPED',
                numApplications: 0,
                queues: { queue: [] },
              } as unknown as QueueInfo],
          },
        } as any,
      });

      const result = validateQueueDeletion('', context);
      expect(result.valid).toBe(true);
    });

    it('should fail when queue is not stopped', () => {
      const context = createMockContext({
        schedulerData: createSchedulerWithQueue({
          state: 'RUNNING',
          numApplications: 0,
        }),
      });

      const result = validateQueueDeletion('', context);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].rule).toBe('deletion-state-requirement');
    });

    it('should fail when queue has applications', () => {
      const context = createMockContext({
        schedulerData: createSchedulerWithQueue({
          state: 'STOPPED',
          numApplications: 5,
        }),
      });

      const result = validateQueueDeletion('', context);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].rule).toBe('deletion-empty-requirement');
      expect(result.errors[0].message).toContain('5 active application');
    });

    it('should fail when queue has children', () => {
      const context = createMockContext({
        schedulerData: createSchedulerWithQueue({
          state: 'STOPPED',
          numApplications: 0,
          queues: {
            queue: [
              { queueName: 'child1', queuePath: 'root.a.child1' } as unknown as QueueInfo,
              { queueName: 'child2', queuePath: 'root.a.child2' } as unknown as QueueInfo,
            ],
          },
        }),
      });

      const result = validateQueueDeletion('', context);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].rule).toBe('deletion-no-children-requirement');
      expect(result.errors[0].message).toContain('2 child queue');
    });

    it('should return multiple errors when multiple conditions fail', () => {
      const context = createMockContext({
        schedulerData: createSchedulerWithQueue({
          state: 'RUNNING',
          numApplications: 3,
          queues: { 
            queue: [{ 
              queueName: 'child',
              queuePath: 'root.a.child'
            } as unknown as QueueInfo] 
          },
        }),
      });

      const result = validateQueueDeletion('', context);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(3);
    });
  });

  describe('validateQueueConversion', () => {
    it('should pass when queue is stopped and empty', () => {
      const context = createMockContext({
        schedulerData: {
          queues: {
            queue: [{
              queuePath: 'root.a',
                state: 'STOPPED',
                numApplications: 0,
              } as unknown as QueueInfo],
          },
        } as any,
      });

      const result = validateQueueConversion('', context);
      expect(result.valid).toBe(true);
    });

    it('should fail when queue is not stopped', () => {
      const context = createMockContext({
        schedulerData: createSchedulerWithQueue({
          state: 'RUNNING',
          numApplications: 0,
        }),
      });

      const result = validateQueueConversion('', context);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].rule).toBe('conversion-state-requirement');
    });

    it('should fail when queue has applications', () => {
      const context = createMockContext({
        schedulerData: createSchedulerWithQueue({
          state: 'STOPPED',
          numApplications: 2,
        }),
      });

      const result = validateQueueConversion('', context);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].rule).toBe('conversion-empty-requirement');
    });
  });
});