import { z } from 'zod';

/**
 * Basic resource allocation schema for YARN resources.
 * Represents the fundamental compute resources: memory (in MB) and virtual CPU cores.
 * @example
 * ```typescript
 * const resources: Resources = {
 *   memory: 8192,  // 8GB
 *   vCores: 4      // 4 virtual cores
 * };
 * ```
 */
export const ResourcesSchema = z.object({
  memory: z.number().min(0),
  vCores: z.number().min(0)
});

/**
 * Queue state enumeration.
 * - RUNNING: Queue is active and can accept new applications
 * - STOPPED: Queue is stopped, existing apps continue but no new apps accepted
 * - DRAINING: Queue is draining, no new apps accepted, will stop when empty
 */
export const QueueStateSchema = z.enum(['RUNNING', 'STOPPED', 'DRAINING']);

/**
 * Capacity allocation modes for queues.
 * - percentage: Traditional percentage-based allocation (0-100)
 * - weight: Relative weight-based allocation
 * - absolute: Fixed resource allocation
 */
export const CapacityModeSchema = z.enum(['percentage', 'weight', 'absolute']);

/**
 * Capacity value with mode specification.
 * Allows queues to use different capacity allocation strategies.
 * @example
 * ```typescript
 * const percentageCapacity: CapacityValue = { mode: 'percentage', value: 25 };
 * const weightCapacity: CapacityValue = { mode: 'weight', value: 1.5 };
 * const absoluteCapacity: CapacityValue = { mode: 'absolute', value: 8192 };
 * ```
 */
export const CapacityValueSchema = z.object({
  mode: CapacityModeSchema,
  value: z.number().min(0)
});

/**
 * Queue configuration properties schema.
 * 
 * This schema represents the configuration properties for a YARN queue.
 * All fields are optional because:
 * 1. Queues inherit properties from parents if not specified
 * 2. Different queue types may use different properties
 * 3. YARN is backward compatible with minimal configs
 * 
 * The `.catchall(z.string().optional())` allows for:
 * - Custom properties added by administrators
 * - Version-specific properties
 * - Dynamic properties like node-label-specific settings
 * 
 * Common properties:
 * - capacity: Queue's capacity as a percentage (e.g., "25.5")
 * - maximum-capacity: Maximum capacity the queue can use (e.g., "100")
 * - state: Queue state (RUNNING, STOPPED, DRAINING)
 * - minimum-user-limit-percent: Minimum resources per user (e.g., "10")
 * - user-limit-factor: Multiplier for user resource limits (e.g., "2.0")
 * - accessible-node-labels: Comma-separated node labels (e.g., "gpu,ssd")
 * 
 * @example
 * ```typescript
 * const queueConfig: QueueConfig = {
 *   capacity: "25.0",
 *   "maximum-capacity": "50.0",
 *   state: "RUNNING",
 *   "accessible-node-labels": "gpu,cpu",
 *   // Custom property
 *   "my.custom.property": "value"
 * };
 * ```
 */
export const QueueConfigSchema = z.object({
  capacity: z.string().optional(),
  'maximum-capacity': z.string().optional(),
  state: QueueStateSchema.optional(),
  'minimum-user-limit-percent': z.string().optional(),
  'user-limit-factor': z.string().optional(),
  'accessible-node-labels': z.string().optional(),
  'default-node-label-expression': z.string().optional(),
  'acl-submit-applications': z.string().optional(),
  'acl-administer-queue': z.string().optional()
}).catchall(z.string().optional());

/**
 * Runtime metrics for queue monitoring.
 * Represents the current state and usage of a queue.
 * These values are typically fetched from the YARN ResourceManager API.
 * 
 * @example
 * ```typescript
 * const metrics: QueueMetrics = {
 *   usedCapacity: 75.5,           // Queue is 75.5% full
 *   absoluteCapacity: 25,         // Queue has 25% of cluster
 *   absoluteUsedCapacity: 18.875, // Using 18.875% of cluster
 *   absoluteMaxCapacity: 50,      // Can grow to 50% of cluster
 *   numApplications: 42,          // 42 total applications
 *   numPendingApplications: 5,    // 5 waiting to start
 *   numActiveApplications: 37,    // 37 currently running
 *   resourcesUsed: {
 *     memory: 65536,              // Using 64GB RAM
 *     vCores: 32                  // Using 32 cores
 *   }
 * };
 * ```
 */
export const QueueMetricsSchema = z.object({
  usedCapacity: z.number().min(0),
  absoluteCapacity: z.number().min(0).max(100),
  absoluteUsedCapacity: z.number().min(0).max(100),
  absoluteMaxCapacity: z.number().min(0).max(100),
  numApplications: z.number().min(0).int(),
  numPendingApplications: z.number().min(0).int().optional(),
  numActiveApplications: z.number().min(0).int().optional(),
  resourcesUsed: ResourcesSchema
});

// Type exports
export type Resources = z.infer<typeof ResourcesSchema>;
export type QueueState = z.infer<typeof QueueStateSchema>;
export type CapacityMode = z.infer<typeof CapacityModeSchema>;
export type CapacityValue = z.infer<typeof CapacityValueSchema>;
export type QueueConfig = z.infer<typeof QueueConfigSchema>;
export type QueueMetrics = z.infer<typeof QueueMetricsSchema>;