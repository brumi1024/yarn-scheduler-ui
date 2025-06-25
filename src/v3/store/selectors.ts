import type { YarnSchedulerStore, QueueNode } from './types';
import { buildQueueTree, flattenQueueTree } from './utils/dataTransformers';

/**
 * Computes the effective configuration by merging original config with staged changes.
 * This is the single source of truth for the current configuration state.
 */
export const selectEffectiveConfig = (state: YarnSchedulerStore): Record<string, string> => {
    const config = { ...state.originalConfig };

    // Apply staged changes
    state.propertyChanges.forEach((change, path) => {
        if (change.stagedValue !== undefined) {
            config[path] = String(change.stagedValue);
        }
    });

    return config;
};

/**
 * Derives the queue tree from the effective configuration.
 * The tree is automatically rebuilt when configuration or metrics change.
 */
export const selectEffectiveQueueTree = (state: YarnSchedulerStore): QueueNode | null => {
    const config = selectEffectiveConfig(state);
    return buildQueueTree(config, state.metrics);
};

/**
 * Gets a specific queue property value from the effective configuration.
 */
export const selectQueueProperty =
    (queuePath: string, property: string) =>
    (state: YarnSchedulerStore): string | undefined => {
        const config = selectEffectiveConfig(state);
        return config[`yarn.scheduler.capacity.${queuePath}.${property}`];
    };

/**
 * Gets all properties for a specific queue from the effective configuration.
 */
export const selectQueueProperties =
    (queuePath: string) =>
    (state: YarnSchedulerStore): Record<string, string> => {
        const config = selectEffectiveConfig(state);
        const prefix = `yarn.scheduler.capacity.${queuePath}.`;
        const properties: Record<string, string> = {};

        Object.entries(config).forEach(([key, value]) => {
            if (key.startsWith(prefix)) {
                const propName = key.substring(prefix.length);
                // Only include direct properties, not child queue properties
                if (!propName.includes('.')) {
                    properties[propName] = value;
                }
            }
        });

        return properties;
    };

/**
 * Gets a flattened array of all queues from the effective tree.
 */
export const selectAllQueues = (state: YarnSchedulerStore): QueueNode[] => {
    const tree = selectEffectiveQueueTree(state);
    return tree ? flattenQueueTree(tree) : [];
};

/**
 * Filters the queue tree by node label assignment.
 * Returns a new tree containing only queues that have the specified label.
 */
export const selectQueuesByNodeLabel =
    (label: string) =>
    (state: YarnSchedulerStore): QueueNode | null => {
        const tree = selectEffectiveQueueTree(state);
        if (!tree) return null;

        const filterByLabel = (node: QueueNode): QueueNode | null => {
            // Check if this queue has the label in its accessible-node-labels
            const accessibleLabels = node.config['accessible-node-labels'];
            const hasLabel = accessibleLabels
                ?.split(',')
                .map((l) => l.trim())
                .includes(label);

            // Filter children recursively
            const filteredChildren = node.children
                .map((child) => filterByLabel(child))
                .filter((child): child is QueueNode => child !== null);

            // Include node if it has the label or has children with the label
            if (hasLabel || filteredChildren.length > 0) {
                return {
                    ...node,
                    children: filteredChildren,
                };
            }

            return null;
        };

        return filterByLabel(tree);
    };

/**
 * Checks if a specific property has staged changes.
 */
export const selectPropertyIsDirty =
    (propertyPath: string) =>
    (state: YarnSchedulerStore): boolean => {
        return state.propertyChanges.has(propertyPath);
    };

/**
 * Gets the count of staged changes.
 */
export const selectChangeCount = (state: YarnSchedulerStore): number => {
    return state.propertyChanges.size + state.nodeLabelChanges.size;
};

/**
 * Gets changes grouped by queue path for easier UI display.
 */
export const selectChangesByQueue = (
    state: YarnSchedulerStore
): Map<
    string,
    Array<{
        property: string;
        originalValue: unknown;
        stagedValue: unknown;
    }>
> => {
    const changesByQueue = new Map<
        string,
        Array<{
            property: string;
            originalValue: unknown;
            stagedValue: unknown;
        }>
    >();

    state.propertyChanges.forEach((change, path) => {
        // Extract queue path from property path
        const match = path.match(/^yarn\.scheduler\.capacity\.([^.]+(?:\.[^.]+)*?)\.([^.]+)$/);
        if (match) {
            const [, queuePath, property] = match;

            if (!changesByQueue.has(queuePath)) {
                changesByQueue.set(queuePath, []);
            }

            changesByQueue.get(queuePath)!.push({
                property,
                originalValue: change.originalValue,
                stagedValue: change.stagedValue,
            });
        }
    });

    return changesByQueue;
};
