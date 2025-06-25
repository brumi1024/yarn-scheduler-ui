import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { apiService } from '../api/ApiService';
import { parseSchedulerResponse } from '../utils/schedulerResponseParser';
import type { SchedulerResponse } from '../types/Configuration';
import type { NodesResponse, NodeLabelsResponse, NodeLabel, ClusterNode } from '../types/NodeLabel';
import type { Queue } from '../types/Queue';

interface RuntimeStore {
    // Scheduler runtime data (read-only)
    scheduler: Queue | null;
    rawScheduler: SchedulerResponse | null;

    // Node data
    nodes: ClusterNode[];
    rawNodes: NodesResponse | null;

    // Node labels
    nodeLabels: NodeLabel[];
    rawNodeLabels: NodeLabelsResponse | null;

    // Loading states
    isLoadingScheduler: boolean;
    isLoadingNodes: boolean;
    isLoadingNodeLabels: boolean;

    // Errors
    schedulerError: string | null;
    nodesError: string | null;
    nodeLabelsError: string | null;

    // Methods
    loadSchedulerData: () => Promise<void>;
    loadNodeData: () => Promise<void>;
    loadNodeLabels: () => Promise<void>;
    loadAllData: () => Promise<void>;
    refresh: () => Promise<void>;
}

export const useRuntimeStore = create<RuntimeStore>()(
    devtools(
        (set, get) => ({
            // Initial state
            scheduler: null,
            rawScheduler: null,
            nodes: [],
            rawNodes: null,
            nodeLabels: [],
            rawNodeLabels: null,
            isLoadingScheduler: false,
            isLoadingNodes: false,
            isLoadingNodeLabels: false,
            schedulerError: null,
            nodesError: null,
            nodeLabelsError: null,

            // Load scheduler runtime data
            loadSchedulerData: async () => {
                set({ isLoadingScheduler: true, schedulerError: null });

                try {
                    const response = await apiService.getScheduler();
                    const parsed = parseSchedulerResponse(response);

                    set({
                        rawScheduler: response,
                        scheduler: parsed,
                        isLoadingScheduler: false,
                    });
                } catch (error) {
                    set({
                        isLoadingScheduler: false,
                        schedulerError: error instanceof Error ? error.message : 'Failed to load scheduler data',
                    });
                }
            },

            // Load node data
            loadNodeData: async () => {
                set({ isLoadingNodes: true, nodesError: null });

                try {
                    const response = await apiService.getNodes();

                    // Parse nodes if needed
                    const nodes: ClusterNode[] = response.nodes?.node || [];

                    set({
                        rawNodes: response,
                        nodes,
                        isLoadingNodes: false,
                    });
                } catch (error) {
                    set({
                        isLoadingNodes: false,
                        nodesError: error instanceof Error ? error.message : 'Failed to load node data',
                    });
                }
            },

            // Load node labels
            loadNodeLabels: async () => {
                set({ isLoadingNodeLabels: true, nodeLabelsError: null });

                try {
                    const response = await apiService.getNodeLabels();

                    // Parse node labels
                    const nodeLabels: NodeLabel[] = response.nodeLabelsInfo?.nodeLabelInfo || [];

                    set({
                        rawNodeLabels: response,
                        nodeLabels,
                        isLoadingNodeLabels: false,
                    });
                } catch (error) {
                    set({
                        isLoadingNodeLabels: false,
                        nodeLabelsError: error instanceof Error ? error.message : 'Failed to load node labels',
                    });
                }
            },

            // Load all runtime data
            loadAllData: async () => {
                await Promise.allSettled([get().loadSchedulerData(), get().loadNodeData(), get().loadNodeLabels()]);
            },

            // Refresh all data
            refresh: () => get().loadAllData(),
        }),
        {
            name: 'runtime-store',
        }
    )
);
