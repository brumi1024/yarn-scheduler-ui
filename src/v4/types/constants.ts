// YARN Queue States
export const QUEUE_STATES = {
    RUNNING: 'RUNNING',
    STOPPED: 'STOPPED',
    DRAINING: 'DRAINING',
} as const;

export type QueueStateValue = typeof QUEUE_STATES[keyof typeof QUEUE_STATES];

// YARN Queue Types
export const QUEUE_TYPES = {
    LEAF: 'leaf',
    PARENT: 'parent',
} as const;

export type QueueTypeValue = typeof QUEUE_TYPES[keyof typeof QUEUE_TYPES];

// YARN Scheduler Types
export const SCHEDULER_TYPES = {
    CAPACITY: 'capacityScheduler',
    FAIR: 'fairScheduler',
} as const;

export type SchedulerTypeValue = typeof SCHEDULER_TYPES[keyof typeof SCHEDULER_TYPES];

// YARN Queue Info Types (from API responses)
export const QUEUE_INFO_TYPES = {
    LEAF: 'capacitySchedulerLeafQueueInfo',
    PARENT: 'capacitySchedulerQueueInfo',
} as const;

export type QueueInfoTypeValue = typeof QUEUE_INFO_TYPES[keyof typeof QUEUE_INFO_TYPES];

// YARN Configuration Property Prefixes
export const CONFIG_PREFIXES = {
    BASE: 'yarn.scheduler.capacity',
    ROOT_QUEUE: 'yarn.scheduler.capacity.root',
} as const;

// YARN Global Configuration Properties
export const GLOBAL_CONFIG_PROPS = {
    MAXIMUM_APPLICATIONS: 'maximum-applications',
    MAXIMUM_AM_RESOURCE_PERCENT: 'maximum-am-resource-percent',
    RESOURCE_CALCULATOR: 'resource-calculator',
    USER_METRICS_ENABLE: 'user-metrics.enable',
    QUEUE_MAPPINGS_OVERRIDE_ENABLE: 'queue-mappings-override.enable',
    PER_NODE_HEARTBEAT_MAX_OFFSWITCH_ASSIGNMENTS: 'per-node-heartbeat.maximum-offswitch-assignments',
} as const;

// YARN Queue Configuration Properties
export const QUEUE_CONFIG_PROPS = {
    CAPACITY: 'capacity',
    MAXIMUM_CAPACITY: 'maximum-capacity',
    USER_LIMIT_FACTOR: 'user-limit-factor',
    MINIMUM_USER_LIMIT_PERCENT: 'minimum-user-limit-percent',
    MAXIMUM_APPLICATIONS: 'maximum-applications',
    MAXIMUM_APPLICATIONS_PER_USER: 'maximum-applications-per-user',
    STATE: 'state',
    QUEUES: 'queues',
    ACL_SUBMIT_APPLICATIONS: 'acl-submit-applications',
    ACL_ADMINISTER_QUEUE: 'acl-administer-queue',
    ORDERING_POLICY: 'ordering-policy',
    PRIORITY: 'priority',
    INTRA_QUEUE_PREEMPTION_DISABLED: 'intra-queue-preemption-disabled',
    ACCESSIBLE_NODE_LABELS: 'accessible-node-labels',
    DEFAULT_NODE_LABEL_EXPRESSION: 'default-node-label-expression',
    MAXIMUM_AM_RESOURCE_PERCENT: 'maximum-am-resource-percent',
} as const;

// YARN Auto-Creation Properties
export const AUTO_CREATION_PROPS = {
    ELIGIBILITY: 'autoCreationEligibility',
    ELIGIBILITY_OFF: 'off',
    ELIGIBILITY_LEGACY: 'legacy',
    ELIGIBILITY_FLEXIBLE: 'flexible',
} as const;

// YARN Resource Types
export const RESOURCE_TYPES = {
    COUNTABLE: 'COUNTABLE',
} as const;

// YARN Resource Units
export const RESOURCE_UNITS = {
    MEMORY: 'Mi',
    VCORES: '',
    GPU: 'gpu',
} as const;

// YARN Resource Names
export const RESOURCE_NAMES = {
    MEMORY_MB: 'memory-mb',
    VCORES: 'vcores',
    GPU: 'gpu',
    FPGA: 'fpga',
} as const;

// YARN Ordering Policies
export const ORDERING_POLICIES = {
    FIFO: 'fifo',
    FAIR: 'fair',
} as const;

// YARN ACL Types
export const ACL_TYPES = {
    SUBMIT_APP: 'SUBMIT_APP',
    ADMINISTER_QUEUE: 'ADMINISTER_QUEUE',
} as const;

// YARN Exception Types
export const EXCEPTION_TYPES = {
    YARN_EXCEPTION: 'YarnException',
    ACCESS_CONTROL_EXCEPTION: 'AccessControlException',
} as const;

// YARN Mutation Operation Types
export const MUTATION_OPERATIONS = {
    ADD_QUEUE: 'add-queue',
    UPDATE_QUEUE: 'update-queue',
    REMOVE_QUEUE: 'remove-queue',
    GLOBAL_UPDATES: 'global-updates',
} as const;

// YARN API Endpoints
export const API_ENDPOINTS = {
    SCHEDULER: '/ws/v1/cluster/scheduler',
    SCHEDULER_CONF: '/ws/v1/cluster/scheduler-conf',
    SCHEDULER_CONF_VALIDATE: '/ws/v1/cluster/scheduler-conf/validate',
    NODE_LABELS_GET: '/ws/v1/cluster/get-node-labels',
    NODE_LABELS_ADD: '/ws/v1/cluster/add-node-labels',
    NODE_LABELS_REMOVE: '/ws/v1/cluster/remove-node-labels',
    NODE_TO_LABELS: '/ws/v1/cluster/get-node-to-labels',
} as const;

// YARN Special Values
export const SPECIAL_VALUES = {
    ROOT_QUEUE_NAME: 'root',
    GLOBAL_QUEUE_PATH: 'global',
    ALL_USERS_ACL: '*',
    DEFAULT_PARTITION: '',
} as const;

// Helper function to build full property path
export function buildPropertyPath(queuePath: string, property: string): string {
    return `${CONFIG_PREFIXES.BASE}.${queuePath}.${property}`;
}

// Helper function to check if a property is global
export function isGlobalPropertyName(property: string): boolean {
    return Object.values(GLOBAL_CONFIG_PROPS).includes(property as any);
}

// Helper function to extract queue path from property name
export function extractQueuePathFromProperty(propertyName: string): { queuePath: string; property: string } | null {
    if (!propertyName.startsWith(CONFIG_PREFIXES.BASE)) {
        return null;
    }
    
    const remainder = propertyName.substring(CONFIG_PREFIXES.BASE.length + 1);
    const lastDotIndex = remainder.lastIndexOf('.');
    
    if (lastDotIndex === -1) {
        // This might be a global property
        return { queuePath: SPECIAL_VALUES.GLOBAL_QUEUE_PATH, property: remainder };
    }
    
    return {
        queuePath: remainder.substring(0, lastDotIndex),
        property: remainder.substring(lastDotIndex + 1),
    };
}

// Simple validation functions (only used at API boundaries or user input)
export function validateQueueName(name: string): void {
    if (!name || name.trim() !== name) {
        throw new Error('Queue name cannot be empty or have leading/trailing spaces');
    }
    if (name.includes('.')) {
        throw new Error('Queue names cannot contain dots');
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
        throw new Error('Queue name must contain only alphanumeric characters, hyphens, and underscores');
    }
}