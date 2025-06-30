import { useMemo } from 'react';
import type { Node, Edge } from '@xyflow/react';
import { useSchedulerStore } from '../../../store/schedulerStore';
import type { QueueInfo, StagedChange, SchedulerInfo, CapacitySchedulerInfo } from '../../../types';
import type { QueueStateValue } from '../../../types/constants';
import { AUTO_CREATION_PROPS } from '../../../types/constants';
import { DagreLayout } from '../utils/DagreLayout';

// Extended QueueInfo for React Flow nodes - just adds UI-specific metadata
export type QueueCardData = QueueInfo & {
    stagedStatus?: 'new' | 'modified' | 'deleted';
    isLeaf: boolean;
    // Config strings for editable fields (separate from live data)
    capacityConfig: string;
    maxCapacityConfig: string;
    // Staged state for visual indication
    stagedState?: string;
    // Auto queue creation eligibility
    autoCreationEligibility?: string;
    // Auto-creation status with staging info
    autoCreationStatus?: { status: string; isStaged: boolean };
};

export type UseQueueTreeDataResult = {
    nodes: Node<QueueCardData>[];
    edges: Edge[];
    isLoading: boolean;
    error: string | null;
};

// Create layout engine instance
const layoutEngine = new DagreLayout({
    nodeWidth: 320,
    nodeHeight: 220,
    horizontalSpacing: 120,
    verticalSpacing: 80,
    orientation: 'horizontal',
});

// Convert SchedulerInfo to QueueInfo format for consistent processing
function convertSchedulerInfoToQueueInfo(schedulerInfo: SchedulerInfo): QueueInfo {
    // Type guard and cast to CapacitySchedulerInfo if needed for additional properties
    const capacitySchedulerInfo = schedulerInfo as CapacitySchedulerInfo;
    
    return {
        type: schedulerInfo.type,
        capacity: schedulerInfo.capacity,
        usedCapacity: schedulerInfo.usedCapacity,
        maxCapacity: schedulerInfo.maxCapacity,
        // Extract these from capacities if available, otherwise use calculated defaults
        absoluteCapacity: capacitySchedulerInfo.capacities?.queueCapacitiesByPartition?.[0]?.absoluteCapacity ?? schedulerInfo.capacity,
        absoluteMaxCapacity: capacitySchedulerInfo.capacities?.queueCapacitiesByPartition?.[0]?.absoluteMaxCapacity ?? schedulerInfo.maxCapacity,
        absoluteUsedCapacity: capacitySchedulerInfo.capacities?.queueCapacitiesByPartition?.[0]?.absoluteUsedCapacity ?? schedulerInfo.usedCapacity,
        // These properties may not exist on base SchedulerInfo, use defaults
        numApplications: 0, // Root queue typically doesn't run applications directly
        numActiveApplications: 0,
        numPendingApplications: 0,
        resourcesUsed: capacitySchedulerInfo.usedResources,
        queueName: schedulerInfo.queueName,
        queuePath: capacitySchedulerInfo.queuePath || schedulerInfo.queueName, // Fallback to queueName if path missing
        state: (capacitySchedulerInfo.state as QueueStateValue) || 'RUNNING', // Default to RUNNING if not specified
        queues: schedulerInfo.queues, // Preserve the children queues structure
        // Preserve auto-creation eligibility if available
        autoCreationEligibility: capacitySchedulerInfo.autoCreationEligibility,
    };
}


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

// Get auto-creation status considering staged changes
function getAutoCreationStatus(
    queuePath: string, 
    liveAutoCreationEligibility: string | undefined,
    stagedChanges: StagedChange[]
): { status: string; isStaged: boolean } {
    // Check for staged auto-creation changes
    const legacyChange = stagedChanges.find(
        c => c.queuePath === queuePath && c.property === AUTO_CREATION_PROPS.LEGACY_ENABLED
    );
    const flexibleChange = stagedChanges.find(
        c => c.queuePath === queuePath && c.property === AUTO_CREATION_PROPS.FLEXIBLE_ENABLED
    );
    
    // If there are staged changes, determine the new status
    if (legacyChange || flexibleChange) {
        const isLegacyEnabled = legacyChange?.newValue === 'true';
        const isFlexibleEnabled = flexibleChange?.newValue === 'true';
        
        // Flexible takes precedence if both are somehow enabled
        if (isFlexibleEnabled) {
            return { status: AUTO_CREATION_PROPS.ELIGIBILITY_FLEXIBLE, isStaged: true };
        } else if (isLegacyEnabled) {
            return { status: AUTO_CREATION_PROPS.ELIGIBILITY_LEGACY, isStaged: true };
        } else {
            return { status: AUTO_CREATION_PROPS.ELIGIBILITY_OFF, isStaged: true };
        }
    }
    
    // No staged changes, return live data
    return { 
        status: liveAutoCreationEligibility || AUTO_CREATION_PROPS.ELIGIBILITY_OFF, 
        isStaged: false 
    };
}

// Transform QueueInfo to React Flow node data - direct transformation
function transformToCardData(queueInfo: QueueInfo, stagedChanges: StagedChange[]): QueueCardData {
    const getQueueDisplayValue = useSchedulerStore.getState().getQueueDisplayValue;
    
    // Get config strings (for editable fields only - completely separate from live data)
    const capacityDisplay = getQueueDisplayValue(queueInfo.queuePath, 'capacity');
    const maxCapacityDisplay = getQueueDisplayValue(queueInfo.queuePath, 'maximum-capacity');
    
    // Check for staged state changes
    const stateDisplay = getQueueDisplayValue(queueInfo.queuePath, 'state');
    
    // Create QueueCardData with live data + config strings + UI metadata
    return {
        // Spread all live QueueInfo data (includes capacity, maxCapacity as numbers)
        ...queueInfo,
        
        // UI-specific metadata
        stagedStatus: getStagedStatus(queueInfo.queuePath, stagedChanges),
        isLeaf: !queueInfo.queues?.queue || (
            Array.isArray(queueInfo.queues.queue) ? queueInfo.queues.queue.length === 0 : false
        ),
        
        // Config strings (for editing only - separate concern from live data)
        capacityConfig: capacityDisplay.value || '0',
        maxCapacityConfig: maxCapacityDisplay.value || '100',
        
        // Staged state for visual indication (only when different from live state)
        stagedState: stateDisplay.isStaged ? stateDisplay.value : undefined,
        
        // Auto queue creation eligibility (from queue data if available)
        autoCreationEligibility: queueInfo.autoCreationEligibility,
        
        // Auto-creation status with staging info
        autoCreationStatus: getAutoCreationStatus(queueInfo.queuePath, queueInfo.autoCreationEligibility, stagedChanges),
    };
}

// Flatten QueueInfo tree to array for React Flow
function flattenQueueTree(queueInfo: QueueInfo, stagedChanges: StagedChange[]): QueueCardData[] {
    const result: QueueCardData[] = [];
    
    // Add current queue
    result.push(transformToCardData(queueInfo, stagedChanges));
    
    // Recursively add children
    if (queueInfo.queues?.queue) {
        const children = Array.isArray(queueInfo.queues.queue) 
            ? queueInfo.queues.queue 
            : [queueInfo.queues.queue];
            
        for (const child of children) {
            result.push(...flattenQueueTree(child, stagedChanges));
        }
    }
    
    return result;
}

// Create React Flow nodes from flattened queue list
function createNodes(
    queues: QueueCardData[],
    positions: Map<string, { x: number; y: number; width: number; height: number }>,
    stagedChanges: StagedChange[]
): Node<QueueCardData>[] {
    const nodes: Node<QueueCardData>[] = [];
    
    for (const queue of queues) {
        const position = positions.get(queue.queuePath);
        
        if (position) {
            nodes.push({
                id: queue.queuePath,
                type: 'queueCard',
                position: { x: position.x, y: position.y },
                data: queue,
                width: position.width,
                height: position.height,
            });
        }
    }
    
    // Add nodes for staged new queues
    const newQueues = stagedChanges.filter(
        c => c.type === 'add' && !c.property
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
                // Create minimal QueueInfo structure for new queue
                type: 'capacitySchedulerLeafQueueInfo',
                capacity: 0,
                usedCapacity: 0,
                maxCapacity: 100,
                absoluteCapacity: 0,
                absoluteMaxCapacity: 100,
                absoluteUsedCapacity: 0,
                numApplications: 0,
                numActiveApplications: 0,
                numPendingApplications: 0,
                queueName,
                queuePath: change.queuePath,
                state: 'RUNNING' as const,
                
                // UI metadata
                stagedStatus: 'new' as const,
                isLeaf: true,
                capacityConfig: '0',
                maxCapacityConfig: '100',
            },
            width: 320,
            height: 220,
        });
    });

    return nodes;
}

// Create edges between parent and child nodes - use LIVE DATA for visualization
function createEdges(queueInfo: QueueInfo): Edge[] {
    const edges: Edge[] = [];

    if (queueInfo.queues?.queue) {
        const children = Array.isArray(queueInfo.queues.queue)
            ? queueInfo.queues.queue
            : [queueInfo.queues.queue];

        children.forEach((child) => {
            const edge: Edge = {
                id: `${queueInfo.queuePath}-${child.queuePath}`,
                source: queueInfo.queuePath,
                target: child.queuePath,
                type: 'sankeyFlow',
                data: {
                    // FIXED: Use live capacity data for edge visualization, not config strings
                    capacity: child.capacity, // This is always a number from QueueInfo
                    targetState: child.state,
                },
            };
            edges.push(edge);

            // Recursively create edges for children
            edges.push(...createEdges(child));
        });
    }

    return edges;
}

export function useQueueTreeData(): UseQueueTreeDataResult {
    const schedulerData = useSchedulerStore(state => state.schedulerData);
    const stagedChanges = useSchedulerStore(state => state.stagedChanges);
    const isLoading = useSchedulerStore(state => state.isLoading);
    const error = useSchedulerStore(state => state.error);

    const { nodes, edges } = useMemo(() => {
        if (!schedulerData || isLoading) {
            return { nodes: [], edges: [] };
        }

        try {
            // Convert SchedulerInfo to QueueInfo for consistent processing
            const rootQueue = convertSchedulerInfoToQueueInfo(schedulerData);
            
            // Flatten QueueInfo tree to array
            const flatQueues = flattenQueueTree(rootQueue, stagedChanges);
            
            // Calculate layout using Dagre directly with QueueInfo
            const positions = layoutEngine.calculatePositions(rootQueue);

            // Create nodes using flattened queue data
            const flowNodes = createNodes(flatQueues, positions, stagedChanges);

            // Create edges using live data
            const flowEdges = createEdges(rootQueue);

            return { nodes: flowNodes, edges: flowEdges };
        } catch (err) {
            console.error('Error processing queue tree data:', err);
            return { nodes: [], edges: [] };
        }
    }, [schedulerData, stagedChanges, isLoading]);

    return {
        nodes,
        edges,
        isLoading,
        error,
    };
}

