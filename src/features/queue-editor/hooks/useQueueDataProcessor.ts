import { useMemo } from 'react';
import { DagreLayout, type LayoutNode, type FlowPath, type LayoutQueue } from '../utils/layout/DagreLayout';
import { useUIStore } from '../../../store';
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
 * Convert ParsedQueue to LayoutQueue format
 */
function convertToLayoutQueue(
    queue: ParsedQueue,
    getMetrics: (path: string) => any,
    filteredQueueMap: Map<string, FilteredQueue>
): LayoutQueue {
    const metrics = getMetrics(queue.path) || {};
    const filteredData = filteredQueueMap.get(queue.path);

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
        children: queue.children?.map((child) => convertToLayoutQueue(child, getMetrics, filteredQueueMap)) || [],
        stagedStatus: queue.stagedStatus,
        isMatch: (queue as any).isMatch,
        isAncestorOfMatch: (queue as any).isAncestorOfMatch,
    };
}

export function useQueueDataProcessor() {
    const { hierarchy, isLoading: isConfigLoading, error: configError } = useQueueConfiguration();
    const { getMetricsForQueue, isLoading: isMetricsLoading } = useQueueMetrics();
    const searchQuery = useUIStore((state) => state.searchQuery);

    // Get all queues for node label filtering
    const allQueues = useMemo(() => {
        if (!hierarchy) return [];

        const queues: any[] = [];
        const traverse = (q: ParsedQueue) => {
            queues.push({
                queueName: q.name,
                queuePath: q.path,
                capacity: q.capacity.numericValue || 0,
                maxCapacity: q.maxCapacity.numericValue || 100,
                state: q.state,
                ...q.properties,
            });
            q.children?.forEach(traverse);
        };
        traverse(hierarchy);
        return queues;
    }, [hierarchy]);

    // Apply node label filtering
    const filteredQueues = useNodeLabelFilteredQueues(allQueues);
    const filteredQueueMap = useMemo(() => {
        const map = new Map<string, FilteredQueue>();
        filteredQueues.forEach((q) => map.set(q.queuePath, q));
        return map;
    }, [filteredQueues]);

    const treeLayout = useMemo(() => {
        return new DagreLayout({
            nodeWidth: 280,
            nodeHeight: 220,
            horizontalSpacing: 100,
            verticalSpacing: 80,
            orientation: 'horizontal',
        });
    }, []);

    return useMemo((): ProcessedFlowData => {
        if (isConfigLoading || isMetricsLoading) {
            return { nodes: [], edges: [], isLoading: true, error: null };
        }

        if (configError) {
            return {
                nodes: [],
                edges: [],
                isLoading: false,
                error: configError.message || 'Configuration loading failed',
            };
        }

        if (!hierarchy) {
            return { nodes: [], edges: [], isLoading: false, error: null };
        }

        // Apply search filter
        const filteredHierarchy = searchQuery ? applySearchFilter(hierarchy, searchQuery) : hierarchy;

        if (!filteredHierarchy) {
            return { nodes: [], edges: [], isLoading: false, error: null };
        }

        // Convert to layout format
        const layoutQueue = convertToLayoutQueue(filteredHierarchy, getMetricsForQueue, filteredQueueMap);

        // Calculate layout
        const layoutData = treeLayout.computeLayout(layoutQueue);

        // Convert to React Flow format
        const flowNodes: Node<QueueNodeData>[] = layoutData.nodes.map((node) => ({
            id: node.id,
            type: 'queueCard',
            position: { x: node.x, y: node.y },
            data: node.data as QueueNodeData,
            draggable: false,
            selectable: true,
        }));

        const flowEdges: Edge[] = layoutData.flows.map((flow) => ({
            id: `${flow.source.id}-${flow.target.id}`,
            source: flow.source.id,
            target: flow.target.id,
            type: 'customFlow',
            animated: flow.target.data.state === 'RUNNING',
            data: {
                sourceStartY: flow.sourceStartY,
                sourceEndY: flow.sourceEndY,
                targetStartY: flow.targetStartY,
                targetEndY: flow.targetEndY,
                capacity: flow.capacity,
                targetState: flow.target.data.state,
            }
        }));

        return { nodes: flowNodes, edges: flowEdges, isLoading: false, error: null };
    }, [
        isConfigLoading,
        isMetricsLoading,
        configError,
        hierarchy,
        searchQuery,
        getMetricsForQueue,
        filteredQueueMap,
        treeLayout,
    ]);
}
