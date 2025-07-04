/**
 * Scheduler data slice - handles loading and storing scheduler configuration
 */

import type { StateCreator } from 'zustand';
import type { ConfigProperty, NodeLabel } from '~/types';
import {
  createDetailedErrorMessage,
  createStoreError,
  ERROR_CODES,
  isNetworkError,
} from '~/lib/errors';
import type { SchedulerDataSlice, SchedulerStore } from './types';

export const createSchedulerDataSlice: StateCreator<
  SchedulerStore,
  [['zustand/immer', never]],
  [],
  SchedulerDataSlice
> = (set, get) => ({
  schedulerData: null,
  configData: new Map(),
  configVersion: 0,
  isLoading: false,
  error: null,

  loadInitialData: async () => {
    set((state) => {
      state.isLoading = true;
      state.error = null;
    });

    try {
      const [scheduler, config, labels, nodes, nodeToLabels, version] = await Promise.all([
        get().apiClient.getScheduler(),
        get().apiClient.getSchedulerConf(),
        get().apiClient.getNodeLabels(),
        get().apiClient.getNodes(),
        get().apiClient.getNodeToLabels(),
        get().apiClient.getSchedulerConfVersion(),
      ]);

      set((state) => {
        state.schedulerData = scheduler.scheduler.schedulerInfo;
        state.configData = new Map(config.property.map((p: ConfigProperty) => [p.name, p.value]));

        // Update node labels data
        state.nodeLabels = normalizeNodeLabels(labels.nodeLabelsInfo?.nodeLabelInfo);
        state.nodes = nodes.nodes?.node || [];
        state.nodeToLabels = nodeToLabels.nodeToLabelsInfo?.nodeToLabels || [];

        state.configVersion = version.versionID;
        state.isLoading = false;
      });
    } catch (error) {
      const errorMessage = createDetailedErrorMessage('load initial data', error);

      set((state) => {
        state.error = errorMessage;
        state.isLoading = false;
      });

      throw createStoreError(
        isNetworkError(error) ? ERROR_CODES.NETWORK_ERROR : ERROR_CODES.LOAD_INITIAL_DATA_FAILED,
        errorMessage,
        error,
      );
    }
  },

  refreshSchedulerData: async () => {
    set((state) => {
      state.isLoading = true;
      state.error = null;
    });

    try {
      const scheduler = await get().apiClient.getScheduler();

      set((state) => {
        state.schedulerData = scheduler.scheduler.schedulerInfo;
        state.isLoading = false;
      });
    } catch (error) {
      const errorMessage = createDetailedErrorMessage('refresh scheduler data', error);

      set((state) => {
        state.error = errorMessage;
        state.isLoading = false;
      });

      throw createStoreError(
        isNetworkError(error) ? ERROR_CODES.NETWORK_ERROR : ERROR_CODES.REFRESH_SCHEDULER_FAILED,
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
