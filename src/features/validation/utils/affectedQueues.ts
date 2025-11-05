import type { SchedulerInfo, StagedChange } from '~/types';
import { findQueueByPath } from '~/utils/queueTreeUtils';
import { getParentQueuePath } from '~/utils/propertyUtils';
import { isTemplateQueuePath } from '~/utils/templateUtils';

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
    const currentQueue = findQueueByPath(schedulerData, queuePath);
    const parentPath = getParentQueuePath(queuePath);

    if (parentPath && !affectedQueues.includes(parentPath)) {
      affectedQueues.push(parentPath);

      const parentQueue = findQueueByPath(schedulerData, parentPath);
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
    const currentQueue = findQueueByPath(schedulerData, queuePath);
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
