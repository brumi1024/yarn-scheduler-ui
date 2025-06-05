/**
 * Centralizes capacity value parsing, validation, and formatting logic.
 * Handles percentage, weight, and absolute resource capacity formats.
 */
class CapacityValueParser {
    /**
     * Parses a capacity value string and determines its type
     * @param {string} value - Capacity value (e.g., "50", "3w", "[memory=4096,vcores=4]")
     * @returns {Object} Parsed result with type, value, unit, and validation info
     */
    static parse(value) {
        if (!value || typeof value !== 'string') {
            return {
                type: null,
                value: null,
                unit: null,
                isValid: false,
                error: 'Invalid or empty capacity value'
            };
        }

        const trimmedValue = value.trim();

        if (trimmedValue.endsWith('w')) {
            return this._parseWeight(trimmedValue);
        }

        if (trimmedValue.startsWith('[') && trimmedValue.endsWith(']')) {
            return this._parseAbsolute(trimmedValue);
        }

        return this._parsePercentage(trimmedValue);
    }

    /**
     * Formats a parsed capacity value back to string representation
     * @param {Object} parsedValue - Result from parse() method
     * @returns {string} Formatted capacity string
     */
    static format(parsedValue) {
        if (!parsedValue || !parsedValue.isValid) {
            return '';
        }

        switch (parsedValue.type) {
            case CAPACITY_MODES.WEIGHT:
                return `${parsedValue.value}w`;
            case CAPACITY_MODES.ABSOLUTE:
            case CAPACITY_MODES.VECTOR:
                return parsedValue.originalValue || parsedValue.value;
            case CAPACITY_MODES.PERCENTAGE:
            default:
                return String(parsedValue.value);
        }
    }

    /**
     * Validates a capacity value for a specific mode
     * @param {string} value - Capacity value string
     * @param {string} mode - Expected capacity mode
     * @param {boolean} allowEmpty - Whether empty values are allowed
     * @returns {Object} Validation result with errors array
     */
    static validate(value, mode, allowEmpty = false) {
        if (!value || value.trim() === '') {
            if (allowEmpty) {
                return { isValid: true, value: '', errors: [] };
            }
            return { isValid: false, value: null, errors: ['Capacity value is required'] };
        }

        const parsed = this.parse(value);
        if (!parsed.isValid) {
            return { isValid: false, value: null, errors: [parsed.error] };
        }

        const errors = [];

        if (mode && parsed.type !== mode) {
            errors.push(`Expected ${mode} capacity, got ${parsed.type}`);
        }

        if (parsed.type === CAPACITY_MODES.PERCENTAGE) {
            if (parsed.value < 0 || parsed.value > 100) {
                errors.push('Percentage capacity must be between 0 and 100');
            }
        }

        // TODO is 0 weight allowed?
        if (parsed.type === CAPACITY_MODES.WEIGHT) {
            if (parsed.value <= 0) {
                errors.push('Weight capacity must be greater than 0');
            }
        }

        return {
            isValid: errors.length === 0,
            value: errors.length === 0 ? this.format(parsed) : null,
            errors
        };
    }

    /**
     * Determines the effective capacity mode from queue properties
     * @param {string} queuePath - Queue path
     * @param {Map} properties - Queue properties map
     * @returns {string} Capacity mode constant
     */
    static determineMode(queuePath, properties) {
        const capacityKey = PropertyKeyMapper.createFullKey(queuePath, 'capacity');
        const capacityValue = properties.get(capacityKey);
        
        if (!capacityValue) {
            return CAPACITY_MODES.PERCENTAGE;
        }

        const parsed = this.parse(capacityValue);
        return parsed.type || CAPACITY_MODES.PERCENTAGE;
    }

    /**
     * Gets default capacity value for a given mode
     * @param {string} mode - Capacity mode
     * @returns {string} Default value
     */
    static getDefaultValue(mode) {
        switch (mode) {
            case CAPACITY_MODES.WEIGHT:
                return '1w';
            case CAPACITY_MODES.ABSOLUTE:
                return '[memory=1024,vcores=1]';
            case CAPACITY_MODES.VECTOR:
                return '[memory=50%,vcores=2]';
            case CAPACITY_MODES.PERCENTAGE:
            default:
                return '10';
        }
    }

    /**
     * Gets default maximum capacity value (usually percentage)
     * @param {string} mode - Capacity mode for context
     * @returns {string} Default max capacity value
     */
    static getDefaultMaxValue(mode) {
        return '100';
    }

    static _parsePercentage(value) {
        const numValue = Number.parseFloat(value);
        if (Number.isNaN(numValue)) {
            return {
                type: CAPACITY_MODES.PERCENTAGE,
                value: null,
                unit: '%',
                isValid: false,
                error: 'Invalid percentage format'
            };
        }

        return {
            type: CAPACITY_MODES.PERCENTAGE,
            value: numValue,
            unit: '%',
            isValid: true,
            originalValue: value
        };
    }

    static _parseWeight(value) {
        const weightValue = value.slice(0, -1);
        const numValue = Number.parseFloat(weightValue);
        if (Number.isNaN(numValue) || numValue <= 0) {
            return {
                type: CAPACITY_MODES.WEIGHT,
                value: null,
                unit: 'w',
                isValid: false,
                error: 'Invalid weight format or value <= 0'
            };
        }

        return {
            type: CAPACITY_MODES.WEIGHT,
            value: numValue,
            unit: 'w',
            isValid: true,
            originalValue: value
        };
    }

    static _parseAbsolute(value) {
        if (!value.includes('=')) {
            return {
                type: CAPACITY_MODES.ABSOLUTE,
                value: null,
                unit: 'absolute',
                isValid: false,
                error: 'Invalid absolute resource format - missing resource assignments'
            };
        }

        const resources = value.slice(1, -1).split(',');
        const parsedResources = {};
        let hasNonAbsoluteValue = false;
        
        for (const resource of resources) {
            const [key, val] = resource.split('=');
            if (!key || !val) {
                return {
                    type: CAPACITY_MODES.ABSOLUTE,
                    value: null,
                    unit: 'absolute',
                    isValid: false,
                    error: `Invalid resource format: ${resource}`
                };
            }
            const trimmedKey = key.trim();
            const trimmedVal = val.trim();
            
            // Check if this is a mixed mode vector (contains %, w, or other units)
            if (trimmedVal.endsWith('%') || trimmedVal.endsWith('w')) {
                hasNonAbsoluteValue = true;
            }
            
            parsedResources[trimmedKey] = trimmedVal;
        }

        // If we have mixed values (%, w, absolute), this is a VECTOR mode
        const capacityType = hasNonAbsoluteValue ? CAPACITY_MODES.VECTOR : CAPACITY_MODES.ABSOLUTE;

        return {
            type: capacityType,
            value: parsedResources,
            unit: capacityType === CAPACITY_MODES.VECTOR ? 'vector' : 'absolute',
            isValid: true,
            originalValue: value,
            isMixedVector: hasNonAbsoluteValue
        };
    }
}