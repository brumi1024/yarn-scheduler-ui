import { useMemo } from 'react';
import { useConfigStore } from '../../../store/configStore';
import { useRuntimeStore } from '../../../store/runtimeStore';
import type { ParsedQueue } from '../../../types/Queue';
import { parseConfiguration } from '../../../utils/configurationParser';

/**
 * Hook that provides the queue configuration with staged changes applied.
 * This is the primary way components should access queue data.
 */
export function useQueueConfiguration() {
    const computed = useConfigStore((state) => state.computed);
    const computedVersion = useConfigStore((state) => state.computedVersion);
    const isLoading = useConfigStore((state) => state.isLoading);
    const error = useConfigStore((state) => state.error);

    // Get runtime data for additional queue info
    const scheduler = useRuntimeStore((state) => state.scheduler);

    // Merge with runtime data if available
    const enrichedQueues = useMemo(() => {
        if (!computed?.queues) {
            return [];
        }

        if (!scheduler) {
            return computed.queues;
        }

        // Function to enrich queue with runtime data
        const enrichQueue = (queue: ParsedQueue): ParsedQueue => {
            // Find matching runtime queue data
            const findRuntimeQueue = (runtimeQueue: any, path: string): any => {
                if (runtimeQueue.queueName === path) {
                    return runtimeQueue;
                }
                if (runtimeQueue.queues?.queue) {
                    for (const child of runtimeQueue.queues.queue) {
                        const found = findRuntimeQueue(child, path);
                        if (found) return found;
                    }
                }
                return null;
            };

            const runtimeData = scheduler.schedulerInfo?.queues?.queue
                ? findRuntimeQueue(
                      { queueName: 'root', queues: { queue: scheduler.schedulerInfo.queues.queue } },
                      queue.path
                  )
                : null;

            const enriched = { ...queue };

            if (runtimeData) {
                // Add runtime-only data (usage, etc.)
                enriched.usedCapacity = parseFloat(runtimeData.usedCapacity || '0');
                enriched.absoluteUsedCapacity = parseFloat(runtimeData.absoluteUsedCapacity || '0');
                enriched.numApplications = parseInt(runtimeData.numApplications || '0', 10);
                enriched.usedResources = runtimeData.resourcesUsed;
            }

            // Recursively enrich children
            if (enriched.children) {
                enriched.children = enriched.children.map(enrichQueue);
            }

            return enriched;
        };

        return computed.queues.map(enrichQueue);
    }, [computed, scheduler, computedVersion]);

    return {
        queues: enrichedQueues || [],
        isLegacyMode: computed?.isLegacyMode ?? true,
        isLoading,
        error,
        refetch: () => useConfigStore.getState().refresh(),
    };
}
