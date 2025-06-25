import { useMemo } from 'react';
import { DagreLayout, type LayoutNode, type FlowPath, type LayoutQueue } from '../utils/layout/DagreLayout';
import { useUIStore } from '../../../store';
import { useConfigStore } from '../../../store/configStore';
import type { ParsedQueue } from '../../../types/Queue';
import type { Node, Edge } from '@xyflow/react';
import { useQueueConfiguration } from './useQueueConfiguration';
import { useQueueMetrics } from './useQueueMetrics';
import { useNodeLabelFilteredQueues, type FilteredQueue } from './useNodeLabelFilteredQueues';

export type QueueNodeData = LayoutQueue & {
    stagedStatus?: 'new' | 'deleted' | 'modified';
    isMatch?: boolean;
    isAncestorOfMatch?: boolean;
    // Node label filtering properties
    hasLabelAccess?: boolean;
    labelCapacity?: number;
    labelMaxCapacity?: number;
    isLabelCapacityConfigured?: boolean;
    isLabelMaxCapacityConfigured?: boolean;
    effectiveCapacity?: number;
    effectiveMaxCapacity?: number;
};

export interface ProcessedFlowData {
    nodes: Node<QueueNodeData>[];
    edges: Edge[];
    isLoading: boolean;
    error: string | null;
}

/**
 * Apply search filter to queue hierarchy
 */
function applySearchFilter(queue: ParsedQueue, searchQuery: string, isMatch = false): ParsedQueue | null {
    if (!searchQuery.trim()) return queue;

    const query = searchQuery.toLowerCase();
    const queueMatches = queue.name.toLowerCase().includes(query) || queue.path.toLowerCase().includes(query);

    // Check if any children match
    const filteredChildren: ParsedQueue[] = [];
    let hasMatchingDescendant = false;

    for (const child of queue.children || []) {
        const filteredChild = applySearchFilter(child, searchQuery, queueMatches);
        if (filteredChild) {
            filteredChildren.push(filteredChild);
            if ((filteredChild as any).isMatch || (filteredChild as any).isAncestorOfMatch) {
                hasMatchingDescendant = true;
            }
        }
    }

    // Include queue if it matches or has matching descendants
    if (queueMatches || hasMatchingDescendant) {
        return {
            ...queue,
            children: filteredChildren,
            isMatch: queueMatches,
            isAncestorOfMatch: !queueMatches && hasMatchingDescendant,
        } as ParsedQueue;
    }

    return null;
}

/**
 * Convert ParsedQueue to LayoutQueue format with staged status
 */
function convertToLayoutQueue(
    queue: ParsedQueue,
    getMetricsForQueue: (path: string) => any,
    filteredQueueMap: Map<string, FilteredQueue>,
    stagedPaths: Set<string>
): LayoutQueue {
    const metrics = getMetricsForQueue(queue.path) || {};
    const filteredData = filteredQueueMap.get(queue.path);

    // Check if this queue has staged changes
    const hasChanges = stagedPaths.has(queue.path);

    return {
        id: queue.path,
        queueName: queue.name,
        queuePath: queue.path,
        // Configuration values (editable)
        capacity: queue.capacity.numericValue || 0,
        maxCapacity: queue.maxCapacity.numericValue || 100,
        state: queue.state || 'RUNNING',
        // Runtime metrics (read-only)
        usedCapacity: metrics.usedCapacity || 0,
        absoluteCapacity: metrics.absoluteCapacity || 0,
        absoluteUsedCapacity: metrics.absoluteUsedCapacity || 0,
        absoluteMaxCapacity: metrics.absoluteMaxCapacity || 100,
        numApplications: metrics.numApplications || 0,
        resourcesUsed: metrics.resourcesUsed || { memory: 0, vCores: 0 },
        // Node label filtering
        hasLabelAccess: filteredData?.hasLabelAccess ?? true,
        effectiveCapacity: filteredData?.effectiveCapacity ?? queue.capacity.numericValue,
        effectiveMaxCapacity: filteredData?.effectiveMaxCapacity ?? queue.maxCapacity.numericValue,
        isLabelCapacityConfigured: filteredData?.isLabelCapacityConfigured ?? false,
        isLabelMaxCapacityConfigured: filteredData?.isLabelMaxCapacityConfigured ?? false,
        // UI state
        children:
            queue.children?.map((child) =>
                convertToLayoutQueue(child, getMetricsForQueue, filteredQueueMap, stagedPaths)
            ) || [],
        isLeaf: !queue.children || queue.children.length === 0,
        isMatch: (queue as any).isMatch,
        isAncestorOfMatch: (queue as any).isAncestorOfMatch,
        stagedStatus: hasChanges ? 'modified' : undefined,
    };
}

/**
 * Main hook to process queue data for visualization
 * This version uses the new state management
 */
export function useQueueDataProcessor(): ProcessedFlowData {
    const { queues, isLoading, error } = useQueueConfiguration();
    const { getMetricsForQueue } = useQueueMetrics();
    const filteredQueues = useNodeLabelFilteredQueues(queues);

    // Get staged changes to mark modified queues
    const staged = useConfigStore((state) => state.staged);
    const stagedQueuePaths = useMemo(() => {
        const paths = new Set<string>();
        staged.forEach((_, path) => {
            // Extract queue path from property path
            if (path.startsWith('queues.')) {
                const parts = path.split('.');
                // Find where the property starts (after queue path)
                const propertyIdx = parts.findIndex(
                    (p) =>
                        p.includes('-') ||
                        p === 'capacity' ||
                        p === 'maximum-capacity' ||
                        p === 'state' ||
                        p === 'accessible-node-labels'
                );
                if (propertyIdx > 1) {
                    const queuePath = parts.slice(1, propertyIdx).join('.');
                    paths.add(queuePath);
                }
            }
        });
        return paths;
    }, [staged]);

    // Get UI state
    const searchQuery = useUIStore((state) => state.searchQuery);

    // Process queue data
    const { nodes, edges } = useMemo(() => {
        // console.log('useQueueDataProcessor: Processing queues', { isLoading, queueCount: queues.length });
        if (isLoading || !queues.length) {
            return { nodes: [], edges: [] };
        }

        try {
            // Build filtered queue map for node label filtering
            const filteredQueueMap = new Map<string, FilteredQueue>();
            filteredQueues.forEach((fq) => {
                filteredQueueMap.set(fq.queuePath, fq);
            });

            // Apply search filter if needed
            let rootQueue = queues[0]; // Assume first queue is root
            // console.log('useQueueDataProcessor: Root queue', rootQueue);
            if (searchQuery) {
                const filtered = applySearchFilter(rootQueue, searchQuery);
                if (!filtered) {
                    return { nodes: [], edges: [] };
                }
                rootQueue = filtered;
            }

            // Convert to layout format
            const layoutQueue = convertToLayoutQueue(rootQueue, getMetricsForQueue, filteredQueueMap, stagedQueuePaths);

            // Use Dagre layout to position nodes
            const layout = new DagreLayout();
            const { nodes: layoutNodes, flows } = layout.computeLayout(layoutQueue);

            // Convert to React Flow nodes
            const flowNodes: Node<QueueNodeData>[] = layoutNodes.map((node: LayoutNode) => ({
                id: node.id,
                type: 'queueCard',
                position: { x: node.x, y: node.y },
                data: node.data,
                width: node.width,
                height: node.height,
            }));

            // Convert to React Flow edges
            const flowEdges: Edge[] = flows.map((flow: FlowPath, index: number) => ({
                id: `e${flow.source.id}-${flow.target.id}-${index}`,
                source: flow.source.id,
                target: flow.target.id,
                type: 'customFlow',
                data: {
                    capacity: flow.capacity,
                    targetState: flow.target.data.state,
                    sourceStartY: flow.sourceStartY,
                    sourceEndY: flow.sourceEndY,
                    targetStartY: flow.targetStartY,
                    targetEndY: flow.targetEndY,
                },
            }));

            return { nodes: flowNodes, edges: flowEdges };
        } catch (err) {
            console.error('Error processing queue data:', err);
            return { nodes: [], edges: [] };
        }
    }, [queues, isLoading, searchQuery, filteredQueues, getMetricsForQueue, stagedQueuePaths]);

    return {
        nodes,
        edges,
        isLoading,
        error,
    };
}
