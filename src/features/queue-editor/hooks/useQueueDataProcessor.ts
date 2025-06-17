import { useMemo } from 'react';
import { DagreLayout, type LayoutNode, type FlowPath, type LayoutQueue } from '../utils/layout/DagreLayout';
import { useConfigParser } from '../../../yarn-parser/useConfigParser';
// TODO: Re-enable these imports in Phase 2 when implementing search/changes features
// import { useUIStore, useChangesStore } from '../../../store';
import type { ConfigurationResponse, SchedulerResponse, ParsedQueue, Queue } from '../../../types/Configuration';
import type { Node, Edge } from '@xyflow/react';

// Runtime queue data from YARN API (extends base Queue with additional properties)
interface RuntimeQueue extends Queue {
    capacities?: {
        queueCapacitiesByPartition?: Array<{
            partitionName?: string;
            absoluteCapacity?: number;
            absoluteMaxCapacity?: number;
            absoluteUsedCapacity?: number;
            usedCapacity?: number;
        }>;
    };
    queues?: {
        queue: RuntimeQueue[];
    };
}

// React Flow compatible node data type with staging support
export type QueueNodeData = LayoutQueue & Record<string, unknown> & {
    stagedStatus?: 'new' | 'deleted' | 'modified';
    isMatch?: boolean;
    isAncestorOfMatch?: boolean;
};

export interface ProcessedFlowData {
    nodes: Node<QueueNodeData>[];
    edges: Edge[];
    isLoading: boolean;
    error: string | null;
}

export function useQueueDataProcessor(
    configQuery: { data?: ConfigurationResponse | null; isLoading?: boolean; error?: Error | null },
    schedulerQuery: { data?: SchedulerResponse | null; isLoading?: boolean; error?: Error | null }
): ProcessedFlowData {
    // Use the new async parser hook
    const { data: parseResult, isLoading: isParsing, error: parseError } = useConfigParser(configQuery.data);

    // TODO: Phase 2 - Consume state from stores for search/changes features
    // const { searchQuery, sortOptions } = useUIStore(state => ({ searchQuery: state.searchQuery, sortOptions: state.sortOptions }));
    // const stagedChanges = useChangesStore(state => state.stagedChanges);
    // Initialize Dagre layout (replaces D3 tree layout)
    const treeLayout = useMemo(() => {
        return new DagreLayout({
            nodeWidth: 280,
            nodeHeight: 220, // Updated to match actual queue card height
            horizontalSpacing: 100,
            verticalSpacing: 80,
            orientation: 'horizontal',
        });
    }, []);

    // Process data and return React Flow compatible format
    const processedData = useMemo((): ProcessedFlowData => {
        const schedulerData = schedulerQuery.data;
        const isSchedulerLoading = schedulerQuery.isLoading ?? false;
        const schedulerError = schedulerQuery.error;

        // Update loading state to include parsing
        if (configQuery.isLoading || isSchedulerLoading || isParsing) {
            return {
                nodes: [],
                edges: [],
                isLoading: true,
                error: null,
            };
        }

        // Update error state to include parsing errors
        if (configQuery.error || schedulerError || parseError) {
            const errorMessage = configQuery.error?.message || 
                                schedulerError?.message || 
                                parseError?.message || 
                                'Unknown data loading error';
            return {
                nodes: [],
                edges: [],
                isLoading: false,
                error: errorMessage,
            };
        }

        // The parseResult is now available directly from the useConfigParser hook
        if (!parseResult) {
            return { nodes: [], edges: [], isLoading: false, error: 'Configuration parsing did not complete.' };
        }

        try {
            // --- Pipeline Step 1: Parse Base Configuration ---
            // Parsing is now handled by the Web Worker via useConfigParser hook
            if (parseResult.errors.length > 0) {
                console.error('Configuration parsing errors:', parseResult.errors);
                return { nodes: [], edges: [], isLoading: false, error: 'Configuration parsing failed.' };
            }
            if (parseResult.queues.length === 0) {
                return { nodes: [], edges: [], isLoading: false, error: 'No queues found in configuration.' };
            }

            // Convert ParsedQueue to LayoutQueue
            const convertParsedQueue = (parsedQueue: ParsedQueue): LayoutQueue => {
                const capacity = parsedQueue.capacity.numericValue || 0;
                const maxCapacity = parsedQueue.maxCapacity.numericValue || 100;

                return {
                    id: parsedQueue.path,
                    queueName: parsedQueue.name,
                    queuePath: parsedQueue.path,
                    capacity,
                    usedCapacity: 0,
                    maxCapacity,
                    absoluteCapacity: 0,
                    absoluteUsedCapacity: 0,
                    absoluteMaxCapacity: 100,
                    state: parsedQueue.state,
                    numApplications: 0,
                    resourcesUsed: { memory: 0, vCores: 0 },
                    children: parsedQueue.children?.map(convertParsedQueue) || [],
                };
            };

            let processedHierarchy = convertParsedQueue(parseResult.queues[0]);

            // --- Pipeline Step 2: Apply Staged Changes ---
            // TODO: Phase 2 - Apply ADD_QUEUE, DELETE_QUEUE, and PROPERTY_UPDATE changes
            // This will modify processedHierarchy based on stagedChanges
            // processedHierarchy = applyChangesToHierarchy(processedHierarchy, stagedChanges);
            // Note: Using 'let' for future modification in Phase 2

            // --- Pipeline Step 3: Apply Search Filter ---
            // TODO: Phase 2 - Filter hierarchy based on searchQuery
            // This will filter out non-matching queues while preserving parent context
            // For now, no filtering is applied

            // --- Pipeline Step 4: Apply Sorting ---
            // TODO: Phase 2 - Sort queues based on sortOptions
            // This will reorder children arrays according to user preferences
            // For now, original order is maintained

            // --- Pipeline Step 5: Merge Live Scheduler Data ---
            const findQueueInSchedulerData = (queuePath: string, schedulerData: SchedulerResponse): RuntimeQueue | null => {
                if (!schedulerData?.scheduler?.schedulerInfo) return null;

                const findInQueue = (queue: RuntimeQueue): RuntimeQueue | null => {
                    if (queue.queuePath === queuePath) {
                        return queue;
                    }
                    if (queue.queues?.queue) {
                        for (const child of queue.queues.queue) {
                            const found = findInQueue(child);
                            if (found) return found;
                        }
                    }
                    return null;
                };

                return findInQueue(schedulerData.scheduler.schedulerInfo as RuntimeQueue);
            };

            // --- Pipeline Step 6: Calculate Layout with Dagre ---
            const layoutData = treeLayout.computeLayout(processedHierarchy);

            // Merge scheduler data into layout nodes
            if (schedulerData) {
                layoutData.nodes.forEach((node) => {
                    const runtimeData = findQueueInSchedulerData(node.id, schedulerData);
                    if (runtimeData) {
                        const defaultPartition = runtimeData?.capacities?.queueCapacitiesByPartition?.find(
                            (partition) => !partition.partitionName || partition.partitionName === ''
                        );

                        node.data = {
                            ...node.data,
                            usedCapacity: defaultPartition?.usedCapacity || 0,
                            absoluteCapacity: defaultPartition?.absoluteCapacity || node.data.absoluteCapacity,
                            absoluteUsedCapacity: defaultPartition?.absoluteUsedCapacity || 0,
                            absoluteMaxCapacity: defaultPartition?.absoluteMaxCapacity || node.data.absoluteMaxCapacity,
                            numApplications: runtimeData?.numApplications || 0,
                            resourcesUsed: runtimeData?.resourcesUsed || { memory: 0, vCores: 0 },
                        };
                    }
                });
            }

            // --- Pipeline Step 7: Format for React Flow ---
            const flowNodes: Node<QueueNodeData>[] = layoutData.nodes.map((node) => ({
                id: node.id,
                type: 'queueCard',
                position: { x: node.x, y: node.y },
                data: node.data as QueueNodeData,
                draggable: false,
                selectable: true,
            }));

            const flowEdges: Edge[] = layoutData.flows.map((flow) => ({
                id: flow.id,
                source: flow.source.id,
                target: flow.target.id,
                type: 'customFlow',
                animated: flow.target.data.state === 'RUNNING',
                data: {
                    capacity: flow.capacity,
                    targetState: flow.target.data.state,
                    sourceStartY: flow.sourceStartY,
                    sourceEndY: flow.sourceEndY,
                    targetStartY: flow.targetStartY,
                    targetEndY: flow.targetEndY,
                    sourceNodeHeight: flow.source.height,
                    targetNodeHeight: flow.target.height,
                },
            }));

            return { nodes: flowNodes, edges: flowEdges, isLoading: false, error: null };
        } catch (error) {
            console.error('Error processing queue data:', error);
            return {
                nodes: [],
                edges: [],
                isLoading: false,
                error: 'Failed to process queue data',
            };
        }
    }, [configQuery.isLoading, configQuery.error, schedulerQuery.data, schedulerQuery.isLoading, schedulerQuery.error, parseResult, isParsing, parseError, treeLayout]);

    return processedData;
}
