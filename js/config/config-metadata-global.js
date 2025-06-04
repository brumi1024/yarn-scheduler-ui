/**
 * @file Metadata for global scheduler configurations.
 * Defines properties, display names, types, descriptions, and default values
 * for settings that apply to the entire scheduler.
 */

const GLOBAL_CONFIG_METADATA = [
    {
        groupName: 'General Scheduler Settings',
        properties: {
            'yarn.scheduler.capacity.schedule-asynchronously.enable': {
                displayName: 'Asynchronous Scheduler',
                description:
                    'Enabling this option decouples the scheduling from Node Heartbeats, significantly improving latency.',
                type: 'boolean',
                defaultValue: 'false',
            },
            'yarn.scheduler.capacity.node-locality-delay': {
                displayName: 'Node Locality Delay',
                description:
                    'Number of scheduling opportunities missed before relaxing locality to node-local. Set to -1 for off.',
                type: 'number',
                defaultValue: '40',
            },
            // Add other global properties here as needed
        },
    },
    {
        groupName: 'Global Application Management',
        properties: {
            'yarn.scheduler.capacity.maximum-am-resource-percent': {
                displayName: 'Max AM Resource Percent (Global)',
                description:
                    'Maximum percentage of cluster resources that can be used for Application Masters. Applies if not overridden by queue-specific settings.',
                type: 'percentage', // Input type number, step 0.01, min 0, max 1
                defaultValue: '0.1',
            },
            'yarn.scheduler.capacity.maximum-applications': {
                displayName: 'Maximum Applications (Global)',
                description: 'Total number of applications that can be active or pending in the cluster.',
                type: 'number',
                defaultValue: '10000',
            },
        },
    },
    {
        groupName: 'Global Queue Defaults', // These are typically YARN-wide defaults affecting queues
        properties: {
            'yarn.scheduler.capacity.user-limit-factor': {
                displayName: 'User Limit Factor (Global Default)',
                description:
                    'Default factor for calculating user resource limits within queues. Queues can override this.',
                type: 'number',
                step: '0.1',
                defaultValue: '1',
            },
        },
    },
];
