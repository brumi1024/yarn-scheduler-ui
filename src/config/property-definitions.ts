/**
 * Simplified YARN Configuration Property Definitions
 *
 * Direct TypeScript interfaces for YARN Capacity Scheduler properties.
 * Replaces the complex metadata system with simple, direct definitions.
 */

// Core property types
export type PropertyType = 'string' | 'number' | 'boolean' | 'enum' | 'percentage';

export interface PropertyDefinition {
    key: string;
    displayName: string;
    description: string;
    type: PropertyType;
    defaultValue?: string | number | boolean;
    placeholder?: string;
    options?: string[];
    step?: string;
    required?: boolean;
}

export interface PropertyGroup {
    groupName: string;
    properties: PropertyDefinition[];
}

// Queue Properties
export const QUEUE_PROPERTIES: PropertyGroup[] = [
    {
        groupName: 'Core Properties',
        properties: [
            {
                key: 'capacity',
                displayName: 'Capacity',
                description: 'Guaranteed resource capacity (e.g., "10%", "2w", "[memory=2048,vcores=2]")',
                type: 'string',
                defaultValue: '10%',
                placeholder: 'Default: 10%',
                required: true,
            },
            {
                key: 'maximum-capacity',
                displayName: 'Maximum Capacity',
                description: 'Maximum resource capacity the queue can use',
                type: 'string',
                defaultValue: '100%',
                placeholder: 'Default: 100%',
            },
            {
                key: 'state',
                displayName: 'State',
                description: 'Operational state of the queue',
                type: 'enum',
                options: ['RUNNING', 'STOPPED'],
                defaultValue: 'RUNNING',
            },
        ],
    },
    {
        groupName: 'Resource Limits & Management',
        properties: [
            {
                key: 'user-limit-factor',
                displayName: 'User Limit Factor',
                description: 'Multiplier for per-user resource limits within this queue',
                type: 'number',
                step: '0.1',
                defaultValue: 1,
                placeholder: 'Default: 1',
            },
            {
                key: 'maximum-am-resource-percent',
                displayName: 'Max AM Resource Percent',
                description: "Maximum percentage of this queue's resources for Application Masters",
                type: 'percentage',
                defaultValue: 0.1,
                placeholder: 'Default: 0.1 (10%)',
            },
            {
                key: 'max-parallel-apps',
                displayName: 'Maximum Parallel Apps',
                description: 'Maximum number of applications that can run concurrently in this queue',
                type: 'number',
                placeholder: 'No limit (unlimited)',
            },
        ],
    },
    {
        groupName: 'Advanced Settings',
        properties: [
            {
                key: 'ordering-policy',
                displayName: 'Ordering Policy',
                description: 'Policy for ordering applications',
                type: 'enum',
                options: ['fifo', 'fair'],
                defaultValue: 'fifo',
            },
            {
                key: 'disable_preemption',
                displayName: 'Disable Preemption',
                description: 'Whether preemption is disabled for this queue',
                type: 'boolean',
                defaultValue: false,
            },
        ],
    },
];

// Auto-Queue Creation Properties
export const AUTO_CREATION_PROPERTIES: PropertyDefinition[] = [
    {
        key: 'auto-create-child-queue.enabled',
        displayName: 'Auto-Create Child Queue (v1)',
        description: 'Whether to automatically create child queues when applications are submitted',
        type: 'boolean',
        defaultValue: false,
    },
    {
        key: 'auto-queue-creation-v2.enabled',
        displayName: 'Auto-Queue Creation v2 (Flexible)',
        description: 'Enable flexible auto queue creation mode (only available for weight-based capacity modes)',
        type: 'boolean',
        defaultValue: false,
    },
    {
        key: 'auto-queue-creation-v2.max-queues',
        displayName: 'Max Auto-Created Queues',
        description: 'Maximum number of queues that can be auto-created under this parent queue',
        type: 'number',
        defaultValue: 1000,
        placeholder: 'Default: 1000',
    },
    {
        key: 'leaf-queue-template.capacity',
        displayName: 'Template Queue Capacity',
        description: 'Default capacity for auto-created leaf queues (legacy mode)',
        type: 'string',
        defaultValue: '10%',
        placeholder: 'Default: 10%',
    },
    {
        key: 'leaf-queue-template.maximum-capacity',
        displayName: 'Template Max Capacity',
        description: 'Default maximum capacity for auto-created leaf queues (legacy mode)',
        type: 'string',
        defaultValue: '100%',
        placeholder: 'Default: 100%',
    },
    {
        key: 'leaf-queue-template.user-limit-factor',
        displayName: 'Template User Limit Factor',
        description: 'Default user limit factor for auto-created leaf queues',
        type: 'number',
        defaultValue: 1,
        step: '0.1',
    },
    {
        key: 'leaf-queue-template.ordering-policy',
        displayName: 'Template Ordering Policy',
        description: 'Default ordering policy for auto-created leaf queues',
        type: 'enum',
        options: ['fifo', 'fair'],
        defaultValue: 'fifo',
    },
    {
        key: 'auto-queue-creation-v2.template.capacity',
        displayName: 'V2 Template Capacity',
        description: 'Default capacity for auto-created queues in flexible mode',
        type: 'string',
        defaultValue: '1w',
        placeholder: 'Default: 1w',
    },
    {
        key: 'auto-queue-creation-v2.template.maximum-capacity',
        displayName: 'V2 Template Max Capacity',
        description: 'Default maximum capacity for auto-created queues in flexible mode',
        type: 'string',
        defaultValue: '100%',
        placeholder: 'Default: 100%',
    },
    {
        key: 'auto-queue-creation-v2.parent-template.enabled',
        displayName: 'Enable Parent Template',
        description: 'Allow auto-created queues to become parent queues themselves',
        type: 'boolean',
        defaultValue: false,
    },
];

// Global Properties
export const GLOBAL_PROPERTIES: PropertyGroup[] = [
    {
        groupName: 'General Scheduler Settings',
        properties: [
            {
                key: 'legacy-queue-mode.enabled',
                displayName: 'Legacy Queue Mode',
                description: 'Enforces legacy queue mode for YARN Capacity Scheduler',
                type: 'boolean',
                defaultValue: true,
            },
            {
                key: 'schedule-asynchronously.enable',
                displayName: 'Asynchronous Scheduler',
                description: 'Enables asynchronous scheduling, decoupling from Node Heartbeats',
                type: 'boolean',
                defaultValue: false,
            },
            {
                key: 'node-locality-delay',
                displayName: 'Node Locality Delay',
                description: 'Number of scheduling opportunities missed before relaxing locality to node-local',
                type: 'number',
                defaultValue: 40,
            },
        ],
    },
    {
        groupName: 'Global Application Management',
        properties: [
            {
                key: 'maximum-am-resource-percent',
                displayName: 'Max AM Resource Percent (Global)',
                description: 'Maximum percentage of cluster resources that can be used for Application Masters',
                type: 'percentage',
                defaultValue: 0.1,
            },
            {
                key: 'maximum-applications',
                displayName: 'Maximum Applications (Global)',
                description: 'Total number of applications that can be active or pending in the cluster',
                type: 'number',
                defaultValue: 10000,
            },
        ],
    },
    {
        groupName: 'Global Queue Defaults',
        properties: [
            {
                key: 'user-limit-factor',
                displayName: 'User Limit Factor (Global Default)',
                description: 'Default factor for calculating user resource limits within queues',
                type: 'number',
                step: '0.1',
                defaultValue: 1,
            },
        ],
    },
];

// Node Label Properties
export const NODE_LABEL_PROPERTIES: PropertyDefinition[] = [
    {
        key: 'accessible-node-labels',
        displayName: 'Accessible Node Labels',
        description: 'Comma-separated list of node labels this queue can access',
        type: 'string',
        defaultValue: '*',
        placeholder: 'Use "*" for all labels',
    },
    {
        key: 'capacity',
        displayName: 'Capacity for Label',
        description: 'Guaranteed capacity for this specific node label',
        type: 'string',
        defaultValue: '100%',
    },
    {
        key: 'maximum-capacity',
        displayName: 'Maximum Capacity for Label',
        description: 'Maximum capacity for this specific node label',
        type: 'string',
        defaultValue: '100%',
    },
];

// Scheduler Info Display Fields
export interface InfoField {
    displayName: string;
    unit?: string;
    memory?: { displayName: string; unit: string };
    vCores?: { displayName: string };
}

export const SCHEDULER_INFO_FIELDS: Record<string, InfoField> = {
    queueName: { displayName: 'Queue Name' },
    queuePath: { displayName: 'Queue Path' },
    state: { displayName: 'State' },
    type: { displayName: 'Queue Type' },
    capacity: { displayName: 'Effective Capacity', unit: '%' },
    usedCapacity: { displayName: 'Used Capacity', unit: '%' },
    maxCapacity: { displayName: 'Effective Max Capacity', unit: '%' },
    absoluteCapacity: { displayName: 'Absolute Capacity', unit: '%' },
    absoluteMaxCapacity: { displayName: 'Absolute Max Capacity', unit: '%' },
    absoluteUsedCapacity: { displayName: 'Absolute Used Capacity', unit: '%' },
    numApplications: { displayName: 'Total Applications' },
    maxParallelApps: { displayName: 'Max Parallel Apps' },
    resourcesUsed: {
        displayName: 'Resources Used',
        memory: { displayName: 'Memory Used', unit: 'MB' },
        vCores: { displayName: 'VCores Used' },
    },
    mode: { displayName: 'Capacity Mode' },
    weight: { displayName: 'Weight' },
    normalizedWeight: { displayName: 'Normalized Weight' },
    numActiveApplications: { displayName: 'Active Applications' },
    numPendingApplications: { displayName: 'Pending Applications' },
    numContainers: { displayName: 'Total Containers' },
    allocatedContainers: { displayName: 'Allocated Containers' },
    reservedContainers: { displayName: 'Reserved Containers' },
    pendingContainers: { displayName: 'Pending Containers' },
    maxApplications: { displayName: 'Max Applications (Queue Limit)' },
    userLimitFactor: { displayName: 'User Limit Factor' },
    defaultPartitionEffectiveMinResource: {
        displayName: 'Default Partition Effective Min Resource',
        memory: { displayName: 'Memory', unit: 'MB' },
        vCores: { displayName: 'VCores' },
    },
    defaultPartitionEffectiveMaxResource: {
        displayName: 'Default Partition Effective Max Resource',
        memory: { displayName: 'Memory', unit: 'MB' },
        vCores: { displayName: 'VCores' },
    },
};

// Helper functions for working with properties
export function findPropertyByKey(key: string): PropertyDefinition | undefined {
    // Search in queue properties
    for (const group of QUEUE_PROPERTIES) {
        const property = group.properties.find((p) => p.key === key);
        if (property) return property;
    }

    // Search in auto-creation properties
    const autoProperty = AUTO_CREATION_PROPERTIES.find((p) => p.key === key);
    if (autoProperty) return autoProperty;

    // Search in global properties
    for (const group of GLOBAL_PROPERTIES) {
        const property = group.properties.find((p) => p.key === key);
        if (property) return property;
    }

    // Search in node label properties
    const nodeLabelProperty = NODE_LABEL_PROPERTIES.find((p) => p.key === key);
    if (nodeLabelProperty) return nodeLabelProperty;

    return undefined;
}

export function getAllQueueProperties(): PropertyDefinition[] {
    const allProperties: PropertyDefinition[] = [];

    // Add all queue properties
    for (const group of QUEUE_PROPERTIES) {
        allProperties.push(...group.properties);
    }

    // Add auto-creation properties
    allProperties.push(...AUTO_CREATION_PROPERTIES);

    return allProperties;
}

export function getAllGlobalProperties(): PropertyDefinition[] {
    const allProperties: PropertyDefinition[] = [];

    for (const group of GLOBAL_PROPERTIES) {
        allProperties.push(...group.properties);
    }

    return allProperties;
}
