import { create } from 'zustand';
import { apiService } from '../api/ApiService';
import type { SchedulerResponse, ConfigurationResponse } from '../types/Configuration';
import type { NodeLabelsResponse, NodesResponse } from '../types/NodeLabel';

interface DataStore {
  // Data
  scheduler: SchedulerResponse | null;
  configuration: ConfigurationResponse | null;
  nodeLabels: NodeLabelsResponse | null;
  nodes: NodesResponse | null;
  
  // Loading states - single boolean
  loading: boolean;
  
  // Error state - single error
  error: Error | null;
  
  // Actions - simplified
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
  loading: false,
  error: null,
  
  // Single loading action
  loadAllData: async () => {
    set({ loading: true, error: null });
    
    try {
      // Parallel loading for performance
      const [scheduler, configuration, nodeLabels, nodes] = await Promise.all([
        apiService.getScheduler(),
        apiService.getConfiguration(),
        apiService.getNodeLabels(),
        apiService.getNodes()
      ]);
      
      set({
        scheduler,
        configuration,
        nodeLabels,
        nodes,
        loading: false
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error : new Error('Failed to load data'),
        loading: false 
      });
    }
  },
  
  refresh: async () => {
    const { loadAllData } = get();
    await loadAllData();
  },
  
  clearError: () => set({ error: null })
}));