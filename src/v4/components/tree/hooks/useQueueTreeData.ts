import { useMemo } from 'react';
import type { Node, Edge } from '@xyflow/react';
import { useSchedulerStore } from '../../../store/schedulerStore';
import type { QueueNode, StagedChange } from '../../../types';
import { DagreLayout } from '../utils/DagreLayout';

export type QueueNodeData = {
    queuePath: string;
    queueName: string;
    capacity: number;
    maxCapacity: number;
    state: 'RUNNING' | 'STOPPED';
    usedCapacity: number;
    absoluteUsedCapacity: number;
    numApplications: number;
    resourcesUsed?: { memory: number; vCores: number };
    stagedStatus?: 'new' | 'modified' | 'deleted';
    isLeaf: boolean;
};

export type UseQueueTreeDataResult = {
    nodes: Node<QueueNodeData>[];
    edges: Edge[];
    isLoading: boolean;
    error: string | null;
};

// Create layout engine instance
const layoutEngine = new DagreLayout({
    nodeWidth: 280,
    nodeHeight: 220,
    horizontalSpacing: 50,
    verticalSpacing: 100,
    orientation: 'vertical',
});

// Get staged change status for a queue
function getStagedStatus(queuePath: string, stagedChanges: StagedChange[]): 'new' | 'modified' | 'deleted' | undefined {
    const changes = stagedChanges.filter(change => change.queuePath === queuePath);
    
    if (changes.some(c => c.type === 'remove')) {
        return 'deleted';
    }
    if (changes.some(c => c.type === 'add' && !c.property)) {
        return 'new';
    }
    if (changes.length > 0) {
        return 'modified';
    }
    
    return undefined;
}

// Transform QueueNode to React Flow node data
function transformToNodeData(queue: QueueNode, stagedChanges: StagedChange[]): QueueNodeData {
    const capacity = parseFloat(queue.properties.get('capacity') || '0');
    const maxCapacity = parseFloat(queue.properties.get('maximum-capacity') || '100');
    const state = (queue.properties.get('state') || 'RUNNING') as 'RUNNING' | 'STOPPED';

    return {
        queuePath: queue.path,
        queueName: queue.name,
        capacity,
        maxCapacity,
        state,
        usedCapacity: queue.metrics?.usedCapacity || 0,
        absoluteUsedCapacity: queue.metrics?.absoluteUsedCapacity || 0,
        numApplications: queue.metrics?.numApplications || 0,
        resourcesUsed: queue.metrics?.resourcesUsed,
        stagedStatus: getStagedStatus(queue.path, stagedChanges),
        isLeaf: queue.children.length === 0,
    };
}

// Create React Flow nodes from queue tree
function createNodes(
    queue: QueueNode,
    positions: Map<string, { x: number; y: number; width: number; height: number }>,
    stagedChanges: StagedChange[]
): Node<QueueNodeData>[] {
    const nodes: Node<QueueNodeData>[] = [];
    const position = positions.get(queue.path);

    if (position) {
        nodes.push({
            id: queue.path,
            type: 'queueCard',
            position: { x: position.x, y: position.y },
            data: transformToNodeData(queue, stagedChanges),
            width: position.width,
            height: position.height,
        });
    }

    // Recursively add child nodes
    queue.children.forEach(child => {
        nodes.push(...createNodes(child, positions, stagedChanges));
    });

    // Check for new queues in staged changes
    const newQueues = stagedChanges.filter(
        c => c.type === 'add' && !c.property && c.queuePath.startsWith(queue.path + '.')
    );
    
    newQueues.forEach(change => {
        const depth = change.queuePath.split('.').length - 1;
        const queueName = change.queuePath.split('.').pop() || '';
        
        // Create placeholder node for new queue
        nodes.push({
            id: change.queuePath,
            type: 'queueCard',
            position: { x: 0, y: depth * 320 }, // Rough positioning
            data: {
                queuePath: change.queuePath,
                queueName,
                capacity: 0,
                maxCapacity: 100,
                state: 'RUNNING',
                usedCapacity: 0,
                absoluteUsedCapacity: 0,
                numApplications: 0,
                stagedStatus: 'new',
                isLeaf: true,
            },
            width: 280,
            height: 220,
        });
    });

    return nodes;
}

// Helper to get capacity from a queue
function getCapacity(queue: QueueNode): number {
    return parseFloat(queue.properties.get('capacity') || '0');
}

// Create edges between parent and child nodes
function createEdges(parentQueue: QueueNode): Edge[] {
    const edges: Edge[] = [];

    parentQueue.children.forEach((child) => {
        const edge: Edge = {
            id: `${parentQueue.path}-${child.path}`,
            source: parentQueue.path,
            target: child.path,
            type: 'sankeyFlow',
            data: {
                capacity: getCapacity(child),
                targetState: child.properties.get('state') || 'UNKNOWN',
            },
        };
        edges.push(edge);

        // Recursively create edges for children
        edges.push(...createEdges(child));
    });

    return edges;
}

export function useQueueTreeData(): UseQueueTreeDataResult {
    const queueTree = useSchedulerStore(state => state.queueTree);
    const stagedChanges = useSchedulerStore(state => state.stagedChanges);
    const isLoading = useSchedulerStore(state => state.isLoading);
    const error = useSchedulerStore(state => state.error);

    const { nodes, edges } = useMemo(() => {
        if (!queueTree || isLoading) {
            return { nodes: [], edges: [] };
        }

        try {
            // Calculate layout using Dagre
            const positions = layoutEngine.calculatePositions(queueTree);

            // Create nodes
            const flowNodes = createNodes(queueTree, positions, stagedChanges);

            // Create edges
            const flowEdges = createEdges(queueTree);

            return { nodes: flowNodes, edges: flowEdges };
        } catch (err) {
            console.error('Error processing queue tree data:', err);
            return { nodes: [], edges: [] };
        }
    }, [queueTree, stagedChanges, isLoading]);

    return {
        nodes,
        edges,
        isLoading,
        error,
    };
}