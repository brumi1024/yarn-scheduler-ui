/**
 * Metadata for auto queue creation configurations.
 *
 * Example: To add a new auto-creation property:
 * [`yarn.scheduler.capacity.${Q_PATH_PLACEHOLDER}.auto-create-child-queue.new-property`]: {
 *   key: 'auto-create-child-queue.new-property',
 *   displayName: 'My New Property',
 *   description: 'Description of the property',
 *   type: 'string',
 *   v2Property: false,
 * }
 */

const AUTO_CREATION_CONFIG_METADATA = {
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
};
