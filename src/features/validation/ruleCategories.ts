export const CROSS_QUEUE_RULES = [
  'child-capacity-sum',
  'capacity-type-consistency',
  'parent-child-capacity-constraint',
  'parent-child-capacity-mode',
  'label-capacity-sum',
] as const;

export const QUEUE_SPECIFIC_RULES = [
  'max-capacity-minimum',
  'max-capacity-format-match',
  'parent-state-dependency',
  'child-state-dependency',
  'lifetime-relationship',
  'user-limit-factor-range',
  'minimum-user-limit-percent-max',
  'deletion-state-requirement',
  'deletion-empty-requirement',
  'deletion-no-children-requirement',
  'conversion-state-requirement',
  'conversion-empty-requirement',
  'queue-label-access',
  'weight-mode-transition-flexible-aqc',
] as const;

export const WARNING_ONLY_RULES = [
  'user-limit-factor-zero-warning',
  'minimum-user-limit-percent-warning',
  'parent-child-capacity-constraint',
] as const;

type CrossQueueRule = (typeof CROSS_QUEUE_RULES)[number];
type QueueSpecificRule = (typeof QUEUE_SPECIFIC_RULES)[number];

export function isCrossQueueRule(rule: string): boolean {
  return CROSS_QUEUE_RULES.includes(rule as CrossQueueRule);
}

export function isQueueSpecificRule(rule: string): boolean {
  return QUEUE_SPECIFIC_RULES.includes(rule as QueueSpecificRule);
}

export function isBlockingError(rule: string, severity: 'error' | 'warning'): boolean {
  if (severity === 'warning') {
    return false;
  }

  if (isCrossQueueRule(rule)) {
    return false;
  }

  return true;
}
