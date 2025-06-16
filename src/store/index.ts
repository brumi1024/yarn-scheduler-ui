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
export const useSelectedQueue = () => {
    const selectedPath = useUIStore((state) => state.selectedQueuePath);
    const scheduler = useDataStore((state) => state.scheduler);

    return useMemo(() => {
        if (!selectedPath || !scheduler?.scheduler.schedulerInfo) return null;

        const findQueue = (queue: any): any => {
            // The queuePath property is added during parsing in some versions, but queueName is more reliable
            const path = queue.queuePath || queue.queueName;
            if (path === selectedPath) {
                return queue;
            }
            if (queue.queues?.queue) {
                for (const child of queue.queues.queue) {
                    const found = findQueue(child);
                    if (found) return found;
                }
            }
            return null;
        };

        return findQueue(scheduler.scheduler.schedulerInfo);
    }, [selectedPath, scheduler]);
};

export const useAllQueues = () => {
    const scheduler = useDataStore((state) => state.scheduler);
    return useMemo(() => {
        if (!scheduler?.scheduler.schedulerInfo) return [];

        const flatten = (queue: any): any[] => {
            const result = [queue];
            if (queue.queues?.queue) {
                queue.queues.queue.forEach((child: any) => {
                    result.push(...flatten(child));
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
