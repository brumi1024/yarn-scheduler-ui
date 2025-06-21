// src/config/globalProperties.ts

export interface GlobalPropertyDefinition {
    displayName: string;
    type: 'boolean' | 'string' | 'number' | 'select';
    description: string;
    defaultValue?: string;
    options?: Array<{ value: string; label: string }>;
    validation?: {
        min?: number;
        max?: number;
        pattern?: string;
    };
    category: 'core' | 'queue' | 'preemption' | 'locality' | 'resource' | 'security' | 'advanced';
}

export const globalProperties: Record<string, GlobalPropertyDefinition> = {
    'yarn.scheduler.capacity.legacy-queue-mode.enabled': {
        displayName: 'Enable Legacy Queue Mode',
        type: 'boolean',
        category: 'core',
        description:
            'Determines if legacy capacity calculation rules are enforced. Default is true. Disabling allows for more flexible capacity configurations but changes behavior significantly.',
        defaultValue: 'true',
    },
    'yarn.scheduler.capacity.preemption.disabled': {
        displayName: 'Disable Preemption Globally',
        type: 'boolean',
        category: 'preemption',
        description: 'Globally disable or enable preemption. This can be overridden per queue.',
        defaultValue: 'false',
    },
    'yarn.scheduler.capacity.preemption.monitor_policy': {
        displayName: 'Preemption Monitor Policy',
        type: 'select',
        category: 'preemption',
        description: 'Policy for monitoring containers for preemption.',
        defaultValue: 'ProportionalCapacityPreemptionPolicy',
        options: [
            { value: 'ProportionalCapacityPreemptionPolicy', label: 'Proportional Capacity' },
            { value: 'FifoPreemptionPolicy', label: 'FIFO' },
        ],
    },
    'yarn.scheduler.capacity.preemption.monitoring_interval': {
        displayName: 'Preemption Monitoring Interval (ms)',
        type: 'number',
        category: 'preemption',
        description: 'Time interval between preemption policy invocations.',
        defaultValue: '3000',
        validation: { min: 1000, max: 60000 },
    },
    'yarn.scheduler.capacity.preemption.max_wait_before_kill': {
        displayName: 'Max Wait Before Kill (ms)',
        type: 'number',
        category: 'preemption',
        description: 'Maximum time to wait before forcefully killing a container during preemption.',
        defaultValue: '15000',
        validation: { min: 1000, max: 300000 },
    },
    'yarn.scheduler.capacity.resource-calculator': {
        displayName: 'Resource Calculator',
        type: 'select',
        category: 'resource',
        description: 'Class used to calculate resource requirements.',
        defaultValue: 'DefaultResourceCalculator',
        options: [
            { value: 'DefaultResourceCalculator', label: 'Default (Memory Only)' },
            { value: 'DominantResourceCalculator', label: 'Dominant Resource (Memory + CPU)' },
        ],
    },
    'yarn.scheduler.capacity.maximum-applications': {
        displayName: 'Maximum Applications (Global)',
        type: 'number',
        category: 'core',
        description: 'Maximum number of applications that can be pending and running.',
        defaultValue: '10000',
        validation: { min: 1, max: 100000 },
    },
    'yarn.scheduler.capacity.node-locality-delay': {
        displayName: 'Node Locality Delay',
        type: 'number',
        category: 'locality',
        description:
            'Number of missed scheduling opportunities after which the scheduler attempts to schedule rack-local containers. Set to -1 to disable node-locality constraint.',
        defaultValue: '40',
        validation: { min: -1, max: 1000 },
    },
    'yarn.scheduler.capacity.rack-locality-additional-delay': {
        displayName: 'Rack Locality Additional Delay',
        type: 'number',
        category: 'locality',
        description:
            'Number of additional missed scheduling opportunities over node-locality-delay after which the scheduler attempts to schedule off-switch containers.',
        defaultValue: '-1',
        validation: { min: -1, max: 1000 },
    },
    'yarn.scheduler.capacity.queue-mappings': {
        displayName: 'Queue Mappings',
        type: 'string',
        category: 'queue',
        description:
            'A list of mappings that will be used to assign jobs to queues. The syntax for this list is [u|g]:[name]:[queue_name][,next_mapping]*.',
        defaultValue: '',
    },
    'yarn.scheduler.capacity.queue-mappings-override.enable': {
        displayName: 'Enable Queue Mappings Override',
        type: 'boolean',
        category: 'queue',
        description: 'If a queue mapping is present, will it override the value specified by the user?',
        defaultValue: 'false',
    },
    'yarn.scheduler.capacity.per-node-heartbeat.maximum-offswitch-assignments': {
        displayName: 'Maximum Off-switch Assignments Per Heartbeat',
        type: 'number',
        category: 'advanced',
        description: 'Controls the number of OFF_SWITCH assignments allowed during a node heartbeat.',
        defaultValue: '1',
        validation: { min: 1, max: 100 },
    },
    'yarn.scheduler.capacity.application.fail-fast': {
        displayName: 'Application Fail Fast',
        type: 'boolean',
        category: 'advanced',
        description: 'Whether applications should fail fast if submitted to a non-existent queue.',
        defaultValue: 'false',
    },
    'yarn.scheduler.capacity.workflow-priority-mappings-override.enable': {
        displayName: 'Enable Workflow Priority Mappings Override',
        type: 'boolean',
        category: 'advanced',
        description: 'Enable workflow priority mappings override.',
        defaultValue: 'false',
    },

    // === CONTAINER ASSIGNMENT ===
    'yarn.scheduler.capacity.per-node-heartbeat.multiple-assignments-enabled': {
        displayName: 'Enable Multiple Container Assignments',
        type: 'boolean',
        category: 'advanced',
        description: 'Allow multiple container assignments per node heartbeat',
        defaultValue: 'true',
    },

    'yarn.scheduler.capacity.per-node-heartbeat.maximum-container-assignments': {
        displayName: 'Max Container Assignments per Heartbeat',
        type: 'number',
        category: 'advanced',
        description: 'Maximum containers assigned per heartbeat (-1 = unlimited)',
        defaultValue: '100',
        validation: { min: -1, max: 1000 },
    },

    // === USER LIMITS ===
    'yarn.scheduler.capacity.user.max-parallel-apps': {
        displayName: 'Default Max Parallel Apps per User',
        type: 'number',
        category: 'resource',
        description: 'Default maximum parallel applications per user',
        defaultValue: '2147483647',
        validation: { min: 1, max: 2147483647 },
    },

    // === RESERVATION PROPERTIES ===
    'yarn.scheduler.capacity.reservations-continue-look-all-nodes': {
        displayName: 'Continue Looking All Nodes for Reservations',
        type: 'boolean',
        category: 'advanced',
        description: 'Continue looking at all nodes even after reservation limit hit',
        defaultValue: 'true',
    },

    // === MAPPING RULES ===
    'yarn.scheduler.capacity.mapping-rule-format': {
        displayName: 'Mapping Rule Format',
        type: 'select',
        category: 'queue',
        description: 'Format for queue mapping rules',
        defaultValue: 'legacy',
        options: [
            { value: 'legacy', label: 'Legacy Format' },
            { value: 'json', label: 'JSON Format' },
        ],
    },

    'yarn.scheduler.capacity.mapping-rule-json': {
        displayName: 'JSON Mapping Rules',
        type: 'string',
        category: 'queue',
        description: 'Queue mapping rules in JSON format',
        defaultValue: '',
    },

    // === ASYNCHRONOUS SCHEDULING ===
    'yarn.scheduler.capacity.schedule-asynchronously.enable': {
        displayName: 'Enable Asynchronous Scheduling',
        type: 'boolean',
        category: 'advanced',
        description: 'Enable asynchronous scheduling for better performance',
        defaultValue: 'false',
    },

    'yarn.scheduler.capacity.schedule-asynchronously.scheduling-interval-ms': {
        displayName: 'Async Scheduling Interval (ms)',
        type: 'number',
        category: 'advanced',
        description: 'Scheduling interval for async scheduling',
        defaultValue: '5',
        validation: { min: 1, max: 1000 },
    },
};

export const getGlobalPropertyCategories = () => {
    const categories = new Set(Object.values(globalProperties).map((prop) => prop.category));
    return Array.from(categories).sort();
};

export const getGlobalPropertiesByCategory = (category: string) => {
    return Object.entries(globalProperties).filter(([, prop]) => prop.category === category);
};
