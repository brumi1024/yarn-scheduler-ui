/**
 * Scheduler data slice - handles loading and storing scheduler configuration
 */

import type { StateCreator } from 'zustand';
import type { ConfigProperty } from '~/types';
import {
  createDetailedErrorMessage,
  createStoreError,
  ERROR_CODES,
  isNetworkError,
} from '~/lib/errors';
import { normalizeNodeLabels, normalizeNodeToLabels } from '~/lib/normalizers/nodeDataNormalizers';
import type { SchedulerDataSlice, SchedulerStore } from './types';

export const createSchedulerDataSlice: StateCreator<
  SchedulerStore,
  [['zustand/immer', never]],
  [],
  SchedulerDataSlice
> = (set, get) => ({
  schedulerData: null,
  schedulerIssueData: null,
  configData: new Map(),
  configVersion: 0,
  isLoading: false,
  error: null,
  errorContext: null,
  isReadOnly: false,

  loadInitialData: async () => {
    set((state) => {
      state.isLoading = true;
      if (state.errorContext === 'load') {
        state.error = null;
        state.errorContext = null;
      }
    });

    try {
      const [scheduler, schedulerIssue, config, labels, nodes, nodeToLabels, version] =
        await Promise.all([
          get().apiClient.getScheduler(),
          get().apiClient.getSchedulerIssue(),
          get().apiClient.getSchedulerConf(),
          get().apiClient.getNodeLabels(),
          get().apiClient.getNodes(),
          get().apiClient.getNodeToLabels(),
          get().apiClient.getSchedulerConfVersion(),
        ]);

      set((state) => {
        state.schedulerData = scheduler.scheduler.schedulerInfo;
        state.schedulerIssueData = schedulerIssue;
        state.configData = new Map(config.property.map((p: ConfigProperty) => [p.name, p.value]));

        // Update node labels data
        state.nodeLabels = normalizeNodeLabels(labels);
        state.nodes = nodes.nodes?.node || [];
        state.nodeToLabels = normalizeNodeToLabels(nodeToLabels);

        state.configVersion = version.versionId;
        state.isReadOnly = get().apiClient.getIsReadOnly();
        state.isLoading = false;
        if (state.errorContext === 'load') {
          state.error = null;
          state.errorContext = null;
        }
      });
    } catch (error) {
      const errorMessage = createDetailedErrorMessage('load initial data', error);

      set((state) => {
        state.error = errorMessage;
        state.errorContext = 'load';
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
      if (state.errorContext === 'load') {
        state.error = null;
        state.errorContext = null;
      }
    });

    try {
      const scheduler = await get().apiClient.getScheduler();

      set((state) => {
        state.schedulerData = scheduler.scheduler.schedulerInfo;
        state.isLoading = false;
        if (state.errorContext === 'load') {
          state.error = null;
          state.errorContext = null;
        }
      });
    } catch (error) {
      const errorMessage = createDetailedErrorMessage('refresh scheduler data', error);

      set((state) => {
        state.error = errorMessage;
        state.errorContext = 'load';
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
