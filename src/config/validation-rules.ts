import { buildPropertyKey } from '~/utils/propertyUtils';
import { parseCapacityValue, getCapacityType } from '~/utils/capacityUtils';
import { SPECIAL_VALUES } from '~/types/constants/special-values';
import type { StagedChange } from '~/types/staged-change';
import type { SchedulerInfo } from '~/types';
import type { ValidationIssue } from '~/features/validation/types';
import {
  findQueueByPath,
  getParentPath,
  getSiblingQueues,
} from '~/features/validation/utils/queueUtils';

export interface ValidationContext {
  queuePath: string;
  fieldName: string;
  fieldValue: unknown;
  config: Map<string, string>;
  schedulerData?: SchedulerInfo | null;
  stagedChanges: StagedChange[];
  legacyModeEnabled: boolean;
}

export interface ValidationRule {
  id: string;
  description: string;
  level: 'error' | 'warning';
  triggers: string[];
  evaluate: (context: ValidationContext) => ValidationIssue[];
}

export const QUEUE_VALIDATION_RULES: ValidationRule[] = [
  {
    id: 'CAPACITY_SUM',
    description: 'Ensures child capacities sum correctly under a parent queue.',
    level: 'error',
    triggers: ['capacity'],
    evaluate: (context) => evaluateChildCapacitySum(context),
  },
  {
    id: 'MAX_CAPACITY_CONSTRAINT',
    description: 'Ensures maximum capacity is not less than capacity and uses consistent units.',
    level: 'error',
    triggers: ['capacity', 'maximum-capacity'],
    evaluate: (context) => evaluateMaxCapacityRelationship(context),
  },
  {
    id: 'CONSISTENT_CAPACITY_MODE',
    description: 'Ensures all sibling queues use the same capacity mode in legacy mode.',
    level: 'error',
    triggers: ['capacity'],
    evaluate: (context) => evaluateCapacityTypeConsistency(context),
  },
  {
    id: 'PARENT_CHILD_CAPACITY_CONSTRAINT',
    description: 'Warns when a child absolute resource exceeds its parent allocation.',
    level: 'warning',
    triggers: ['capacity'],
    evaluate: (context) => evaluateParentChildCapacityConstraints(context),
  },
];

export function runFieldValidation(context: ValidationContext): ValidationIssue[] {
  const applicableRules = QUEUE_VALIDATION_RULES.filter((rule) =>
    rule.triggers.includes(context.fieldName),
  );
  return applicableRules.flatMap((rule) => rule.evaluate(context));
}

// --- Rule evaluators -------------------------------------------------------

function evaluateCapacityTypeConsistency(context: ValidationContext): ValidationIssue[] {
  if (!context.legacyModeEnabled) {
    return [];
  }

  const siblings = getSiblingQueues(context.schedulerData, context.queuePath);
  if (!siblings.length) {
    return [];
  }

  const currentValue = typeof context.fieldValue === 'string' ? context.fieldValue : undefined;
  const currentType = getCapacityType(currentValue);
  if (!currentType) {
    return [];
  }

  const inconsistentSiblings = siblings
    .filter((sibling) => sibling.queuePath !== context.queuePath)
    .map((sibling) => {
      const value = context.config.get(buildPropertyKey(sibling.queuePath, 'capacity'));
      const type = getCapacityType(value);
      return type && type !== currentType ? sibling.queueName : null;
    })
    .filter((name): name is string => Boolean(name));

  if (inconsistentSiblings.length === 0) {
    return [];
  }

  return [
    {
      queuePath: context.queuePath,
      field: 'capacity',
      message: `All sibling queues must use the same capacity type (legacy mode requirement). Inconsistent siblings: ${inconsistentSiblings.join(', ')}`,
      severity: 'error',
      rule: 'capacity-type-consistency',
    },
  ];
}

function evaluateChildCapacitySum(context: ValidationContext): ValidationIssue[] {
  if (!context.legacyModeEnabled) {
    return [];
  }

  const queue = findQueueByPath(context.schedulerData, context.queuePath);
  if (!queue?.queues?.queue?.length) {
    return [];
  }

  const childQueuePaths = new Set(queue.queues.queue.map((child) => child.queuePath));

  context.stagedChanges.forEach((change) => {
    if (change.queuePath === SPECIAL_VALUES.GLOBAL_QUEUE_PATH) {
      return;
    }
    const parentPath = getParentPath(change.queuePath);
    if (parentPath !== context.queuePath) {
      return;
    }

    if (change.type === 'remove') {
      childQueuePaths.delete(change.queuePath);
    } else if (change.type === 'add') {
      childQueuePaths.add(change.queuePath);
    }
  });

  const childCapacities: number[] = [];
  let allPercentages = true;

  childQueuePaths.forEach((childPath) => {
    const key = buildPropertyKey(childPath, 'capacity');
    const rawValue =
      childPath === context.queuePath && context.fieldName === 'capacity'
        ? (context.fieldValue as string)
        : context.config.get(key);

    if (!rawValue) {
      return;
    }

    const parsed = parseCapacityValue(rawValue);
    if (!parsed) {
      return;
    }

    if (parsed.type !== 'percentage') {
      allPercentages = false;
      return;
    }

    childCapacities.push(parsed.value);
  });

  if (!allPercentages || childCapacities.length === 0) {
    return [];
  }

  const sum = childCapacities.reduce((total, value) => total + value, 0);
  const tolerance = 0.001;

  if (Math.abs(sum - 100) <= tolerance) {
    return [];
  }

  return [
    {
      queuePath: context.queuePath,
      field: 'capacity',
      message: `Child queue capacities must sum to 100% (legacy mode requirement, current: ${sum.toFixed(1)}%)`,
      severity: 'error',
      rule: 'child-capacity-sum',
    },
  ];
}

function evaluateMaxCapacityRelationship(context: ValidationContext): ValidationIssue[] {
  const queuePath = context.queuePath;
  const capacityKey = buildPropertyKey(queuePath, 'capacity');
  const maxCapacityKey = buildPropertyKey(queuePath, 'maximum-capacity');

  const capacityValue =
    context.fieldName === 'capacity'
      ? (context.fieldValue as string)
      : context.config.get(capacityKey) || '';
  const maxCapacityValue =
    context.fieldName === 'maximum-capacity'
      ? (context.fieldValue as string)
      : context.config.get(maxCapacityKey) || '';

  if (!maxCapacityValue || maxCapacityValue.trim() === '' || maxCapacityValue === '-1') {
    return [];
  }

  const parsedCapacity = parseCapacityValue(capacityValue);
  const parsedMaxCapacity = parseCapacityValue(maxCapacityValue);

  if (!parsedCapacity || !parsedMaxCapacity) {
    return [];
  }

  if (parsedCapacity.type !== parsedMaxCapacity.type) {
    return [
      {
        queuePath,
        field: 'maximum-capacity',
        message: 'Maximum capacity must use the same format as capacity',
        severity: 'error',
        rule: 'max-capacity-format-match',
      },
    ];
  }

  if (parsedCapacity.type === 'absolute' || parsedMaxCapacity.type === 'absolute') {
    return [];
  }

  if (parsedMaxCapacity.value < parsedCapacity.value) {
    return [
      {
        queuePath,
        field: 'maximum-capacity',
        message: 'Maximum capacity must be greater than or equal to capacity',
        severity: 'error',
        rule: 'max-capacity-minimum',
      },
    ];
  }

  return [];
}

function evaluateParentChildCapacityConstraints(context: ValidationContext): ValidationIssue[] {
  if (!context.legacyModeEnabled) {
    return [];
  }

  const parentPath = getParentPath(context.queuePath);
  if (!parentPath) {
    return [];
  }

  const childValue =
    context.fieldName === 'capacity'
      ? (context.fieldValue as string)
      : context.config.get(buildPropertyKey(context.queuePath, 'capacity')) || '';

  if (!childValue) {
    return [];
  }

  const childParsed = parseCapacityValue(childValue);
  if (!childParsed) {
    return [];
  }

  const parentValue = context.config.get(buildPropertyKey(parentPath, 'capacity'));
  if (!parentValue) {
    return [];
  }

  const parentParsed = parseCapacityValue(parentValue);
  if (!parentParsed) {
    return [];
  }

  if (childParsed.type !== 'absolute' || parentParsed.type !== 'absolute') {
    return [];
  }

  const childResources = childParsed.resources;
  const parentResources = parentParsed.resources;

  if (!childResources || !parentResources) {
    return [];
  }

  const issues: ValidationIssue[] = [];

  Object.entries(childResources).forEach(([resource, childAmount]) => {
    const parentAmount = parentResources[resource];
    if (parentAmount === undefined) {
      return;
    }
    if (childAmount > parentAmount) {
      issues.push({
        queuePath: context.queuePath,
        field: 'capacity',
        message: `Child queue ${resource} allocation (${childAmount}) cannot exceed parent queue ${resource} allocation (${parentAmount})`,
        severity: 'warning',
        rule: 'parent-child-capacity-constraint',
      });
    }
  });

  return issues;
}

// --- Helper utilities ------------------------------------------------------
