/**
 * Store modules for YARN Scheduler UI state management
 *
 * @module stores
 */

/** UI state management store for selection, view settings, and modals */
export { useUIStore } from './uiStore';

/** Configuration data store for scheduler, queues, and node information */
export { useConfigurationStore } from './configurationStore';

/** Staged changes store for managing pending configuration updates */
export { useStagedChangesStore } from './stagedChangesStore';

/** Activity logging store for user actions and API calls */
export { useActivityStore } from './activityStore';

// Re-export types
export type * from './types';

// Import the stores after exporting them to avoid circular dependencies
import { useUIStore } from './uiStore';
import { useConfigurationStore } from './configurationStore';
import { useStagedChangesStore } from './stagedChangesStore';
import { useActivityStore } from './activityStore';


/**
 * Selectors that combine data from multiple stores
 * These are memoized automatically by Zustand's selector functions
 */

/** Get the currently selected queue data */
export const useSelectedQueue = () => {
    const selectedQueuePath = useUIStore((state) => state.selectedQueuePath);
    const scheduler = useConfigurationStore((state) => state.scheduler);

    if (!selectedQueuePath || !scheduler?.scheduler.schedulerInfo) {
        return null;
    }

    const schedulerInfo = scheduler.scheduler.schedulerInfo;

    // Check if the selected queue is root
    if (selectedQueuePath === 'root' && schedulerInfo.queueName === 'root') {
        return schedulerInfo;
    }

    // Find the queue by path in the scheduler data
    const findQueueByPath = (queues: any[], path: string): any => {
        for (const queue of queues) {
            // Use queuePath if available, otherwise construct it
            const queuePath = queue.queuePath || queue.queueName;
            if (queuePath === path) {
                return queue;
            }
            if (queue.queues?.queue) {
                const found = findQueueByPath(queue.queues.queue, path);
                if (found) return found;
            }
        }
        return null;
    };

    // Search in the queue tree
    const queues = schedulerInfo.queues?.queue || [];
    return findQueueByPath(queues, selectedQueuePath);
};

export const useAllQueues = () => {
    const scheduler = useConfigurationStore((state) => state.scheduler);

    if (!scheduler?.scheduler.schedulerInfo.queues?.queue) {
        return [];
    }

    const flattenQueues = (queues: any[], parentPath = 'root'): any[] => {
        const result: any[] = [];

        for (const queue of queues) {
            const queuePath = `${parentPath}.${queue.queueName}`;
            const queueWithPath = { ...queue, path: queuePath };

            result.push(queueWithPath);

            if (queue.queues?.queue) {
                result.push(...flattenQueues(queue.queues.queue, queuePath));
            }
        }

        return result;
    };

    return flattenQueues(scheduler.scheduler.schedulerInfo.queues.queue);
};

export const useHasUnsavedChanges = () => {
    const store = useStagedChangesStore();
    return store.hasUnsavedChanges();
};
