import { create } from 'zustand';
import { apiService } from '../api/ApiService';
import type { SchedulerResponse, ConfigurationResponse, ChangeSet } from '../types/Configuration';
import type { NodeLabelsResponse, NodesResponse } from '../types/NodeLabel';

interface ConflictInfo {
  changeId: string;
  type: 'validation' | 'dependency' | 'server';
  message: string;
  severity: 'error' | 'warning';
}

interface DataStore {
  // Server data
  scheduler: SchedulerResponse | null;
  configuration: ConfigurationResponse | null;
  nodeLabels: NodeLabelsResponse | null;
  nodes: NodesResponse | null;
  
  // Loading state
  loading: boolean;
  error: Error | null;
  
  // Staged changes (moved from stagedChangesStore)
  stagedChanges: ChangeSet[];
  applyingChanges: boolean;
  lastApplied?: number;
  conflicts: ConflictInfo[];
  
  // Actions
  loadAllData: () => Promise<void>;
  refresh: () => Promise<void>;
  clearError: () => void;
  
  // Utility functions
  getQueueByPath: (path: string) => any | null;
  
  // Change management actions
  stageChange: (change: ChangeSet) => void;
  unstageChange: (changeId: string) => void;
  clearStagedChanges: () => void;
  applyChanges: () => Promise<void>;
  hasUnsavedChanges: () => boolean;
  getChangesByQueue: (queuePath: string) => ChangeSet[];
}

export const useDataStore = create<DataStore>((set, get) => ({
  // Initial state
  scheduler: null,
  configuration: null,
  nodeLabels: null,
  nodes: null,
  loading: false,
  error: null,
  stagedChanges: [],
  applyingChanges: false,
  lastApplied: undefined,
  conflicts: [],
  
  // Data loading actions
  loadAllData: async () => {
    set({ loading: true, error: null });
    
    try {
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
  
  clearError: () => set({ error: null }),
  
  getQueueByPath: (path: string) => {
    const state = get();
    if (!state.scheduler?.scheduler.schedulerInfo) return null;
    
    const findQueue = (queue: any): any => {
      if (queue.queuePath === path || queue.queueName === path) {
        return queue;
      }
      if (queue.queues?.queue) {
        for (const child of queue.queues.queue) {
          const found = findQueue(child);
          if (found) return found;
        }
      }
      return null;
    };
    
    return findQueue(state.scheduler.scheduler.schedulerInfo);
  },
  
  // Change management actions
  stageChange: (change) => {
    set((state) => {
      const newStagedChanges = [...state.stagedChanges.filter((c) => c.id !== change.id), change];
      return {
        stagedChanges: newStagedChanges,
      };
    });
  },

  unstageChange: (changeId) =>
    set((state) => ({
      stagedChanges: state.stagedChanges.filter((c) => c.id !== changeId),
      conflicts: state.conflicts.filter((c) => c.changeId !== changeId),
    })),

  clearStagedChanges: () =>
    set({
      stagedChanges: [],
      conflicts: [],
    }),
    
  applyChanges: async () => {
    const { stagedChanges } = get();
    if (stagedChanges.length === 0) return;
    
    set({ applyingChanges: true, error: null });
    
    try {
      // Group changes by queue
      const changesByQueue = stagedChanges.reduce((acc, change) => {
        if (!acc[change.queuePath]) {
          acc[change.queuePath] = {};
        }
        acc[change.queuePath][change.property] = change.newValue;
        return acc;
      }, {} as Record<string, Record<string, string>>);
      
      // Create update request
      const updateRequest = {
        'update-queue': Object.entries(changesByQueue).map(([queuePath, params]) => ({
          'queue-name': queuePath,
          params
        }))
      };
      
      await apiService.updateConfiguration(updateRequest);
      
      set({
        applyingChanges: false,
        lastApplied: Date.now(),
        stagedChanges: [],
        conflicts: [],
      });
      
      // Refresh data after successful update
      await get().loadAllData();
    } catch (error) {
      set({ 
        applyingChanges: false,
        error: error instanceof Error ? error : new Error('Failed to apply changes')
      });
    }
  },

  hasUnsavedChanges: () => get().stagedChanges.length > 0,

  getChangesByQueue: (queuePath) => get().stagedChanges.filter((change) => change.queuePath === queuePath),
}));