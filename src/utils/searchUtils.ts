import { flattenSchedulerTree } from './treeUtils';
import type { SchedulerInfo } from '~/types';
import type { PropertyDescriptor } from '~/types/property-descriptor';

/**
 * Calculate search results based on search query, context, and filtered data
 */
export function calculateSearchResults(params: {
  searchQuery: string;
  searchContext: 'queues' | 'nodes' | 'settings' | null;
  filteredQueues: SchedulerInfo | null;
  filteredNodes: Array<{ nodeHostName: string; nodeLabels?: string[]; rack?: string }>;
  filteredSettings: PropertyDescriptor[];
}): { count: number; hasResults: boolean } {
  const { searchQuery, searchContext, filteredQueues, filteredNodes, filteredSettings } = params;

  // Return empty results if no query
  if (!searchQuery) {
    return { count: 0, hasResults: false };
  }

  let count = 0;

  switch (searchContext) {
    case 'queues': {
      if (filteredQueues) {
        count = flattenSchedulerTree(filteredQueues).length;
      }
      break;
    }
    case 'nodes':
      count = filteredNodes.length;
      break;
    case 'settings':
      count = filteredSettings.length;
      break;
    case null:
    default: {
      // When context is not set, search all contexts and return the total
      count =
        (filteredQueues ? flattenSchedulerTree(filteredQueues).length : 0) +
        filteredNodes.length +
        filteredSettings.length;
      break;
    }
  }

  return {
    count,
    hasResults: count > 0,
  };
}
