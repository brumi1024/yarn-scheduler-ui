/**
 * Large Dataset Integration Tests
 *
 * Tests that verify the application can handle large queue hierarchies
 * within acceptable performance bounds.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { DagreLayout } from '~/features/queue-management/utils/DagreLayout';
import { QUEUE_CARD_HEIGHT, QUEUE_CARD_WIDTH } from '~/features/queue-management/constants';
import {
  generateMockScheduler,
  generateMockSchedulerConf,
  calculateExpectedQueueCount,
  countQueues,
  PRESET_CONFIGS,
} from '~/testing/utils/generateMockQueues';
import type { QueueInfo } from '~/types';

// Performance thresholds (in milliseconds)
// Note: These thresholds are generous to account for CI/system load variance
const THRESHOLDS = {
  treeTransformation: 100, // <100ms for transformation
  layoutCalculation: 300, // <300ms for layout (dagre is computationally intensive)
  searchFilter: 50, // <50ms for search
  fullPipeline: 600, // <600ms for complete transformation pipeline
};

// Create a root QueueInfo from scheduler response
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

// Flatten queue tree
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

// Search filter
function filterQueues(queues: QueueInfo[], query: string): QueueInfo[] {
  const lowerQuery = query.toLowerCase();
  return queues.filter(
    (q) =>
      q.queueName.toLowerCase().includes(lowerQuery) ||
      q.queuePath.toLowerCase().includes(lowerQuery),
  );
}

describe('Mock Data Generation', () => {
  it('generates correct queue count for baseline config', () => {
    const expected = calculateExpectedQueueCount(PRESET_CONFIGS.baseline);
    const scheduler = generateMockScheduler(PRESET_CONFIGS.baseline);
    const actual = countQueues(scheduler);

    // Allow small variance due to naming collisions
    expect(actual).toBeGreaterThan(expected * 0.9);
    expect(actual).toBeLessThanOrEqual(expected);
  });

  it('generates correct queue count for enterprise config', () => {
    const expected = calculateExpectedQueueCount(PRESET_CONFIGS.enterprise);
    const scheduler = generateMockScheduler(PRESET_CONFIGS.enterprise);
    const actual = countQueues(scheduler);

    expect(actual).toBeGreaterThan(expected * 0.9);
    expect(actual).toBeLessThanOrEqual(expected);
  });

  it('generates correct queue count for large enterprise config', () => {
    const expected = calculateExpectedQueueCount(PRESET_CONFIGS.largeEnterprise);
    const scheduler = generateMockScheduler(PRESET_CONFIGS.largeEnterprise);
    const actual = countQueues(scheduler);

    expect(actual).toBeGreaterThan(expected * 0.9);
    expect(actual).toBeLessThanOrEqual(expected);
  });

  it('generates deterministic output with seed', () => {
    const scheduler1 = generateMockScheduler({ ...PRESET_CONFIGS.baseline, seed: 42 });
    const scheduler2 = generateMockScheduler({ ...PRESET_CONFIGS.baseline, seed: 42 });

    expect(JSON.stringify(scheduler1)).toBe(JSON.stringify(scheduler2));
  });

  it('generates matching scheduler conf', () => {
    const options = { ...PRESET_CONFIGS.baseline, seed: 123 };
    const scheduler = generateMockScheduler(options);
    const conf = generateMockSchedulerConf(options);

    // Verify root queues property exists
    const rootQueuesProperty = conf.property.find(
      (p) => p.name === 'yarn.scheduler.capacity.root.queues',
    );
    expect(rootQueuesProperty).toBeDefined();

    // Verify queue count matches
    const queueCount = countQueues(scheduler);
    const capacityProperties = conf.property.filter(
      (p) => p.name.includes('.capacity') && !p.name.includes('maximum-capacity'),
    );
    // Account for root.queues and partition properties
    expect(capacityProperties.length).toBeGreaterThanOrEqual(queueCount - 1);
  });

  it('includes partition data when specified', () => {
    const scheduler = generateMockScheduler({
      ...PRESET_CONFIGS.baseline,
      includePartitions: ['gpu', 'fpga'],
    });

    const rootQueues = scheduler.scheduler.schedulerInfo.queues?.queue ?? [];
    const firstQueue = rootQueues[0];

    expect(firstQueue.nodeLabels).toContain('gpu');
    expect(firstQueue.nodeLabels).toContain('fpga');
    expect(firstQueue.capacities?.queueCapacitiesByPartition).toBeDefined();
  });
});

describe('Large Dataset Tree Transformation Performance', () => {
  let enterpriseScheduler: ReturnType<typeof generateMockScheduler>;
  let largeEnterpriseScheduler: ReturnType<typeof generateMockScheduler>;
  let stressScheduler: ReturnType<typeof generateMockScheduler>;

  beforeAll(() => {
    enterpriseScheduler = generateMockScheduler(PRESET_CONFIGS.enterprise);
    largeEnterpriseScheduler = generateMockScheduler(PRESET_CONFIGS.largeEnterprise);
    stressScheduler = generateMockScheduler(PRESET_CONFIGS.stress);
  });

  it('transforms enterprise dataset within threshold', () => {
    const root = createRootQueueInfo(enterpriseScheduler);

    const start = performance.now();
    const flattened = flattenQueueTree(root);
    const duration = performance.now() - start;

    expect(flattened.length).toBeGreaterThan(200);
    expect(duration).toBeLessThan(THRESHOLDS.treeTransformation);
  });

  it('transforms large enterprise dataset within threshold', () => {
    const root = createRootQueueInfo(largeEnterpriseScheduler);

    const start = performance.now();
    const flattened = flattenQueueTree(root);
    const duration = performance.now() - start;

    expect(flattened.length).toBeGreaterThan(500);
    expect(duration).toBeLessThan(THRESHOLDS.treeTransformation);
  });

  it('transforms stress dataset within extended threshold', () => {
    const root = createRootQueueInfo(stressScheduler);

    const start = performance.now();
    const flattened = flattenQueueTree(root);
    const duration = performance.now() - start;

    expect(flattened.length).toBeGreaterThan(1000);
    // Allow 2x threshold for stress test
    expect(duration).toBeLessThan(THRESHOLDS.treeTransformation * 2);
  });
});

describe('Large Dataset Layout Performance', () => {
  let layoutEngine: DagreLayout;
  let enterpriseRoot: QueueInfo;
  let largeEnterpriseRoot: QueueInfo;

  beforeAll(() => {
    layoutEngine = new DagreLayout({
      nodeWidth: QUEUE_CARD_WIDTH,
      nodeHeight: QUEUE_CARD_HEIGHT,
      horizontalSpacing: 120,
      verticalSpacing: 80,
      orientation: 'horizontal',
    });

    enterpriseRoot = createRootQueueInfo(generateMockScheduler(PRESET_CONFIGS.enterprise));
    largeEnterpriseRoot = createRootQueueInfo(
      generateMockScheduler(PRESET_CONFIGS.largeEnterprise),
    );
  });

  it('calculates layout for enterprise dataset within threshold', () => {
    const start = performance.now();
    const positions = layoutEngine.calculatePositions(enterpriseRoot);
    const duration = performance.now() - start;

    expect(positions.size).toBeGreaterThan(200);
    expect(duration).toBeLessThan(THRESHOLDS.layoutCalculation);
  });

  it('calculates layout for large enterprise dataset within threshold', () => {
    const start = performance.now();
    const positions = layoutEngine.calculatePositions(largeEnterpriseRoot);
    const duration = performance.now() - start;

    expect(positions.size).toBeGreaterThan(500);
    expect(duration).toBeLessThan(THRESHOLDS.layoutCalculation);
  });

  it('produces valid positions for all nodes', () => {
    const positions = layoutEngine.calculatePositions(largeEnterpriseRoot);

    positions.forEach((pos, _path) => {
      expect(pos.x).toBeGreaterThanOrEqual(0);
      expect(pos.y).toBeGreaterThanOrEqual(0);
      expect(pos.width).toBe(QUEUE_CARD_WIDTH);
      expect(pos.height).toBe(QUEUE_CARD_HEIGHT);
    });
  });

  it('maintains parent-child relationships in layout', () => {
    const positions = layoutEngine.calculatePositions(enterpriseRoot);

    // Root should be leftmost
    const rootPos = positions.get('root');
    expect(rootPos).toBeDefined();

    // All children should be to the right of root (horizontal layout)
    positions.forEach((pos, path) => {
      if (path !== 'root' && rootPos) {
        expect(pos.x).toBeGreaterThan(rootPos.x);
      }
    });
  });
});

describe('Large Dataset Search Performance', () => {
  let largeDataset: QueueInfo[];

  beforeAll(() => {
    const scheduler = generateMockScheduler(PRESET_CONFIGS.largeEnterprise);
    const root = createRootQueueInfo(scheduler);
    largeDataset = flattenQueueTree(root);
  });

  it('filters large dataset within threshold', () => {
    const start = performance.now();
    const filtered = filterQueues(largeDataset, 'prod');
    const duration = performance.now() - start;

    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.length).toBeLessThan(largeDataset.length);
    expect(duration).toBeLessThan(THRESHOLDS.searchFilter);
  });

  it('handles empty query efficiently', () => {
    const start = performance.now();
    const filtered = filterQueues(largeDataset, '');
    const duration = performance.now() - start;

    expect(filtered.length).toBe(largeDataset.length);
    expect(duration).toBeLessThan(THRESHOLDS.searchFilter);
  });

  it('handles no-match query efficiently', () => {
    const start = performance.now();
    const filtered = filterQueues(largeDataset, 'nonexistent-queue-xyz-123');
    const duration = performance.now() - start;

    expect(filtered.length).toBe(0);
    expect(duration).toBeLessThan(THRESHOLDS.searchFilter);
  });

  it('handles complex path query', () => {
    const start = performance.now();
    filterQueues(largeDataset, 'root.engineering.alpha');
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(THRESHOLDS.searchFilter);
  });
});

describe('Full Pipeline Performance', () => {
  it('completes full transformation pipeline within threshold', () => {
    const scheduler = generateMockScheduler(PRESET_CONFIGS.largeEnterprise);
    const layoutEngine = new DagreLayout({
      nodeWidth: QUEUE_CARD_WIDTH,
      nodeHeight: QUEUE_CARD_HEIGHT,
      horizontalSpacing: 120,
      verticalSpacing: 80,
      orientation: 'horizontal',
    });

    const start = performance.now();

    // Simulate full pipeline
    const root = createRootQueueInfo(scheduler);
    const flattened = flattenQueueTree(root);
    const positions = layoutEngine.calculatePositions(root);
    const filtered = filterQueues(flattened, 'prod');

    const duration = performance.now() - start;

    expect(flattened.length).toBeGreaterThan(500);
    expect(positions.size).toBeGreaterThan(500);
    expect(filtered.length).toBeGreaterThan(0);
    expect(duration).toBeLessThan(THRESHOLDS.fullPipeline);
  });
});
