import { useMemo } from 'react';
import { useSchedulerQuery } from '../../../hooks/useYarnApi';
import type { Queue } from '../../../types/Queue';

export interface QueueMetrics {
    usedCapacity: number;
    absoluteCapacity: number;
    absoluteUsedCapacity: number;
    absoluteMaxCapacity: number;
    numApplications: number;
    resourcesUsed: {
        memory: number;
        vCores: number;
    };
}

export function useQueueMetrics() {
    const { data: schedulerData, isLoading, error } = useSchedulerQuery();

    const metricsMap = useMemo(() => {
        const map = new Map<string, QueueMetrics>();

        if (!schedulerData?.scheduler?.schedulerInfo) {
            return map;
        }

        const traverse = (queue: any) => {
            const queuePath = queue.queuePath || queue.queueName;

            if (queuePath) {
                // Extract metrics from runtime data
                const defaultPartition = queue.capacities?.queueCapacitiesByPartition?.find(
                    (p: any) => !p.partitionName || p.partitionName === ''
                );

                map.set(queuePath, {
                    usedCapacity: queue.usedCapacity || 0,
                    absoluteCapacity: defaultPartition?.absoluteCapacity || queue.absoluteCapacity || 0,
                    absoluteUsedCapacity: defaultPartition?.absoluteUsedCapacity || queue.absoluteUsedCapacity || 0,
                    absoluteMaxCapacity: defaultPartition?.absoluteMaxCapacity || queue.absoluteMaxCapacity || 100,
                    numApplications: queue.numApplications || 0,
                    resourcesUsed: queue.resourcesUsed || { memory: 0, vCores: 0 },
                });
            }

            // Traverse children
            if (queue.queues?.queue) {
                queue.queues.queue.forEach(traverse);
            }
        };

        traverse(schedulerData.scheduler.schedulerInfo);
        return map;
    }, [schedulerData]);

    const getMetricsForQueue = (queuePath: string): QueueMetrics | undefined => {
        return metricsMap.get(queuePath);
    };

    return {
        getMetricsForQueue,
        isLoading,
        error: error as Error | null,
    };
}
