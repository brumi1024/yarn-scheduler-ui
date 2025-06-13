import type { ConfigGroup } from './types';
import { Q_PATH_PLACEHOLDER } from './types';
import { AUTO_CREATION_CONFIG_METADATA } from './auto-creation-metadata';

export const QUEUE_CONFIG_METADATA: ConfigGroup[] = [
    {
        groupName: 'Core Properties',
        properties: {
            [`yarn.scheduler.capacity.${Q_PATH_PLACEHOLDER}.capacity`]: {
                key: 'capacity',
                displayName: 'Capacity',
                description:
                    'Guaranteed resource capacity (e.g., "10%", "2w", "[memory=2048,vcores=2]"). Format depends on selected Capacity Mode.',
                type: 'string',
                defaultValue: '10%',
                placeholder: 'Default: 10%',
                availableInTemplate: true,
            },
            [`yarn.scheduler.capacity.${Q_PATH_PLACEHOLDER}.maximum-capacity`]: {
                key: 'maximum-capacity',
                displayName: 'Maximum Capacity',
                description: 'Maximum resource capacity the queue can use (e.g., "100%", "[memory=4096,vcores=4]").',
                type: 'string',
                defaultValue: '100%',
                placeholder: 'Default: 100%',
                availableInTemplate: true,
            },
            [`yarn.scheduler.capacity.${Q_PATH_PLACEHOLDER}.state`]: {
                key: 'state',
                displayName: 'State',
                description: 'Operational state of the queue.',
                type: 'enum',
                options: ['RUNNING', 'STOPPED'],
                defaultValue: 'RUNNING',
                availableInTemplate: false,
            },
        },
    },
    {
        groupName: 'Resource Limits & Management',
        properties: {
            [`yarn.scheduler.capacity.${Q_PATH_PLACEHOLDER}.user-limit-factor`]: {
                key: 'user-limit-factor',
                displayName: 'User Limit Factor',
                description: 'Multiplier for per-user resource limits within this queue.',
                type: 'number',
                step: '0.1',
                defaultValue: '1',
                placeholder: 'Default: 1',
                availableInTemplate: true,
            },
            [`yarn.scheduler.capacity.${Q_PATH_PLACEHOLDER}.maximum-am-resource-percent`]: {
                key: 'maximum-am-resource-percent',
                displayName: 'Max AM Resource Percent',
                description:
                    "Maximum percentage of this queue's resources for Application Masters (e.g., 0.1 for 10%).",
                type: 'percentage',
                defaultValue: '0.1',
                placeholder: 'Default: 0.1 (10%)',
                availableInTemplate: true,
            },
            [`yarn.scheduler.capacity.${Q_PATH_PLACEHOLDER}.max-parallel-apps`]: {
                key: 'max-parallel-apps',
                displayName: 'Maximum Parallel Apps',
                description: 'Maximum number of applications that can run concurrently in this queue.',
                type: 'number',
                defaultValue: '',
                placeholder: 'No limit (unlimited)',
                availableInTemplate: false,
            },
        },
    },
    {
        groupName: 'Advanced Settings',
        properties: {
            [`yarn.scheduler.capacity.${Q_PATH_PLACEHOLDER}.ordering-policy`]: {
                key: 'ordering-policy',
                displayName: 'Ordering Policy',
                description: 'Policy for ordering applications (e.g., fifo, fair, utilization).',
                type: 'enum',
                options: ['fifo', 'fair'],
                defaultValue: 'fifo',
                availableInTemplate: true,
            },
            [`yarn.scheduler.capacity.${Q_PATH_PLACEHOLDER}.disable_preemption`]: {
                key: 'disable_preemption',
                displayName: 'Disable Preemption',
                description: 'Whether preemption is disabled for this queue.',
                type: 'boolean',
                defaultValue: 'false',
                availableInTemplate: false,
            },
        },
    },
    {
        groupName: 'Auto-Queue Creation',
        properties: AUTO_CREATION_CONFIG_METADATA,
    },
];
