import { useCallback, useMemo } from 'react';
import { D3TreeLayout, type LayoutNode, type FlowPath, type LayoutQueue } from '../../utils/d3';
import { ConfigParser } from '../../utils/ConfigParser';

export interface QueueDataProcessorProps {
    configData: unknown;
    schedulerData: unknown;
    onDataProcessed: (nodes: LayoutNode[], flows: FlowPath[]) => void;
    onError: (error: string) => void;
}

export interface ProcessedQueueData {
    nodes: LayoutNode[];
    flows: FlowPath[];
    isLoading: boolean;
    error: string | null;
}

export function useQueueDataProcessor(configData: unknown, schedulerData: unknown): ProcessedQueueData {
    // Initialize D3 tree layout
    const treeLayout = useMemo(() => {
        return new D3TreeLayout({
            nodeWidth: 280,
            nodeHeight: 180,
            horizontalSpacing: 100,
            verticalSpacing: 80,
            orientation: 'horizontal',
        });
    }, []);

    // Find queue in scheduler data for runtime metrics
    const findQueueInSchedulerData = useCallback((queuePath: string, schedulerData: unknown): any | null => {
        if (!schedulerData || typeof schedulerData !== 'object') return null;

        const data = schedulerData as { scheduler?: { schedulerInfo?: any } };
        if (!data.scheduler?.schedulerInfo) return null;

        const findInQueue = (queue: any): any | null => {
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

        return findInQueue(data.scheduler.schedulerInfo);
    }, []);

    // Merge configuration and runtime data
    const mergeQueueData = useCallback((layoutQueue: LayoutQueue, runtimeQueue: any): LayoutQueue => {
        const defaultPartition = runtimeQueue?.capacities?.queueCapacitiesByPartition?.find(
            (partition: any) => !partition.partitionName || partition.partitionName === ''
        );

        return {
            ...layoutQueue,
            usedCapacity: defaultPartition?.usedCapacity || 0,
            absoluteCapacity: defaultPartition?.absoluteCapacity || layoutQueue.absoluteCapacity,
            absoluteUsedCapacity: defaultPartition?.absoluteUsedCapacity || 0,
            absoluteMaxCapacity: defaultPartition?.absoluteMaxCapacity || layoutQueue.absoluteMaxCapacity,
            numApplications: runtimeQueue?.numApplications || 0,
            resourcesUsed: runtimeQueue?.resourcesUsed || { memory: 0, vCores: 0 },
            capacities: runtimeQueue?.capacities || undefined,
        };
    }, []);

    // Convert configuration data to queue tree
    const buildQueueTree = useCallback((configData: unknown): LayoutQueue | null => {
        if (!configData || typeof configData !== 'object') return null;

        const data = configData as { property?: Array<{ name: string; value: string }> };
        if (!data.property) return null;

        // Convert property array to configuration object for ConfigParser
        const configuration: Record<string, string> = {};
        data.property.forEach((prop) => {
            configuration[prop.name] = prop.value;
        });

        // Parse the configuration using ConfigParser
        const parseResult = ConfigParser.parse(configuration);

        if (parseResult.errors.length > 0) {
            console.error('Configuration parsing errors:', parseResult.errors);
            return null;
        }

        if (parseResult.queues.length === 0) {
            return null;
        }

        // Convert ParsedQueue to LayoutQueue
        const convertParsedQueue = (parsedQueue: any): LayoutQueue => {
            return {
                id: parsedQueue.path,
                queueName: parsedQueue.name,
                queuePath: parsedQueue.path,
                capacity: parsedQueue.capacity.numericValue || 0,
                usedCapacity: 0,
                maxCapacity: parsedQueue.maxCapacity.numericValue || 100,
                absoluteCapacity: 0,
                absoluteUsedCapacity: 0,
                absoluteMaxCapacity: 100,
                state: parsedQueue.state,
                numApplications: 0,
                resourcesUsed: { memory: 0, vCores: 0 },
                children: parsedQueue.children?.map(convertParsedQueue) || [],
            };
        };

        return convertParsedQueue(parseResult.queues[0]);
    }, []);

    // Process data and return layout
    const processedData = useMemo((): ProcessedQueueData => {
        if (!configData) {
            return {
                nodes: [],
                flows: [],
                isLoading: true,
                error: null,
            };
        }

        try {
            // Build queue tree from configuration data
            const rootQueue = buildQueueTree(configData);
            if (!rootQueue) {
                return {
                    nodes: [],
                    flows: [],
                    isLoading: false,
                    error: 'No queue data available',
                };
            }

            // Calculate tree layout
            const layoutData = treeLayout.computeLayout(rootQueue);

            // Merge scheduler data into nodes
            if (schedulerData) {
                layoutData.nodes.forEach((node) => {
                    const runtimeData = findQueueInSchedulerData(node.id, schedulerData);
                    if (runtimeData) {
                        node.data = mergeQueueData(node.data, runtimeData);
                    }
                });
            }

            return {
                nodes: layoutData.nodes,
                flows: layoutData.flows,
                isLoading: false,
                error: null,
            };
        } catch (error) {
            console.error('Error processing queue data:', error);
            return {
                nodes: [],
                flows: [],
                isLoading: false,
                error: 'Failed to process queue data',
            };
        }
    }, [configData, schedulerData, treeLayout, buildQueueTree, findQueueInSchedulerData, mergeQueueData]);

    return processedData;
}
