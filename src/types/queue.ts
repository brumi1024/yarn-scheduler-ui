import type { ResourceInfo } from './resource';
import type { QueueTypeValue, QueueStateValue } from './constants';
import type { QueueAcl } from './scheduler';

export type QueueType = QueueTypeValue;

export type QueueState = QueueStateValue;

export type QueueCreationMethod = 'static' | 'dynamicLegacy' | 'dynamicFlexible';

export type QueueMetrics = {
  usedCapacity: number;
  absoluteUsedCapacity: number;
  numApplications: number;
  numActiveApplications: number;
  numPendingApplications: number;
  resourcesUsed: ResourceInfo;
};

export type ResourceUsageByPartition = {
  partitionName: string;
  amLimit?: ResourceInfo;
  amUsed?: ResourceInfo;
  pending?: ResourceInfo;
  reserved?: ResourceInfo;
  used?: ResourceInfo;
};

export type QueueCapacityByPartition = {
  partitionName: string;
  capacity?: number;
  maxCapacity?: number;
  usedCapacity?: number;
  absoluteCapacity?: number;
  absoluteMaxCapacity?: number;
  absoluteUsedCapacity?: number;
  weight?: number;
  normalizedWeight?: number;
  maxAMLimitPercentage?: number;
  configuredMaxResource?: ResourceInfo;
  configuredMinResource?: ResourceInfo;
  effectiveMaxResource?: ResourceInfo;
  effectiveMinResource?: ResourceInfo;
  queueCapacityVectorInfo?: Record<string, unknown>;
};

export type QueueInfo = {
  queueType: QueueType;
  capacity: number;
  usedCapacity: number;
  maxCapacity: number;
  absoluteCapacity: number;
  absoluteMaxCapacity: number;
  absoluteUsedCapacity: number;
  numApplications: number;
  numActiveApplications: number;
  numPendingApplications: number;
  resourcesUsed?: ResourceInfo;
  queueName: string;
  queuePath: string;
  state: QueueState;
  autoCreationEligibility?: string;
  creationMethod?: QueueCreationMethod;
  queues?: {
    queue: QueueInfo[];
  };

  // Container metrics
  numContainers?: number;
  allocatedContainers?: number;
  pendingContainers?: number;
  reservedContainers?: number;

  // Resource limits
  AMResourceLimit?: ResourceInfo;
  configuredMaxAMResourceLimit?: number;
  maximumAllocation?: ResourceInfo;
  userAMResourceLimit?: ResourceInfo;
  amUsedResource?: ResourceInfo;

  // Application limits
  maxApplications?: number;
  maxApplicationsPerUser?: number;
  maxParallelApps?: number;
  numSchedulableApplications?: number;
  numNonSchedulableApplications?: number;

  // Capacity details
  maxEffectiveCapacity?: ResourceInfo;
  minEffectiveCapacity?: ResourceInfo;
  normalizedWeight?: number;
  isAbsoluteResource?: boolean;
  effectiveMinResource?: ResourceInfo;
  effectiveMaxResource?: ResourceInfo;

  // Policies
  preemptionDisabled?: boolean;
  intraQueuePreemptionDisabled?: boolean;
  orderingPolicy?: string;
  queueAcls?: {
    queueAcl: QueueAcl[];
  };

  // Priority
  defaultPriority?: number;
  queuePriority?: number;

  // Node labels
  nodeLabels?: string[];
  defaultNodeLabelExpression?: string;

  // Per-partition resources
  resources?: {
    resourceUsagesByPartition?: ResourceUsageByPartition[];
  };
  capacities?: {
    queueCapacitiesByPartition?: QueueCapacityByPartition[];
  };

  // Lifecycle
  defaultApplicationLifetime?: number;
  maxApplicationLifetime?: number;
};
