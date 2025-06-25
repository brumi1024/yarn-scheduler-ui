import { z } from 'zod';

/**
 * Single configuration property from YARN API.
 * YARN returns configuration as an array of name-value pairs.
 *
 * @example
 * ```typescript
 * const configProp: ConfigProperty = {
 *   name: "yarn.scheduler.capacity.root.production.capacity",
 *   value: "70.0"
 * };
 * ```
 */
export const ConfigPropertySchema = z.object({
    /** Property key/name */
    name: z.string(),
    /** Property value (always string in YARN) */
    value: z.string(),
});

/**
 * Configuration response from YARN REST API.
 * GET /ws/v1/cluster/scheduler-conf returns this format.
 *
 * @example
 * ```typescript
 * const response: ConfigurationResponse = {
 *   property: [
 *     { name: "yarn.scheduler.capacity.root.capacity", value: "100" },
 *     { name: "yarn.scheduler.capacity.root.production.capacity", value: "70" },
 *     { name: "yarn.scheduler.capacity.root.development.capacity", value: "30" }
 *   ]
 * };
 * ```
 */
export const ConfigurationResponseSchema = z.object({
    /** Array of configuration properties */
    property: z.array(ConfigPropertySchema),
});

/**
 * Queue update request for modifying existing queues.
 * Part of the configuration update API payload.
 *
 * @example
 * ```typescript
 * const updateReq: QueueUpdateRequest = {
 *   "queue-name": "root.production",
 *   params: {
 *     "capacity": "75.0",
 *     "maximum-capacity": "100.0",
 *     "user-limit-factor": "2.0"
 *   }
 * };
 * ```
 */
export const QueueUpdateRequestSchema = z.object({
    /** Queue path to update */
    'queue-name': z.string(),
    /** Properties to update as key-value pairs */
    params: z.record(z.string(), z.string()),
});

/**
 * Complete configuration update request.
 * PUT /ws/v1/cluster/scheduler-conf accepts this format.
 * Supports adding, updating, and removing queues, plus global updates.
 *
 * @example
 * ```typescript
 * const updateRequest: ConfigurationUpdateRequest = {
 *   "global-updates": {
 *     "yarn.scheduler.capacity.resource-calculator":
 *       "org.apache.hadoop.yarn.util.resource.DominantResourceCalculator"
 *   },
 *   "add-queue": [{
 *     "queue-name": "root.production.analytics",
 *     params: {
 *       "capacity": "10.0",
 *       "state": "RUNNING"
 *     }
 *   }],
 *   "update-queue": [{
 *     "queue-name": "root.production",
 *     params: { "capacity": "60.0" }
 *   }],
 *   "remove-queue": ["root.development.test"]
 * };
 * ```
 */
export const ConfigurationUpdateRequestSchema = z.object({
    /** Global configuration updates */
    'global-updates': z.record(z.string(), z.string()).optional(),
    /** New queues to add */
    'add-queue': z
        .array(
            z.object({
                /** New queue path */
                'queue-name': z.string(),
                /** Initial properties */
                params: z.record(z.string(), z.string()),
            })
        )
        .optional(),
    /** Existing queues to update */
    'update-queue': z.array(QueueUpdateRequestSchema).optional(),
    /** Queue paths to remove */
    'remove-queue': z.array(z.string()).optional(),
});

/**
 * Scheduler information from YARN REST API.
 * GET /ws/v1/cluster/scheduler returns hierarchical queue data.
 * This is a simplified schema - actual response has many more fields.
 *
 * @example
 * ```typescript
 * const scheduler: SchedulerResponse = {
 *   type: "capacityScheduler",
 *   capacity: 100.0,
 *   usedCapacity: 85.5,
 *   maxCapacity: 100.0,
 *   queueName: "root",
 *   state: "RUNNING",
 *   queues: {
 *     queue: [{
 *       type: "capacityScheduler",
 *       capacity: 70.0,
 *       usedCapacity: 92.8,
 *       maxCapacity: 100.0,
 *       queueName: "production",
 *       resourcesUsed: {
 *         memory: 524288,
 *         vCores: 256
 *       }
 *     }]
 *   }
 * };
 * ```
 */
export const SchedulerResponseSchema = z.object({
    /** Scheduler type (usually "capacityScheduler") */
    type: z.string(),
    /** Queue capacity percentage */
    capacity: z.number(),
    /** Current usage percentage */
    usedCapacity: z.number(),
    /** Maximum capacity percentage */
    maxCapacity: z.number(),
    /** Queue name */
    queueName: z.string(),
    /** Child queues (recursive structure) */
    queues: z
        .object({
            queue: z.array(z.lazy(() => SchedulerResponseSchema)),
        })
        .optional(),
    /** Queue state */
    state: z.string().optional(),
    /** Number of running applications */
    numApplications: z.number().optional(),
    /** Resources currently used */
    resourcesUsed: z
        .object({
            memory: z.number(),
            vCores: z.number(),
        })
        .optional(),
});

/**
 * Node labels response from YARN REST API.
 * GET /ws/v1/cluster/node-labels returns available labels.
 *
 * @example
 * ```typescript
 * const labels: NodeLabelsResponse = {
 *   nodeLabels: ["gpu", "ssd", "cpu"],
 *   nodeLabelsInfo: [{
 *     name: "gpu",
 *     exclusivity: true,
 *     partitionInfo: {
 *       defaultPartition: false,
 *       exclusiveToPartition: true
 *     }
 *   }]
 * };
 * ```
 */
export const NodeLabelsResponseSchema = z.object({
    /** Simple list of label names */
    nodeLabels: z.array(z.string()).optional(),
    /** Detailed label information */
    nodeLabelsInfo: z
        .array(
            z.object({
                /** Label name */
                name: z.string(),
                /** Whether label is exclusive */
                exclusivity: z.boolean(),
                /** Partition details */
                partitionInfo: z
                    .object({
                        defaultPartition: z.boolean(),
                        exclusiveToPartition: z.boolean(),
                    })
                    .optional(),
            })
        )
        .optional(),
});

/**
 * Nodes response from YARN REST API.
 * GET /ws/v1/cluster/nodes returns cluster node information.
 * This is a simplified schema - actual nodes have many more fields.
 *
 * @example
 * ```typescript
 * const nodesResp: NodesResponse = {
 *   nodes: {
 *     node: [{
 *       id: "node-123.cluster.local:45454",
 *       nodeHostName: "node-123.cluster.local",
 *       nodeHTTPAddress: "node-123.cluster.local:8042",
 *       state: "RUNNING"
 *     }]
 *   }
 * };
 * ```
 */
export const NodesResponseSchema = z.object({
    /** Container for node array */
    nodes: z
        .object({
            /** Array of nodes */
            node: z.array(
                z.object({
                    /** Node ID */
                    id: z.string(),
                    /** Node hostname */
                    nodeHostName: z.string(),
                    /** HTTP address for node UI */
                    nodeHTTPAddress: z.string(),
                    /** Node state */
                    state: z.string(),
                    // Note: Many more fields available in actual API
                })
            ),
        })
        .optional(),
});

// Type exports
export type ConfigProperty = z.infer<typeof ConfigPropertySchema>;
export type ConfigurationResponse = z.infer<typeof ConfigurationResponseSchema>;
export type QueueUpdateRequest = z.infer<typeof QueueUpdateRequestSchema>;
export type ConfigurationUpdateRequest = z.infer<typeof ConfigurationUpdateRequestSchema>;
export type SchedulerResponse = z.infer<typeof SchedulerResponseSchema>;
export type NodeLabelsResponse = z.infer<typeof NodeLabelsResponseSchema>;
export type NodesResponse = z.infer<typeof NodesResponseSchema>;
