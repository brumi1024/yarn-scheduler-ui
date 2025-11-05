/**
 * Utilities for working with auto-created queue templates
 */

/**
 * Template suffix constants for auto-created queues
 */
export const TEMPLATE_SUFFIXES = {
  /** Legacy auto-created leaf queues */
  LEGACY: 'leaf-queue-template',
  /** Flexible auto-created queues (shared template) */
  FLEXIBLE_TEMPLATE: 'auto-queue-creation-v2.template',
  /** Flexible auto-created leaf queues */
  FLEXIBLE_LEAF: 'auto-queue-creation-v2.leaf-template',
  /** Flexible auto-created parent queues */
  FLEXIBLE_PARENT: 'auto-queue-creation-v2.parent-template',
} as const;

/**
 * Array of all template suffix values for iteration
 */
export const ALL_TEMPLATE_SUFFIXES = Object.values(TEMPLATE_SUFFIXES);

/**
 * Template markers used in queue paths
 */
export const TEMPLATE_MARKERS = [TEMPLATE_SUFFIXES.LEGACY, 'auto-queue-creation-v2.'] as const;

/**
 * Check if a queue path represents a template queue
 * @param queuePath Queue path to check
 * @returns True if the path includes a template marker
 */
export function isTemplateQueuePath(queuePath: string): boolean {
  return TEMPLATE_MARKERS.some((marker) => queuePath.includes(marker));
}
