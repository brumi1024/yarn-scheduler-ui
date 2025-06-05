/**
 * @file Metadata for auto queue creation configurations.
 * Template properties are dynamically generated from QUEUE_CONFIG_METADATA based on availableInTemplate flag.
 */

const AUTO_CREATION_CONFIG_METADATA = {
    // v1 auto-creation toggle
    [`yarn.scheduler.capacity.${Q_PATH_PLACEHOLDER}.auto-create-child-queue.enabled`]: {
        key: 'auto-create-child-queue.enabled',
        displayName: 'Auto-Create Child Queue (v1)',
        description: 'Whether to automatically create child queues when applications are submitted to children of this queue.',
        type: 'boolean',
        v2Property: false, // v1 property
    },
    
    // v2 auto-creation toggle
    [`yarn.scheduler.capacity.${Q_PATH_PLACEHOLDER}.auto-queue-creation-v2.enabled`]: {
        key: 'auto-queue-creation-v2.enabled',
        displayName: 'Auto-Queue Creation v2 (Flexible)',
        description: 'Enable flexible auto queue creation mode (only available for weight-based capacity modes).',
        type: 'boolean',
        v2Property: true, // v2 property
    },
    
    // v2-specific non-template properties
    [`yarn.scheduler.capacity.${Q_PATH_PLACEHOLDER}.auto-queue-creation-v2.max-queues`]: {
        key: 'auto-queue-creation-v2.max-queues',
        displayName: 'Max Auto-Created Queues',
        description: 'Maximum number of queues that can be auto-created under this parent queue.',
        type: 'number',
        placeholder: 'Default: 1000',
        v2Property: true, // Only available in v2 mode
    },
    
    // Template configurations are dynamically generated from QUEUE_CONFIG_METADATA
    // v1 uses: yarn.scheduler.capacity.<queue-path>.leaf-queue-template.<property>
    // v2 uses: 
    //   - yarn.scheduler.capacity.<queue-path>.auto-queue-creation-v2.template.<property>
    //   - yarn.scheduler.capacity.<queue-path>.auto-queue-creation-v2.parent-template.<property>
    //   - yarn.scheduler.capacity.<queue-path>.auto-queue-creation-v2.leaf-template.<property>
};