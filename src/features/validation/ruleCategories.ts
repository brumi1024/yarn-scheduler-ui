export const CROSS_QUEUE_RULES = [
  'child-capacity-sum',
  'capacity-type-consistency',
  'parent-child-capacity-constraint',
  'parent-child-capacity-mode',
] as const;

export const QUEUE_SPECIFIC_RULES = [
  'max-capacity-minimum',
  'max-capacity-format-match',
  'weight-mode-transition-flexible-aqc',
] as const;

export const WARNING_ONLY_RULES = ['parent-child-capacity-constraint'] as const;

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
