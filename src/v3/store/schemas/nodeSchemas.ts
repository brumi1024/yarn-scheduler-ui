import { z } from 'zod';
import { ResourcesSchema } from './coreSchemas';

/**
 * Node state enumeration.
 * Represents the lifecycle states of a YARN node.
 * 
 * - NEW: Node just added, not yet active
 * - RUNNING: Node is active and healthy
 * - UNHEALTHY: Node failed health checks
 * - DECOMMISSIONING: Node is being gracefully removed
 * - DECOMMISSIONED: Node has been removed from service
 * - LOST: Connection to node lost
 * - REBOOTED: Node has restarted
 * - SHUTDOWN: Node has been shut down
 */
export const NodeStateSchema = z.enum([
  'NEW',
  'RUNNING',
  'UNHEALTHY',
  'DECOMMISSIONING',
  'DECOMMISSIONED',
  'LOST',
  'REBOOTED',
  'SHUTDOWN'
]);

/**
 * Complete node information from YARN.
 * Contains all details about a cluster node including resources,
 * state, containers, and utilization metrics.
 * 
 * @example
 * ```typescript
 * const nodeInfo: NodeInfo = {
 *   id: "node-123.cluster.local:45454",
 *   rack: "/rack1",
 *   state: "RUNNING",
 *   nodeHostName: "node-123.cluster.local",
 *   nodeHTTPAddress: "node-123.cluster.local:8042",
 *   lastHealthUpdate: 1635360000000,
 *   healthReport: "Healthy",
 *   numContainers: 12,
 *   usedMemoryMB: 32768,      // 32 GB used
 *   availMemoryMB: 98304,     // 96 GB available
 *   usedVirtualCores: 16,
 *   availableVirtualCores: 48,
 *   resourceUtilization: {
 *     nodePhysicalMemoryMB: 131072,  // 128 GB total
 *     nodeVirtualMemoryMB: 262144,
 *     nodeCPUUsage: 33.5,
 *     aggregatedContainersPhysicalMemoryMB: 32768,
 *     aggregatedContainersVirtualMemoryMB: 65536,
 *     containersCPUUsage: 31.2
 *   },
 *   nodeLabels: ["gpu", "ssd"],
 *   version: "3.3.4"
 * };
 * ```
 */
export const NodeInfoSchema = z.object({
  /** Unique node identifier (hostname:port) */
  id: z.string(),
  /** Rack location for topology awareness */
  rack: z.string().optional(),
  /** Current node state */
  state: NodeStateSchema,
  /** Node hostname */
  nodeHostName: z.string(),
  /** HTTP address for node UI */
  nodeHTTPAddress: z.string(),
  /** Timestamp of last health check */
  lastHealthUpdate: z.number(),
  /** Health check report message */
  healthReport: z.string().optional(),
  /** Number of containers running */
  numContainers: z.number().min(0).int(),
  /** Memory currently in use (MB) */
  usedMemoryMB: z.number().min(0),
  /** Memory available (MB) */
  availMemoryMB: z.number().min(0),
  /** Virtual cores in use */
  usedVirtualCores: z.number().min(0),
  /** Virtual cores available */
  availableVirtualCores: z.number().min(0),
  /** Detailed resource utilization metrics */
  resourceUtilization: z.object({
    /** Total physical memory on node (MB) */
    nodePhysicalMemoryMB: z.number().min(0),
    /** Total virtual memory on node (MB) */
    nodeVirtualMemoryMB: z.number().min(0),
    /** Node CPU usage percentage */
    nodeCPUUsage: z.number().min(0).max(100),
    /** Physical memory used by containers (MB) */
    aggregatedContainersPhysicalMemoryMB: z.number().min(0),
    /** Virtual memory used by containers (MB) */
    aggregatedContainersVirtualMemoryMB: z.number().min(0),
    /** CPU usage by containers percentage */
    containersCPUUsage: z.number().min(0).max(100)
  }).optional(),
  /** Labels assigned to this node */
  nodeLabels: z.array(z.string()).optional(),
  /** Node manager version */
  version: z.string().optional()
});

/**
 * Node label metadata.
 * Defines a label that can be assigned to nodes for
 * partitioning and resource isolation.
 * 
 * @example
 * ```typescript
 * const gpuLabel: NodeLabel = {
 *   name: "gpu",
 *   exclusivity: true,  // Only GPU-enabled apps can use these nodes
 *   partitionInfo: {
 *     defaultPartition: false,
 *     exclusiveToPartition: true
 *   }
 * };
 * ```
 */
export const NodeLabelSchema = z.object({
  /** Label name */
  name: z.string(),
  /** Whether label is exclusive (restricts node access) */
  exclusivity: z.boolean(),
  /** Partition configuration */
  partitionInfo: z.object({
    /** Whether this is the default partition */
    defaultPartition: z.boolean().optional(),
    /** Whether nodes are exclusive to this partition */
    exclusiveToPartition: z.boolean().optional()
  }).optional()
});

/**
 * Maps nodes to their assigned labels.
 * Used for tracking which labels are on which nodes.
 * 
 * @example
 * ```typescript
 * const mapping: NodeToLabelsMapping = {
 *   nodeId: "node-123.cluster.local:45454",
 *   labels: ["gpu", "ssd", "highmem"]
 * };
 * ```
 */
export const NodeToLabelsMappingSchema = z.object({
  /** Node identifier */
  nodeId: z.string(),
  /** Labels assigned to this node */
  labels: z.array(z.string())
});

/**
 * Complete cluster node information.
 * Combines node info with detailed resource breakdowns.
 * 
 * @example
 * ```typescript
 * const clusterNode: ClusterNode = {
 *   nodeInfo: { /* ... NodeInfo data ... */ },
 *   totalResources: {
 *     memory: 131072,  // 128 GB total
 *     vCores: 64
 *   },
 *   usedResources: {
 *     memory: 32768,   // 32 GB used
 *     vCores: 16
 *   },
 *   availableResources: {
 *     memory: 98304,   // 96 GB available
 *     vCores: 48
 *   }
 * };
 * ```
 */
export const ClusterNodeSchema = z.object({
  /** Node information */
  nodeInfo: NodeInfoSchema,
  /** Total resources on node */
  totalResources: ResourcesSchema,
  /** Resources currently in use */
  usedResources: ResourcesSchema,
  /** Resources available for allocation */
  availableResources: ResourcesSchema
});

// Type exports
export type NodeState = z.infer<typeof NodeStateSchema>;
export type NodeInfo = z.infer<typeof NodeInfoSchema>;
export type NodeLabel = z.infer<typeof NodeLabelSchema>;
export type NodeToLabelsMapping = z.infer<typeof NodeToLabelsMappingSchema>;
export type ClusterNode = z.infer<typeof ClusterNodeSchema>;