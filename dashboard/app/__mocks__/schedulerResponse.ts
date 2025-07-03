import type { SchedulerInfo, ConfigInfo, NodeLabelsInfo, VersionInfo } from '~/types';

export const mockSchedulerResponse: SchedulerInfo = {
  scheduler: {
    schedulerInfo: {
      type: 'capacityScheduler',
      capacity: 100,
      usedCapacity: 50,
      maxCapacity: 100,
      queueName: 'root',
      queues: {
        queue: [{
          queueName: 'default',
          capacity: 100,
          usedCapacity: 0,
          maxCapacity: 100,
          absoluteCapacity: 100,
          absoluteMaxCapacity: 100,
          absoluteUsedCapacity: 0,
          numApplications: 0,
          queuePath: 'root.default',
          queues: { queue: [] },
          resourcesUsed: {
            memory: 0,
            vCores: 0,
          },
          state: 'RUNNING',
        }],
      },
    },
  },
};

export const mockConfigResponse: ConfigInfo = {
  property: [
    {
      name: 'yarn.scheduler.capacity.root.queues',
      value: 'default',
    },
    {
      name: 'yarn.scheduler.capacity.root.default.capacity',
      value: '100',
    },
  ],
};

export const mockNodeLabelsResponse: NodeLabelsInfo = {
  nodeLabels: [],
  nodeToLabels: {
    nodeLabels: {},
  },
};

export const mockVersionResponse: VersionInfo = {
  resourceManagerVersion: '3.4.0',
  resourceManagerBuildVersion: '3.4.0',
  resourceManagerVersionBuiltOn: '2024-01-01T00:00:00Z',
  hadoopVersion: '3.4.0',
  hadoopBuildVersion: '3.4.0',
  hadoopVersionBuiltOn: '2024-01-01T00:00:00Z',
};