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
      }
      if (!queuePath) {
        state.propertyPanelInitialTab = 'overview';
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
      }
    });
  },

  setPropertyPanelInitialTab: (tab) => {
    set((state) => {
      state.propertyPanelInitialTab = tab;
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
});
