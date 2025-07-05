/**
 * Utilities for working with queue tree structures
 */

import type { QueueInfo } from '~/types';

/**
 * Flatten a queue tree into a flat array of all queues
 * @param root The root queue to start from
 * @returns Array of all queues in the tree
 */
export function flattenQueueTree(root: QueueInfo): QueueInfo[] {
  const result: QueueInfo[] = [root];

  if (root.queues?.queue) {
    root.queues.queue.forEach((child) => {
      result.push(...flattenQueueTree(child));
    });
  }

  return result;
}

/**
 * Traverse a queue tree and call a callback for each queue
 * @param root The root queue to start from
 * @param callback Function to call for each queue
 * @param depth Current depth in the tree (starts at 0)
 * @param parent Parent queue (undefined for root)
 */
export function traverseQueueTree(
  root: QueueInfo,
  callback: (queue: QueueInfo, depth: number, parent?: QueueInfo) => void,
  depth = 0,
  parent?: QueueInfo,
): void {
  callback(root, depth, parent);

  if (root.queues?.queue) {
    root.queues.queue.forEach((child) => {
      traverseQueueTree(child, callback, depth + 1, root);
    });
  }
}

/**
 * Find a queue by its path in the tree
 * @param root The root queue to search from
 * @param path The queue path to find (e.g., "root.production.team1")
 * @returns The queue if found, null otherwise
 */
export function findQueueByPath(root: QueueInfo, path: string): QueueInfo | null {
  if (root.queuePath === path) return root;

  if (root.queues?.queue) {
    for (const child of root.queues.queue) {
      const found = findQueueByPath(child, path);
      if (found) return found;
    }
  }

  return null;
}

// Export as namespace for easier use
export const queueTreeUtils = {
  flattenQueueTree,
  traverseQueueTree,
  findQueueByPath,
};
