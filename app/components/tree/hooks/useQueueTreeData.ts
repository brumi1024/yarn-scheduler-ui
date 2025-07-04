import { useMemo } from 'react';
import type { Node, Edge } from '@xyflow/react';
import { useSchedulerStore } from '../../../store/schedulerStore';
import type { QueueInfo, StagedChange, SchedulerInfo, CapacitySchedulerInfo } from '../../../lib/types';
import type { QueueStateValue } from '../../../lib/types/constants';
import { AUTO_CREATION_PROPS } from '../../../lib/types/constants';
import { DagreLayout } from '../utils/DagreLayout';

export type QueueCardData = QueueInfo & {
    stagedStatus?: 'new' | 'modified' | 'deleted';
    isLeaf: boolean;
    capacityConfig: string;
    maxCapacityConfig: string;
    stagedState?: string;
    autoCreationEligibility?: string;
    autoCreationStatus?: { status: 'off' | 'legacy' | 'flexible'; isStaged: boolean };
};

export type UseQueueTreeDataResult = {
    nodes: Node<QueueCardData>[];
    edges: Edge[];
    isLoading: boolean;
    error: string | null;
};

const layoutEngine = new DagreLayout({
    nodeWidth: 400,
    nodeHeight: 300,
    horizontalSpacing: 120,
    verticalSpacing: 80,
    orientation: 'horizontal',
});

function convertSchedulerInfoToQueueInfo(schedulerInfo: SchedulerInfo): QueueInfo {
    const capacitySchedulerInfo = schedulerInfo as CapacitySchedulerInfo;

    return {
        type: schedulerInfo.type,
        capacity: schedulerInfo.capacity,
        usedCapacity: schedulerInfo.usedCapacity,
        maxCapacity: schedulerInfo.maxCapacity,
        absoluteCapacity: capacitySchedulerInfo.capacities?.queueCapacitiesByPartition?.[0]?.absoluteCapacity ?? schedulerInfo.capacity,
        absoluteMaxCapacity: capacitySchedulerInfo.capacities?.queueCapacitiesByPartition?.[0]?.absoluteMaxCapacity ?? schedulerInfo.maxCapacity,
        absoluteUsedCapacity: capacitySchedulerInfo.capacities?.queueCapacitiesByPartition?.[0]?.absoluteUsedCapacity ?? schedulerInfo.usedCapacity,
        numApplications: 0,
        numActiveApplications: 0,
        numPendingApplications: 0,
        resourcesUsed: capacitySchedulerInfo.usedResources,
        queueName: schedulerInfo.queueName,
        queuePath: capacitySchedulerInfo.queuePath || schedulerInfo.queueName,
        state: (capacitySchedulerInfo.state as QueueStateValue) || 'RUNNING',
        queues: schedulerInfo.queues,
        autoCreationEligibility: capacitySchedulerInfo.autoCreationEligibility,
    };
}


function getStagedStatus(queuePath: string, stagedChanges: StagedChange[]): 'new' | 'modified' | 'deleted' | undefined {
    const changes = stagedChanges.filter(change => change.queuePath === queuePath);

    if (changes.some(c => c.type === 'remove')) {
        return 'deleted';
    }
    // Check if any change is type 'add' (indicating new queue)
    if (changes.some(c => c.type === 'add')) {
        return 'new';
    }
    if (changes.length > 0) {
        return 'modified';
    }

    return undefined;
}

function getAutoCreationStatus(
    queuePath: string,
    liveAutoCreationEligibility: string | undefined,
    stagedChanges: StagedChange[]
): { status: 'off' | 'legacy' | 'flexible'; isStaged: boolean } {
    const legacyChange = stagedChanges.find(
        c => c.queuePath === queuePath && c.property === AUTO_CREATION_PROPS.LEGACY_ENABLED
    );
    const flexibleChange = stagedChanges.find(
        c => c.queuePath === queuePath && c.property === AUTO_CREATION_PROPS.FLEXIBLE_ENABLED
    );

    if (legacyChange || flexibleChange) {
        const isLegacyEnabled = legacyChange?.newValue === 'true';
        const isFlexibleEnabled = flexibleChange?.newValue === 'true';

        if (isFlexibleEnabled) {
            return { status: 'flexible' as const, isStaged: true };
        } else if (isLegacyEnabled) {
            return { status: 'legacy' as const, isStaged: true };
        } else {
            return { status: 'off' as const, isStaged: true };
        }
    }

    const status = liveAutoCreationEligibility === AUTO_CREATION_PROPS.ELIGIBILITY_FLEXIBLE ? 'flexible' as const :
                    liveAutoCreationEligibility === AUTO_CREATION_PROPS.ELIGIBILITY_LEGACY ? 'legacy' as const :
                    'off' as const;
    
    return {
        status,
        isStaged: false
    };
}

function transformToCardData(queueInfo: QueueInfo, stagedChanges: StagedChange[]): QueueCardData {
    const getQueuePropertyValue = useSchedulerStore.getState().getQueuePropertyValue;

    const capacityDisplay = getQueuePropertyValue(queueInfo.queuePath, 'capacity');
    const maxCapacityDisplay = getQueuePropertyValue(queueInfo.queuePath, 'maximum-capacity');

    const stateDisplay = getQueuePropertyValue(queueInfo.queuePath, 'state');

    return {
        ...queueInfo,

        stagedStatus: getStagedStatus(queueInfo.queuePath, stagedChanges),
        isLeaf: !queueInfo.queues?.queue || (
            Array.isArray(queueInfo.queues.queue) ? queueInfo.queues.queue.length === 0 : false
        ),

        capacityConfig: capacityDisplay.value || '0',
        maxCapacityConfig: maxCapacityDisplay.value || '100',

        stagedState: stateDisplay.isStaged ? stateDisplay.value : undefined,

        autoCreationEligibility: queueInfo.autoCreationEligibility,

        autoCreationStatus: getAutoCreationStatus(queueInfo.queuePath, queueInfo.autoCreationEligibility, stagedChanges),
    };
}

function flattenQueueTree(queueInfo: QueueInfo, stagedChanges: StagedChange[]): QueueCardData[] {
    const result: QueueCardData[] = [];

    result.push(transformToCardData(queueInfo, stagedChanges));

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

    // Get all unique queue paths from 'add' type changes
    const newQueuePaths = new Set(
        stagedChanges
            .filter(c => c.type === 'add')
            .map(c => c.queuePath)
    );

    // For each new queue path, create a node if it doesn't already exist
    newQueuePaths.forEach(queuePath => {
        if (!nodes.find(n => n.id === queuePath)) {
            const position = positions.get(queuePath);
            const queueName = queuePath.split('.').pop() || '';
            
            // Get the staged values for this new queue
            const getQueuePropertyValue = useSchedulerStore.getState().getQueuePropertyValue;
            const capacityDisplay = getQueuePropertyValue(queuePath, 'capacity');
            const maxCapacityDisplay = getQueuePropertyValue(queuePath, 'maximum-capacity');
            const stateDisplay = getQueuePropertyValue(queuePath, 'state');

            const nodeData: QueueCardData = {
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
                queuePath,
                state: (stateDisplay.value || 'RUNNING') as QueueStateValue,
                
                stagedStatus: 'new' as const,
                isLeaf: true,
                capacityConfig: capacityDisplay.value || '0',
                maxCapacityConfig: maxCapacityDisplay.value || '100',
                stagedState: stateDisplay.value,
            };

            if (position) {
                nodes.push({
                    id: queuePath,
                    type: 'queueCard',
                    position: { x: position.x, y: position.y },
                    data: nodeData,
                    width: position.width,
                    height: position.height,
                });
            } else {
                // Fallback position if not in layout
                const depth = queuePath.split('.').length - 1;
                nodes.push({
                    id: queuePath,
                    type: 'queueCard',
                    position: { x: depth * 520, y: 0 },
                    data: nodeData,
                    width: 400,
                    height: 300,
                });
            }
        }
    });

    return nodes;
}

function createEdges(
    queueInfo: QueueInfo, 
    positions: Map<string, { x: number; y: number; width: number; height: number }>,
    stagedChanges?: StagedChange[]
): Edge[] {
    const edges: Edge[] = [];
    const CARD_HEIGHT = 260; // Updated to match actual card height
    const MIN_SEGMENT_HEIGHT = 4; // Minimum visible height for very small capacity percentages

    if (queueInfo.queues?.queue) {
        const children = Array.isArray(queueInfo.queues.queue)
            ? queueInfo.queues.queue
            : [queueInfo.queues.queue];

        // Calculate total capacity of all children for proportional allocation
        const totalChildCapacity = children.reduce((sum, child) => sum + (child.capacity || 0), 0);
        
        // Get source position for the parent queue
        const sourcePos = positions.get(queueInfo.queuePath);
        
        if (sourcePos && totalChildCapacity > 0) {
            let cumulativeCapacity = 0;
            
            children.forEach((child) => {
                const targetPos = positions.get(child.queuePath);
                
                if (targetPos) {
                    // Calculate proportional segment for this child on parent's side
                    const childCapacity = child.capacity || 0;
                    const childPercentage = childCapacity / totalChildCapacity;
                    
                    // Calculate segment boundaries (0.0 to 1.0 scale)
                    const segmentStart = cumulativeCapacity / totalChildCapacity;
                    const segmentEnd = (cumulativeCapacity + childCapacity) / totalChildCapacity;
                    
                    // Ensure minimum segment height for visibility
                    const segmentHeight = Math.max(
                        (segmentEnd - segmentStart) * CARD_HEIGHT,
                        MIN_SEGMENT_HEIGHT
                    );
                    const adjustedSegmentEnd = segmentStart + (segmentHeight / CARD_HEIGHT);
                    
                    // Parent side: proportional segment based on capacity
                    const parentCenterY = sourcePos.y + sourcePos.height / 2;
                    const sourceStartY = parentCenterY - CARD_HEIGHT / 2 + (segmentStart * CARD_HEIGHT);
                    const sourceEndY = parentCenterY - CARD_HEIGHT / 2 + (adjustedSegmentEnd * CARD_HEIGHT);
                    
                    // Target side: full height (child receives the full connector)
                    const targetCenterY = targetPos.y + targetPos.height / 2;
                    const targetStartY = targetCenterY - CARD_HEIGHT / 2;
                    const targetEndY = targetCenterY + CARD_HEIGHT / 2;

                    const edge: Edge = {
                        id: `${queueInfo.queuePath}-${child.queuePath}`,
                        source: queueInfo.queuePath,
                        target: child.queuePath,
                        type: 'sankeyFlow',
                        data: {
                            capacity: child.capacity,
                            targetState: child.state,
                            // Proportional positioning data for true Sankey visualization
                            sourceStartY,
                            sourceEndY,
                            targetStartY,
                            targetEndY,
                            // Additional metadata for debugging/visualization
                            childPercentage,
                            segmentStart,
                            segmentEnd: adjustedSegmentEnd,
                        },
                    };
                    edges.push(edge);
                    
                    cumulativeCapacity += childCapacity;
                }
            });
        } else {
            // Fallback for cases without proper capacity data or positioning
            children.forEach((child) => {
                const targetPos = positions.get(child.queuePath);
                
                if (sourcePos && targetPos) {
                    const edge: Edge = {
                        id: `${queueInfo.queuePath}-${child.queuePath}`,
                        source: queueInfo.queuePath,
                        target: child.queuePath,
                        type: 'sankeyFlow',
                        data: {
                            capacity: child.capacity,
                            targetState: child.state,
                            // Fallback to full height
                            sourceStartY: sourcePos.y + sourcePos.height / 2 - CARD_HEIGHT / 2,
                            sourceEndY: sourcePos.y + sourcePos.height / 2 + CARD_HEIGHT / 2,
                            targetStartY: targetPos.y + targetPos.height / 2 - CARD_HEIGHT / 2,
                            targetEndY: targetPos.y + targetPos.height / 2 + CARD_HEIGHT / 2,
                        },
                    };
                    edges.push(edge);
                }
            });
        }

        // Recursively create edges for child queues
        children.forEach((child) => {
            edges.push(...createEdges(child, positions, stagedChanges));
        });
    }

    return edges;
}

// Function to augment the queue tree with staged new queues
function augmentQueueTreeWithStagedQueues(rootQueue: QueueInfo, stagedChanges: StagedChange[]): QueueInfo {
    // Deep clone the root queue to avoid mutations
    const augmentedRoot = JSON.parse(JSON.stringify(rootQueue)) as QueueInfo;
    
    // Get all unique new queue paths
    const newQueuePaths = new Set(
        stagedChanges
            .filter(c => c.type === 'add')
            .map(c => c.queuePath)
    );
    
    // For each new queue, add it to its parent in the tree
    newQueuePaths.forEach(queuePath => {
        const pathParts = queuePath.split('.');
        const queueName = pathParts[pathParts.length - 1];
        const parentPath = pathParts.slice(0, -1).join('.');
        
        // Find the parent queue in the tree
        const findAndAddQueue = (queue: QueueInfo): boolean => {
            if (queue.queuePath === parentPath) {
                // Create the new queue info
                const newQueue: QueueInfo = {
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
                    queuePath,
                    state: 'RUNNING' as QueueStateValue,
                };
                
                // Add to parent's queues
                if (!queue.queues) {
                    queue.queues = { queue: [] };
                } else if (!queue.queues.queue) {
                    queue.queues.queue = [];
                } else if (!Array.isArray(queue.queues.queue)) {
                    queue.queues.queue = [queue.queues.queue];
                }
                
                if (Array.isArray(queue.queues.queue)) {
                    queue.queues.queue.push(newQueue);
                }
                
                return true;
            }
            
            // Recursively search in children
            if (queue.queues?.queue) {
                const children = Array.isArray(queue.queues.queue) 
                    ? queue.queues.queue 
                    : [queue.queues.queue];
                
                for (const child of children) {
                    if (findAndAddQueue(child)) {
                        return true;
                    }
                }
            }
            
            return false;
        };
        
        findAndAddQueue(augmentedRoot);
    });
    
    return augmentedRoot;
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
            const rootQueue = convertSchedulerInfoToQueueInfo(schedulerData);
            
            // Augment the tree with staged new queues
            const augmentedRootQueue = augmentQueueTreeWithStagedQueues(rootQueue, stagedChanges);

            const flatQueues = flattenQueueTree(augmentedRootQueue, stagedChanges);

            const positions = layoutEngine.calculatePositions(augmentedRootQueue);

            const flowNodes = createNodes(flatQueues, positions, stagedChanges);

            const flowEdges = createEdges(augmentedRootQueue, positions, stagedChanges);

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

