import type { SchedulerInfo, QueueInfo } from '~/types';

/**
 * Finds a queue by path in the scheduler data, searching recursively
 */
function findQueueByPathRecursive(queue: QueueInfo | SchedulerInfo, targetPath: string): QueueInfo | null {
  // Check if this is the root (SchedulerInfo)
  if ('queueName' in queue && queue.queueName === 'root' && targetPath === 'root') {
    // Convert SchedulerInfo to QueueInfo-like structure for root
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
      resourcesUsed: {
        memory: 0,
        vCores: 0
      },
      queues: queue.queues
    } as QueueInfo;
  }
  
  // For regular queues
  if ('queuePath' in queue && queue.queuePath === targetPath) {
    return queue as QueueInfo;
  }
  
  if (queue.queues?.queue) {
    for (const child of queue.queues.queue) {
      const found = findQueueByPathRecursive(child, targetPath);
      if (found) return found;
    }
  }
  
  return null;
}

/**
 * Finds a queue by path in the scheduler data
 */
function findQueueInScheduler(schedulerData: SchedulerInfo, queuePath: string): QueueInfo | null {
  return findQueueByPathRecursive(schedulerData, queuePath);
}

/**
 * Identifies queues that need to be validated when a property changes.
 * For example, when changing a child queue's capacity, the parent queue
 * also needs validation for the child capacity sum rule.
 */
export function getAffectedQueuesForValidation(
  propertyName: string,
  queuePath: string,
  schedulerData: SchedulerInfo | null
): string[] {
  const affectedQueues: string[] = [queuePath]; // Always include the current queue
  
  if (!schedulerData) {
    return affectedQueues;
  }
  
  // For capacity changes, include parent queue for child sum validation
  if (propertyName === 'capacity') {
    const currentQueue = findQueueInScheduler(schedulerData, queuePath);
    if (!currentQueue) {
      return affectedQueues;
    }
    
    // If this queue has a parent, add it to affected queues
    const parentPath = getParentQueuePath(queuePath);
    if (parentPath) {
      affectedQueues.push(parentPath);
      
      // Also add sibling queues for capacity type consistency validation
      const parentQueue = findQueueInScheduler(schedulerData, parentPath);
      if (parentQueue?.queues?.queue) {
        parentQueue.queues.queue.forEach(sibling => {
          if (sibling.queuePath !== queuePath && !affectedQueues.includes(sibling.queuePath)) {
            affectedQueues.push(sibling.queuePath);
          }
        });
      }
    }
    
    // If this queue has children, they might be affected by capacity type consistency
    if (currentQueue.queues?.queue?.length) {
      currentQueue.queues.queue.forEach(child => {
        if (!affectedQueues.includes(child.queuePath)) {
          affectedQueues.push(child.queuePath);
        }
      });
    }
  }
  
  // For state changes, include parent and children
  if (propertyName === 'state') {
    const currentQueue = findQueueInScheduler(schedulerData, queuePath);
    if (!currentQueue) {
      return affectedQueues;
    }
    
    // Add parent if exists
    const parentPath = getParentQueuePath(queuePath);
    if (parentPath) {
      affectedQueues.push(parentPath);
    }
    
    // Add all children
    if (currentQueue.queues?.queue?.length) {
      currentQueue.queues.queue.forEach(child => {
        if (!affectedQueues.includes(child.queuePath)) {
          affectedQueues.push(child.queuePath);
        }
      });
    }
  }
  
  return affectedQueues;
}

/**
 * Gets the parent queue path from a queue path.
 * For example: "root.parent.child" -> "root.parent"
 */
function getParentQueuePath(queuePath: string): string | null {
  const parts = queuePath.split('.');
  if (parts.length <= 1) {
    return null; // Root queue has no parent
  }
  return parts.slice(0, -1).join('.');
}

/**
 * Collects validation errors for all affected queues.
 * This ensures cross-queue validation errors (like parent queue errors
 * when a child changes) are properly captured.
 */
export function collectAffectedQueuesValidationErrors(
  affectedQueues: string[],
  allValidationErrors: Array<{ queuePath: string; errors: any[] }>
): any[] {
  const collectedErrors: any[] = [];
  
  affectedQueues.forEach(queuePath => {
    const queueErrors = allValidationErrors.find(item => item.queuePath === queuePath);
    if (queueErrors?.errors) {
      collectedErrors.push(...queueErrors.errors);
    }
  });
  
  return collectedErrors;
}