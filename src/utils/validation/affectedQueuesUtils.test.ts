import { describe, it, expect } from 'vitest';
import {
  getAffectedQueuesForValidation,
  collectAffectedQueuesValidationErrors,
} from './affectedQueuesUtils';
import type { SchedulerInfo, QueueInfo } from '~/types';

describe('affectedQueuesUtils', () => {
  const createMockSchedulerData = (queues: QueueInfo[]): SchedulerInfo => ({
    type: 'capacityScheduler',
    capacity: 100,
    usedCapacity: 50,
    maxCapacity: 100,
    queueName: 'root',
    queues: {
      queue: queues,
    },
  });

  const createMockQueue = (
    queuePath: string,
    queueName: string,
    children?: QueueInfo[],
  ): QueueInfo => ({
    queuePath,
    queueName,
    queueType: children ? 'parent' : 'leaf',
    capacity: 50,
    usedCapacity: 0,
    maxCapacity: 100,
    absoluteCapacity: 50,
    absoluteMaxCapacity: 100,
    absoluteUsedCapacity: 0,
    numApplications: 0,
    numActiveApplications: 0,
    numPendingApplications: 0,
    state: 'RUNNING',
    resourcesUsed: {
      memory: 0,
      vCores: 0,
    },
    ...(children && { queues: { queue: children } }),
  });

  describe('getAffectedQueuesForValidation', () => {
    it('should always include the current queue', () => {
      const affected = getAffectedQueuesForValidation('someProp', 'root.a', null);
      expect(affected).toEqual(['root.a']);
    });

    it('should include parent queue for capacity changes', () => {
      const mockData = createMockSchedulerData([
        createMockQueue('root.parent', 'parent', [createMockQueue('root.parent.child', 'child')]),
      ]);

      const affected = getAffectedQueuesForValidation('capacity', 'root.parent.child', mockData);

      expect(affected).toContain('root.parent.child');
      expect(affected).toContain('root.parent');
    });

    it('should include child queues for capacity changes on parent', () => {
      const mockData = createMockSchedulerData([
        createMockQueue('root.parent', 'parent', [
          createMockQueue('root.parent.child1', 'child1'),
          createMockQueue('root.parent.child2', 'child2'),
        ]),
      ]);

      const affected = getAffectedQueuesForValidation('capacity', 'root.parent', mockData);

      expect(affected).toContain('root.parent');
      expect(affected).toContain('root.parent.child1');
      expect(affected).toContain('root.parent.child2');
    });

    it('should not include parent for root queue', () => {
      const mockData = createMockSchedulerData([createMockQueue('root', 'root')]);

      const affected = getAffectedQueuesForValidation('capacity', 'root', mockData);

      expect(affected).toEqual(['root']);
    });

    it('should include parent and children for state changes', () => {
      const mockData = createMockSchedulerData([
        createMockQueue('root.parent', 'parent', [
          createMockQueue('root.parent.middle', 'middle', [
            createMockQueue('root.parent.middle.child', 'child'),
          ]),
        ]),
      ]);

      const affected = getAffectedQueuesForValidation('state', 'root.parent.middle', mockData);

      expect(affected).toContain('root.parent.middle');
      expect(affected).toContain('root.parent');
      expect(affected).toContain('root.parent.middle.child');
    });

    it('should handle non-capacity properties without adding extra queues', () => {
      const mockData = createMockSchedulerData([
        createMockQueue('root.parent', 'parent', [createMockQueue('root.parent.child', 'child')]),
      ]);

      const affected = getAffectedQueuesForValidation(
        'user-limit-factor',
        'root.parent.child',
        mockData,
      );

      expect(affected).toEqual(['root.parent.child']);
    });
  });

  describe('collectAffectedQueuesValidationErrors', () => {
    it('should collect errors from all affected queues', () => {
      const allErrors = [
        {
          queuePath: 'root.parent',
          errors: [
            { field: 'capacity', message: 'Parent error 1' },
            { field: 'capacity', message: 'Parent error 2' },
          ],
        },
        {
          queuePath: 'root.parent.child',
          errors: [{ field: 'capacity', message: 'Child error' }],
        },
        {
          queuePath: 'root.other',
          errors: [{ field: 'state', message: 'Other error' }],
        },
      ];

      const collected = collectAffectedQueuesValidationErrors(
        ['root.parent', 'root.parent.child'],
        allErrors,
      );

      expect(collected).toHaveLength(3);
      expect(collected).toContainEqual({ field: 'capacity', message: 'Parent error 1' });
      expect(collected).toContainEqual({ field: 'capacity', message: 'Parent error 2' });
      expect(collected).toContainEqual({ field: 'capacity', message: 'Child error' });
      expect(collected).not.toContainEqual({ field: 'state', message: 'Other error' });
    });

    it('should handle empty error lists', () => {
      const collected = collectAffectedQueuesValidationErrors(['root.parent'], []);

      expect(collected).toEqual([]);
    });

    it('should handle queues with no errors', () => {
      const allErrors = [
        {
          queuePath: 'root.other',
          errors: [{ field: 'state', message: 'Other error' }],
        },
      ];

      const collected = collectAffectedQueuesValidationErrors(['root.parent'], allErrors);

      expect(collected).toEqual([]);
    });
  });
});
