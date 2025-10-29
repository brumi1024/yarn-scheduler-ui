/**
 * Node labels slice - handles node label management operations
 */

import type { StateCreator } from 'zustand';
import type {
  NodeLabel,
  NodeLabelInfoItem,
  NodeLabelsResponse,
  NodeToLabelMapping,
  NodeToLabelsMapEntry,
  NodeToLabelsResponse,
} from '~/types';
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
      if (state.errorContext === 'nodeLabels') {
        state.error = null;
        state.errorContext = null;
      }
    });

    try {
      await get().apiClient.addNodeLabels([{ name, exclusivity }]);

      // Refresh node labels
      const labels = await get().apiClient.getNodeLabels();

      set((state) => {
        state.nodeLabels = normalizeNodeLabels(labels);
        state.isLoading = false;
        if (state.errorContext === 'nodeLabels') {
          state.error = null;
          state.errorContext = null;
        }
      });
    } catch (error) {
      const errorMessage = createDetailedErrorMessage(`add node label "${name}"`, error);

      set((state) => {
        state.error = errorMessage;
        state.errorContext = 'nodeLabels';
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
      if (state.errorContext === 'nodeLabels') {
        state.error = null;
        state.errorContext = null;
      }
    });

    try {
      await get().apiClient.removeNodeLabels([name]);

      // Refresh node labels and node-to-label mappings
      const [labels, nodeToLabels] = await Promise.all([
        get().apiClient.getNodeLabels(),
        get().apiClient.getNodeToLabels(),
      ]);

      set((state) => {
        state.nodeLabels = normalizeNodeLabels(labels);
        state.nodeToLabels = normalizeNodeToLabels(nodeToLabels);
        state.isLoading = false;

        // Clear selection if the removed label was selected
        if (state.selectedNodeLabel === name) {
          state.selectedNodeLabel = null;
        }

        if (state.errorContext === 'nodeLabels') {
          state.error = null;
          state.errorContext = null;
        }
      });
    } catch (error) {
      const errorMessage = createDetailedErrorMessage(`remove node label "${name}"`, error);

      set((state) => {
        state.error = errorMessage;
        state.errorContext = 'nodeLabels';
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
      if (state.errorContext === 'nodeLabels') {
        state.error = null;
        state.errorContext = null;
      }
    });

    try {
      // Replace with new label or empty array if null
      const newLabels = labelName ? [labelName] : [];

      await get().apiClient.replaceNodeToLabels([{ nodeId, labels: newLabels }]);

      // Refresh node-to-label mappings
      const nodeToLabels = await get().apiClient.getNodeToLabels();

      set((state) => {
        state.nodeToLabels = normalizeNodeToLabels(nodeToLabels);
        state.isLoading = false;
        if (state.errorContext === 'nodeLabels') {
          state.error = null;
          state.errorContext = null;
        }
      });
    } catch (error) {
      const errorMessage = createDetailedErrorMessage(
        `assign node "${nodeId}" to label "${labelName || 'DEFAULT'}"`,
        error,
      );

      set((state) => {
        state.error = errorMessage;
        state.errorContext = 'nodeLabels';
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
function normalizeNodeLabels(response?: NodeLabelsResponse): NodeLabel[] {
  const rawNodeLabelInfo = response?.nodeLabelInfo;
  const nodeLabelInfo = Array.isArray(rawNodeLabelInfo)
    ? rawNodeLabelInfo
    : rawNodeLabelInfo
      ? [rawNodeLabelInfo]
      : [];

  return nodeLabelInfo.map((label) => ({
    ...label,
    exclusivity: parseExclusivity(label.exclusivity),
  }));
}

function parseExclusivity(value?: boolean | 'true' | 'false'): boolean {
  if (typeof value === 'string') {
    return value.toLowerCase() !== 'false';
  }

  return value ?? true;
}

type NodeLabelInfoLike =
  | NodeLabelInfoItem
  | NodeLabelInfoItem[]
  | {
      nodeLabelInfo?: NodeLabelInfoItem | NodeLabelInfoItem[];
    };

function normalizeNodeToLabels(response?: NodeToLabelsResponse): NodeToLabelMapping[] {
  const entries = extractEntries(response?.nodeToLabels);

  return entries.map((entry) => ({
    nodeId: entry.key,
    nodeLabels: extractLabelNames(entry.value?.nodeLabelInfo),
  }));
}

function extractEntries(data?: NodeToLabelsResponse['nodeToLabels']): NodeToLabelsMapEntry[] {
  if (!data || !data.entry) {
    return [];
  }

  const { entry } = data;
  return Array.isArray(entry) ? entry : [entry];
}

function extractLabelNames(info?: NodeLabelInfoLike): string[] {
  if (!info) {
    return [];
  }

  if (Array.isArray(info)) {
    return info.map((item) => item?.name).filter((name): name is string => Boolean(name));
  }

  if ('nodeLabelInfo' in info && info.nodeLabelInfo) {
    return extractLabelNames(info.nodeLabelInfo as NodeLabelInfoItem | NodeLabelInfoItem[]);
  }

  if (typeof info === 'object' && info !== null && 'name' in info) {
    const name = (info as NodeLabelInfoItem).name;
    return name ? [name] : [];
  }

  return [];
}
