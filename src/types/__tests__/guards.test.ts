import { describe, it, expect } from 'vitest';
import { isLeafQueue, isParentQueue, isValidQueueName } from '~/types';
import type { QueueInfo } from '~/types';

describe('Type Guards', () => {
  describe('isLeafQueue', () => {
    it('should identify leaf queues', () => {
      const leafQueue: QueueInfo = {
        queueType: 'leaf',
        capacity: 70,
        usedCapacity: 45.5,
        maxCapacity: 100,
        absoluteCapacity: 70,
        absoluteMaxCapacity: 100,
        absoluteUsedCapacity: 31.85,
        numApplications: 150,
        numActiveApplications: 100,
        numPendingApplications: 50,
        queueName: 'batch',
        queuePath: 'root.production.batch',
        state: 'RUNNING',
      };

      expect(isLeafQueue(leafQueue)).toBe(true);
    });

    it('should reject parent queues', () => {
      const parentQueue: QueueInfo = {
        queueType: 'parent',
        capacity: 100,
        usedCapacity: 60,
        maxCapacity: 100,
        absoluteCapacity: 100,
        absoluteMaxCapacity: 100,
        absoluteUsedCapacity: 60,
        numApplications: 500,
        numActiveApplications: 300,
        numPendingApplications: 200,
        queueName: 'root',
        queuePath: 'root',
        state: 'RUNNING',
        queues: { queue: [] },
      };

      expect(isLeafQueue(parentQueue)).toBe(false);
    });
  });

  describe('isParentQueue', () => {
    it('should identify parent queues', () => {
      const parentQueue: QueueInfo = {
        queueType: 'parent',
        capacity: 100,
        usedCapacity: 60,
        maxCapacity: 100,
        absoluteCapacity: 100,
        absoluteMaxCapacity: 100,
        absoluteUsedCapacity: 60,
        numApplications: 500,
        numActiveApplications: 300,
        numPendingApplications: 200,
        queueName: 'root',
        queuePath: 'root',
        state: 'RUNNING',
        queues: { queue: [] },
      };

      expect(isParentQueue(parentQueue)).toBe(true);
    });
  });

  describe('isValidQueueName', () => {
    it('should accept valid queue names', () => {
      expect(isValidQueueName('production')).toBe(true);
      expect(isValidQueueName('prod-01')).toBe(true);
      expect(isValidQueueName('batch_jobs')).toBe(true);
      expect(isValidQueueName('GPU')).toBe(true);
      expect(isValidQueueName('a')).toBe(true);
    });

    it('should reject queue names with dots', () => {
      expect(isValidQueueName('prod.batch')).toBe(false);
      expect(isValidQueueName('.production')).toBe(false);
      expect(isValidQueueName('production.')).toBe(false);
    });

    it('should reject empty or invalid names', () => {
      expect(isValidQueueName('')).toBe(false);
      expect(isValidQueueName(' ')).toBe(false);
      expect(isValidQueueName('queue name')).toBe(false); // spaces not allowed
      expect(isValidQueueName('queue@special')).toBe(false);
    });
  });
});
