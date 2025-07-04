/**
 * Queue selection slice - handles UI state for queue selection and comparison
 */

import type { StateCreator } from 'zustand';
import type { QueueSelectionSlice, SchedulerStore } from './types';

export const createQueueSelectionSlice: StateCreator<
  SchedulerStore,
  [['zustand/immer', never]],
  [],
  QueueSelectionSlice
> = (set, get) => ({
  selectedQueuePath: null,
  comparisonQueues: [],
  isPropertyPanelOpen: false,

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
      }
    });
  },
});
