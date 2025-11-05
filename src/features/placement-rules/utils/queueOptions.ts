import type { QueueInfo, SchedulerInfo } from '~/types';

export interface QueueOption {
  value: string;
  label: string;
}

/**
 * Generic function to recursively collect queues from the tree
 * @param queue - The queue to process
 * @param result - Array to collect results
 * @param filter - Optional filter function to determine which queues to include
 */
function collectQueues(
  queue: QueueInfo,
  result: QueueOption[],
  filter?: (queue: QueueInfo) => boolean,
): void {
  // Add this queue if it passes the filter (or no filter is provided)
  if (!filter || filter(queue)) {
    result.push({
      value: queue.queuePath,
      label: queue.queuePath,
    });
  }

  // Recursively process children if they exist
  if (queue.queues?.queue) {
    const children = Array.isArray(queue.queues.queue) ? queue.queues.queue : [queue.queues.queue];

    for (const child of children) {
      collectQueues(child, result, filter);
    }
  }
}

/**
 * Check if a queue has children (is a parent queue)
 */
function isParentQueue(queue: QueueInfo): boolean {
  return !!(
    queue.queues?.queue &&
    (Array.isArray(queue.queues.queue) ? queue.queues.queue.length > 0 : true)
  );
}

/**
 * Generic function to get queues from scheduler data
 * @param schedulerData - The scheduler data
 * @param filter - Optional filter function to determine which queues to include
 */
function getQueues(
  schedulerData: SchedulerInfo | null,
  filter?: (queue: QueueInfo) => boolean,
): QueueOption[] {
  if (!schedulerData) {
    return [];
  }

  const result: QueueOption[] = [];

  // Add root queue
  result.push({
    value: 'root',
    label: 'root',
  });

  // Process child queues
  if (schedulerData.queues?.queue) {
    const children = Array.isArray(schedulerData.queues.queue)
      ? schedulerData.queues.queue
      : [schedulerData.queues.queue];

    for (const child of children) {
      collectQueues(child, result, filter);
    }
  }

  return result.sort((a, b) => a.value.localeCompare(b.value));
}

/**
 * Get all parent queue paths from the scheduler data
 * Returns an array of queue options suitable for use in a combobox
 */
export function getAllParentQueues(schedulerData: SchedulerInfo | null): QueueOption[] {
  return getQueues(schedulerData, isParentQueue);
}

/**
 * Get all queue paths from the scheduler data
 * Returns an array of queue options suitable for use in a combobox
 * This includes both parent and leaf queues
 */
export function getAllQueues(schedulerData: SchedulerInfo | null): QueueOption[] {
  return getQueues(schedulerData);
}
