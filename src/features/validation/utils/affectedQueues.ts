import type { SchedulerInfo, QueueInfo, StagedChange } from '~/types';

function findQueueByPathRecursive(
  queue: QueueInfo | SchedulerInfo,
  targetPath: string,
): QueueInfo | null {
  if ('queueName' in queue && queue.queueName === 'root' && targetPath === 'root') {
    return {
      queuePath: 'root',
      queueName: 'root',
      queueType: 'parent',
      capacity: queue.capacity,
      usedCapacity: queue.usedCapacity,
      maxCapacity: queue.maxCapacity,
      absoluteCapacity: queue.capacity,
      absoluteMaxCapacity: queue.maxCapacity,
      absoluteUsedCapacity: queue.usedCapacity,
      numApplications: 0,
      numActiveApplications: 0,
      numPendingApplications: 0,
      state: 'RUNNING',
      resourcesUsed: queue.queues?.queue?.[0]?.resourcesUsed ?? { memory: 0, vCores: 0 },
      queues: queue.queues,
    } as QueueInfo;
  }

  if ('queuePath' in queue && queue.queuePath === targetPath) {
    return queue as QueueInfo;
  }

  if (queue.queues?.queue) {
    for (const child of queue.queues.queue) {
      const found = findQueueByPathRecursive(child, targetPath);
      if (found) {
        return found;
      }
    }
  }

  return null;
}

function findQueueInScheduler(schedulerData: SchedulerInfo, queuePath: string): QueueInfo | null {
  return findQueueByPathRecursive(schedulerData, queuePath);
}

function getParentQueuePath(queuePath: string): string | null {
  const parts = queuePath.split('.');
  if (parts.length <= 1) {
    return null;
  }
  return parts.slice(0, -1).join('.');
}

function isTemplateQueuePath(queuePath: string): boolean {
  return queuePath.includes('leaf-queue-template') || queuePath.includes('auto-queue-creation-v2.');
}

export function getAffectedQueuesForValidation(
  propertyName: string,
  queuePath: string,
  schedulerData: SchedulerInfo | null,
  stagedChanges: StagedChange[] = [],
): string[] {
  const affectedQueues: string[] = [queuePath];

  if (isTemplateQueuePath(queuePath)) {
    return affectedQueues;
  }

  if (!schedulerData) {
    return affectedQueues;
  }

  if (propertyName === 'capacity') {
    const currentQueue = findQueueInScheduler(schedulerData, queuePath);
    const parentPath = getParentQueuePath(queuePath);

    if (parentPath && !affectedQueues.includes(parentPath)) {
      affectedQueues.push(parentPath);

      const parentQueue = findQueueInScheduler(schedulerData, parentPath);
      if (parentQueue?.queues?.queue) {
        parentQueue.queues.queue.forEach((sibling) => {
          if (sibling.queuePath !== queuePath && !affectedQueues.includes(sibling.queuePath)) {
            affectedQueues.push(sibling.queuePath);
          }
        });
      }

      stagedChanges
        .filter(
          (change) => change.type === 'add' && getParentQueuePath(change.queuePath) === parentPath,
        )
        .forEach((change) => {
          if (!affectedQueues.includes(change.queuePath)) {
            affectedQueues.push(change.queuePath);
          }
        });
    }

    if (currentQueue?.queues?.queue?.length) {
      currentQueue.queues.queue.forEach((child) => {
        if (!affectedQueues.includes(child.queuePath)) {
          affectedQueues.push(child.queuePath);
        }
      });
    }
  }

  if (propertyName === 'state') {
    const currentQueue = findQueueInScheduler(schedulerData, queuePath);
    if (!currentQueue) {
      return affectedQueues;
    }

    const parentPath = getParentQueuePath(queuePath);
    if (parentPath) {
      affectedQueues.push(parentPath);
    }

    if (currentQueue.queues?.queue?.length) {
      currentQueue.queues.queue.forEach((child) => {
        if (!affectedQueues.includes(child.queuePath)) {
          affectedQueues.push(child.queuePath);
        }
      });
    }
  }

  return affectedQueues;
}

export function collectAffectedQueuesValidationErrors(
  affectedQueues: string[],
  allValidationErrors: Array<{ queuePath: string; errors: unknown[] }>,
): unknown[] {
  const collectedErrors: unknown[] = [];

  affectedQueues.forEach((queuePath) => {
    const queueErrors = allValidationErrors.find((item) => item.queuePath === queuePath);
    if (queueErrors?.errors) {
      collectedErrors.push(...queueErrors.errors);
    }
  });

  return collectedErrors;
}
