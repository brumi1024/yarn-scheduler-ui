import type { QueueInfo } from './queue';
import { QUEUE_TYPES } from './constants';

export function isLeafQueue(queue: QueueInfo): boolean {
  return queue.queueType === QUEUE_TYPES.LEAF;
}

export function isParentQueue(queue: QueueInfo): boolean {
  return queue.queueType === QUEUE_TYPES.PARENT;
}

export function isValidQueueName(name: string): boolean {
  if (!name || name.trim() !== name) {
    return false;
  }

  // Queue names cannot contain dots
  if (name.includes('.')) {
    return false;
  }

  // Must match alphanumeric, hyphen, underscore pattern
  return /^[a-zA-Z0-9_-]+$/.test(name);
}
