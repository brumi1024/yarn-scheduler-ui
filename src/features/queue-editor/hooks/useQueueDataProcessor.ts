import { useMemo } from 'react';
import { DagreLayout, type LayoutNode, type FlowPath, type LayoutQueue } from '../utils/layout/DagreLayout';
import { useConfigParser } from '../../../yarn-parser/useConfigParser';
import { useChangesStore, useUIStore } from '../../../store';
import type { ConfigurationResponse, SchedulerResponse, ParsedQueue, Queue, ChangeSet } from '../../../types/Configuration';
import type { Node, Edge } from '@xyflow/react';
import { useNodeLabelFilteredQueues, type FilteredQueue } from './useNodeLabelFilteredQueues';

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

// Helper function to apply staged changes to queue hierarchy
function applyChangesToHierarchy(hierarchy: LayoutQueue, changes: ChangeSet[]): LayoutQueue {
    // Deep clone the hierarchy to avoid mutations
    const cloneQueue = (queue: LayoutQueue): LayoutQueue => ({
        ...queue,
        children: queue.children.map(cloneQueue)
    });

    let modifiedHierarchy = cloneQueue(hierarchy);

    // Apply changes in chronological order
    const sortedChanges = [...changes].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    for (const change of sortedChanges) {
        if (change.type === 'ADD_QUEUE') {
            modifiedHierarchy = applyAddQueueChange(modifiedHierarchy, change);
        } else if (change.type === 'DELETE_QUEUE') {
            modifiedHierarchy = applyDeleteQueueChange(modifiedHierarchy, change);
        } else if (change.type === 'PROPERTY_UPDATE') {
            modifiedHierarchy = applyPropertyUpdateChange(modifiedHierarchy, change);
        }
    }

    return modifiedHierarchy;
}

// Helper to add a new queue to the hierarchy
function applyAddQueueChange(hierarchy: LayoutQueue, change: ChangeSet): LayoutQueue {
    const findAndAddToParent = (queue: LayoutQueue): LayoutQueue => {
        if (queue.queuePath === change.queuePath) {
            // This is the parent queue, add the new child
            const newValueObj = (change.newValue as Record<string, unknown>) || {};
            const newQueuePath = change.property; // Full path of new queue
            const newQueueName = newQueuePath.split('.').pop() || newQueuePath;
            
            const newQueue: LayoutQueue = {
                id: newQueuePath,
                queueName: newQueueName,
                queuePath: newQueuePath,
                capacity: parseFloat(String(newValueObj.capacity)) || 10,
                usedCapacity: 0,
                maxCapacity: parseFloat(String(newValueObj.maxCapacity)) || 100,
                absoluteCapacity: 0,
                absoluteUsedCapacity: 0,
                absoluteMaxCapacity: 100,
                state: String(newValueObj.state) || 'RUNNING',
                numApplications: 0,
                resourcesUsed: { memory: 0, vCores: 0 },
                children: [],
                stagedStatus: 'new' // Mark as staged
            };

            return {
                ...queue,
                children: [...(queue.children || []), newQueue]
            };
        }

        return {
            ...queue,
            children: queue.children?.map(findAndAddToParent) || []
        };
    };

    return findAndAddToParent(hierarchy);
}

// Helper to mark a queue as deleted in the hierarchy
function applyDeleteQueueChange(hierarchy: LayoutQueue, change: ChangeSet): LayoutQueue {
    const markAsDeleted = (queue: LayoutQueue): LayoutQueue => {
        if (queue.queuePath === change.queuePath) {
            // Mark this queue as deleted
            return {
                ...queue,
                stagedStatus: 'deleted'
            };
        }

        return {
            ...queue,
            children: queue.children?.map(markAsDeleted) || []
        };
    };

    return markAsDeleted(hierarchy);
}

// Helper to apply property updates to the hierarchy
function applyPropertyUpdateChange(hierarchy: LayoutQueue, change: ChangeSet): LayoutQueue {
    const updateProperty = (queue: LayoutQueue): LayoutQueue => {
        if (queue.queuePath === change.queuePath) {
            // Apply the property update to this queue
            const updatedQueue = { ...queue };
            
            // Handle different property types
            switch (change.property) {
                case 'capacity':
                    updatedQueue.capacity = parseFloat(String(change.newValue)) || 0;
                    break;
                case 'maxCapacity':
                    updatedQueue.maxCapacity = parseFloat(String(change.newValue)) || 100;
                    break;
                case 'state':
                    updatedQueue.state = String(change.newValue);
                    break;
                default:
                    // For other properties, add them as additional data
                    updatedQueue[change.property] = change.newValue;
                    break;
            }
            
            // Mark queue as modified if it doesn't already have a staged status
            if (!updatedQueue.stagedStatus) {
                updatedQueue.stagedStatus = 'modified';
            }
            
            return updatedQueue;
        }

        return {
            ...queue,
            children: queue.children?.map(updateProperty) || []
        };
    };

    return updateProperty(hierarchy);
}

// Helper function to apply search filter to queue hierarchy
function applySearchFilter(hierarchy: LayoutQueue, searchQuery?: string): LayoutQueue | null {
    // If no search query, return the original hierarchy
    if (!searchQuery || searchQuery.trim() === '') {
        return hierarchy;
    }

    const query = searchQuery.toLowerCase().trim();

    // Check if a queue matches the search query
    const queueMatches = (queue: LayoutQueue): boolean => {
        return queue.queueName.toLowerCase().includes(query) || 
               queue.queuePath.toLowerCase().includes(query);
    };

    // Recursively filter the hierarchy
    const filterQueue = (queue: LayoutQueue): LayoutQueue | null => {
        const matches = queueMatches(queue);
        
        // Process children first
        const filteredChildren = queue.children
            ?.map(child => filterQueue(child))
            .filter((child): child is LayoutQueue => child !== null) || [];

        // If this queue matches OR has matching children, include it
        if (matches || filteredChildren.length > 0) {
            return {
                ...queue,
                children: filteredChildren,
                // Mark nodes for visual feedback
                isMatch: matches,
                isAncestorOfMatch: !matches && filteredChildren.length > 0,
            };
        }

        // This queue doesn't match and has no matching children
        return null;
    };

    return filterQueue(hierarchy);
}

export function useQueueDataProcessor(
    configQuery: { data?: ConfigurationResponse | null; isLoading?: boolean; error?: Error | null },
    schedulerQuery: { data?: SchedulerResponse | null; isLoading?: boolean; error?: Error | null }
): ProcessedFlowData {
    // Use the new async parser hook
    const { data: parseResult, isLoading: isParsing, error: parseError } = useConfigParser(configQuery.data);

    // Get staged changes and search query from stores
    const stagedChanges = useChangesStore(state => state.stagedChanges) || [];
    const searchQuery = useUIStore(state => state.searchQuery);

    // Extract all queues for node label filtering
    const allQueues = useMemo(() => {
        if (!parseResult?.queues?.[0]) return [];
        
        const getAllQueues = (parsedQueue: ParsedQueue): Queue[] => {
            const queue: Queue = {
                queueName: parsedQueue.name,
                queuePath: parsedQueue.path,
                capacity: parsedQueue.capacity.numericValue || 0,
                maxCapacity: parsedQueue.maxCapacity.numericValue || 100,
                state: parsedQueue.state,
                usedCapacity: 0, // Will be updated from scheduler data
                absoluteCapacity: 0,
                absoluteUsedCapacity: 0,
                absoluteMaxCapacity: 100,
                numApplications: 0,
                resourcesUsed: { memory: 0, vCores: 0 },
                // Add any properties from parsed queue that might contain node label info
                ...parsedQueue.properties,
            } as Queue;
            
            const result: Queue[] = [queue];
            parsedQueue.children?.forEach(child => {
                result.push(...getAllQueues(child));
            });
            return result;
        };
        
        return getAllQueues(parseResult.queues[0]);
    }, [parseResult]);

    // Apply node label filtering to all queues
    const filteredQueues = useNodeLabelFilteredQueues(allQueues);
    
    // Create a mapping from queue path to filtered queue data
    const filteredQueueMap = useMemo(() => {
        const map = new Map<string, FilteredQueue>();
        filteredQueues.forEach(queue => {
            map.set(queue.queuePath, queue);
        });
        return map;
    }, [filteredQueues]);

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

            // Convert ParsedQueue to LayoutQueue with node label filtering applied
            const convertParsedQueue = (parsedQueue: ParsedQueue): LayoutQueue => {
                const capacity = parsedQueue.capacity.numericValue || 0;
                const maxCapacity = parsedQueue.maxCapacity.numericValue || 100;
                
                // Get filtered queue data if available
                const filteredQueue = filteredQueueMap.get(parsedQueue.path);

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
                    // Add node label filtering properties
                    hasLabelAccess: filteredQueue?.hasLabelAccess,
                    labelCapacity: filteredQueue?.labelCapacity,
                    labelMaxCapacity: filteredQueue?.labelMaxCapacity,
                    isLabelCapacityConfigured: filteredQueue?.isLabelCapacityConfigured,
                    isLabelMaxCapacityConfigured: filteredQueue?.isLabelMaxCapacityConfigured,
                    effectiveCapacity: filteredQueue?.effectiveCapacity ?? capacity,
                    effectiveMaxCapacity: filteredQueue?.effectiveMaxCapacity ?? maxCapacity,
                };
            };

            let processedHierarchy = convertParsedQueue(parseResult.queues[0]);

            // --- Pipeline Step 2: Apply Staged Changes ---
            // Apply ADD_QUEUE, DELETE_QUEUE, and PROPERTY_UPDATE changes
            if (stagedChanges.length > 0) {
                processedHierarchy = applyChangesToHierarchy(processedHierarchy, stagedChanges);
            }

            // --- Pipeline Step 3: Apply Search Filter ---
            // Filter hierarchy based on searchQuery, preserving parent context
            const filteredHierarchy = applySearchFilter(processedHierarchy, searchQuery);
            if (!filteredHierarchy) {
                // No matches found, return empty result
                return { nodes: [], edges: [], isLoading: false, error: 'No queues match the search criteria.' };
            }
            processedHierarchy = filteredHierarchy;

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
    }, [configQuery.isLoading, configQuery.error, schedulerQuery.data, schedulerQuery.isLoading, schedulerQuery.error, parseResult, isParsing, parseError, treeLayout, stagedChanges, searchQuery, filteredQueueMap]);

    return processedData;
}
