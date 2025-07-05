import { parseCapacityValue, getCapacityType } from '~/utils/capacityUtils';
import type { BusinessValidator, QueueValidationContext, BusinessValidationError } from './types';
import { findQueueByPath } from './utils';

export const validateCapacityTypeConsistency: BusinessValidator<string> = (value, context) => {
  if (!context.legacyModeEnabled || !context.siblingQueues) {
    return { valid: true, errors: [] };
  }

  const currentType = getCapacityType(value);
  if (!currentType) {
    return { valid: true, errors: [] };
  }

  const inconsistentSiblings: string[] = [];

  for (const sibling of context.siblingQueues) {
    if (sibling.queuePath === context.queuePath) continue;

    const siblingCapacity = context.configData.get(
      `yarn.scheduler.capacity.${sibling.queuePath}.capacity`,
    );

    if (siblingCapacity) {
      const siblingType = getCapacityType(siblingCapacity);
      if (siblingType && siblingType !== currentType) {
        inconsistentSiblings.push(sibling.queueName);
      }
    }
  }

  if (inconsistentSiblings.length > 0) {
    return {
      valid: false,
      errors: [
        {
          field: 'capacity',
          message: `All sibling queues must use the same capacity type (legacy mode requirement). Inconsistent siblings: ${inconsistentSiblings.join(', ')}`,
          severity: 'error',
          rule: 'capacity-type-consistency',
        },
      ],
    };
  }

  return { valid: true, errors: [] };
};

export const validateChildCapacitySum: BusinessValidator = (_, context) => {
  if (!context.legacyModeEnabled || !context.queuePath) {
    return { valid: true, errors: [] };
  }

  const queue = findQueueByPath(context.schedulerData, context.queuePath);
  if (!queue?.queues?.queue?.length) {
    return { valid: true, errors: [] };
  }

  const childCapacities: number[] = [];
  let allPercentages = true;

  for (const child of queue.queues.queue) {
    const capacity = context.configData.get(`yarn.scheduler.capacity.${child.queuePath}.capacity`);

    if (!capacity) continue;

    const parsed = parseCapacityValue(capacity);
    if (!parsed) continue;

    if (parsed.type !== 'percentage') {
      allPercentages = false;
      break;
    }

    childCapacities.push(parsed.value);
  }

  if (!allPercentages || childCapacities.length === 0) {
    return { valid: true, errors: [] };
  }

  const sum = childCapacities.reduce((a, b) => a + b, 0);
  const tolerance = 0.001;

  if (Math.abs(sum - 100) > tolerance) {
    return {
      valid: false,
      errors: [
        {
          field: 'capacity',
          message: `Child queue capacities must sum to 100% (legacy mode requirement, current: ${sum.toFixed(1)}%)`,
          severity: 'error',
          rule: 'child-capacity-sum',
        },
      ],
    };
  }

  return { valid: true, errors: [] };
};

export const validateMaxCapacityRelationship: BusinessValidator<string> = (
  maxCapacity,
  context,
) => {
  if (!maxCapacity || maxCapacity.trim() === '' || maxCapacity === '-1') {
    return { valid: true, errors: [] };
  }

  const capacity = context.configData.get(`yarn.scheduler.capacity.${context.queuePath}.capacity`);

  if (!capacity) {
    return { valid: true, errors: [] };
  }

  const capacityParsed = parseCapacityValue(capacity);
  const maxCapacityParsed = parseCapacityValue(maxCapacity);

  if (!capacityParsed || !maxCapacityParsed) {
    return { valid: true, errors: [] };
  }

  if (capacityParsed.type !== maxCapacityParsed.type) {
    return {
      valid: false,
      errors: [
        {
          field: 'maximum-capacity',
          message: 'Maximum capacity must use the same format as capacity',
          severity: 'error',
          rule: 'max-capacity-format-match',
        },
      ],
    };
  }

  if (capacityParsed.type === 'absolute' || maxCapacityParsed.type === 'absolute') {
    return { valid: true, errors: [] };
  }

  if (maxCapacityParsed.value < capacityParsed.value) {
    return {
      valid: false,
      errors: [
        {
          field: 'maximum-capacity',
          message: 'Maximum capacity must be greater than or equal to capacity',
          severity: 'error',
          rule: 'max-capacity-minimum',
        },
      ],
    };
  }

  return { valid: true, errors: [] };
};

export const validateParentChildCapacityConstraints: BusinessValidator<string> = (
  value,
  context,
) => {
  if (!context.parentQueue || !value) {
    return { valid: true, errors: [] };
  }

  const childParsed = parseCapacityValue(value);
  if (!childParsed) {
    return { valid: true, errors: [] };
  }

  const parentCapacity = context.configData.get(
    `yarn.scheduler.capacity.${context.parentQueue.queuePath}.capacity`,
  );

  if (!parentCapacity) {
    return { valid: true, errors: [] };
  }

  const parentParsed = parseCapacityValue(parentCapacity);
  if (!parentParsed) {
    return { valid: true, errors: [] };
  }

  const errors: BusinessValidationError[] = [];

  // Only validate for absolute resources, not percentages or weights
  if (childParsed.type === 'absolute' && parentParsed.type === 'absolute') {
    if (!childParsed.resources || !parentParsed.resources) {
      return { valid: true, errors: [] };
    }

    // Check each resource type independently
    for (const [resource, childValue] of Object.entries(childParsed.resources)) {
      const parentValue = parentParsed.resources[resource];

      // If parent doesn't have this resource defined, skip validation
      if (parentValue === undefined) {
        continue;
      }

      if (childValue > parentValue) {
        errors.push({
          field: 'capacity',
          message: `Child queue ${resource} allocation (${childValue}) cannot exceed parent queue ${resource} allocation (${parentValue})`,
          severity: 'warning',
          rule: 'parent-child-capacity-constraint',
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};
