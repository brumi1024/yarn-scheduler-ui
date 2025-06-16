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

    // Loading and error state for individual data types
    loading: {
        scheduler: boolean;
        configuration: boolean;
        nodeLabels: boolean;
        nodes: boolean;
    };
    errors: {
        scheduler: Error | null;
        configuration: Error | null;
        nodeLabels: Error | null;
        nodes: Error | null;
    };
    lastUpdated: {
        scheduler?: number;
        configuration?: number;
        nodeLabels?: number;
        nodes?: number;
    };

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
    loading: {
        scheduler: false,
        configuration: false,
        nodeLabels: false,
        nodes: false,
    },
    errors: {
        scheduler: null,
        configuration: null,
        nodeLabels: null,
        nodes: null,
    },
    lastUpdated: {},

    // Data loading actions
    loadAllData: async () => {
        set((state) => ({
            loading: {
                scheduler: true,
                configuration: true,
                nodeLabels: true,
                nodes: true,
            },
            errors: {
                scheduler: null,
                configuration: null,
                nodeLabels: null,
                nodes: null,
            },
        }));

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
                loading: {
                    scheduler: false,
                    configuration: false,
                    nodeLabels: false,
                    nodes: false,
                },
                lastUpdated: {
                    scheduler: Date.now(),
                    configuration: Date.now(),
                    nodeLabels: Date.now(),
                    nodes: Date.now(),
                },
            });
        } catch (error) {
            const err = error instanceof Error ? error : new Error('Failed to load data');
            set((state) => ({
                loading: {
                    scheduler: false,
                    configuration: false,
                    nodeLabels: false,
                    nodes: false,
                },
                errors: {
                    scheduler: err,
                    configuration: err,
                    nodeLabels: err,
                    nodes: err,
                },
            }));
            throw err; // Re-throw so callers can handle it
        }
    },

    refresh: async () => {
        await get().loadAllData();
    },

    clearError: () => set((state) => ({
        errors: {
            scheduler: null,
            configuration: null,
            nodeLabels: null,
            nodes: null,
        },
    })),
}));
