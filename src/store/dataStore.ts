import { create } from 'zustand';
import { apiService } from '../api/ApiService';
import type { SchedulerResponse, ConfigurationResponse } from '../types/Configuration';
import type { NodeLabelsResponse, NodesResponse } from '../types/NodeLabel';

interface DataStore {
    // Server data
    scheduler: SchedulerResponse | null;
    configuration: ConfigurationResponse | null;
    nodeLabels: NodeLabelsResponse | null;
    nodes: NodesResponse | null;

    // Loading and error state for data fetching
    loading: boolean;
    error: Error | null;

    // Actions
    loadAllData: () => Promise<void>;
    refresh: () => Promise<void>;
    clearError: () => void;
}

export const useDataStore = create<DataStore>((set, get) => ({
    // Initial state
    scheduler: null,
    configuration: null,
    nodeLabels: null,
    nodes: null,
    loading: true, // Start in loading state
    error: null,

    // Data loading actions
    loadAllData: async () => {
        set({ loading: true, error: null });

        try {
            const [scheduler, configuration, nodeLabels, nodes] = await Promise.all([
                apiService.getScheduler(),
                apiService.getConfiguration(),
                apiService.getNodeLabels(),
                apiService.getNodes(),
            ]);

            set({
                scheduler,
                configuration,
                nodeLabels,
                nodes,
                loading: false,
            });
        } catch (error) {
            const err = error instanceof Error ? error : new Error('Failed to load data');
            set({ error: err, loading: false });
            throw err; // Re-throw so callers can handle it
        }
    },

    refresh: async () => {
        await get().loadAllData();
    },

    clearError: () => set({ error: null }),
}));
