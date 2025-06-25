import { z } from 'zod';

// Basic resource schema for memory and vCores
export const ResourcesSchema = z.object({
  memory: z.number().min(0),
  vCores: z.number().min(0)
});

// Queue state enum
export const QueueStateSchema = z.enum(['RUNNING', 'STOPPED', 'DRAINING']);

// Capacity value with different modes
export const CapacityModeSchema = z.enum(['percentage', 'weight', 'absolute']);

export const CapacityValueSchema = z.object({
  mode: CapacityModeSchema,
  value: z.number().min(0)
});

// Queue configuration properties (flexible key-value structure)
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

// Runtime metrics for queues
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