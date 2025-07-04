export const QUEUE_STATES = {
    RUNNING: 'RUNNING',
    STOPPED: 'STOPPED',
    DRAINING: 'DRAINING',
} as const;

export type QueueStateValue = typeof QUEUE_STATES[keyof typeof QUEUE_STATES];

export const QUEUE_TYPES = {
    LEAF: 'leaf',
    PARENT: 'parent',
} as const;

export type QueueTypeValue = typeof QUEUE_TYPES[keyof typeof QUEUE_TYPES];

export const SCHEDULER_TYPES = {
    CAPACITY: 'capacityScheduler',
    FAIR: 'fairScheduler',
} as const;

export type SchedulerTypeValue = typeof SCHEDULER_TYPES[keyof typeof SCHEDULER_TYPES];

export const QUEUE_INFO_TYPES = {
    LEAF: 'capacitySchedulerLeafQueueInfo',
    PARENT: 'capacitySchedulerQueueInfo',
} as const;

export type QueueInfoTypeValue = typeof QUEUE_INFO_TYPES[keyof typeof QUEUE_INFO_TYPES];

export const CONFIG_PREFIXES = {
    BASE: 'yarn.scheduler.capacity',
    ROOT_QUEUE: 'yarn.scheduler.capacity.root',
} as const;

export const GLOBAL_CONFIG_PROPS = {
    MAXIMUM_APPLICATIONS: 'maximum-applications',
    MAXIMUM_AM_RESOURCE_PERCENT: 'maximum-am-resource-percent',
    RESOURCE_CALCULATOR: 'resource-calculator',
    USER_METRICS_ENABLE: 'user-metrics.enable',
    QUEUE_MAPPINGS_OVERRIDE_ENABLE: 'queue-mappings-override.enable',
    PER_NODE_HEARTBEAT_MAX_OFFSWITCH_ASSIGNMENTS: 'per-node-heartbeat.maximum-offswitch-assignments',
} as const;


export const AUTO_CREATION_PROPS = {
    ELIGIBILITY: 'autoCreationEligibility',
    ELIGIBILITY_OFF: 'off',
    ELIGIBILITY_LEGACY: 'legacy',
    ELIGIBILITY_FLEXIBLE: 'flexible',
    LEGACY_ENABLED: 'auto-create-child-queue.enabled',
    FLEXIBLE_ENABLED: 'auto-queue-creation-v2.enabled',
} as const;

export const EXCEPTION_TYPES = {
    YARN_EXCEPTION: 'YarnException',
    ACCESS_CONTROL_EXCEPTION: 'AccessControlException',
} as const;

export const MUTATION_OPERATIONS = {
    ADD_QUEUE: 'add-queue',
    UPDATE_QUEUE: 'update-queue',
    REMOVE_QUEUE: 'remove-queue',
    GLOBAL_UPDATES: 'global-updates',
} as const;

export const API_ENDPOINTS = {
    SCHEDULER: '/ws/v1/cluster/scheduler',
    SCHEDULER_CONF: '/ws/v1/cluster/scheduler-conf',
    SCHEDULER_CONF_VALIDATE: '/ws/v1/cluster/scheduler-conf/validate',
    NODE_LABELS_GET: '/ws/v1/cluster/get-node-labels',
    NODE_LABELS_ADD: '/ws/v1/cluster/add-node-labels',
    NODE_LABELS_REMOVE: '/ws/v1/cluster/remove-node-labels',
    NODE_TO_LABELS: '/ws/v1/cluster/get-node-to-labels',
} as const;

export const SPECIAL_VALUES = {
    ROOT_QUEUE_NAME: 'root',
    GLOBAL_QUEUE_PATH: 'global',
    ALL_USERS_ACL: '*',
    DEFAULT_PARTITION: '',
} as const;




