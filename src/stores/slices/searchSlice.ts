/**
 * Search slice - handles context-aware search functionality
 */

import type { StateCreator } from 'zustand';
import type { SearchSlice, SchedulerStore } from './types';
import { schedulerTreeUtils } from '~/utils/schedulerTreeUtils';
import { globalPropertyDefinitions } from '~/config/properties/global-properties';
import { buildGlobalPropertyKey } from '~/utils/propertyUtils';

export const createSearchSlice: StateCreator<
  SchedulerStore,
  [['zustand/immer', never]],
  [],
  SearchSlice
> = (set, get) => ({
  searchQuery: '',
  searchContext: null,
  searchHistory: [],
  isSearchFocused: false,

  setSearchQuery: (query) => {
    set((state) => {
      state.searchQuery = query;
    });
  },

  setSearchContext: (context) => {
    set((state) => {
      state.searchContext = context;
    });
  },

  clearSearch: () => {
    set((state) => {
      state.searchQuery = '';
      state.isSearchFocused = false;
    });
  },

  addToSearchHistory: (query) => {
    set((state) => {
      // Add to history if not already present
      if (query && !state.searchHistory.includes(query)) {
        state.searchHistory = [query, ...state.searchHistory].slice(0, 10); // Keep last 10
      }
    });
  },

  setSearchFocused: (focused) => {
    set((state) => {
      state.isSearchFocused = focused;
    });
  },

  getFilteredQueues: () => {
    const { searchQuery, schedulerData } = get();
    if (!searchQuery || !schedulerData) return schedulerData;

    // Find all matching queue paths
    const matches = schedulerTreeUtils.findMatchingQueues(schedulerData, searchQuery);

    // Return filtered scheduler tree
    return schedulerTreeUtils.filterSchedulerTree(schedulerData, matches);
  },

  getFilteredNodes: () => {
    const { searchQuery, nodes } = get();
    if (!searchQuery) return nodes;

    const lowerQuery = searchQuery.toLowerCase();
    return nodes.filter(
      (node) =>
        node.nodeHostName.toLowerCase().includes(lowerQuery) ||
        node.nodeLabels?.some((label) => label.toLowerCase().includes(lowerQuery)) ||
        node.rack?.toLowerCase().includes(lowerQuery),
    );
  },

  getFilteredSettings: () => {
    const { searchQuery } = get();
    if (!searchQuery) return globalPropertyDefinitions;

    const lowerQuery = searchQuery.toLowerCase();

    return globalPropertyDefinitions.filter((prop) => {
      // Build the full property key
      const fullPropertyKey = buildGlobalPropertyKey(prop.name);

      // Search in property metadata - technical name, full key, and display name
      const matchesSearch =
        prop.name.toLowerCase().includes(lowerQuery) ||
        fullPropertyKey.toLowerCase().includes(lowerQuery) ||
        prop.displayName.toLowerCase().includes(lowerQuery) ||
        prop.description?.toLowerCase().includes(lowerQuery) ||
        prop.category.toLowerCase().includes(lowerQuery);

      return matchesSearch;
    });
  },

  getSearchResults: () => {
    const { searchQuery, searchContext } = get();
    if (!searchQuery) return { count: 0, hasResults: false };

    let count = 0;

    switch (searchContext) {
      case 'queues': {
        const filteredQueues = get().getFilteredQueues();
        if (filteredQueues) {
          count = schedulerTreeUtils.flattenSchedulerTree(filteredQueues).length;
        }
        break;
      }
      case 'nodes':
        count = get().getFilteredNodes().length;
        break;
      case 'settings':
        count = get().getFilteredSettings().length;
        break;
    }

    return {
      count,
      hasResults: count > 0,
    };
  },
});
