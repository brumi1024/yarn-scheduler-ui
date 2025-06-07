/**
 * Centralized service for providing default values for YARN scheduler properties.
 * Single source of truth for all default values, using metadata as the primary source.
 */
class DefaultValueProvider {
    /**
     * Gets the default value for a property from metadata
     * @param {string} queuePath - Queue path (for queue properties)
     * @param {string} simpleKey - Simple property key
     * @returns {string|null} Default value or null if not found
     */
    static getPropertyDefault(queuePath, simpleKey) {
        if (queuePath) {
            const fullKey = PropertyKeyMapper.toFullKey(queuePath, simpleKey);
            if (fullKey) {
                for (const category of QUEUE_CONFIG_METADATA) {
                    for (const placeholderKey in category.properties) {
                        if (placeholderKey.replace(Q_PATH_PLACEHOLDER, queuePath) === fullKey) {
                            return category.properties[placeholderKey].defaultValue || null;
                        }
                    }
                }
            }
        }

        for (const category of GLOBAL_CONFIG_METADATA) {
            for (const key in category.properties) {
                const meta = category.properties[key];
                if (meta.key === simpleKey) {
                    return meta.defaultValue || null;
                }
            }
        }

        return null;
    }

    /**
     * Gets default capacity value for a given mode
     * @param {string} mode - Capacity mode constant
     * @returns {string} Default capacity value
     */
    static getCapacityDefault(mode) {
        return CapacityValueParser.getDefaultValue(mode);
    }

    /**
     * Gets default maximum capacity value
     * @param {string} mode - Capacity mode (for context)
     * @returns {string} Default max capacity value
     */
    static getMaxCapacityDefault(mode) {
        return CapacityValueParser.getDefaultMaxValue(mode);
    }

    /**
     * Checks if a value is using the default
     * @param {string} queuePath - Queue path
     * @param {string} simpleKey - Simple property key
     * @param {string} currentValue - Current value to check
     * @returns {boolean} True if using default value
     */
    static isUsingDefault(queuePath, simpleKey, currentValue) {
        const defaultValue = this.getPropertyDefault(queuePath, simpleKey);

        if (simpleKey === 'capacity') {
            const parsed = CapacityValueParser.parse(currentValue);
            if (parsed.isValid) {
                const mode = parsed.type;
                const capacityDefault = this.getCapacityDefault(mode);
                const parsedDefault = CapacityValueParser.parse(capacityDefault);
                return parsed.value === parsedDefault.value;
            }
        }

        return currentValue === defaultValue || (!currentValue && defaultValue);
    }

    /**
     * Gets all defaults for a queue path as a Map
     * @param {string} queuePath - Queue path
     * @returns {Map<string, string>} Map of simple key to default value
     */
    static getQueueDefaults(queuePath) {
        const defaults = new Map();

        for (const category of QUEUE_CONFIG_METADATA) {
            for (const placeholderKey in category.properties) {
                const meta = category.properties[placeholderKey];
                if (meta.defaultValue !== undefined) {
                    defaults.set(meta.key, meta.defaultValue);
                }
            }
        }

        return defaults;
    }
}
