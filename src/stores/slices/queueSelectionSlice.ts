/**
 * Queue selection slice - handles UI state for queue selection and comparison
 */

import type { StateCreator } from 'zustand';
import type { QueueSelectionSlice, SchedulerStore } from './types';
import { getQueueProperties } from '~/utils/configPropertyUtils';

export const createQueueSelectionSlice: StateCreator<
  SchedulerStore,
  [['zustand/immer', never]],
  [],
  QueueSelectionSlice
> = (set, get) => ({
  selectedQueuePath: null,
  comparisonQueues: [],
  isPropertyPanelOpen: false,
  propertyPanelInitialTab: 'overview',
  shouldOpenTemplateConfig: false,
  isComparisonModeActive: false,

  selectQueue: (queuePath) => {
    // Validate that the queue exists if a path is provided
    if (queuePath) {
      const queue = get().getQueueByPath(queuePath);
      if (!queue) {
        // Queue doesn't exist, don't select it
        return;
      }
    }

    set((state) => {
      state.selectedQueuePath = queuePath;
      if (queuePath) {
        state.isPropertyPanelOpen = true;
        state.shouldOpenTemplateConfig = false;
      }
      if (!queuePath) {
        state.propertyPanelInitialTab = 'overview';
        state.shouldOpenTemplateConfig = false;
      }
    });
  },

  toggleComparisonQueue: (queuePath) => {
    set((state) => {
      const index = state.comparisonQueues.indexOf(queuePath);
      if (index >= 0) {
        state.comparisonQueues.splice(index, 1);
      } else {
        state.comparisonQueues.push(queuePath);
      }
    });
  },

  setPropertyPanelOpen: (isOpen) => {
    set((state) => {
      state.isPropertyPanelOpen = isOpen;
      // Clear selection when panel closes
      if (!isOpen) {
        state.selectedQueuePath = null;
        state.propertyPanelInitialTab = 'overview';
        state.shouldOpenTemplateConfig = false;
      }
    });
  },

  setPropertyPanelInitialTab: (tab) => {
    set((state) => {
      state.propertyPanelInitialTab = tab;
    });
  },

  requestTemplateConfigOpen: () => {
    set((state) => {
      state.shouldOpenTemplateConfig = true;
    });
  },

  clearTemplateConfigRequest: () => {
    set((state) => {
      state.shouldOpenTemplateConfig = false;
    });
  },

  clearComparisonQueues: () => {
    set((state) => {
      state.comparisonQueues = [];
    });
  },

  canCompareQueues: () => {
    return get().comparisonQueues.length >= 2;
  },

  getComparisonData: () => {
    const { comparisonQueues, configData } = get();
    const configs = new Map<string, Record<string, string>>();

    comparisonQueues.forEach((queuePath) => {
      const properties = getQueueProperties(configData, queuePath);
      configs.set(queuePath, properties);
    });

    return configs;
  },

  toggleComparisonMode: () => {
    set((state) => {
      state.isComparisonModeActive = !state.isComparisonModeActive;
      // Clear selections when exiting comparison mode
      if (!state.isComparisonModeActive) {
        state.comparisonQueues = [];
      }
    });
  },

  setComparisonMode: (active) => {
    set((state) => {
      state.isComparisonModeActive = active;
      // Clear selections when exiting comparison mode
      if (!active) {
        state.comparisonQueues = [];
      }
    });
  },
});
