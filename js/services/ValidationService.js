/**
 * @file Provides stateless validation utility functions.
 * More complex, stateful validations (e.g., capacity totals) are handled
 * by SchedulerConfigModel.performStatefulValidation() using data from ViewDataFormatterService.
 */
class ValidationService {
    /**
     * Validates the characters allowed in a queue name segment.
     * @param {string} name - The queue name segment to validate.
     * @returns {{isValid: boolean, message?: string}}
     */
    static isValidQueueNameChars(name) {
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return { isValid: false, message: "Queue name segment is required." };
        }
        if (!/^[a-zA-Z0-9_-]+$/.test(name.trim())) {
            return {
                isValid: false,
                message: "Queue name segment can only contain letters, numbers, underscores, and hyphens."
            };
        }
        return { isValid: true };
    }

    /**
     * Parses and validates a capacity string based on its mode.
     * @param {string} capacityString - The capacity value as a string.
     * @param {string} mode - One of CAPACITY_MODES (e.g., PERCENTAGE, WEIGHT, ABSOLUTE).
     * @returns {{value: string|null, error?: string}}
     *          `value` is the (potentially auto-corrected) string, or null if invalid.
     *          `error` contains a message if validation fails.
     */
    static parseAndValidateCapacityValue(capacityString, mode) {
        const str = String(capacityString || '').trim();

        if (mode === CAPACITY_MODES.PERCENTAGE) {
            if (!str.endsWith('%')) return { value: null, error: 'Percentage capacity must end with "%".' };
            const num = parseFloat(str.slice(0, -1));
            if (isNaN(num) || num < 0 || num > 100) {
                return { value: null, error: "Percentage capacity must be a number between 0 and 100." };
            }
            return { value: `${num.toFixed(1)}%` }; // Standardize format
        }
        if (mode === CAPACITY_MODES.WEIGHT) {
            if (!str.endsWith('w')) return { value: null, error: 'Weight capacity must end with "w".' };
            const num = parseFloat(str.slice(0, -1));
            if (isNaN(num) || num < 0) { // Weights can be > 1 (or 100 effectively)
                return { value: null, error: "Weight capacity must be a non-negative number." };
            }
            return { value: `${num.toFixed(1)}w` }; // Standardize format
        }
        if (mode === CAPACITY_MODES.ABSOLUTE || mode === CAPACITY_MODES.VECTOR) {
            if (!str.startsWith('[') || !str.endsWith(']')) {
                return { value: null, error: "Absolute capacity must be enclosed in brackets, e.g., [memory=1024,vcores=1]." };
            }
            if (str === "[]") return { value: null, error: "Absolute capacity vector cannot be empty."};
            // Further parsing of vector content (e.g. "memory=1024,vcores=1") can be added here if needed.
            // For now, we just check the brackets.
            return { value: str };
        }
        return { value: null, error: `Unknown capacity mode: ${mode}` };
    }

    /**
     * Validates a node label string (comma-separated).
     * @param {string} labelsString - The string of comma-separated labels.
     * @returns {{isValid: boolean, labels: Array<string>, message?: string}}
     *          `labels` contains an array of trimmed, non-empty, unique label segments.
     */
    static validateNodeLabelsString(labelsString) {
        if (labelsString === null || labelsString === undefined || String(labelsString).trim() === "") {
            return { isValid: true, labels: [] }; // Empty is valid (means no explicit labels or use default "*")
        }
        if (String(labelsString).trim() === "*") {
            return { isValid: true, labels: ["*"] };
        }

        const labels = String(labelsString).split(',')
            .map(label => label.trim())
            .filter(label => label.length > 0);

        const uniqueLabels = [...new Set(labels)]; // Ensure uniqueness

        for (const label of uniqueLabels) {
            // YARN label validation (alphanumeric, '.', '_', '-')
            if (!/^[a-zA-Z0-9._-]+$/.test(label)) {
                return {
                    isValid: false,
                    labels: [],
                    message: `Invalid character in label "${label}". Labels can only contain letters, numbers, periods, underscores, and hyphens.`
                };
            }
            if (label === "*") {
                return {
                    isValid: false,
                    labels: [],
                    message: `Label '*' cannot be mixed with other specific labels.`
                };
            }
        }
        return { isValid: true, labels: uniqueLabels };
    }
}