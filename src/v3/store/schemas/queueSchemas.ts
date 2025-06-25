import { z } from 'zod';
import { QueueConfigSchema, QueueMetricsSchema } from './coreSchemas';

/**
 * Base queue node schema without children.
 * Used to break recursion in TypeScript type inference.
 */
const BaseQueueNodeSchema = z.object({
  /** Full dot-separated path (e.g., "root.production.analytics") */
  path: z.string(),
  /** Queue name without parent path (e.g., "analytics") */
  name: z.string(),
  /** Queue configuration properties */
  config: QueueConfigSchema,
  /** Runtime metrics (optional, not available for new queues) */
  metrics: QueueMetricsSchema.optional(),
  /** Flag indicating this is a newly created queue */
  isNew: z.boolean().optional(),
  /** Flag indicating this queue is marked for deletion */
  isDeleted: z.boolean().optional(),
  /** Validation errors mapped by property key */
  validationErrors: z.record(z.string(), z.string()).optional()
});

/**
 * Full queue node schema with recursive children.
 * Represents a node in the queue hierarchy tree.
 * 
 * @example
 * ```typescript
 * const queueNode: QueueNode = {
 *   path: "root",
 *   name: "root",
 *   config: { capacity: "100.0", state: "RUNNING" },
 *   metrics: {
 *     usedCapacity: 85.0,
 *     absoluteCapacity: 100,
 *     absoluteUsedCapacity: 85,
 *     absoluteMaxCapacity: 100,
 *     numApplications: 150,
 *     resourcesUsed: { memory: 524288, vCores: 256 }
 *   },
 *   children: [
 *     {
 *       path: "root.production",
 *       name: "production",
 *       config: { capacity: "70.0" },
 *       children: []
 *     },
 *     {
 *       path: "root.development",
 *       name: "development",
 *       config: { capacity: "30.0" },
 *       children: []
 *     }
 *   ]
 * };
 * ```
 */
export const QueueNodeSchema: z.ZodType<QueueNode> = BaseQueueNodeSchema.extend({
  children: z.lazy(() => z.array(QueueNodeSchema))
});

/**
 * Type definition for QueueNode.
 * Manually defined to handle recursive nature properly.
 */
export type QueueNode = z.infer<typeof BaseQueueNodeSchema> & {
  children: QueueNode[];
};

/**
 * Queue tree schema representing the entire hierarchy.
 * Nullable to handle empty/unloaded state.
 */
export const QueueTreeSchema = QueueNodeSchema.nullable();

/**
 * Queue path validation schema.
 * Validates YARN queue path format:
 * - Must start with alphanumeric
 * - Can contain letters, numbers, hyphens, underscores
 * - Must end with alphanumeric
 * - Dot-separated for hierarchy
 * 
 * @example
 * Valid paths:
 * - "root"
 * - "root.production"
 * - "root.prod-team.analytics_v2"
 * 
 * Invalid paths:
 * - ".root" (starts with dot)
 * - "root." (ends with dot)
 * - "root..prod" (double dots)
 * - "root.prod-" (ends with hyphen)
 */
export const QueuePathSchema = z.string().regex(
  /^[a-zA-Z0-9]([a-zA-Z0-9-_]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-_]*[a-zA-Z0-9])?)*$/,
  "Invalid queue path format"
);

/**
 * Types of operations that can be performed on queues.
 * - add: Create a new queue
 * - remove: Delete an existing queue
 * - update: Modify queue properties
 * - move: Relocate queue in hierarchy
 */
export const QueueOperationSchema = z.enum(['add', 'remove', 'update', 'move']);

// Type exports
export type QueueTree = z.infer<typeof QueueTreeSchema>;
export type QueuePath = z.infer<typeof QueuePathSchema>;
export type QueueOperation = z.infer<typeof QueueOperationSchema>;