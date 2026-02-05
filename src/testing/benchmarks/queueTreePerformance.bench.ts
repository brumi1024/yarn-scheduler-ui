/**
 * Queue Tree Transformation Performance Benchmarks
 *
 * Benchmarks for measuring queue tree transformation, layout calculation,
 * and search filtering performance at scale.
 *
 * Run with: npx vitest bench src/testing/benchmarks/queueTreePerformance.bench.ts
 */

import { bench, describe } from 'vitest';
import { DagreLayout } from '~/features/queue-management/utils/DagreLayout';
import { QUEUE_CARD_HEIGHT, QUEUE_CARD_WIDTH } from '~/features/queue-management/constants';
import {
  generateMockScheduler,
  calculateExpectedQueueCount,
  PRESET_CONFIGS,
  type QueueGeneratorOptions,
} from '~/testing/utils/generateMockQueues';
import type { QueueInfo } from '~/types';

// Pre-generate test data to avoid including generation time in benchmarks
const MOCK_DATA = {
  baseline: generateMockScheduler({ ...PRESET_CONFIGS.baseline, seed: 1 }),
  enterprise: generateMockScheduler({ ...PRESET_CONFIGS.enterprise, seed: 2 }),
  largeEnterprise: generateMockScheduler({ ...PRESET_CONFIGS.largeEnterprise, seed: 3 }),
  stress: generateMockScheduler({ ...PRESET_CONFIGS.stress, seed: 4 }),
};

// Create a root QueueInfo from scheduler response for layout testing
function createRootQueueInfo(scheduler: ReturnType<typeof generateMockScheduler>): QueueInfo {
  const info = scheduler.scheduler.schedulerInfo;
  return {
    queueType: 'parent',
    capacity: info.capacity,
    usedCapacity: info.usedCapacity,
    maxCapacity: info.maxCapacity,
    absoluteCapacity: info.capacity,
    absoluteMaxCapacity: info.maxCapacity,
    absoluteUsedCapacity: info.usedCapacity,
    numApplications: 0,
    numActiveApplications: 0,
    numPendingApplications: 0,
    queueName: 'root',
    queuePath: 'root',
    state: 'RUNNING',
    queues: info.queues,
  };
}

const ROOT_QUEUES = {
  baseline: createRootQueueInfo(MOCK_DATA.baseline),
  enterprise: createRootQueueInfo(MOCK_DATA.enterprise),
  largeEnterprise: createRootQueueInfo(MOCK_DATA.largeEnterprise),
  stress: createRootQueueInfo(MOCK_DATA.stress),
};

// Layout engine instance
const layoutEngine = new DagreLayout({
  nodeWidth: QUEUE_CARD_WIDTH,
  nodeHeight: QUEUE_CARD_HEIGHT,
  horizontalSpacing: 120,
  verticalSpacing: 80,
  orientation: 'horizontal',
});

/**
 * Flatten queue tree to array (simulates part of useQueueTreeData transformation)
 */
function flattenQueueTree(queue: QueueInfo): QueueInfo[] {
  const result: QueueInfo[] = [queue];

  if (queue.queues?.queue) {
    const children = Array.isArray(queue.queues.queue) ? queue.queues.queue : [queue.queues.queue];

    for (const child of children) {
      result.push(...flattenQueueTree(child));
    }
  }

  return result;
}

/**
 * Simple search filter simulation
 */
function filterQueues(queues: QueueInfo[], query: string): QueueInfo[] {
  const lowerQuery = query.toLowerCase();
  return queues.filter(
    (q) =>
      q.queueName.toLowerCase().includes(lowerQuery) ||
      q.queuePath.toLowerCase().includes(lowerQuery),
  );
}

describe('Queue Tree Transformation Performance', () => {
  const baselineCount = calculateExpectedQueueCount(PRESET_CONFIGS.baseline);
  const enterpriseCount = calculateExpectedQueueCount(PRESET_CONFIGS.enterprise);
  const largeCount = calculateExpectedQueueCount(PRESET_CONFIGS.largeEnterprise);
  const stressCount = calculateExpectedQueueCount(PRESET_CONFIGS.stress);

  bench(`flatten ${baselineCount} queues (baseline)`, () => {
    flattenQueueTree(ROOT_QUEUES.baseline);
  });

  bench(`flatten ${enterpriseCount} queues (enterprise)`, () => {
    flattenQueueTree(ROOT_QUEUES.enterprise);
  });

  bench(`flatten ${largeCount} queues (large enterprise)`, () => {
    flattenQueueTree(ROOT_QUEUES.largeEnterprise);
  });

  bench(`flatten ${stressCount} queues (stress)`, () => {
    flattenQueueTree(ROOT_QUEUES.stress);
  });
});

describe('Dagre Layout Performance', () => {
  const baselineCount = calculateExpectedQueueCount(PRESET_CONFIGS.baseline);
  const enterpriseCount = calculateExpectedQueueCount(PRESET_CONFIGS.enterprise);
  const largeCount = calculateExpectedQueueCount(PRESET_CONFIGS.largeEnterprise);
  const stressCount = calculateExpectedQueueCount(PRESET_CONFIGS.stress);

  bench(`layout ${baselineCount} nodes (baseline)`, () => {
    layoutEngine.calculatePositions(ROOT_QUEUES.baseline);
  });

  bench(`layout ${enterpriseCount} nodes (enterprise)`, () => {
    layoutEngine.calculatePositions(ROOT_QUEUES.enterprise);
  });

  bench(`layout ${largeCount} nodes (large enterprise)`, () => {
    layoutEngine.calculatePositions(ROOT_QUEUES.largeEnterprise);
  });

  bench(`layout ${stressCount} nodes (stress)`, () => {
    layoutEngine.calculatePositions(ROOT_QUEUES.stress);
  });
});

describe('Search Filter Performance', () => {
  // Pre-flatten queues for search benchmarks
  const flattenedQueues = {
    baseline: flattenQueueTree(ROOT_QUEUES.baseline),
    enterprise: flattenQueueTree(ROOT_QUEUES.enterprise),
    largeEnterprise: flattenQueueTree(ROOT_QUEUES.largeEnterprise),
    stress: flattenQueueTree(ROOT_QUEUES.stress),
  };

  const baselineCount = flattenedQueues.baseline.length;
  const enterpriseCount = flattenedQueues.enterprise.length;
  const largeCount = flattenedQueues.largeEnterprise.length;
  const stressCount = flattenedQueues.stress.length;

  bench(`filter ${baselineCount} queues (baseline)`, () => {
    filterQueues(flattenedQueues.baseline, 'prod');
  });

  bench(`filter ${enterpriseCount} queues (enterprise)`, () => {
    filterQueues(flattenedQueues.enterprise, 'prod');
  });

  bench(`filter ${largeCount} queues (large enterprise)`, () => {
    filterQueues(flattenedQueues.largeEnterprise, 'prod');
  });

  bench(`filter ${stressCount} queues (stress)`, () => {
    filterQueues(flattenedQueues.stress, 'prod');
  });

  // Test with longer query strings
  bench(`filter ${largeCount} queues with long query`, () => {
    filterQueues(flattenedQueues.largeEnterprise, 'engineering.alpha');
  });

  // Test with no matches
  bench(`filter ${largeCount} queues with no match`, () => {
    filterQueues(flattenedQueues.largeEnterprise, 'nonexistent-queue-xyz');
  });
});

describe('Combined Transformation Pipeline', () => {
  const enterpriseCount = calculateExpectedQueueCount(PRESET_CONFIGS.enterprise);
  const largeCount = calculateExpectedQueueCount(PRESET_CONFIGS.largeEnterprise);

  bench(`full pipeline ${enterpriseCount} queues (flatten + layout)`, () => {
    flattenQueueTree(ROOT_QUEUES.enterprise);
    layoutEngine.calculatePositions(ROOT_QUEUES.enterprise);
  });

  bench(`full pipeline ${largeCount} queues (flatten + layout)`, () => {
    flattenQueueTree(ROOT_QUEUES.largeEnterprise);
    layoutEngine.calculatePositions(ROOT_QUEUES.largeEnterprise);
  });

  bench(`full pipeline ${largeCount} queues with search`, () => {
    const flattened = flattenQueueTree(ROOT_QUEUES.largeEnterprise);
    layoutEngine.calculatePositions(ROOT_QUEUES.largeEnterprise);
    filterQueues(flattened, 'prod');
  });
});
