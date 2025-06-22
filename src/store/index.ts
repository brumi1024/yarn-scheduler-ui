import { useMemo } from 'react';
import { useDataStore } from './dataStore';
import { useUIStore } from './uiStore';
import { useChangesStore } from './changesStore';
import { useActivityStore } from './activityStore';

export { useDataStore } from './dataStore';
export { useUIStore } from './uiStore';
export { useChangesStore } from './changesStore';
export { useActivityStore } from './activityStore';

// Re-export types
export type * from './types';

// Derived selectors

export const useAllQueues = () => {
    const scheduler = useDataStore((state) => state.scheduler);
    return useMemo(() => {
        if (!scheduler?.scheduler?.schedulerInfo) return [];

        const flatten = (queue: any, parentPath = ''): any[] => {
            // Build the queue path properly
            const queuePath = parentPath ? `${parentPath}.${queue.queueName}` : queue.queueName;

            // Ensure queuePath is set on the queue object
            const queueWithPath = {
                ...queue,
                queuePath,
            };

            const result = [queueWithPath];
            if (queue.queues?.queue) {
                queue.queues.queue.forEach((child: any) => {
                    result.push(...flatten(child, queuePath));
                });
            }
            return result;
        };

        return flatten(scheduler.scheduler.schedulerInfo);
    }, [scheduler]);
};
export const useHasStagedChanges = () => {
    return useChangesStore((state) => state.stagedChanges.length > 0);
};

export const useGlobalProperties = () => {
    const configuration = useDataStore((state) => state.configuration);

    return useMemo(() => {
        if (!configuration?.property) return {};

        const globalProps: Record<string, string> = {};

        // Extract global properties (those not containing .root.)
        for (const prop of configuration.property) {
            if (prop.name && prop.value && !prop.name.includes('.root.')) {
                globalProps[prop.name] = prop.value;
            }
        }

        return globalProps;
    }, [configuration?.property]);
};
