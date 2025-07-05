import { describe, it, expect } from 'vitest';
import {
  validateCapacityTypeConsistency,
  validateChildCapacitySum,
  validateMaxCapacityRelationship,
  validateParentChildCapacityConstraints,
} from './capacityRules';
import type { QueueValidationContext, QueueInfo } from './types';

const createMockContext = (
  overrides?: Partial<QueueValidationContext>,
): QueueValidationContext => ({
  queuePath: 'root.a',
  legacyModeEnabled: true,
  schedulerData: undefined,
  configData: new Map(),
  parentQueue: undefined,
  siblingQueues: [],
  ...overrides,
});

describe('capacityRules', () => {
  describe('validateCapacityTypeConsistency', () => {
    it('should pass when legacy mode is disabled', () => {
      const context = createMockContext({ legacyModeEnabled: false });
      const result = validateCapacityTypeConsistency('50%', context);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass when all siblings have same capacity type', () => {
      const context = createMockContext({
        siblingQueues: [
          { queuePath: 'root.a', queueName: 'a' } as unknown as QueueInfo,
          { queuePath: 'root.b', queueName: 'b' } as unknown as QueueInfo,
          { queuePath: 'root.c', queueName: 'c' } as unknown as QueueInfo,
        ],
        configData: new Map([
          ['yarn.scheduler.capacity.root.b.capacity', '30%'],
          ['yarn.scheduler.capacity.root.c.capacity', '20%'],
        ]),
      });

      const result = validateCapacityTypeConsistency('50%', context);
      expect(result.valid).toBe(true);
    });

    it('should fail when siblings have different capacity types', () => {
      const context = createMockContext({
        siblingQueues: [
          { queuePath: 'root.a', queueName: 'a' } as unknown as QueueInfo,
          { queuePath: 'root.b', queueName: 'b' } as unknown as QueueInfo,
          { queuePath: 'root.c', queueName: 'c' } as unknown as QueueInfo,
        ],
        configData: new Map([
          ['yarn.scheduler.capacity.root.b.capacity', '2w'],
          ['yarn.scheduler.capacity.root.c.capacity', '20%'],
        ]),
      });

      const result = validateCapacityTypeConsistency('50%', context);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].rule).toBe('capacity-type-consistency');
      expect(result.errors[0].message).toContain('b');
    });
  });

  describe('validateChildCapacitySum', () => {
    it('should pass when legacy mode is disabled', () => {
      const context = createMockContext({ legacyModeEnabled: false });
      const result = validateChildCapacitySum('', context);
      expect(result.valid).toBe(true);
    });

    it('should pass when queue has no children', () => {
      const context = createMockContext({
        schedulerData: {
          queueName: 'root',
          queuePath: 'root',
          queues: { queue: [] },
        } as unknown as import('~/types').SchedulerInfo,
      });

      const result = validateChildCapacitySum('', context);
      expect(result.valid).toBe(true);
    });

    it('should pass when child capacities sum to 100%', () => {
      const childQueues: QueueInfo[] = [
        { queuePath: 'root.a', queueName: 'a' } as unknown as QueueInfo,
        { queuePath: 'root.b', queueName: 'b' } as unknown as QueueInfo,
        { queuePath: 'root.c', queueName: 'c' } as unknown as QueueInfo,
      ];

      const context = createMockContext({
        queuePath: 'root',
        schedulerData: {
          queueName: 'root',
          queuePath: 'root',
          queues: { queue: childQueues },
        } as unknown as import('~/types').SchedulerInfo,
        configData: new Map([
          ['yarn.scheduler.capacity.root.a.capacity', '50%'],
          ['yarn.scheduler.capacity.root.b.capacity', '30%'],
          ['yarn.scheduler.capacity.root.c.capacity', '20%'],
        ]),
      });

      const result = validateChildCapacitySum('', context);
      expect(result.valid).toBe(true);
    });

    it('should fail when child capacities do not sum to 100%', () => {
      const childQueues: QueueInfo[] = [
        { queuePath: 'root.a', queueName: 'a' } as unknown as QueueInfo,
        { queuePath: 'root.b', queueName: 'b' } as unknown as QueueInfo,
      ];

      const context = createMockContext({
        queuePath: 'root',
        schedulerData: {
          queueName: 'root',
          queuePath: 'root',
          queues: { queue: childQueues },
        } as unknown as import('~/types').SchedulerInfo,
        configData: new Map([
          ['yarn.scheduler.capacity.root.a.capacity', '40%'],
          ['yarn.scheduler.capacity.root.b.capacity', '30%'],
        ]),
      });

      const result = validateChildCapacitySum('', context);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].rule).toBe('child-capacity-sum');
      expect(result.errors[0].message).toContain('70.0%');
    });

    it('should skip validation when not all children use percentages', () => {
      const childQueues: QueueInfo[] = [
        { queuePath: 'root.a', queueName: 'a' } as unknown as QueueInfo,
        { queuePath: 'root.b', queueName: 'b' } as unknown as QueueInfo,
      ];

      const context = createMockContext({
        queuePath: 'root',
        schedulerData: {
          queueName: 'root',
          queuePath: 'root',
          queues: { queue: childQueues },
        } as unknown as import('~/types').SchedulerInfo,
        configData: new Map([
          ['yarn.scheduler.capacity.root.a.capacity', '2w'],
          ['yarn.scheduler.capacity.root.b.capacity', '30%'],
        ]),
      });

      const result = validateChildCapacitySum('', context);
      expect(result.valid).toBe(true);
    });
  });

  describe('validateMaxCapacityRelationship', () => {
    it('should pass when max capacity is -1 (unlimited)', () => {
      const context = createMockContext({
        configData: new Map([['yarn.scheduler.capacity.root.a.capacity', '50%']]),
      });

      const result = validateMaxCapacityRelationship('-1', context);
      expect(result.valid).toBe(true);
    });

    it('should pass when max capacity >= capacity', () => {
      const context = createMockContext({
        configData: new Map([['yarn.scheduler.capacity.root.a.capacity', '50%']]),
      });

      const result = validateMaxCapacityRelationship('75%', context);
      expect(result.valid).toBe(true);
    });

    it('should fail when max capacity < capacity', () => {
      const context = createMockContext({
        configData: new Map([['yarn.scheduler.capacity.root.a.capacity', '50%']]),
      });

      const result = validateMaxCapacityRelationship('30%', context);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].rule).toBe('max-capacity-minimum');
    });

    it('should fail when capacity types do not match', () => {
      const context = createMockContext({
        configData: new Map([['yarn.scheduler.capacity.root.a.capacity', '50%']]),
      });

      const result = validateMaxCapacityRelationship('2w', context);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].rule).toBe('max-capacity-format-match');
    });

    it('should skip validation for absolute capacities', () => {
      const context = createMockContext({
        configData: new Map([['yarn.scheduler.capacity.root.a.capacity', '[memory=1024]']]),
      });

      const result = validateMaxCapacityRelationship('[memory=2048]', context);
      expect(result.valid).toBe(true);
    });
  });

  describe('validateParentChildCapacityConstraints', () => {
    it('should skip validation for percentage capacities', () => {
      const context = createMockContext({
        parentQueue: { queuePath: 'root' } as unknown as QueueInfo,
        configData: new Map([['yarn.scheduler.capacity.root.capacity', '40%']]),
      });

      const result = validateParentChildCapacityConstraints('50%', context);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should skip validation for weight capacities', () => {
      const context = createMockContext({
        parentQueue: { queuePath: 'root' } as unknown as QueueInfo,
        configData: new Map([['yarn.scheduler.capacity.root.capacity', '2w']]),
      });

      const result = validateParentChildCapacityConstraints('3w', context);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should skip validation when parent uses percentage and child uses absolute', () => {
      const context = createMockContext({
        parentQueue: { queuePath: 'root' } as unknown as QueueInfo,
        configData: new Map([['yarn.scheduler.capacity.root.capacity', '100%']]),
      });

      const result = validateParentChildCapacityConstraints('[memory=1024,vcores=4]', context);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate absolute resources independently', () => {
      const context = createMockContext({
        parentQueue: { queuePath: 'root' } as unknown as QueueInfo,
        configData: new Map([['yarn.scheduler.capacity.root.capacity', '[memory=2048,vcores=8]']]),
      });

      const result = validateParentChildCapacityConstraints('[memory=1024,vcores=4]', context);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should warn when child absolute resource exceeds parent', () => {
      const context = createMockContext({
        parentQueue: { queuePath: 'root' } as unknown as QueueInfo,
        configData: new Map([['yarn.scheduler.capacity.root.capacity', '[memory=2048,vcores=4]']]),
      });

      const result = validateParentChildCapacityConstraints('[memory=3000,vcores=2]', context);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].severity).toBe('warning');
      expect(result.errors[0].rule).toBe('parent-child-capacity-constraint');
      expect(result.errors[0].message).toContain('memory');
      expect(result.errors[0].message).toContain('3000');
      expect(result.errors[0].message).toContain('2048');
    });

    it('should check multiple resources independently', () => {
      const context = createMockContext({
        parentQueue: { queuePath: 'root' } as unknown as QueueInfo,
        configData: new Map([
          ['yarn.scheduler.capacity.root.capacity', '[memory=2048,vcores=4,gpu=2]'],
        ]),
      });

      const result = validateParentChildCapacityConstraints(
        '[memory=1024,vcores=8,gpu=3]',
        context,
      );
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2);

      // Should have warnings for vcores and gpu, but not memory
      const errorMessages = result.errors.map((e) => e.message);
      expect(errorMessages.some((m) => m.includes('vcores'))).toBe(true);
      expect(errorMessages.some((m) => m.includes('gpu'))).toBe(true);
      expect(errorMessages.every((m) => !m.includes('memory'))).toBe(true);
    });

    it('should skip validation when child has resource not in parent', () => {
      const context = createMockContext({
        parentQueue: { queuePath: 'root' } as unknown as QueueInfo,
        configData: new Map([['yarn.scheduler.capacity.root.capacity', '[memory=2048]']]),
      });

      // Child has vcores but parent doesn't - should not validate vcores
      const result = validateParentChildCapacityConstraints('[memory=1024,vcores=8]', context);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should skip validation when no parent queue', () => {
      const context = createMockContext({ parentQueue: undefined });
      const result = validateParentChildCapacityConstraints('[memory=1024]', context);
      expect(result.valid).toBe(true);
    });
  });
});
