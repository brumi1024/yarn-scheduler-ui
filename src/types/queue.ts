import type { ResourceInfo } from './resource';
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
    queues?: {
        queue: QueueInfo[];
    };
};

