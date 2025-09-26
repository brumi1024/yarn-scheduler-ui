import type { QueueValidationContext } from './businessRules/types';
import type { SchedulerInfo, QueueInfo, StagedChange } from '~/types';
import { SPECIAL_VALUES } from '~/types';
import {
  createSyntheticQueueInfo,
  findQueueByPath,
  getParentPath,
  getSiblingQueues,
} from './businessRules/utils';

interface CreateValidationContextOptions {
  queuePath: string;
  schedulerData: SchedulerInfo | null;
  configData: Map<string, string>;
  stagedChanges?: StagedChange[];
  field?: string;
}

/**
 * Creates a consistent validation context for a queue.
 * This ensures all validation runs use the same context structure.
 */
export function createValidationContext({
  queuePath,
  schedulerData,
  configData,
  stagedChanges = [],
  field,
}: CreateValidationContextOptions): QueueValidationContext {
  const legacyModeEnabled = configData.get(SPECIAL_VALUES.LEGACY_MODE_PROPERTY) !== 'false';

  let parentQueue: QueueInfo | undefined;
  let siblingQueues: QueueInfo[] | undefined;

  if (schedulerData) {
    const parentPath = getParentPath(queuePath);
    if (parentPath) {
      parentQueue = findQueueByPath(schedulerData, parentPath);
    }
    siblingQueues = getSiblingQueues(schedulerData, queuePath);
  }

  const parentPath = getParentPath(queuePath);

  if (parentPath) {
    const siblingMap = new Map<string, QueueInfo>();

    (siblingQueues ?? []).forEach((queue) => {
      siblingMap.set(queue.queuePath, queue);
    });

    if (stagedChanges.length > 0) {
      const additionPaths = new Set(
        stagedChanges
          .filter(
            (change) => change.type === 'add' && getParentPath(change.queuePath) === parentPath,
          )
          .map((change) => change.queuePath),
      );

      const removalPaths = new Set(
        stagedChanges
          .filter(
            (change) => change.type === 'remove' && getParentPath(change.queuePath) === parentPath,
          )
          .map((change) => change.queuePath),
      );

      removalPaths.forEach((path) => siblingMap.delete(path));

      additionPaths.forEach((path) => {
        if (!siblingMap.has(path)) {
          siblingMap.set(path, createSyntheticQueueInfo(path));
        }
      });
    }

    siblingQueues = Array.from(siblingMap.values());
  }

  return {
    queuePath,
    legacyModeEnabled,
    schedulerData: schedulerData || undefined,
    configData,
    parentQueue,
    siblingQueues,
    stagedChanges,
    field,
  };
}
