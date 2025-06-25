import type { QueueNode, QueueConfig, QueueMetrics } from '../types';
import { SchedulerResponseSchema } from '../schemas/apiSchemas';
import type { SchedulerResponse } from '../schemas/apiSchemas';

/**
 * Converts a queue path to its configuration prefix.
 *
 * @param queuePath - The queue path (e.g., 'root.production')
 * @returns The configuration prefix (e.g., 'yarn.scheduler.capacity.root.production')
 */
export const getQueuePrefix = (queuePath: string): string => {
    return `yarn.scheduler.capacity.${queuePath}`;
};

/**
 * Extracts configuration properties for a specific queue from the full config.
 *
 * @param fullConfig - The complete flat configuration object
 * @param queuePath - The queue path to extract config for
 * @returns Queue-specific configuration properties
 */
export const extractQueueConfig = (fullConfig: Record<string, string>, queuePath: string): QueueConfig => {
    const prefix = getQueuePrefix(queuePath);
    const config: QueueConfig = {};

    // First, get the list of child queues if any
    const queuesKey = `${prefix}.queues`;
    const childQueueNames = fullConfig[queuesKey] ? fullConfig[queuesKey].split(',').map((s) => s.trim()) : [];

    // Build full paths for child queues
    const childQueuePaths = childQueueNames.map((name) => `${queuePath}.${name}`);

    // Process each configuration entry
    Object.entries(fullConfig).forEach(([key, value]) => {
        // Skip if not our queue's property
        if (!key.startsWith(prefix + '.')) {
            return;
        }

        // Skip wildcard properties
        if (key.includes('*')) {
            return;
        }

        // Extract property name after queue prefix
        const propName = key.substring(prefix.length + 1);

        // Check if this property belongs to a child queue
        // by seeing if any child queue path is a prefix of the property
        const belongsToChildQueue = childQueuePaths.some((childPath) => {
            const childPrefix = childPath.substring(queuePath.length + 1) + '.';
            return propName.startsWith(childPrefix);
        });

        // If it doesn't belong to a child queue, it's our property
        if (!belongsToChildQueue) {
            config[propName] = value;
        }
    });

    return config;
};

/**
 * Builds a hierarchical queue tree from flat configuration.
 *
 * @param config - Flat configuration object from YARN
 * @param metrics - Optional runtime metrics to merge
 * @returns Root queue node or null if no root queue found
 */
export const buildQueueTree = (config: Record<string, string>, metrics?: SchedulerResponse): QueueNode | null => {
    // Check if we have any root queue configuration
    const hasRootConfig = Object.keys(config).some((key) => key.startsWith('yarn.scheduler.capacity.root.'));

    if (!hasRootConfig) {
        return null;
    }

    // Build the tree recursively
    const buildNode = (queuePath: string, queueName: string, queueMetrics?: SchedulerResponse): QueueNode => {
        const queueConfig = extractQueueConfig(config, queuePath);
        const node: QueueNode = {
            path: queuePath,
            name: queueName,
            config: queueConfig,
            children: [],
        };

        // Add metrics if available
        if (queueMetrics) {
            node.metrics = {
                capacity: queueMetrics.capacity,
                usedCapacity: queueMetrics.usedCapacity,
                absoluteCapacity: queueMetrics.capacity,
                absoluteUsedCapacity: queueMetrics.usedCapacity,
                absoluteMaxCapacity: queueMetrics.maxCapacity,
                numApplications: queueMetrics.numApplications || 0,
                queueName: queueMetrics.queueName,
                resourcesUsed: queueMetrics.resourcesUsed || { memory: 0, vCores: 0 },
            };
        }

        // Check for child queues
        const queuesStr = queueConfig.queues;
        if (queuesStr) {
            const childNames = queuesStr.split(',').map((s) => s.trim());

            childNames.forEach((childName) => {
                const childPath = `${queuePath}.${childName}`;

                // Find corresponding metrics for child
                let childMetrics: SchedulerResponse | undefined;
                if (queueMetrics?.queues?.queue) {
                    childMetrics = queueMetrics.queues.queue.find((q) => q.queueName === childName);
                }

                const childNode = buildNode(childPath, childName, childMetrics);
                node.children.push(childNode);
            });
        }

        return node;
    };

    // Start building from root
    return buildNode('root', 'root', metrics);
};

/**
 * Flattens a queue tree into an array of queue nodes.
 *
 * @param tree - The root queue node
 * @returns Array of all queue nodes in tree order
 */
export const flattenQueueTree = (tree: QueueNode): QueueNode[] => {
    const result: QueueNode[] = [];

    const traverse = (node: QueueNode) => {
        result.push(node);
        node.children.forEach((child) => traverse(child));
    };

    traverse(tree);
    return result;
};
