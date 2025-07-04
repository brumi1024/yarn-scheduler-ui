import type { QueueInfo, PropertyDescriptor, StagedChange, NodeLabel } from '~/types';

// Factory functions for test data following CLAUDE.md pattern

export const getMockQueueInfo = (overrides?: Partial<QueueInfo>): QueueInfo => {
  return {
    queueType: 'leaf',
    queueName: 'default',
    queuePath: 'root.default',
    capacity: 10,
    maxCapacity: 100,
    absoluteCapacity: 10,
    absoluteMaxCapacity: 100,
    absoluteUsedCapacity: 5,
    usedCapacity: 5,
    numApplications: 2,
    numPendingApplications: 0,
    numActiveApplications: 2,
    state: 'RUNNING',
    queues: undefined,
    ...overrides,
  };
};

export const getMockPropertyDescriptor = (
  overrides?: Partial<PropertyDescriptor>,
): PropertyDescriptor => {
  return {
    name: 'capacity',
    displayName: 'Capacity',
    description: 'Queue capacity as percentage, weight, or absolute resources',
    type: 'string',
    category: 'general',
    required: true,
    defaultValue: '0',
    ...overrides,
  };
};

export const getMockStagedChange = (overrides?: Partial<StagedChange>): StagedChange => {
  return {
    id: 'change-1',
    queuePath: 'root.default',
    property: 'capacity',
    oldValue: '10',
    newValue: '20',
    type: 'update',
    timestamp: Date.now(),
    ...overrides,
  };
};

export const getMockNodeLabel = (overrides?: Partial<NodeLabel>): NodeLabel => {
  return {
    name: 'gpu',
    exclusivity: true,
    ...overrides,
  };
};
