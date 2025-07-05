/**
 * Categorizes validation rules to determine if they can be temporarily staged
 * or if they must be resolved before staging.
 */

// Cross-queue rules that can be temporarily staged with warnings
export const CROSS_QUEUE_RULES = [
  'child-capacity-sum', // Children must sum to 100%
  'capacity-type-consistency', // Siblings must use same capacity type
  'parent-child-capacity-constraint', // Child shouldn't exceed parent (warning level)
] as const;

// Queue-specific rules that must be resolved before staging
export const QUEUE_SPECIFIC_RULES = [
  'max-capacity-minimum', // Max capacity must be >= capacity
  'max-capacity-format-match', // Max capacity must use same format
  'parent-state-dependency', // Can't run if parent stopped
  'child-state-dependency', // Can't stop if children running
  'lifetime-relationship', // Default <= maximum lifetime
  'user-limit-factor-range', // Must be non-negative
  'minimum-user-limit-percent-max', // Cannot exceed 100%
  'deletion-state-requirement', // Must be stopped to delete
  'deletion-empty-requirement', // Must have no apps to delete
  'deletion-no-children-requirement', // Must have no children to delete
  'conversion-state-requirement', // Must be stopped to convert
  'conversion-empty-requirement', // Must have no apps to convert
] as const;

// Warning-only rules that don't block staging
export const WARNING_ONLY_RULES = [
  'user-limit-factor-zero-warning', // Zero user limit factor
  'minimum-user-limit-percent-warning', // 100% minimum user limit
  'parent-child-capacity-constraint', // Also appears here as it's a warning
] as const;

export type CrossQueueRule = (typeof CROSS_QUEUE_RULES)[number];
export type QueueSpecificRule = (typeof QUEUE_SPECIFIC_RULES)[number];
export type WarningOnlyRule = (typeof WARNING_ONLY_RULES)[number];

/**
 * Checks if a validation rule is a cross-queue rule that can be temporarily staged
 */
export function isCrossQueueRule(rule: string): boolean {
  return CROSS_QUEUE_RULES.includes(rule as CrossQueueRule);
}

/**
 * Checks if a validation rule is queue-specific and must be resolved
 */
export function isQueueSpecificRule(rule: string): boolean {
  return QUEUE_SPECIFIC_RULES.includes(rule as QueueSpecificRule);
}

/**
 * Checks if a validation rule only produces warnings
 */
export function isWarningOnlyRule(rule: string): boolean {
  return WARNING_ONLY_RULES.includes(rule as WarningOnlyRule);
}

/**
 * Checks if a validation error blocks staging
 */
export function isBlockingError(rule: string, severity: 'error' | 'warning'): boolean {
  // Warnings never block
  if (severity === 'warning') {
    return false;
  }

  // Cross-queue errors can be staged
  if (isCrossQueueRule(rule)) {
    return false;
  }

  // Queue-specific errors block staging
  return true;
}
