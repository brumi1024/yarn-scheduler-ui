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

// Configuration property
export interface ConfigProperty {
    name: string;
    value: string;
}

// Parsed queue for internal use
export interface ParsedQueue {
    name: string;
    path: string;
    parent?: string;
    children: ParsedQueue[];
    capacity: string; // Raw capacity value like "50%", "2w", "[memory=1024,vcores=2]"
    maxCapacity: string;
    state: 'RUNNING' | 'STOPPED';
    properties: Record<string, string>; // All raw properties
}

// Scheduler response structure
export interface SchedulerResponse {
    scheduler: {
        schedulerInfo: Queue & {
            type: 'capacityScheduler' | 'fairScheduler' | 'fifoScheduler';
        };
    };
}

// Configuration response structure
export interface ConfigurationResponse {
    property: ConfigProperty[];
}
