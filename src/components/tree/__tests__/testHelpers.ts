import type { QueueNode, QueueMetrics, LabelConfig } from '../../../types';

/**
 * Creates a mock QueueNode with proper structure for testing
 */
export function createMockQueueNode(
    path: string,
    name: string,
    options: {
        type?: 'parent' | 'leaf';
        capacity?: number;
        maxCapacity?: number;
        state?: 'RUNNING' | 'STOPPED';
        children?: QueueNode[];
        metrics?: Partial<QueueMetrics>;
        properties?: Map<string, string>;
        labelConfigs?: Map<string, LabelConfig>;
    } = {}
): QueueNode {
    const {
        type = 'leaf',
        capacity = 100,
        maxCapacity = 100,
        state = 'RUNNING',
        children = [],
        metrics = {},
        properties = new Map(),
        labelConfigs = new Map(),
    } = options;

    // Build default properties if not provided
    const defaultProperties = new Map([
        ['capacity', capacity.toString()],
        ['maximum-capacity', maxCapacity.toString()],
        ['state', state],
    ]);

    // Merge with provided properties
    properties.forEach((value, key) => {
        defaultProperties.set(key, value);
    });

    // Build metrics
    const queueMetrics: QueueMetrics = {
        usedCapacity: metrics.usedCapacity ?? 0,
        absoluteUsedCapacity: metrics.absoluteUsedCapacity ?? 0,
        numApplications: metrics.numApplications ?? 0,
        numActiveApplications: metrics.numActiveApplications ?? 0,
        numPendingApplications: metrics.numPendingApplications ?? 0,
        resourcesUsed: metrics.resourcesUsed ?? { memory: 0, vCores: 0 },
    };

    return {
        path,
        name,
        type,
        properties: defaultProperties,
        children,
        metrics: queueMetrics,
        labelConfigs,
    };
}

/**
 * Creates a mock queue tree for testing
 */
export function createMockQueueTree(): QueueNode {
    const defaultQueue = createMockQueueNode('root.default', 'default', {
        type: 'leaf',
        capacity: 40,
        maxCapacity: 80,
        metrics: {
            usedCapacity: 10,
            absoluteUsedCapacity: 4,
            numApplications: 2,
        },
    });

    const criticalQueue = createMockQueueNode('root.production.critical', 'critical', {
        type: 'leaf',
        capacity: 70,
        maxCapacity: 100,
        metrics: {
            usedCapacity: 50,
            absoluteUsedCapacity: 21,
            numApplications: 5,
        },
    });

    const batchQueue = createMockQueueNode('root.production.batch', 'batch', {
        type: 'leaf',
        capacity: 30,
        maxCapacity: 50,
        state: 'STOPPED',
        metrics: {
            usedCapacity: 0,
            absoluteUsedCapacity: 0,
            numApplications: 0,
        },
    });

    const productionQueue = createMockQueueNode('root.production', 'production', {
        type: 'parent',
        capacity: 60,
        maxCapacity: 100,
        children: [criticalQueue, batchQueue],
        metrics: {
            usedCapacity: 35,
            absoluteUsedCapacity: 21,
            numApplications: 5,
        },
    });

    const rootQueue = createMockQueueNode('root', 'root', {
        type: 'parent',
        capacity: 100,
        maxCapacity: 100,
        children: [defaultQueue, productionQueue],
        metrics: {
            usedCapacity: 25,
            absoluteUsedCapacity: 25,
            numApplications: 7,
        },
    });

    return rootQueue;
}