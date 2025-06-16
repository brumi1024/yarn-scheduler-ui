import { create } from 'zustand';
import { apiService } from '../api/ApiService';
import type { 
    NodeLabel, 
    ClusterNode, 
    NodeToLabelsMapping,
    AddNodeLabelsRequest,
    ReplaceNodeLabelsRequest 
} from '../types/NodeLabel';

interface PendingLabelChange {
    nodeId: string;
    originalLabels: string[];
    newLabels: string[];
}

interface PendingNodeLabelAddition {
    name: string;
    exclusivity: boolean;
}

interface NodeLabelStore {
    // Pending changes state
    pendingNodeChanges: Map<string, PendingLabelChange>;
    pendingNewLabels: PendingNodeLabelAddition[];
    pendingLabelRemovals: string[];

    // UI state
    selectedNodes: Set<string>;
    selectedLabels: Set<string>;
    isLoading: boolean;
    error: Error | null;

    // Actions for managing pending changes
    stageLabelChange: (nodeId: string, originalLabels: string[], newLabels: string[]) => void;
    unstageNodeChange: (nodeId: string) => void;
    clearAllChanges: () => void;

    // Actions for managing labels
    stageNewLabel: (name: string, exclusivity: boolean) => void;
    unstageNewLabel: (name: string) => void;
    stageLabelRemoval: (labelName: string) => void;
    unstageLabelRemoval: (labelName: string) => void;

    // Actions for node/label selection
    selectNode: (nodeId: string) => void;
    deselectNode: (nodeId: string) => void;
    selectLabel: (labelName: string) => void;
    deselectLabel: (labelName: string) => void;
    clearSelections: () => void;

    // Actions for bulk operations (single label per node)
    bulkAssignLabel: (nodeIds: string[], labelName: string) => void;
    bulkRemoveLabels: (nodeIds: string[]) => void;

    // Actions for applying changes
    applyChanges: () => Promise<void>;

    // Utility functions
    getNodePendingLabels: (nodeId: string, currentLabels: string[]) => string[];
    hasChanges: () => boolean;
    getChangesSummary: () => {
        nodeChanges: number;
        newLabels: number;
        removedLabels: number;
    };
}

export const useNodeLabelStore = create<NodeLabelStore>((set, get) => ({
    // Initial state
    pendingNodeChanges: new Map(),
    pendingNewLabels: [],
    pendingLabelRemovals: [],
    selectedNodes: new Set(),
    selectedLabels: new Set(),
    isLoading: false,
    error: null,

    // Staging actions
    stageLabelChange: (nodeId, originalLabels, newLabels) => {
        set((state) => {
            const newPendingChanges = new Map(state.pendingNodeChanges);
            
            // Check if labels are actually different
            const labelsChanged = JSON.stringify([...originalLabels].sort()) !== 
                                 JSON.stringify([...newLabels].sort());
            
            if (labelsChanged) {
                newPendingChanges.set(nodeId, {
                    nodeId,
                    originalLabels: [...originalLabels],
                    newLabels: [...newLabels],
                });
            } else {
                // If labels are the same as original, remove any pending change
                newPendingChanges.delete(nodeId);
            }

            return {
                pendingNodeChanges: newPendingChanges,
            };
        });
    },

    unstageNodeChange: (nodeId) => {
        set((state) => {
            const newPendingChanges = new Map(state.pendingNodeChanges);
            newPendingChanges.delete(nodeId);
            return {
                pendingNodeChanges: newPendingChanges,
            };
        });
    },

    clearAllChanges: () => {
        set({
            pendingNodeChanges: new Map(),
            pendingNewLabels: [],
            pendingLabelRemovals: [],
        });
    },

    stageNewLabel: (name, exclusivity) => {
        set((state) => {
            // Check if label already exists in pending additions
            const exists = state.pendingNewLabels.some(label => label.name === name);
            if (exists) return state;

            return {
                pendingNewLabels: [...state.pendingNewLabels, { name, exclusivity }],
            };
        });
    },

    unstageNewLabel: (name) => {
        set((state) => ({
            pendingNewLabels: state.pendingNewLabels.filter(label => label.name !== name),
        }));
    },

    stageLabelRemoval: (labelName) => {
        set((state) => {
            if (state.pendingLabelRemovals.includes(labelName)) return state;
            return {
                pendingLabelRemovals: [...state.pendingLabelRemovals, labelName],
            };
        });
    },

    unstageLabelRemoval: (labelName) => {
        set((state) => ({
            pendingLabelRemovals: state.pendingLabelRemovals.filter(name => name !== labelName),
        }));
    },

    // Selection actions
    selectNode: (nodeId) => {
        set((state) => ({
            selectedNodes: new Set([...state.selectedNodes, nodeId]),
        }));
    },

    deselectNode: (nodeId) => {
        set((state) => {
            const newSelected = new Set(state.selectedNodes);
            newSelected.delete(nodeId);
            return { selectedNodes: newSelected };
        });
    },

    selectLabel: (labelName) => {
        set((state) => ({
            selectedLabels: new Set([...state.selectedLabels, labelName]),
        }));
    },

    deselectLabel: (labelName) => {
        set((state) => {
            const newSelected = new Set(state.selectedLabels);
            newSelected.delete(labelName);
            return { selectedLabels: newSelected };
        });
    },

    clearSelections: () => {
        set({
            selectedNodes: new Set(),
            selectedLabels: new Set(),
        });
    },

    // Bulk operations (single label per node)
    bulkAssignLabel: (nodeIds, labelName) => {
        const state = get();
        
        nodeIds.forEach(nodeId => {
            // Get current labels for this node (including any pending changes)
            const currentLabels = state.getNodePendingLabels(nodeId, []);
            // Since each node can only have one label, replace with the new label
            const newLabels = [labelName];
            
            state.stageLabelChange(nodeId, currentLabels, newLabels);
        });
    },

    bulkRemoveLabels: (nodeIds) => {
        const state = get();
        
        nodeIds.forEach(nodeId => {
            // Get current labels for this node (including any pending changes)
            const currentLabels = state.getNodePendingLabels(nodeId, []);
            // Remove all labels from the node
            const newLabels: string[] = [];
            
            state.stageLabelChange(nodeId, currentLabels, newLabels);
        });
    },

    // Apply changes
    applyChanges: async () => {
        const state = get();
        
        set({ isLoading: true, error: null });

        try {
            // Apply new labels first
            if (state.pendingNewLabels.length > 0) {
                const addRequest: AddNodeLabelsRequest = {
                    nodeLabelsInfo: {
                        nodeLabelInfo: state.pendingNewLabels.map(label => ({
                            name: label.name,
                            exclusivity: label.exclusivity,
                        })),
                    },
                };
                await apiService.addNodeLabels(addRequest);
            }

            // Apply node label changes
            if (state.pendingNodeChanges.size > 0) {
                const nodeToLabelsChanges: NodeToLabelsMapping[] = Array.from(state.pendingNodeChanges.values())
                    .map(change => ({
                        nodeId: change.nodeId,
                        nodeLabels: change.newLabels,
                    }));

                const replaceRequest: ReplaceNodeLabelsRequest = {
                    nodeToLabelsEntryList: {
                        nodeToLabels: nodeToLabelsChanges,
                    },
                };
                await apiService.replaceNodeLabels(replaceRequest);
            }

            // Remove labels last
            if (state.pendingLabelRemovals.length > 0) {
                await apiService.removeNodeLabels(state.pendingLabelRemovals);
            }

            // Clear all pending changes on success
            set({
                pendingNodeChanges: new Map(),
                pendingNewLabels: [],
                pendingLabelRemovals: [],
                isLoading: false,
            });

        } catch (error) {
            set({
                isLoading: false,
                error: error instanceof Error ? error : new Error('Failed to apply changes'),
            });
            throw error;
        }
    },

    // Utility functions
    getNodePendingLabels: (nodeId, currentLabels) => {
        const state = get();
        const pendingChange = state.pendingNodeChanges.get(nodeId);
        return pendingChange ? pendingChange.newLabels : currentLabels;
    },

    hasChanges: () => {
        const state = get();
        return state.pendingNodeChanges.size > 0 || 
               state.pendingNewLabels.length > 0 || 
               state.pendingLabelRemovals.length > 0;
    },

    getChangesSummary: () => {
        const state = get();
        return {
            nodeChanges: state.pendingNodeChanges.size,
            newLabels: state.pendingNewLabels.length,
            removedLabels: state.pendingLabelRemovals.length,
        };
    },
}));