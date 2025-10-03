import type { BusinessValidator, BusinessValidationError } from './types';
import { findQueueByPath } from './utils';

export const validateQueueStateTransition: BusinessValidator<string> = (newState, context) => {
  if (!['RUNNING', 'STOPPED'].includes(newState)) {
    return { valid: true, errors: [] };
  }

  if (newState === 'RUNNING' && context.parentQueue) {
    const parentState = context.parentQueue.state;
    if (parentState !== 'RUNNING') {
      return {
        valid: false,
        errors: [
          {
            field: 'state',
            message: 'Cannot set queue to RUNNING when parent is not RUNNING',
            severity: 'error',
            rule: 'parent-state-dependency',
          },
        ],
      };
    }
  }

  if (newState === 'STOPPED') {
    const queue = findQueueByPath(context.schedulerData, context.queuePath);
    if (queue?.queues?.queue?.length) {
      const runningChildren = queue.queues.queue.filter((child) => child.state === 'RUNNING');
      if (runningChildren.length > 0) {
        return {
          valid: false,
          errors: [
            {
              field: 'state',
              message: `Cannot stop queue with ${runningChildren.length} running child queue(s)`,
              severity: 'error',
              rule: 'child-state-dependency',
            },
          ],
        };
      }
    }
  }

  return { valid: true, errors: [] };
};

export const validateQueueDeletion: BusinessValidator = (_, context) => {
  const queue = findQueueByPath(context.schedulerData, context.queuePath);

  if (!queue) {
    return { valid: true, errors: [] };
  }

  const errors: BusinessValidationError[] = [];

  if (queue.state !== 'STOPPED') {
    errors.push({
      field: 'deletion',
      message: 'Queue must be in STOPPED state before deletion',
      severity: 'error',
      rule: 'deletion-state-requirement',
    });
  }

  if (queue.numApplications > 0) {
    errors.push({
      field: 'deletion',
      message: `Queue has ${queue.numApplications} active application(s) and cannot be deleted`,
      severity: 'error',
      rule: 'deletion-empty-requirement',
    });
  }

  if (queue.queues?.queue?.length) {
    errors.push({
      field: 'deletion',
      message: `Queue has ${queue.queues.queue.length} child queue(s) and cannot be deleted`,
      severity: 'error',
      rule: 'deletion-no-children-requirement',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

export const validateQueueConversion: BusinessValidator = (_, context) => {
  const queue = findQueueByPath(context.schedulerData, context.queuePath);

  if (!queue) {
    return { valid: true, errors: [] };
  }

  const errors: BusinessValidationError[] = [];

  if (queue.state !== 'STOPPED') {
    errors.push({
      field: 'conversion',
      message: 'Queue must be in STOPPED state before conversion',
      severity: 'error',
      rule: 'conversion-state-requirement',
    });
  }

  if (queue.numApplications > 0) {
    errors.push({
      field: 'conversion',
      message: `Queue has ${queue.numApplications} active application(s) and cannot be converted`,
      severity: 'error',
      rule: 'conversion-empty-requirement',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};
