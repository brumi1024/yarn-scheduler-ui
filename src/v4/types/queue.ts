import type { ResourceInfo } from './resource';
import type { LabelConfig } from './node-label';
import type { QueueTypeValue, QueueStateValue } from './constants';

export type QueueType = QueueTypeValue;

export type QueueState = QueueStateValue;

export type QueueMetrics = {
    usedCapacity: number;
    absoluteUsedCapacity: number;
    numApplications: number;
    numActiveApplications: number;
    numPendingApplications: number;
    resourcesUsed: ResourceInfo;
};

export type QueueNode = {
    path: string;      // e.g., "root.production"
    name: string;      // e.g., "production"
    type: QueueType;
    properties: Map<string, string>;
    children: QueueNode[];
    metrics?: QueueMetrics;
    labelConfigs: Map<string, LabelConfig>;
};

export type QueueInfo = {
    type: string;
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
    queues?: {
        queue: QueueInfo[];
    };
};