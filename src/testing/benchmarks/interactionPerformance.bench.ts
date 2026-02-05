/**
 * Interaction Responsiveness Performance Benchmarks
 *
 * Benchmarks for user-facing interactions with large queue datasets.
 * Focus on ensuring sub-16ms response times for smooth 60fps interactions.
 *
 * Run with: npx vitest bench src/testing/benchmarks/interactionPerformance.bench.ts
 */

import { bench, describe, beforeAll } from 'vitest';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { enableMapSet } from 'immer';
import {
  generateMockScheduler,
  generateMockSchedulerConf,
  PRESET_CONFIGS,
} from '~/testing/utils/generateMockQueues';
import type { QueueInfo, StagedChange } from '~/types';

// Enable Map and Set support in immer
enableMapSet();

// Pre-generate test data
const MOCK_DATA = {
  enterprise: {
    scheduler: generateMockScheduler({ ...PRESET_CONFIGS.enterprise, seed: 100 }),
    conf: generateMockSchedulerConf({ ...PRESET_CONFIGS.enterprise, seed: 100 }),
  },
  largeEnterprise: {
    scheduler: generateMockScheduler({ ...PRESET_CONFIGS.largeEnterprise, seed: 200 }),
    conf: generateMockSchedulerConf({ ...PRESET_CONFIGS.largeEnterprise, seed: 200 }),
  },
};

/**
 * Simplified store slice for benchmarking search operations
 */
interface SearchState {
  searchQuery: string;
  queuePaths: string[];
  filteredPaths: string[];
  setSearchQuery: (query: string) => void;
}

function createSearchStore(queuePaths: string[]) {
  return create<SearchState>()(
    immer((set) => ({
      searchQuery: '',
      queuePaths,
      filteredPaths: queuePaths,
      setSearchQuery: (query: string) =>
        set((state) => {
          state.searchQuery = query;
          if (!query) {
            state.filteredPaths = state.queuePaths;
          } else {
            const lowerQuery = query.toLowerCase();
            state.filteredPaths = state.queuePaths.filter((path) =>
              path.toLowerCase().includes(lowerQuery),
            );
          }
        }),
    })),
  );
}

/**
 * Simplified store slice for benchmarking staged changes
 */
interface StagedChangesState {
  stagedChanges: Map<string, StagedChange>;
  stagePropertyChange: (queuePath: string, property: string, value: string) => void;
  clearQueueChanges: (queuePath: string) => void;
}

function createStagedChangesStore() {
  let idCounter = 0;
  return create<StagedChangesState>()(
    immer((set) => ({
      stagedChanges: new Map(),
      stagePropertyChange: (queuePath: string, property: string, value: string) =>
        set((state) => {
          const key = `${queuePath}:${property}`;
          state.stagedChanges.set(key, {
            id: `change-${++idCounter}`,
            queuePath,
            property,
            type: 'update',
            newValue: value,
            timestamp: Date.now(),
          });
        }),
      clearQueueChanges: (queuePath: string) =>
        set((state) => {
          const keysToDelete: string[] = [];
          state.stagedChanges.forEach((_, key) => {
            if (key.startsWith(`${queuePath}:`)) {
              keysToDelete.push(key);
            }
          });
          keysToDelete.forEach((key) => state.stagedChanges.delete(key));
        }),
    })),
  );
}

/**
 * Simplified store slice for benchmarking queue selection
 */
interface SelectionState {
  selectedQueuePath: string | null;
  selectQueue: (path: string | null) => void;
}

function createSelectionStore() {
  return create<SelectionState>()(
    immer((set) => ({
      selectedQueuePath: null,
      selectQueue: (path: string | null) =>
        set((state) => {
          state.selectedQueuePath = path;
        }),
    })),
  );
}

/**
 * Extract all queue paths from scheduler response
 */
function extractQueuePaths(scheduler: ReturnType<typeof generateMockScheduler>): string[] {
  const paths: string[] = ['root'];

  function traverse(queue: QueueInfo) {
    paths.push(queue.queuePath);
    if (queue.queues?.queue) {
      const children = Array.isArray(queue.queues.queue)
        ? queue.queues.queue
        : [queue.queues.queue];
      children.forEach(traverse);
    }
  }

  const rootQueues = scheduler.scheduler.schedulerInfo.queues?.queue ?? [];
  rootQueues.forEach(traverse);

  return paths;
}

// Pre-extract queue paths
const QUEUE_PATHS = {
  enterprise: extractQueuePaths(MOCK_DATA.enterprise.scheduler),
  largeEnterprise: extractQueuePaths(MOCK_DATA.largeEnterprise.scheduler),
};

describe('Search Filter Interactions', () => {
  const enterpriseCount = QUEUE_PATHS.enterprise.length;
  const largeCount = QUEUE_PATHS.largeEnterprise.length;

  let enterpriseStore: ReturnType<typeof createSearchStore>;
  let largeStore: ReturnType<typeof createSearchStore>;

  beforeAll(() => {
    enterpriseStore = createSearchStore(QUEUE_PATHS.enterprise);
    largeStore = createSearchStore(QUEUE_PATHS.largeEnterprise);
  });

  bench(`search filter ${enterpriseCount} queues - type query`, () => {
    enterpriseStore.getState().setSearchQuery('prod');
  });

  bench(`search filter ${enterpriseCount} queues - clear filter`, () => {
    enterpriseStore.getState().setSearchQuery('prod');
    enterpriseStore.getState().setSearchQuery('');
  });

  bench(`search filter ${largeCount} queues - type query`, () => {
    largeStore.getState().setSearchQuery('prod');
  });

  bench(`search filter ${largeCount} queues - clear filter`, () => {
    largeStore.getState().setSearchQuery('prod');
    largeStore.getState().setSearchQuery('');
  });

  bench(`search filter ${largeCount} queues - specific path`, () => {
    largeStore.getState().setSearchQuery('root.engineering.alpha');
  });

  bench(`search filter ${largeCount} queues - incremental typing`, () => {
    const store = createSearchStore(QUEUE_PATHS.largeEnterprise);
    store.getState().setSearchQuery('p');
    store.getState().setSearchQuery('pr');
    store.getState().setSearchQuery('pro');
    store.getState().setSearchQuery('prod');
  });
});

describe('Queue Selection Interactions', () => {
  const enterpriseCount = QUEUE_PATHS.enterprise.length;

  let store: ReturnType<typeof createSelectionStore>;

  beforeAll(() => {
    store = createSelectionStore();
  });

  bench(`select queue (${enterpriseCount} total)`, () => {
    store.getState().selectQueue('root.engineering.team-a.project1');
  });

  bench(`deselect queue`, () => {
    store.getState().selectQueue('root.engineering.team-a');
    store.getState().selectQueue(null);
  });

  bench(`rapid queue selection changes`, () => {
    const paths = QUEUE_PATHS.enterprise.slice(0, 10);
    paths.forEach((path) => {
      store.getState().selectQueue(path);
    });
  });
});

describe('Staged Changes Interactions', () => {
  const enterpriseCount = QUEUE_PATHS.enterprise.length;

  bench(`stage property change`, () => {
    const store = createStagedChangesStore();
    store.getState().stagePropertyChange('root.production', 'capacity', '50');
  });

  bench(`stage multiple properties on same queue`, () => {
    const store = createStagedChangesStore();
    store.getState().stagePropertyChange('root.production', 'capacity', '50');
    store.getState().stagePropertyChange('root.production', 'maximum-capacity', '80');
    store.getState().stagePropertyChange('root.production', 'state', 'STOPPED');
  });

  bench(`stage properties on ${Math.min(50, enterpriseCount)} queues`, () => {
    const store = createStagedChangesStore();
    const paths = QUEUE_PATHS.enterprise.slice(0, 50);
    paths.forEach((path) => {
      store.getState().stagePropertyChange(path, 'capacity', '50');
    });
  });

  bench(`clear queue changes`, () => {
    const store = createStagedChangesStore();
    // First stage some changes
    store.getState().stagePropertyChange('root.production', 'capacity', '50');
    store.getState().stagePropertyChange('root.production', 'maximum-capacity', '80');
    // Then clear them
    store.getState().clearQueueChanges('root.production');
  });

  bench(`stage and clear rapid cycle`, () => {
    const store = createStagedChangesStore();
    for (let i = 0; i < 10; i++) {
      store.getState().stagePropertyChange('root.production', 'capacity', `${50 + i}`);
    }
    store.getState().clearQueueChanges('root.production');
  });
});

describe('Combined Interaction Patterns', () => {
  bench(`typical user workflow - search, select, modify`, () => {
    const searchStore = createSearchStore(QUEUE_PATHS.largeEnterprise);
    const selectionStore = createSelectionStore();
    const changesStore = createStagedChangesStore();

    // User searches for production queues
    searchStore.getState().setSearchQuery('prod');

    // User selects a queue from results
    const filteredPaths = searchStore.getState().filteredPaths;
    if (filteredPaths.length > 0) {
      selectionStore.getState().selectQueue(filteredPaths[0]);
    }

    // User modifies capacity
    const selected = selectionStore.getState().selectedQueuePath;
    if (selected) {
      changesStore.getState().stagePropertyChange(selected, 'capacity', '75');
    }
  });

  bench(`batch modification workflow`, () => {
    const searchStore = createSearchStore(QUEUE_PATHS.largeEnterprise);
    const changesStore = createStagedChangesStore();

    // User filters to specific queues
    searchStore.getState().setSearchQuery('team');

    // User batch modifies all filtered queues
    const filteredPaths = searchStore.getState().filteredPaths;
    filteredPaths.slice(0, 20).forEach((path) => {
      changesStore.getState().stagePropertyChange(path, 'state', 'STOPPED');
    });
  });
});
