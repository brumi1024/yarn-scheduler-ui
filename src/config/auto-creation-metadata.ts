import type { ConfigProperty } from './types';
import { Q_PATH_PLACEHOLDER } from './types';

export const AUTO_CREATION_CONFIG_METADATA: Record<string, ConfigProperty> = {
    [`yarn.scheduler.capacity.${Q_PATH_PLACEHOLDER}.auto-create-child-queue.enabled`]: {
        key: 'auto-create-child-queue.enabled',
        displayName: 'Auto-Create Child Queue (v1)',
        description:
            'Whether to automatically create child queues when applications are submitted to children of this queue.',
        type: 'boolean',
        v2Property: false,
        semanticRole: 'v1-enabled-key',
    },

    [`yarn.scheduler.capacity.${Q_PATH_PLACEHOLDER}.auto-queue-creation-v2.enabled`]: {
        key: 'auto-queue-creation-v2.enabled',
        displayName: 'Auto-Queue Creation v2 (Flexible)',
        description: 'Enable flexible auto queue creation mode (only available for weight-based capacity modes).',
        type: 'boolean',
        v2Property: true,
        semanticRole: 'v2-enabled-key',
    },

    [`yarn.scheduler.capacity.${Q_PATH_PLACEHOLDER}.auto-queue-creation-v2.max-queues`]: {
        key: 'auto-queue-creation-v2.max-queues',
        displayName: 'Max Auto-Created Queues',
        description: 'Maximum number of queues that can be auto-created under this parent queue.',
        type: 'number',
        placeholder: 'Default: 1000',
        v2Property: true,
    },

    // Legacy v1 template properties
    [`yarn.scheduler.capacity.${Q_PATH_PLACEHOLDER}.leaf-queue-template.capacity`]: {
        key: 'leaf-queue-template.capacity',
        displayName: 'Template Queue Capacity',
        description: 'Default capacity for auto-created leaf queues (legacy mode).',
        type: 'string',
        defaultValue: '10%',
        placeholder: 'Default: 10%',
        v2Property: false,
    },

    [`yarn.scheduler.capacity.${Q_PATH_PLACEHOLDER}.leaf-queue-template.maximum-capacity`]: {
        key: 'leaf-queue-template.maximum-capacity',
        displayName: 'Template Max Capacity',
        description: 'Default maximum capacity for auto-created leaf queues (legacy mode).',
        type: 'string',
        defaultValue: '100%',
        placeholder: 'Default: 100%',
        v2Property: false,
    },

    [`yarn.scheduler.capacity.${Q_PATH_PLACEHOLDER}.leaf-queue-template.user-limit-factor`]: {
        key: 'leaf-queue-template.user-limit-factor',
        displayName: 'Template User Limit Factor',
        description: 'Default user limit factor for auto-created leaf queues.',
        type: 'number',
        defaultValue: '1',
        step: '0.1',
        v2Property: false,
    },

    [`yarn.scheduler.capacity.${Q_PATH_PLACEHOLDER}.leaf-queue-template.ordering-policy`]: {
        key: 'leaf-queue-template.ordering-policy',
        displayName: 'Template Ordering Policy',
        description: 'Default ordering policy for auto-created leaf queues.',
        type: 'enum',
        options: ['fifo', 'fair'],
        defaultValue: 'fifo',
        v2Property: false,
    },

    // V2 template properties
    [`yarn.scheduler.capacity.${Q_PATH_PLACEHOLDER}.auto-queue-creation-v2.template.capacity`]: {
        key: 'auto-queue-creation-v2.template.capacity',
        displayName: 'V2 Template Capacity',
        description: 'Default capacity for auto-created queues in flexible mode.',
        type: 'string',
        defaultValue: '1w',
        placeholder: 'Default: 1w',
        v2Property: true,
    },

    [`yarn.scheduler.capacity.${Q_PATH_PLACEHOLDER}.auto-queue-creation-v2.template.maximum-capacity`]: {
        key: 'auto-queue-creation-v2.template.maximum-capacity',
        displayName: 'V2 Template Max Capacity',
        description: 'Default maximum capacity for auto-created queues in flexible mode.',
        type: 'string',
        defaultValue: '100%',
        placeholder: 'Default: 100%',
        v2Property: true,
    },

    [`yarn.scheduler.capacity.${Q_PATH_PLACEHOLDER}.auto-queue-creation-v2.parent-template.enabled`]: {
        key: 'auto-queue-creation-v2.parent-template.enabled',
        displayName: 'Enable Parent Template',
        description: 'Allow auto-created queues to become parent queues themselves.',
        type: 'boolean',
        defaultValue: 'false',
        v2Property: true,
    },
};
