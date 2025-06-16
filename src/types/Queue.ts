// Runtime queue data from YARN API
export interface Queue {
    queueName: string;
    queuePath?: string; // Full path like root.production.team1
    capacity: number;
    usedCapacity: number;
    maxCapacity: number;
    absoluteCapacity: number;
    absoluteUsedCapacity: number;
    absoluteMaxCapacity: number;
    state: 'RUNNING' | 'STOPPED';
    numApplications: number;
    resourcesUsed: {
        memory: number;
        vCores: number;
    };
    queues?: {
        queue: Queue[];
    };

    // Optional fields
    userLimitFactor?: number;
    maxApplications?: number;
    maxApplicationsPerUser?: number;
    nodeLabels?: string[];
    accessibleNodeLabels?: string[];
    preemptionDisabled?: boolean;
    priority?: number;
    orderingPolicy?: string;
    autoCreateChildQueueEnabled?: boolean;
}

// Resource structure
export interface Resource {
    memory: number;
    vCores: number;
}

// Configuration property
export interface ConfigProperty {
    name: string;
    value: string;
}

// Capacity value structure
export interface CapacityValue {
    mode: 'percentage' | 'weight' | 'absolute';
    value: string;
    numericValue?: number;
    resources?: Record<string, string>;
}

// Parsed queue for internal use
export interface ParsedQueue {
    name: string;
    path: string;
    parent?: string;
    children: ParsedQueue[];
    capacity: CapacityValue;
    maxCapacity: CapacityValue;
    state: 'RUNNING' | 'STOPPED';
    properties: Record<string, string>; // All raw properties

    // Additional properties that tests expect
    isLeaf?: boolean;
    maxApplications?: number;
    maxAMResourcePercent?: number;
    minimumUserLimitPercent?: number;
    userLimitFactor?: number;
    priority?: number;
    submitACL?: string;
    adminACL?: string;
    preemptionDisabled?: boolean;
    accessibleNodeLabels?: string[];
    defaultNodeLabelExpression?: string;
}

// Scheduler response structure
export interface SchedulerResponse {
    scheduler: {
        schedulerInfo: Queue & {
            type: 'capacityScheduler' | 'fairScheduler' | 'fifoScheduler';
        };
    };
}

// Configuration flat format (used by ConfigParser)
export interface Configuration {
    [key: string]: string;
}

// Configuration response structure
export interface ConfigurationResponse {
    property: ConfigProperty[];
}
