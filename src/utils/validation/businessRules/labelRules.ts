import { SPECIAL_VALUES } from '~/types';
import { buildPropertyKey, buildNodeLabelPropertyKey } from '~/utils/propertyUtils';
import { getParentPath } from './utils';
import type { BusinessValidationError, BusinessValidator } from './types';
import {
  validateQueueLabelAccess,
  validateLabelCapacities,
} from '~/features/node-labels/utils/labelValidation';
import { parseCapacityValue } from '~/utils/capacityUtils';

function parseAccessibleLabels(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return [];
  }

  return trimmed
    .split(',')
    .map((label) => label.trim())
    .filter((label) => label.length > 0);
}

function getEffectiveAccessibleLabels(
  queuePath: string,
  configData: Map<string, string>,
  visited: Set<string> = new Set(),
): string[] {
  if (!queuePath || visited.has(queuePath)) {
    return [];
  }

  visited.add(queuePath);

  if (queuePath === SPECIAL_VALUES.ROOT_QUEUE_NAME) {
    return [SPECIAL_VALUES.ALL_USERS_ACL];
  }

  const propertyKey = buildPropertyKey(queuePath, 'accessible-node-labels');
  const configuredValue = configData.get(propertyKey);

  if (configuredValue !== undefined) {
    const parsed = parseAccessibleLabels(configuredValue);
    if (parsed.length === 0) {
      return [];
    }
    return parsed;
  }

  const parentPath = getParentPath(queuePath);
  if (!parentPath) {
    return [];
  }

  return getEffectiveAccessibleLabels(parentPath, configData, visited);
}

function sanitizeFieldName(field: string | undefined, fallback: string): string {
  if (!field) {
    return fallback;
  }

  return field.replace(/__DOT__/g, '.');
}

function buildLabelAccessError(field: string, message: string): BusinessValidationError {
  return {
    field,
    message,
    severity: 'error',
    rule: 'queue-label-access',
  };
}

export const validateAccessibleNodeLabels: BusinessValidator<string> = (value, context) => {
  const queuePath = context.queuePath;
  const parentPath = getParentPath(queuePath);

  if (!queuePath || !parentPath) {
    return { valid: true, errors: [] };
  }

  const labels = parseAccessibleLabels(value);
  if (labels.length === 0) {
    return { valid: true, errors: [] };
  }

  const parentLabels = getEffectiveAccessibleLabels(parentPath, context.configData);
  const errors: BusinessValidationError[] = [];
  const fieldName = sanitizeFieldName(context.field, 'accessible-node-labels');

  // Deduplicate labels for validation
  const uniqueLabels = Array.from(new Set(labels));

  for (const label of uniqueLabels) {
    const validation = validateQueueLabelAccess(queuePath, label, parentLabels);
    if (!validation.valid && validation.error) {
      errors.push(buildLabelAccessError(fieldName, validation.error));
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

export const validateLabelSpecificCapacities: BusinessValidator<string> = (value, context) => {
  const { field, siblingQueues = [], configData, queuePath, legacyModeEnabled } = context;

  if (!queuePath || !legacyModeEnabled) {
    return { valid: true, errors: [] };
  }

  const normalizedField = sanitizeFieldName(field, 'accessible-node-labels');

  const match = normalizedField.match(/^accessible-node-labels\.([^.]+)\.capacity$/);
  if (!match) {
    return { valid: true, errors: [] };
  }

  const labelName = match[1];

  // Determine sibling queue paths including current queue
  const siblingPaths = new Set<string>(siblingQueues.map((queue) => queue.queuePath));
  siblingPaths.add(queuePath);

  const capacities = new Map<string, number>();
  let allPercentages = true;
  let hasRelevantQueues = false;

  siblingPaths.forEach((path) => {
    const accessibleLabels = getEffectiveAccessibleLabels(path, configData);
    const hasLabelAccess =
      accessibleLabels.includes(SPECIAL_VALUES.ALL_USERS_ACL) ||
      accessibleLabels.includes(labelName);

    if (!hasLabelAccess && path !== queuePath) {
      return;
    }

    hasRelevantQueues = true;
    const propertyKey = buildNodeLabelPropertyKey(path, labelName, 'capacity');
    const rawValue = path === queuePath ? value : configData.get(propertyKey) || '';

    const parsed = parseCapacityValue(rawValue);

    if (!parsed) {
      capacities.set(path, 0);
      return;
    }

    if (parsed.type !== 'percentage') {
      allPercentages = false;
      return;
    }

    capacities.set(path, parsed.value);
  });

  if (!hasRelevantQueues || !allPercentages) {
    return { valid: true, errors: [] };
  }

  const siblingList = Array.from(capacities.keys());
  const result = validateLabelCapacities(siblingList, labelName, capacities);

  if (result.valid || !result.error) {
    return { valid: true, errors: [] };
  }

  const error: BusinessValidationError = {
    field: normalizedField,
    message: result.error,
    severity: 'error',
    rule: 'label-capacity-sum',
  };

  return {
    valid: false,
    errors: [error],
  };
};
