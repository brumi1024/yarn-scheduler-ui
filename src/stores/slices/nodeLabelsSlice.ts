/**
 * Node labels slice - handles node label management operations
 */

import type { StateCreator } from 'zustand';
import type { NodeLabel } from '~/types';
import {
  createDetailedErrorMessage,
  createStoreError,
  ERROR_CODES,
  isNetworkError,
} from '~/lib/errors';
import type { NodeLabelsSlice, SchedulerStore } from './types';

export const createNodeLabelsSlice: StateCreator<
  SchedulerStore,
  [['zustand/immer', never]],
  [],
  NodeLabelsSlice
> = (set, get) => ({
  nodeLabels: [],
  nodes: [],
  nodeToLabels: [],
  selectedNodeLabel: null,

  selectNodeLabel: (label) => {
    set((state) => {
      state.selectedNodeLabel = label;
    });
  },

  addNodeLabel: async (name, exclusivity) => {
    set((state) => {
      state.isLoading = true;
      state.error = null;
    });

    try {
      await get().apiClient.addNodeLabels([{ name, exclusivity }]);

      // Refresh node labels
      const labels = await get().apiClient.getNodeLabels();

      set((state) => {
        state.nodeLabels = normalizeNodeLabels(labels.nodeLabelsInfo?.nodeLabelInfo);
        state.isLoading = false;
      });
    } catch (error) {
      const errorMessage = createDetailedErrorMessage(`add node label "${name}"`, error);

      set((state) => {
        state.error = errorMessage;
        state.isLoading = false;
      });

      throw createStoreError(
        isNetworkError(error) ? ERROR_CODES.NETWORK_ERROR : ERROR_CODES.ADD_NODE_LABEL_FAILED,
        errorMessage,
        error,
      );
    }
  },

  removeNodeLabel: async (name) => {
    set((state) => {
      state.isLoading = true;
      state.error = null;
    });

    try {
      await get().apiClient.removeNodeLabels([name]);

      // Refresh node labels and node-to-label mappings
      const [labels, nodeToLabels] = await Promise.all([
        get().apiClient.getNodeLabels(),
        get().apiClient.getNodeToLabels(),
      ]);

      set((state) => {
        state.nodeLabels = normalizeNodeLabels(labels.nodeLabelsInfo?.nodeLabelInfo);
        state.nodeToLabels = nodeToLabels.nodeToLabelsInfo?.nodeToLabels || [];
        state.isLoading = false;

        // Clear selection if the removed label was selected
        if (state.selectedNodeLabel === name) {
          state.selectedNodeLabel = null;
        }
      });
    } catch (error) {
      const errorMessage = createDetailedErrorMessage(`remove node label "${name}"`, error);

      set((state) => {
        state.error = errorMessage;
        state.isLoading = false;
      });

      throw createStoreError(
        isNetworkError(error) ? ERROR_CODES.NETWORK_ERROR : ERROR_CODES.REMOVE_NODE_LABEL_FAILED,
        errorMessage,
        error,
      );
    }
  },

  assignNodeToLabel: async (nodeId, labelName) => {
    set((state) => {
      state.isLoading = true;
      state.error = null;
    });

    try {
      // Replace with new label or empty array if null
      const newLabels = labelName ? [labelName] : [];

      await get().apiClient.replaceNodeToLabels([{ nodeId, labels: newLabels }]);

      // Refresh node-to-label mappings
      const nodeToLabels = await get().apiClient.getNodeToLabels();

      set((state) => {
        state.nodeToLabels = nodeToLabels.nodeToLabelsInfo?.nodeToLabels || [];
        state.isLoading = false;
      });
    } catch (error) {
      const errorMessage = createDetailedErrorMessage(
        `assign node "${nodeId}" to label "${labelName || 'DEFAULT'}"`,
        error,
      );

      set((state) => {
        state.error = errorMessage;
        state.isLoading = false;
      });

      throw createStoreError(
        isNetworkError(error) ? ERROR_CODES.NETWORK_ERROR : ERROR_CODES.ASSIGN_NODE_TO_LABEL_FAILED,
        errorMessage,
        error,
      );
    }
  },
});

/**
 * Helper function to normalize node labels from API response
 * Ensures exclusivity defaults to true if not specified (YARN default)
 */
function normalizeNodeLabels(
  nodeLabelsInfo?: {
    name: string;
    exclusivity?: boolean;
    partitionName?: string;
  }[],
): NodeLabel[] {
  return (nodeLabelsInfo || []).map((label) => ({
    ...label,
    exclusivity: label.exclusivity ?? true, // Default to exclusive if not specified
  }));
}
