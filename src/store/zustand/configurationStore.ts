import { create } from 'zustand';
import type { SchedulerResponse, ConfigurationResponse } from '../../types/Configuration';
import type { NodeLabelsResponse, NodesResponse } from '../../types/NodeLabel';
import type { ConfigurationState } from './types';

interface ConfigurationStore extends ConfigurationState {
    // Scheduler actions
    loadSchedulerStart: () => void;
    loadSchedulerSuccess: (data: SchedulerResponse) => void;
    loadSchedulerError: (error: Error) => void;
    
    // Configuration actions
    loadConfigurationStart: () => void;
    loadConfigurationSuccess: (data: ConfigurationResponse) => void;
    loadConfigurationError: (error: Error) => void;
    
    // Node labels actions
    loadNodeLabelsStart: () => void;
    loadNodeLabelsSuccess: (data: NodeLabelsResponse) => void;
    loadNodeLabelsError: (error: Error) => void;
    
    // Nodes actions
    loadNodesStart: () => void;
    loadNodesSuccess: (data: NodesResponse) => void;
    loadNodesError: (error: Error) => void;
    
    // Utility actions
    refreshAllData: () => void;
    clearErrors: () => void;
}

export const useConfigurationStore = create<ConfigurationStore>()((set) => ({
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

    // Scheduler actions
    loadSchedulerStart: () => set((state) => ({
        loading: { ...state.loading, scheduler: true },
        errors: { ...state.errors, scheduler: null }
    })),

    loadSchedulerSuccess: (data) => set((state) => ({
        scheduler: data,
        loading: { ...state.loading, scheduler: false },
        lastUpdated: { ...state.lastUpdated, scheduler: Date.now() }
    })),

    loadSchedulerError: (error) => set((state) => ({
        errors: { ...state.errors, scheduler: error },
        loading: { ...state.loading, scheduler: false }
    })),

    // Configuration actions
    loadConfigurationStart: () => set((state) => ({
        loading: { ...state.loading, configuration: true },
        errors: { ...state.errors, configuration: null }
    })),

    loadConfigurationSuccess: (data) => set((state) => ({
        configuration: data,
        loading: { ...state.loading, configuration: false },
        lastUpdated: { ...state.lastUpdated, configuration: Date.now() }
    })),

    loadConfigurationError: (error) => set((state) => ({
        errors: { ...state.errors, configuration: error },
        loading: { ...state.loading, configuration: false }
    })),

    // Node labels actions
    loadNodeLabelsStart: () => set((state) => ({
        loading: { ...state.loading, nodeLabels: true },
        errors: { ...state.errors, nodeLabels: null }
    })),

    loadNodeLabelsSuccess: (data) => set((state) => ({
        nodeLabels: data,
        loading: { ...state.loading, nodeLabels: false },
        lastUpdated: { ...state.lastUpdated, nodeLabels: Date.now() }
    })),

    loadNodeLabelsError: (error) => set((state) => ({
        errors: { ...state.errors, nodeLabels: error },
        loading: { ...state.loading, nodeLabels: false }
    })),

    // Nodes actions
    loadNodesStart: () => set((state) => ({
        loading: { ...state.loading, nodes: true },
        errors: { ...state.errors, nodes: null }
    })),

    loadNodesSuccess: (data) => set((state) => ({
        nodes: data,
        loading: { ...state.loading, nodes: false },
        lastUpdated: { ...state.lastUpdated, nodes: Date.now() }
    })),

    loadNodesError: (error) => set((state) => ({
        errors: { ...state.errors, nodes: error },
        loading: { ...state.loading, nodes: false }
    })),

    // Utility actions
    refreshAllData: () => set({
        scheduler: null,
        configuration: null,
        nodeLabels: null,
        nodes: null,
        loading: {
            scheduler: false,
            configuration: false,
            nodeLabels: false,
            nodes: false,
        }
    }),

    clearErrors: () => set({
        errors: {
            scheduler: null,
            configuration: null,
            nodeLabels: null,
            nodes: null,
        }
    }),
}));