import type { QueueInfo } from './queue';
import { QUEUE_TYPES } from './constants';

export function isLeafQueue(queue: QueueInfo): boolean {
  return queue.queueType === QUEUE_TYPES.LEAF;
}

export function isParentQueue(queue: QueueInfo): boolean {
  return queue.queueType === QUEUE_TYPES.PARENT;
}

/**
 * Returns an error message if the queue name is invalid, or null if valid.
 * This is the single source of truth for queue name validation rules.
 */
export function getQueueNameValidationError(name: string): string | null {
  if (!name || name.trim() === '') {
    return 'Queue name cannot be empty';
  }

  if (name.trim() !== name) {
    return 'Queue name cannot have leading or trailing whitespace';
  }

  // Queue names cannot contain dots (they are used as path separators)
  if (name.includes('.')) {
    return 'Queue names cannot contain dots (.)';
  }

  // Must match alphanumeric, hyphen, underscore pattern
  if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
    return 'Queue names should only contain letters, numbers, hyphens, and underscores';
  }

  return null;
}

/**
 * Returns true if the queue name is valid.
 */
export function isValidQueueName(name: string): boolean {
  return getQueueNameValidationError(name) === null;
}
