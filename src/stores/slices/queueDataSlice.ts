/**
 * Queue data slice - provides getter functions for queue information
 */

import type { StateCreator } from 'zustand';
import { SPECIAL_VALUES, CONFIG_PREFIXES } from '~/types';
import type { QueueInfo } from '~/types';
import { buildGlobalPropertyKey, buildPropertyKey } from '~/utils/propertyUtils';
import { globalPropertyDefinitions } from '~/config/properties/global-properties';
import type { QueueDataSlice, SchedulerStore } from './types';

export const createQueueDataSlice: StateCreator<
  SchedulerStore,
  [['zustand/immer', never]],
  [],
  QueueDataSlice
> = (_set, get) => ({
  getQueuePropertyValue: (queuePath, property) => {
    const propertyKey = buildPropertyKey(queuePath, property);
    const configValue = get().configData.get(propertyKey) || '';

    // Check if there's a staged change for this property
    const stagedChange = get().stagedChanges.find(
      (c) => c.queuePath === queuePath && c.property === property,
    );

    if (stagedChange && stagedChange.newValue !== undefined) {
      return { value: stagedChange.newValue, isStaged: true };
    }

    return { value: configValue, isStaged: false };
  },

  getGlobalPropertyValue: (property) => {
    const propertyKey = buildGlobalPropertyKey(property);
    const configValue = get().configData.get(propertyKey);

    // Check if there's a staged change for this property
    const stagedChange = get().stagedChanges.find(
      (c) => c.queuePath === SPECIAL_VALUES.GLOBAL_QUEUE_PATH && c.property === property,
    );

    if (stagedChange && stagedChange.newValue !== undefined) {
      return { value: stagedChange.newValue, isStaged: true };
    }

    // If config doesn't have the value, check for default value
    if (configValue === undefined || configValue === null) {
      const propertyDef = globalPropertyDefinitions.find((p) => p.name === property);
      const defaultValue = propertyDef?.defaultValue || '';
      return { value: defaultValue, isStaged: false };
    }

    return { value: configValue, isStaged: false };
  },

  getQueueByPath: (queuePath) => {
    const schedulerData = get().schedulerData;
    if (!schedulerData) return null;

    // Handle root queue - create a QueueInfo-compatible object from schedulerData
    if (queuePath === SPECIAL_VALUES.ROOT_QUEUE_NAME) {
      // Convert SchedulerInfo to QueueInfo format
      const rootQueueInfo: QueueInfo = {
        queueType: 'parent' as const,
        queueName: schedulerData.queueName,
        queuePath: SPECIAL_VALUES.ROOT_QUEUE_NAME,
        capacity: schedulerData.capacity,
        usedCapacity: schedulerData.usedCapacity,
        maxCapacity: schedulerData.maxCapacity,
        absoluteCapacity: schedulerData.capacity,
        absoluteMaxCapacity: schedulerData.maxCapacity,
        absoluteUsedCapacity: schedulerData.usedCapacity,
        numApplications: 0,
        numActiveApplications: 0,
        numPendingApplications: 0,
        state: 'RUNNING',
        queues: schedulerData.queues,
        resourcesUsed: {
          memory: 0,
          vCores: 0,
        },
      };
      return rootQueueInfo;
    }

    const pathParts = queuePath.split('.');

    // Find in the queue tree
    if (!schedulerData.queues?.queue) return null;

    const children = Array.isArray(schedulerData.queues.queue)
      ? schedulerData.queues.queue
      : [schedulerData.queues.queue];

    // Start traversing from root's children
    let currentQueue: QueueInfo | null = null;

    for (let i = 1; i < pathParts.length; i++) {
      const queueName = pathParts[i];

      if (i === 1) {
        // First level - search in root's children
        currentQueue = children.find((q: QueueInfo) => q.queueName === queueName) || null;
      } else {
        // Deeper levels - search in current queue's children
        if (!currentQueue?.queues?.queue) return null;

        const currentChildren: QueueInfo[] = Array.isArray(currentQueue.queues.queue)
          ? currentQueue.queues.queue
          : [currentQueue.queues.queue];

        currentQueue = currentChildren.find((q: QueueInfo) => q.queueName === queueName) || null;
      }

      if (!currentQueue) return null;
    }

    return currentQueue;
  },

  getChildQueues: (parentPath) => {
    const parentQueue = get().getQueueByPath(parentPath);
    if (!parentQueue || !parentQueue.queues?.queue) return [];

    return Array.isArray(parentQueue.queues.queue)
      ? parentQueue.queues.queue
      : [parentQueue.queues.queue];
  },
});

/**
 * Helper function to traverse queue tree and apply a visitor function
 */
export function traverseQueueTree(
  queueInfo: QueueInfo,
  configData: Map<string, string>,
  visitor: (queue: QueueInfo & { configured: Record<string, string> }) => void,
): void {
  const configured: Record<string, string> = {};

  const prefix = `${CONFIG_PREFIXES.BASE}.${queueInfo.queuePath}.`;
  for (const [key, value] of configData.entries()) {
    if (key.startsWith(prefix)) {
      const property = key.substring(prefix.length);
      configured[property] = value;
    }
  }

  const combinedQueue = {
    ...queueInfo,
    configured,
  };

  visitor(combinedQueue);

  if (queueInfo.queues?.queue) {
    const children = Array.isArray(queueInfo.queues.queue)
      ? queueInfo.queues.queue
      : [queueInfo.queues.queue];

    for (const child of children) {
      traverseQueueTree(child, configData, visitor);
    }
  }
}
