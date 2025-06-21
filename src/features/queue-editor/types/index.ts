// This file consolidates all queue-editor specific types

import { Queue } from '../../../types/Queue';
import { PropertyDefinition } from '../../../config/properties';

export interface QueueChild {
    queueName: string;
    capacity: number;
    state?: 'RUNNING' | 'STOPPED';
    maxCapacity?: number;
    numApplications?: number;
}

export interface PropertyGroup {
    name: string;
    properties: PropertyDefinition[];
    collapsed?: boolean;
}

export interface QueueMetrics {
    usedCapacity: number;
    absoluteUsedCapacity: number;
    absoluteCapacity: number;
    absoluteMaxCapacity: number;
    numApplications: number;
    numActiveApplications: number;
    numPendingApplications: number;
}

export interface ChildQueueInfo {
    queueName: string;
    capacity: number;
    state?: 'RUNNING' | 'STOPPED';
    numApplications?: number;
}

// Re-export commonly used types
export type { Queue, PropertyDefinition };