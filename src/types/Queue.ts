export interface Resource {
    memory: number;
    vCores: number;
}

export interface QueueCapacities {
    queueCapacitiesByPartition: Array<{
        partitionName?: string;
        capacity: number;
        usedCapacity: number;
        maxCapacity: number;
        absoluteCapacity: number;
        absoluteUsedCapacity: number;
        absoluteMaxCapacity: number;
        configuredMaxResource?: Resource;
        effectiveMaxResource?: Resource;
    }>;
}

export interface QueueUser {
    username: string;
    resourcesUsed: Resource;
    numActiveApplications: number;
    numPendingApplications: number;
    userResourceLimit?: Resource;
    isActive?: boolean;
}

export interface Queue {
    queueName: string;
    capacity: number;
    usedCapacity: number;
    maxCapacity: number;
    absoluteCapacity: number;
    absoluteUsedCapacity: number;
    absoluteMaxCapacity: number;
    state: 'RUNNING' | 'STOPPED';
    numApplications: number;
    resourcesUsed: Resource;
    capacities?: QueueCapacities;
    users?: {
        user: QueueUser[];
    };
    queues?: {
        queue: Queue[];
    };
    // Additional queue properties
    userLimit?: number;
    userLimitFactor?: number;
    maxApplications?: number;
    maxApplicationsPerUser?: number;
    maxApplicationLifetime?: number;
    defaultApplicationLifetime?: number;
    nodeLabels?: string[];
    accessibleNodeLabels?: string[];
    defaultNodeLabelExpression?: string;
    preemptionDisabled?: boolean;
    intraQueuePreemptionDisabled?: boolean;
    priority?: number;
    orderingPolicy?: string;
    autoCreateChildQueueEnabled?: boolean;
    leafQueueTemplate?: Record<string, string>;
}

export interface SchedulerInfo {
    type: 'capacityScheduler' | 'fairScheduler' | 'fifoScheduler';
    capacity: number;
    usedCapacity: number;
    maxCapacity: number;
    queueName: string;
    queues?: {
        queue: Queue[];
    };
    health?: {
        lastrun: number;
        operationsInfo: {
            operation: Array<{
                operation: string;
                nodeId: string;
                containerId: string;
            }>;
        };
        lastRunDetails: Array<{
            operation: string;
            count: number;
        }>;
    };
}

export interface SchedulerResponse {
    scheduler: {
        schedulerInfo: SchedulerInfo;
    };
}

// Configuration types for parser
export interface Configuration {
    [key: string]: string;
}

export interface CapacityValue {
    mode: 'percentage' | 'weight' | 'absolute';
    value: string;
    numericValue?: number;
    resources?: Record<string, string>;
}

// Parsed queue structure (different from API response Queue)
export interface ParsedQueue {
    name: string;
    path: string;
    parent?: string;
    children: ParsedQueue[];
    isLeaf: boolean;

    // Capacity information
    capacity: CapacityValue;
    maxCapacity: CapacityValue;

    // Basic properties
    state: 'RUNNING' | 'STOPPED';

    // Resource limits
    maxApplications: number;
    maxAMResourcePercent?: number;

    // User limits
    minimumUserLimitPercent: number;
    userLimitFactor: number;

    // Application settings
    maxParallelApps: number;
    priority: number;

    // Access control
    submitACL: string;
    adminACL: string;

    // Node labels
    accessibleNodeLabels: string[];
    defaultNodeLabelExpression?: string;

    // Preemption
    preemptionDisabled: boolean;
    intraQueuePreemptionDisabled: boolean;

    // Raw properties for extensibility
    properties: Record<string, string>;
}
