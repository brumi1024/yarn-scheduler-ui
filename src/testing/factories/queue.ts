/**
 * Test data factory for queue objects
 */

import type { QueueInfo } from '~/types';

interface QueueOverrides extends Partial<QueueInfo> {
  children?: QueueOverrides[];
}

/**
 * Factory for creating test queue data
 */
export const queueFactory = {
  /**
   * Build a single queue with optional overrides
   */
  build: (overrides?: Partial<QueueInfo>): QueueInfo => {
    const defaults: QueueInfo = {
      queueName: 'default',
      queuePath: 'root.default',
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
      queueType: 'leaf',
      resourcesUsed: {
        memory: 0,
        vCores: 0,
      },
      creationMethod: 'static',
    };

    return { ...defaults, ...overrides };
  },

  /**
   * Build a root queue with optional overrides
   */
  buildRoot: (overrides?: Partial<QueueInfo>): QueueInfo => {
    return queueFactory.build({
      queueName: 'root',
      queuePath: 'root',
      capacity: 100,
      absoluteCapacity: 100,
      ...overrides,
    });
  },

  /**
   * Build a queue tree structure
   */
  buildTree: (rootOverrides?: QueueOverrides): QueueInfo => {
    const { children, ...rootProps } = rootOverrides || {};
    const root = queueFactory.buildRoot(rootProps);

    if (children && children.length > 0) {
      root.queues = {
        queue: children.map((childOverride) => {
          const { children: grandchildren, ...childProps } = childOverride;
          const child = queueFactory.build({
            ...childProps,
            queuePath:
              childProps.queuePath || `${root.queuePath}.${childProps.queueName || 'child'}`,
          });

          if (grandchildren && grandchildren.length > 0) {
            child.queues = {
              queue: grandchildren.map((gcOverride) =>
                queueFactory.build({
                  ...gcOverride,
                  queuePath:
                    gcOverride.queuePath ||
                    `${child.queuePath}.${gcOverride.queueName || 'grandchild'}`,
                }),
              ),
            };
          }

          return child;
        }),
      };
    }

    return root;
  },

  /**
   * Build a typical production queue tree
   */
  buildProductionTree: (): QueueInfo => {
    return queueFactory.buildTree({
      children: [
        {
          queueName: 'default',
          capacity: 20,
          absoluteCapacity: 20,
        },
        {
          queueName: 'production',
          capacity: 60,
          absoluteCapacity: 60,
          children: [
            {
              queueName: 'critical',
              capacity: 60,
              absoluteCapacity: 36,
            },
            {
              queueName: 'batch',
              capacity: 40,
              absoluteCapacity: 24,
            },
          ],
        },
        {
          queueName: 'development',
          capacity: 20,
          absoluteCapacity: 20,
          children: [
            {
              queueName: 'team-a',
              capacity: 50,
              absoluteCapacity: 10,
            },
            {
              queueName: 'team-b',
              capacity: 50,
              absoluteCapacity: 10,
            },
          ],
        },
      ],
    });
  },
};
