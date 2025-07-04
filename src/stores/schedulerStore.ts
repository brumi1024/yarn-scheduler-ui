/**
 * Main scheduler store - combines all slices into a single store
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { enableMapSet } from 'immer';
import { YarnApiClient } from '~/lib/api/YarnApiClient';
import { API_CONFIG } from '~/lib/api/config';
import {
  createSchedulerDataSlice,
  createNodeLabelsSlice,
  createStagedChangesSlice,
  createQueueSelectionSlice,
  createQueueDataSlice,
  type SchedulerStore,
} from './slices';

// Enable Map and Set support in immer
enableMapSet();

/**
 * Creates the scheduler store with the given API client
 */
const createStoreImplementation = (apiClient: YarnApiClient) =>
  immer<SchedulerStore>((set, get, api) => ({
    apiClient,
    ...createSchedulerDataSlice(set, get, api),
    ...createNodeLabelsSlice(set, get, api),
    ...createStagedChangesSlice(set, get, api),
    ...createQueueSelectionSlice(set, get, api),
    ...createQueueDataSlice(set, get, api),
  }));

/**
 * The default scheduler store instance
 */
export const useSchedulerStore = create(
  createStoreImplementation(new YarnApiClient(API_CONFIG.baseUrl, API_CONFIG)),
);

/**
 * Factory function to create a scheduler store with a custom API client
 * Useful for testing or different environments
 */
export const createSchedulerStore = (apiClient: YarnApiClient) => {
  return create(createStoreImplementation(apiClient));
};

// Re-export types and utilities
export type { SchedulerStore } from './slices';
export { traverseQueueTree } from './slices/queueDataSlice';
