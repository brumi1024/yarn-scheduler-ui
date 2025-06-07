/**
 * Centralizes property key transformation logic for YARN scheduler configurations.
 * Handles conversion between simple keys, partial keys, and full YARN keys.
 */
const PropertyKeyMapper = {
    /**
     * Maps a simple key to a full YARN property key using queue metadata
     * @param {string} queuePath - Full queue path (e.g., "root.default")
     * @param {string} simpleKey - Simple property key (e.g., "capacity")
     * @returns {string|null} Full YARN key or null if not found in metadata
     */
    toFullKey(queuePath, simpleKey) {
        for (const category of QUEUE_CONFIG_METADATA) {
            for (const placeholderKey in category.properties) {
                if (category.properties[placeholderKey].key === simpleKey) {
                    return placeholderKey.replace(Q_PATH_PLACEHOLDER, queuePath);
                }
            }
        }
        return null;
    },

    /**
     * Extracts the simple key from a full YARN property key
     * @param {string} fullKey - Full YARN key (e.g., "yarn.scheduler.capacity.root.default.capacity")
     * @returns {string|null} Simple key or null if not extractable
     */
    toSimpleKey(fullKey) {
        if (!fullKey || !fullKey.startsWith('yarn.scheduler.capacity.')) {
            return null;
        }

        const withoutPrefix = fullKey.replace('yarn.scheduler.capacity.', '');
        const parts = withoutPrefix.split('.');

        if (parts.length < 2) {
            return null;
        }

        if (
            withoutPrefix.includes('auto-create-child-queue.') ||
            withoutPrefix.includes('auto-queue-creation-v2.') ||
            withoutPrefix.includes('leaf-queue-template.')
        ) {
            let queuePathLength = 0;
            for (let i = 0; i < parts.length; i++) {
                const remainingParts = parts.slice(i);
                const remaining = remainingParts.join('.');

                if (
                    remaining.startsWith('auto-create-child-queue.') ||
                    remaining.startsWith('auto-queue-creation-v2.') ||
                    remaining.startsWith('leaf-queue-template.')
                ) {
                    queuePathLength = i;
                    break;
                }
            }

            if (queuePathLength > 0) {
                return parts.slice(queuePathLength).join('.');
            }
        }
        return parts.at(-1);
    },

    /**
     * Extracts the queue path from a full YARN property key
     * WARNING: This is a best-effort method using metadata patterns.
     * For accurate queue path extraction, use QueueConfigurationManager which has
     * access to the actual queue structure from .queues properties.
     * @param {string} fullKey - Full YARN key
     * @returns {string|null} Queue path or null if not extractable
     */
    extractQueuePath(fullKey) {
        if (!fullKey || !fullKey.startsWith('yarn.scheduler.capacity.')) {
            return null;
        }

        for (const category of QUEUE_CONFIG_METADATA) {
            for (const placeholderKey in category.properties) {
                const pattern = placeholderKey.replace(Q_PATH_PLACEHOLDER, String.raw`([^.]+(?:\.[^.]+)*)`);
                const regex = new RegExp(`^${pattern}$`);
                const match = fullKey.match(regex);
                if (match) {
                    return match[1];
                }
            }
        }
        const withoutPrefix = fullKey.replace('yarn.scheduler.capacity.', '');
        const parts = withoutPrefix.split('.');
        if (parts.length < 2) return null;

        return parts.slice(0, -1).join('.');
    },

    /**
     * Checks if a property is a global (non-queue specific) property
     * @param {string} fullKey - Full YARN key
     * @returns {boolean} True if global property
     */
    isGlobalProperty(fullKey) {
        if (!fullKey || !fullKey.startsWith('yarn.scheduler.capacity.')) {
            return false;
        }

        const withoutPrefix = fullKey.replace('yarn.scheduler.capacity.', '');

        return !withoutPrefix.startsWith('root.');
    },

    /**
     * Converts simple parameters to full YARN keys for a specific queue
     * @param {Object} simpleParams - Object with simple keys
     * @param {string} queuePath - Queue path for conversion
     * @param {string} [selectedPartition] - Selected partition/node label for partition-specific properties
     * @returns {Map<string, string>} Map of full keys to values
     */
    convertToFullKeys(simpleParams, queuePath, selectedPartition = DEFAULT_PARTITION) {
        const fullKeyMap = new Map();

        for (const [simpleKey, value] of Object.entries(simpleParams)) {
            if (simpleKey === '_ui_capacityMode') continue;

            let fullKey;

            if (selectedPartition && selectedPartition !== DEFAULT_PARTITION) {
                // Map partition-specific properties
                if (simpleKey === 'capacity') {
                    fullKey = NodeLabelService.getLabelCapacityKey(queuePath, selectedPartition);
                } else if (simpleKey === 'maximum-capacity') {
                    fullKey = NodeLabelService.getLabelMaxCapacityKey(queuePath, selectedPartition);
                } else {
                    // For other properties, use standard mapping
                    fullKey = this.toFullKey(queuePath, simpleKey);
                }
            } else {
                // Standard mapping for default partition
                fullKey = this.toFullKey(queuePath, simpleKey);
            }

            if (!fullKey) {
                fullKey = `yarn.scheduler.capacity.${queuePath}.${simpleKey}`;
            }

            fullKeyMap.set(fullKey, value);
        }

        return fullKeyMap;
    },

    /**
     * Fallback method that creates a full key when metadata lookup fails
     * @param {string} queuePath - Queue path
     * @param {string} simpleKey - Simple key
     * @returns {string} Full YARN key
     */
    createFullKey(queuePath, simpleKey) {
        return this.toFullKey(queuePath, simpleKey) || `yarn.scheduler.capacity.${queuePath}.${simpleKey}`;
    },
};
