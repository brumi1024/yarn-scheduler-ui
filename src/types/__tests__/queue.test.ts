import { describe, it, expect } from 'vitest';
import type { QueueNode, QueueInfo, QueueMetrics, QueueType } from '~/types';

describe('QueueNode interface', () => {
  it('should accept valid queue node structure', () => {
    const validQueueNode: QueueNode = {
      path: 'root.production',
      name: 'production',
      type: 'parent',
      properties: new Map([
        ['capacity', '70'],
        ['maximum-capacity', '100'],
      ]),
      children: [],
      metrics: {
        usedCapacity: 45.5,
        absoluteUsedCapacity: 31.85,
        numApplications: 150,
        numActiveApplications: 25,
        numPendingApplications: 10,
        resourcesUsed: {
          memory: 4096,
          vCores: 8,
        },
      },
      labelConfigs: new Map(),
    };

    expect(validQueueNode).toBeDefined();
    expect(validQueueNode.path).toBe('root.production');
    expect(validQueueNode.type).toBe('parent');
  });

  it('should handle leaf queue without children', () => {
    const leafQueue: QueueNode = {
      path: 'root.production.batch',
      name: 'batch',
      type: 'leaf',
      properties: new Map([['capacity', '60']]),
      children: [],
      labelConfigs: new Map([
        [
          'gpu',
          {
            name: 'gpu',
            capacity: 80,
            maximumCapacity: 100,
            isAccessible: true,
          },
        ],
      ]),
    };

    expect(leafQueue.type).toBe('leaf');
    expect(leafQueue.children).toHaveLength(0);
    expect(leafQueue.labelConfigs.get('gpu')?.capacity).toBe(80);
  });

  it('should handle queue without metrics', () => {
    const queueWithoutMetrics: QueueNode = {
      path: 'root.dev',
      name: 'dev',
      type: 'parent',
      properties: new Map(),
      children: [],
      labelConfigs: new Map(),
    };

    expect(queueWithoutMetrics.metrics).toBeUndefined();
  });
});

describe('QueueInfo interface', () => {
  it('should accept valid scheduler queue info', () => {
    const queueInfo: QueueInfo = {
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
      queueName: 'production',
      queuePath: 'root.production',
      state: 'RUNNING',
    };

    expect(queueInfo.state).toBe('RUNNING');
    expect(queueInfo.queuePath).toBe('root.production');
  });

  it('should handle parent queue with child queues', () => {
    const parentQueueInfo: QueueInfo = {
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
      queues: {
        queue: [
          {
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
            queueName: 'production',
            queuePath: 'root.production',
            state: 'RUNNING',
          },
        ],
      },
    };

    expect(parentQueueInfo.queues).toBeDefined();
    expect(parentQueueInfo.queues?.queue).toHaveLength(1);
    expect(parentQueueInfo.queues?.queue[0].queueName).toBe('production');
  });

  it('should handle stopped queue state', () => {
    const stoppedQueue: QueueInfo = {
      queueType: 'leaf',
      capacity: 20,
      usedCapacity: 0,
      maxCapacity: 50,
      absoluteCapacity: 20,
      absoluteMaxCapacity: 50,
      absoluteUsedCapacity: 0,
      numApplications: 0,
      numActiveApplications: 0,
      numPendingApplications: 0,
      queueName: 'maintenance',
      queuePath: 'root.maintenance',
      state: 'STOPPED',
    };

    expect(stoppedQueue.state).toBe('STOPPED');
    expect(stoppedQueue.usedCapacity).toBe(0);
  });
});

describe('QueueMetrics interface', () => {
  it('should accept valid queue metrics', () => {
    const metrics: QueueMetrics = {
      usedCapacity: 45.5,
      absoluteUsedCapacity: 31.85,
      numApplications: 150,
      numActiveApplications: 25,
      numPendingApplications: 10,
      resourcesUsed: {
        memory: 4096,
        vCores: 8,
      },
    };

    expect(metrics.usedCapacity).toBe(45.5);
    expect(metrics.resourcesUsed.memory).toBe(4096);
    expect(metrics.resourcesUsed.vCores).toBe(8);
  });

  it('should handle metrics with extended resource information', () => {
    const metricsWithExtendedResources: QueueMetrics = {
      usedCapacity: 60,
      absoluteUsedCapacity: 42,
      numApplications: 200,
      numActiveApplications: 50,
      numPendingApplications: 20,
      resourcesUsed: {
        memory: 8192,
        vCores: 16,
        resourceInformations: {
          gpu: 4,
          fpga: 2,
        },
      },
    };

    expect(metricsWithExtendedResources.resourcesUsed.resourceInformations).toBeDefined();
    expect(metricsWithExtendedResources.resourcesUsed.resourceInformations?.['gpu']).toBe(4);
  });
});

describe('QueueType', () => {
  it('should only accept valid queue types', () => {
    const leafType: QueueType = 'leaf';
    const parentType: QueueType = 'parent';

    expect(leafType).toBe('leaf');
    expect(parentType).toBe('parent');

    // TypeScript should prevent invalid values at compile time
    // The following would cause a TypeScript error:
    // const invalidType: QueueType = 'invalid';
  });
});
