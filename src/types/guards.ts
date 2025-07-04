import type { QueueInfo } from './queue';
import type { SchedulerInfo } from './scheduler';
import type { ResourceInfo } from './resource';
import type { PropertyDescriptor } from './property-descriptor';
import type { MutationError } from './mutation';
import {
  QUEUE_STATES,
  SCHEDULER_TYPES,
  QUEUE_TYPES,
  CONFIG_PREFIXES,
  SPECIAL_VALUES,
} from './constants';

export function isQueueInfo(obj: unknown): obj is QueueInfo {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  const q = obj as Record<string, unknown>;
  return (
    typeof q.queueType === 'string' &&
    (q.queueType === QUEUE_TYPES.LEAF || q.queueType === QUEUE_TYPES.PARENT) &&
    typeof q.capacity === 'number' &&
    typeof q.usedCapacity === 'number' &&
    typeof q.maxCapacity === 'number' &&
    typeof q.absoluteCapacity === 'number' &&
    typeof q.absoluteMaxCapacity === 'number' &&
    typeof q.absoluteUsedCapacity === 'number' &&
    typeof q.numApplications === 'number' &&
    typeof q.queueName === 'string' &&
    typeof q.queuePath === 'string' &&
    (q.state === QUEUE_STATES.RUNNING || q.state === QUEUE_STATES.STOPPED)
  );
}

export function isCapacitySchedulerInfo(
  obj: SchedulerInfo,
): obj is SchedulerInfo & { type: 'capacityScheduler' } {
  return obj.type === SCHEDULER_TYPES.CAPACITY;
}

export function isLeafQueue(queue: QueueInfo): boolean {
  return queue.queueType === QUEUE_TYPES.LEAF;
}

export function isParentQueue(queue: QueueInfo): boolean {
  return queue.queueType === QUEUE_TYPES.PARENT;
}

export function hasQueueChildren(obj: unknown): boolean {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  const q = obj as Record<string, unknown>;
  return (
    q.queues !== undefined &&
    q.queues !== null &&
    typeof q.queues === 'object' &&
    'queue' in q.queues &&
    Array.isArray((q.queues as any).queue) &&
    ((q.queues as any).queue as unknown[]).length > 0
  );
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

export function isValidPropertyValue(
  value: string,
  descriptor: Pick<PropertyDescriptor, 'type' | 'validationRules' | 'enumValues'>,
): boolean {
  switch (descriptor.type) {
    case 'number':
      const num = parseFloat(value);
      if (isNaN(num)) {
        return false;
      }

      if (descriptor.validationRules) {
        for (const rule of descriptor.validationRules) {
          if (rule.type === 'range') {
            if (rule.min !== undefined && num < rule.min) {
              return false;
            }
            if (rule.max !== undefined && num > rule.max) {
              return false;
            }
          }
        }
      }
      return true;

    case 'boolean':
      return value.toLowerCase() === 'true' || value.toLowerCase() === 'false';

    case 'enum':
      return descriptor.enumValues?.includes(value) ?? false;

    case 'string':
      if (descriptor.validationRules) {
        for (const rule of descriptor.validationRules) {
          if (rule.type === 'pattern' && rule.pattern) {
            const regex = new RegExp(rule.pattern);
            if (!regex.test(value)) {
              return false;
            }
          }
        }
      }
      return true;

    case 'list':
      // Basic validation - could be enhanced
      return true;

    default:
      return false;
  }
}

export function isGlobalProperty(propertyName: string): boolean {
  // Global properties don't have queue paths after yarn.scheduler.capacity
  if (!propertyName.startsWith(CONFIG_PREFIXES.BASE)) {
    return false;
  }

  const remainder = propertyName.substring(CONFIG_PREFIXES.BASE.length + 1);
  // If it starts with 'root.', it's queue-specific
  if (remainder.startsWith(SPECIAL_VALUES.ROOT_QUEUE_NAME + '.')) {
    return false;
  }

  return true;
}

export function isNodeLabelProperty(propertyName: string): boolean {
  return propertyName.includes('accessible-node-labels');
}

export function isResourceInfo(obj: unknown): obj is ResourceInfo {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  const r = obj as Record<string, unknown>;
  return (
    typeof r.memory === 'number' &&
    typeof r.vCores === 'number' &&
    (r.resourceInformations === undefined ||
      (typeof r.resourceInformations === 'object' && r.resourceInformations !== null))
  );
}

export function isMutationError(obj: unknown): obj is MutationError {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  const e = obj as Record<string, unknown>;
  return (
    e.RemoteException !== undefined &&
    typeof e.RemoteException === 'object' &&
    e.RemoteException !== null &&
    typeof (e.RemoteException as any).exception === 'string' &&
    typeof (e.RemoteException as any).message === 'string' &&
    typeof (e.RemoteException as any).javaClassName === 'string'
  );
}
