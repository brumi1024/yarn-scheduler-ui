/**
 * @file Metadata for node label configurations associated with a queue.
 * These are typically sub-properties of a queue, like accessible-node-labels and its specific capacities.
 */

const NODE_LABEL_CONFIG_METADATA = {
    // This is the main property listing accessible labels for the queue
    [`yarn.scheduler.capacity.${Q_PATH_PLACEHOLDER}.accessible-node-labels`]: {
        key: 'accessible-node-labels', // Simple key for form data
        displayName: 'Accessible Node Labels',
        description:
            'Comma-separated list of node labels this queue can access. Use "*" for all labels, or leave blank for no explicit labels (inherits parent or default).',
        type: 'string', // Handled as a special input in the Edit Modal
        defaultValue: '*',
    },
    // This defines the structure for per-label properties
    // The placeholder `<label_name>` will be replaced by the actual label.
    perLabelProperties: {
        [`yarn.scheduler.capacity.${Q_PATH_PLACEHOLDER}.accessible-node-labels.<label_name>.capacity`]: {
            key: 'capacity', // Simple key relative to the label, e.g., data-label-key="capacity"
            displayName: 'Capacity for Label', // DisplayName will be prefixed with "Label 'X': "
            description: 'Guaranteed capacity for this specific node label (e.g., "100%").',
            type: 'string', // Usually percentage or absolute
            defaultValue: '100%',
        },
        [`yarn.scheduler.capacity.${Q_PATH_PLACEHOLDER}.accessible-node-labels.<label_name>.maximum-capacity`]: {
            key: 'maximum-capacity',
            displayName: 'Maximum Capacity for Label',
            description: 'Maximum capacity for this specific node label (e.g., "100%").',
            type: 'string',
            defaultValue: '100%',
        },
        // Add other per-label specific properties if they exist or become configurable,
        // e.g., user-limit-factor for a label, max-am-resource-percent for a label.
        // [`yarn.scheduler.capacity.${Q_PATH_PLACEHOLDER}.accessible-node-labels.<label_name>.user-limit-factor`]: {
        //     key: 'user-limit-factor',
        //     displayName: 'User Limit Factor for Label',
        //     type: 'number',
        //     step: '0.1',
        //     defaultValue: '1'
        // },
    },
};
