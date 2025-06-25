import { useMemo } from 'react';
import { useRuntimeStore } from './runtimeStore';
import { useConfigStore } from './configStore';
import { useUIStore } from './uiStore';
import { useActivityStore } from './activityStore';
import { useNodeLabelStore } from './nodeLabelStore';

export { useRuntimeStore } from './runtimeStore';
export { useConfigStore } from './configStore';
export { useUIStore } from './uiStore';
export { useActivityStore } from './activityStore';
export { useNodeLabelStore } from './nodeLabelStore';

// Re-export types
export type * from './types';

// Derived selectors

export const useAllQueues = () => {
    const scheduler = useRuntimeStore((state) => state.scheduler);
    return useMemo(() => {
        if (!scheduler) return [];

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

        return flatten(scheduler);
    }, [scheduler]);
};

export const useHasStagedChanges = () => {
    return useConfigStore((state) => state.staged.size > 0);
};

export const useGlobalProperties = () => {
    const computed = useConfigStore((state) => state.computed);

    return useMemo(() => {
        if (!computed?.global) return {};

        // Return the global properties from the computed configuration
        return computed.global as Record<string, string>;
    }, [computed?.global]);
};
