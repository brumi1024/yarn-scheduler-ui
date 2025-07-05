import type { QueueValidationContext } from './businessRules/types';
import type { SchedulerInfo, QueueInfo } from '~/types';
import { findQueueByPath, getParentPath, getSiblingQueues } from './businessRules/utils';

interface CreateValidationContextOptions {
  queuePath: string;
  schedulerData: SchedulerInfo | null;
  configData: Map<string, string>;
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
  field
}: CreateValidationContextOptions): QueueValidationContext {
  const legacyModeEnabled = configData.get(
    'yarn.scheduler.capacity.legacy-queue-mode.enabled'
  ) !== 'false';

  let parentQueue: QueueInfo | undefined;
  let siblingQueues: QueueInfo[] | undefined;
  
  if (schedulerData) {
    const parentPath = getParentPath(queuePath);
    if (parentPath) {
      parentQueue = findQueueByPath(schedulerData, parentPath);
    }
    siblingQueues = getSiblingQueues(schedulerData, queuePath);
  }

  return {
    queuePath,
    legacyModeEnabled,
    schedulerData: schedulerData || undefined,
    configData,
    parentQueue,
    siblingQueues,
    field
  };
}