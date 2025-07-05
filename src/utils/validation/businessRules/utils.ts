import type { QueueInfo, SchedulerInfo } from '~/types';

export function findQueueByPath(
  schedulerData: SchedulerInfo | undefined,
  queuePath: string
): QueueInfo | undefined {
  if (!schedulerData?.queues?.queue || !queuePath) {
    return undefined;
  }

  // Handle root queue
  if (queuePath === 'root' && schedulerData.queueName === 'root') {
    return schedulerData as unknown as QueueInfo;
  }

  const pathParts = queuePath.split('.');
  
  // Start from the scheduler root
  let currentQueue: QueueInfo | undefined = schedulerData as unknown as QueueInfo;

  if (!currentQueue || pathParts[0] !== currentQueue.queueName) {
    return undefined;
  }

  for (let i = 1; i < pathParts.length; i++) {
    if (!currentQueue?.queues?.queue) {
      return undefined;
    }

    currentQueue = currentQueue.queues.queue.find(
      (q) => q.queueName === pathParts[i]
    );

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
  schedulerData: SchedulerInfo | undefined,
  queuePath: string
): QueueInfo[] {
  const parentPath = getParentPath(queuePath);
  if (!parentPath) {
    return [];
  }

  const parentQueue = findQueueByPath(schedulerData, parentPath);
  return parentQueue?.queues?.queue || [];
}