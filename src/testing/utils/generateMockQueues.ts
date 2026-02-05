/**
 * Mock data generator for large queue hierarchies
 *
 * Generates realistic YARN scheduler data for performance testing with
 * configurable tree depth and branching factor.
 */

import type { QueueInfo, QueueState, QueueType, ResourceInfo, ConfigProperty } from '~/types';
import type { SchedulerResponse, SchedulerConfResponse } from '~/types/api';
import type { SchedulerInfo } from '~/types/scheduler';

export interface QueueGeneratorOptions {
  /** Tree depth (1-5 levels) */
  depth: number;
  /** Children per non-leaf queue (2-10) */
  childrenPerParent: number;
  /** Node labels/partitions to include */
  includePartitions?: string[];
  /** Whether to include memory/vCores data */
  includeResources?: boolean;
  /** Seed for deterministic generation */
  seed?: number;
}

interface GeneratorState {
  queueCount: number;
  random: () => number;
}

const TEAM_NAMES = [
  'alpha',
  'beta',
  'gamma',
  'delta',
  'epsilon',
  'zeta',
  'eta',
  'theta',
  'iota',
  'kappa',
];
const DEPT_NAMES = [
  'engineering',
  'analytics',
  'ml',
  'data',
  'platform',
  'infra',
  'services',
  'core',
  'frontend',
  'backend',
];
const PROJECT_NAMES = [
  'prod',
  'staging',
  'dev',
  'test',
  'sandbox',
  'experimental',
  'batch',
  'realtime',
  'adhoc',
  'scheduled',
];

/**
 * Simple seeded random number generator (Mulberry32)
 */
function createSeededRandom(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateQueueName(depth: number, index: number, _state: GeneratorState): string {
  const nameSets = [PROJECT_NAMES, DEPT_NAMES, TEAM_NAMES];
  const nameSet = nameSets[depth % nameSets.length];
  const baseName = nameSet[index % nameSet.length];
  const suffix = Math.floor(index / nameSet.length);
  return suffix > 0 ? `${baseName}${suffix}` : baseName;
}

function generateResourceInfo(state: GeneratorState): ResourceInfo {
  return {
    memory: Math.floor(state.random() * 100000),
    vCores: Math.floor(state.random() * 100),
  };
}

function generateQueueInfo(
  parentPath: string,
  name: string,
  depth: number,
  maxDepth: number,
  childrenPerParent: number,
  state: GeneratorState,
  options: QueueGeneratorOptions,
): QueueInfo {
  const queuePath = parentPath ? `${parentPath}.${name}` : name;
  const isLeaf = depth >= maxDepth;
  state.queueCount++;

  // Distribute capacity evenly among siblings
  const capacity = 100 / childrenPerParent;
  const usedCapacity = state.random() * capacity * 0.8; // 0-80% utilization

  const queue: QueueInfo = {
    queueType: (isLeaf ? 'leaf' : 'parent') as QueueType,
    queueName: name,
    queuePath,
    capacity,
    maxCapacity: 100,
    usedCapacity,
    absoluteCapacity: capacity,
    absoluteMaxCapacity: 100,
    absoluteUsedCapacity: usedCapacity,
    numApplications: isLeaf ? Math.floor(state.random() * 50) : 0,
    numActiveApplications: isLeaf ? Math.floor(state.random() * 30) : 0,
    numPendingApplications: isLeaf ? Math.floor(state.random() * 20) : 0,
    state: (state.random() > 0.1 ? 'RUNNING' : 'STOPPED') as QueueState,
  };

  if (options.includeResources) {
    queue.resourcesUsed = generateResourceInfo(state);
  }

  if (options.includePartitions && options.includePartitions.length > 0) {
    queue.nodeLabels = options.includePartitions;
    queue.capacities = {
      queueCapacitiesByPartition: [
        {
          partitionName: '',
          capacity,
          maxCapacity: 100,
          usedCapacity,
          absoluteCapacity: capacity,
          absoluteMaxCapacity: 100,
          absoluteUsedCapacity: usedCapacity,
        },
        ...options.includePartitions.map((label) => ({
          partitionName: label,
          capacity,
          maxCapacity: 100,
          usedCapacity: state.random() * capacity * 0.5,
          absoluteCapacity: capacity,
          absoluteMaxCapacity: 100,
          absoluteUsedCapacity: state.random() * capacity * 0.5,
        })),
      ],
    };
  }

  // Generate children if not at max depth
  if (!isLeaf) {
    const children: QueueInfo[] = [];
    for (let i = 0; i < childrenPerParent; i++) {
      const childName = generateQueueName(depth + 1, i, state);
      children.push(
        generateQueueInfo(
          queuePath,
          childName,
          depth + 1,
          maxDepth,
          childrenPerParent,
          state,
          options,
        ),
      );
    }
    queue.queues = { queue: children };
  }

  return queue;
}

/**
 * Generates a mock SchedulerResponse with a large queue hierarchy
 */
export function generateMockScheduler(options: QueueGeneratorOptions): SchedulerResponse {
  const { depth, childrenPerParent } = options;

  const state: GeneratorState = {
    queueCount: 0,
    random: createSeededRandom(options.seed ?? 12345),
  };

  // Generate child queues under root
  const childQueues: QueueInfo[] = [];
  for (let i = 0; i < childrenPerParent; i++) {
    const childName = generateQueueName(1, i, state);
    childQueues.push(
      generateQueueInfo('root', childName, 1, depth, childrenPerParent, state, options),
    );
  }

  const schedulerInfo: SchedulerInfo = {
    type: 'capacityScheduler',
    capacity: 100,
    usedCapacity: state.random() * 80,
    maxCapacity: 100,
    queueName: 'root',
    queues: { queue: childQueues },
  };

  return {
    scheduler: {
      schedulerInfo,
    },
  };
}

/**
 * Flattens a queue tree into an array of queue paths
 */
export function flattenQueuePaths(queue: QueueInfo, paths: string[] = []): string[] {
  paths.push(queue.queuePath);
  if (queue.queues?.queue) {
    for (const child of queue.queues.queue) {
      flattenQueuePaths(child, paths);
    }
  }
  return paths;
}

/**
 * Generates a mock SchedulerConfResponse matching the queue hierarchy
 */
export function generateMockSchedulerConf(options: QueueGeneratorOptions): SchedulerConfResponse {
  const scheduler = generateMockScheduler(options);
  const properties: ConfigProperty[] = [];
  const childQueues = scheduler.scheduler.schedulerInfo.queues?.queue ?? [];

  // Root queues property
  const rootQueueNames = childQueues.map((q) => q.queueName);
  properties.push({
    name: 'yarn.scheduler.capacity.root.queues',
    value: rootQueueNames.join(','),
  });

  // Generate properties for each queue
  function generateQueueProperties(queue: QueueInfo) {
    const prefix = `yarn.scheduler.capacity.${queue.queuePath}`;

    properties.push(
      { name: `${prefix}.capacity`, value: String(queue.capacity) },
      { name: `${prefix}.maximum-capacity`, value: String(queue.maxCapacity) },
      { name: `${prefix}.state`, value: queue.state },
    );

    if (queue.queues?.queue) {
      const childNames = queue.queues.queue.map((q) => q.queueName);
      properties.push({
        name: `${prefix}.queues`,
        value: childNames.join(','),
      });

      for (const child of queue.queues.queue) {
        generateQueueProperties(child);
      }
    }

    // Add partition-specific properties
    if (options.includePartitions) {
      properties.push({
        name: `${prefix}.accessible-node-labels`,
        value: options.includePartitions.join(','),
      });

      for (const label of options.includePartitions) {
        properties.push(
          {
            name: `${prefix}.accessible-node-labels.${label}.capacity`,
            value: String(queue.capacity),
          },
          { name: `${prefix}.accessible-node-labels.${label}.maximum-capacity`, value: '100' },
        );
      }
    }
  }

  for (const queue of childQueues) {
    generateQueueProperties(queue);
  }

  // Add version property
  properties.push({
    name: 'yarn.webservice.mutation-api.version',
    value: String(Date.now()),
  });

  return { property: properties };
}

/**
 * Counts total queues in a scheduler response
 */
export function countQueues(scheduler: SchedulerResponse): number {
  let count = 1; // root

  function countChildren(queue: QueueInfo) {
    count++;
    if (queue.queues?.queue) {
      for (const child of queue.queues.queue) {
        countChildren(child);
      }
    }
  }

  const rootQueues = scheduler.scheduler.schedulerInfo.queues?.queue ?? [];
  for (const queue of rootQueues) {
    countChildren(queue);
  }

  return count - 1; // subtract the extra count from root
}

/**
 * Preset configurations for common test scenarios
 */
export const PRESET_CONFIGS = {
  /** 50 queues - baseline for comparison */
  baseline: { depth: 3, childrenPerParent: 3 } as QueueGeneratorOptions,

  /** 200 queues - typical enterprise (~195 queues: 4^1 + 4^2 + 4^3 + 4^4 = 340, adjusted) */
  enterprise: { depth: 4, childrenPerParent: 4 } as QueueGeneratorOptions,

  /** 500 queues - large enterprise */
  largeEnterprise: { depth: 4, childrenPerParent: 5 } as QueueGeneratorOptions,

  /** 1000 queues - stress test */
  stress: { depth: 5, childrenPerParent: 4 } as QueueGeneratorOptions,
} as const;

/**
 * Calculate expected queue count for given options
 * Formula: sum of childrenPerParent^i for i from 1 to depth
 */
export function calculateExpectedQueueCount(options: QueueGeneratorOptions): number {
  let total = 0;
  for (let i = 1; i <= options.depth; i++) {
    total += Math.pow(options.childrenPerParent, i);
  }
  return total;
}
