import type { QueueInfo, SchedulerInfo } from '~/types';
import { QUEUE_STATES, QUEUE_TYPES } from '~/types/constants/queue';

export function findQueueByPath(
  schedulerData: SchedulerInfo | undefined | null,
  queuePath: string,
): QueueInfo | undefined {
  if (!schedulerData?.queues?.queue || !queuePath) {
    return undefined;
  }

  if (queuePath === 'root' && schedulerData.queueName === 'root') {
    return schedulerData as unknown as QueueInfo;
  }

  const pathParts = queuePath.split('.');
  let currentQueue: QueueInfo | undefined = schedulerData as unknown as QueueInfo;

  if (!currentQueue || pathParts[0] !== currentQueue.queueName) {
    return undefined;
  }

  for (let i = 1; i < pathParts.length; i += 1) {
    if (!currentQueue?.queues?.queue) {
      return undefined;
    }

    currentQueue = currentQueue.queues.queue.find((q) => q.queueName === pathParts[i]);

    if (!currentQueue) {
      return undefined;
    }
  }

  return currentQueue;
}

export function getParentPath(queuePath: string): string | undefined {
  const lastDotIndex = queuePath.lastIndexOf('.');
  return lastDotIndex > 0 ? queuePath.substring(0, lastDotIndex) : undefined;
}

export function getSiblingQueues(
  schedulerData: SchedulerInfo | undefined | null,
  queuePath: string,
): QueueInfo[] {
  const parentPath = getParentPath(queuePath);
  if (!parentPath) {
    return [];
  }

  const parentQueue = findQueueByPath(schedulerData, parentPath);
  return parentQueue?.queues?.queue || [];
}

export function createSyntheticQueueInfo(queuePath: string): QueueInfo {
  const queueName = queuePath.split('.').pop() || queuePath;

  return {
    queueType: QUEUE_TYPES.LEAF,
    capacity: 0,
    usedCapacity: 0,
    maxCapacity: 100,
    absoluteCapacity: 0,
    absoluteMaxCapacity: 100,
    absoluteUsedCapacity: 0,
    numApplications: 0,
    numActiveApplications: 0,
    numPendingApplications: 0,
    queueName,
    queuePath,
    state: QUEUE_STATES.RUNNING,
  };
}
