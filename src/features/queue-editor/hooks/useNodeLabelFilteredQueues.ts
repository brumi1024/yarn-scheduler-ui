import { useMemo } from 'react';
import { useUIStore } from '../../../store/uiStore';
import type { Queue } from '../../../types/Queue';
import { hasQueueAccessToLabel } from '../../../utils/nodeLabelUtils';

interface FilteredQueue extends Queue {
    hasLabelAccess: boolean;
    labelCapacity?: number;
    labelMaxCapacity?: number;
    isLabelCapacityConfigured: boolean;
    isLabelMaxCapacityConfigured: boolean;
    effectiveCapacity: number;
    effectiveMaxCapacity: number;
}

export function useNodeLabelFilteredQueues(queues: Queue[]): FilteredQueue[] {
    const selectedNodeLabel = useUIStore((state) => state.selectedNodeLabel);

    return useMemo(() => {
        return queues.map((queue) => {
            // Default case - no label selected or "default" label selected (default partition)
            if (!selectedNodeLabel || selectedNodeLabel === 'default') {
                return {
                    ...queue,
                    hasLabelAccess: true, // All queues have access to default partition
                    isLabelCapacityConfigured: false,
                    isLabelMaxCapacityConfigured: false,
                    effectiveCapacity: queue.capacity || 0,
                    effectiveMaxCapacity: queue.maxCapacity || 100,
                };
            }

            // Check if queue has access to the selected label using improved logic
            const hasLabelAccess = hasQueueAccessToLabel(queue, selectedNodeLabel, queues);

            // Get label-specific capacity if configured
            const labelCapacityKey = `accessible-node-labels.${selectedNodeLabel}.capacity`;
            const labelCapacity = (queue as Record<string, unknown>)[labelCapacityKey];
            const isLabelCapacityConfigured = labelCapacity !== undefined;

            // Get label-specific max capacity if configured
            const labelMaxCapacityKey = `accessible-node-labels.${selectedNodeLabel}.maximum-capacity`;
            const labelMaxCapacity = (queue as Record<string, unknown>)[labelMaxCapacityKey];
            const isLabelMaxCapacityConfigured = labelMaxCapacity !== undefined;

            return {
                ...queue,
                hasLabelAccess,
                labelCapacity: isLabelCapacityConfigured ? parseFloat(labelCapacity as string) : undefined,
                labelMaxCapacity: isLabelMaxCapacityConfigured ? parseFloat(labelMaxCapacity as string) : undefined,
                isLabelCapacityConfigured,
                isLabelMaxCapacityConfigured,
                effectiveCapacity: isLabelCapacityConfigured 
                    ? parseFloat(labelCapacity as string)
                    : (hasLabelAccess ? queue.capacity || 0 : 0),
                effectiveMaxCapacity: isLabelMaxCapacityConfigured 
                    ? parseFloat(labelMaxCapacity as string)
                    : (hasLabelAccess ? queue.maxCapacity || 100 : 0),
            };
        });
    }, [queues, selectedNodeLabel]);
}