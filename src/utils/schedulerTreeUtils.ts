/**
 * Utilities for working with SchedulerInfo structures
 */

import type { SchedulerInfo, QueueInfo } from '~/types';
import { queueTreeUtils } from './queueTreeUtils';

/**
 * Get all queues from a SchedulerInfo structure without conversion
 * @param scheduler The scheduler info to extract queues from
 * @returns Array of all queues in the scheduler
 */
export function flattenSchedulerTree(scheduler: SchedulerInfo): QueueInfo[] {
  const queues: QueueInfo[] = [];

  if (scheduler.queues?.queue) {
    scheduler.queues.queue.forEach((queue) => {
      queues.push(...queueTreeUtils.flattenQueueTree(queue));
    });
  }

  return queues;
}

/**
 * Filter a scheduler tree based on matching queue paths
 * @param scheduler The scheduler to filter
 * @param matches Set of queue paths that should be included
 * @returns The scheduler with only matching queues, or null if no matches
 */
export function filterSchedulerTree(
  scheduler: SchedulerInfo,
  matches: Set<string>,
): SchedulerInfo | null {
  if (!scheduler.queues?.queue || matches.size === 0) {
    return null;
  }

  // Filter root's children
  const filteredQueues = scheduler.queues.queue
    .map((queue) => filterQueueSubtree(queue, matches))
    .filter((queue): queue is QueueInfo => queue !== null);

  if (filteredQueues.length === 0) {
    return null;
  }

  // Return scheduler with filtered queues
  return {
    ...scheduler,
    queues: {
      queue: filteredQueues,
    },
  };
}

/**
 * Filter a queue subtree based on matching paths
 * @param queue The queue to filter
 * @param matches Set of queue paths that should be included
 * @returns The filtered queue or null if not included
 */
function filterQueueSubtree(queue: QueueInfo, matches: Set<string>): QueueInfo | null {
  if (!matches.has(queue.queuePath)) {
    return null;
  }

  // If this queue has children, filter them too
  if (queue.queues?.queue) {
    const filteredChildren = queue.queues.queue
      .map((child) => filterQueueSubtree(child, matches))
      .filter((child): child is QueueInfo => child !== null);

    return {
      ...queue,
      queues: filteredChildren.length > 0 ? { queue: filteredChildren } : undefined,
    };
  }

  return queue;
}

/**
 * Find all queues matching a search query
 * @param scheduler The scheduler to search in
 * @param searchQuery The search query
 * @returns Set of queue paths that match, including ancestors and descendants
 */
export function findMatchingQueues(scheduler: SchedulerInfo, searchQuery: string): Set<string> {
  const matches = new Set<string>();
  const lowerQuery = searchQuery.toLowerCase();

  // Get all queues
  const allQueues = flattenSchedulerTree(scheduler);

  // Find direct matches
  allQueues.forEach((queue) => {
    if (
      queue.queueName.toLowerCase().includes(lowerQuery) ||
      queue.queuePath.toLowerCase().includes(lowerQuery)
    ) {
      // Add the match itself
      matches.add(queue.queuePath);

      // Add all ancestors
      const pathParts = queue.queuePath.split('.');
      for (let i = 1; i <= pathParts.length; i++) {
        matches.add(pathParts.slice(0, i).join('.'));
      }

      // Add all descendants
      allQueues.forEach((otherQueue) => {
        if (otherQueue.queuePath.startsWith(queue.queuePath + '.')) {
          matches.add(otherQueue.queuePath);
        }
      });
    }
  });

  return matches;
}

// Export as namespace for consistency with queueTreeUtils
export const schedulerTreeUtils = {
  flattenSchedulerTree,
  filterSchedulerTree,
  findMatchingQueues,
};
