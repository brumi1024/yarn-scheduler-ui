/**
 * Metadata for node label configurations.
 *
 * Example: To add a new node label property:
 * [`yarn.scheduler.capacity.${Q_PATH_PLACEHOLDER}.accessible-node-labels.new-property`]: {
 *   key: 'new-property',
 *   displayName: 'My New Property',
 *   description: 'Description of the property',
 *   type: 'string',
 * }
 */

const NODE_LABEL_CONFIG_METADATA = {
    [`yarn.scheduler.capacity.${Q_PATH_PLACEHOLDER}.accessible-node-labels`]: {
        key: 'accessible-node-labels',
        displayName: 'Accessible Node Labels',
        description:
            'Comma-separated list of node labels this queue can access. Use "*" for all labels, or leave blank for no explicit labels (inherits parent or default).',
        type: 'string',
        defaultValue: '*',
        semanticRole: 'accessible-node-labels-key',
    },
    perLabelProperties: {
        [`yarn.scheduler.capacity.${Q_PATH_PLACEHOLDER}.accessible-node-labels.<label_name>.capacity`]: {
            key: 'capacity',
            displayName: 'Capacity for Label',
            description: 'Guaranteed capacity for this specific node label (e.g., "100%").',
            type: 'string',
            defaultValue: '100%',
        },
        [`yarn.scheduler.capacity.${Q_PATH_PLACEHOLDER}.accessible-node-labels.<label_name>.maximum-capacity`]: {
            key: 'maximum-capacity',
            displayName: 'Maximum Capacity for Label',
            description: 'Maximum capacity for this specific node label (e.g., "100%").',
            type: 'string',
            defaultValue: '100%',
        },
    },
};
