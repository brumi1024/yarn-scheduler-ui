/**
 * @file Provides stateless validation utility functions.
 * More complex, stateful validations (e.g., capacity totals, queue state before delete)
 * should be handled by SchedulerConfigModel.performStatefulValidation() using data from ViewDataFormatterService.
 * Uses constants from js/config/config.js
 */
class ValidationService {
    /**
     * Validates the characters allowed in a queue name segment.
     * @param {string} name - The queue name segment to validate.
     * @returns {{isValid: boolean, message?: string}}
     */
    static isValidQueueNameChars(name) {
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return { isValid: false, message: 'Queue name segment is required.' };
        }
        if (!/^[a-zA-Z0-9_.-]+$/.test(name.trim())) {
            // Relaxed: allow dot for template names. Standard queues usually don't have dots in segments.
            return {
                isValid: false,
                message: 'Queue name segment can only contain letters, numbers, underscores, hyphens, and periods.',
            };
        }
        if (name.trim().includes(' ')) {
            return { isValid: false, message: 'Queue name segment cannot contain spaces.' };
        }
        return { isValid: true };
    }

    /**
     * Parses and validates a capacity string based on its mode.
     * @param {string} capacityString - The capacity value as a string.
     * @param {string} mode - One of CAPACITY_MODES (e.g., PERCENTAGE, WEIGHT, ABSOLUTE).
     * @param {boolean} [allowEmptyVector=false] - For absolute mode, whether an empty "[]" is permissible.
     * @returns {{value: string|null, error?: string, errors?: Array<string>}}
     *          `value` is the (potentially auto-corrected) string, or null if invalid.
     *          `error` (singular) for general errors, `errors` (array) from old `validateCapacity`.
     */
    static parseAndValidateCapacityValue(capacityString, mode, allowEmptyVector = false) {
        const str = String(capacityString || '').trim();
        const errors = [];

        if (mode === CAPACITY_MODES.PERCENTAGE) {
            let numStr = str;
            if (str.endsWith('%')) {
                numStr = str.slice(0, -1);
            }
            const num = parseFloat(numStr);
            if (isNaN(num)) {
                errors.push('Percentage capacity must be a number.');
            } else if (num < 0 || num > 100) {
                errors.push('Percentage capacity must be between 0.0 and 100.0.');
            }
            return errors.length > 0 ? { value: null, errors: errors } : { value: `${num.toFixed(1)}%` };
        }

        if (mode === CAPACITY_MODES.WEIGHT) {
            let numStr = str;
            if (str.endsWith('w')) {
                numStr = str.slice(0, -1);
            }
            const num = parseFloat(numStr);
            if (isNaN(num)) {
                errors.push('Weight capacity must be a number.');
            } else if (num < 0) {
                errors.push('Weight capacity must be non-negative.');
            }
            // YARN might support integer weights better, but UI can standardize to one decimal for 'w'
            return errors.length > 0 ? { value: null, errors: errors } : { value: `${num.toFixed(1)}w` };
        }

        if (mode === CAPACITY_MODES.ABSOLUTE || mode === CAPACITY_MODES.VECTOR) {
            if (!str.startsWith('[') || !str.endsWith(']')) {
                errors.push('Absolute capacity must be enclosed in brackets, e.g., [memory=1024,vcores=1].');
            } else if (str === '[]' && !allowEmptyVector) {
                errors.push('Absolute capacity vector cannot be empty unless explicitly allowed.');
            }
            // TODO: Deeper validation of vector content (key=value pairs, valid resource names)
            // For example: '[memory=100mb,vcores=2]' - '100mb' would be an issue. Needs to be numeric.
            if (str !== '[]') {
                const content = str.slice(1, -1);
                const pairs = content.split(',');
                if (content && pairs.length === 0) errors.push('Invalid format inside absolute capacity brackets.');
                for (const pair of pairs) {
                    const parts = pair.split('=');
                    if (parts.length !== 2 || !parts[0].trim() || !parts[1].trim()) {
                        errors.push(
                            `Invalid resource entry in vector: "${pair}". Expected format "resourceName=value".`
                        );
                        continue;
                    }
                    const resourceValue = parts[1].trim();
                    // Check if value is numeric (ignoring units for now, YARN handles units)
                    // More robust parsing might extract numeric part and unit separately for stricter validation
                    if (isNaN(parseFloat(resourceValue))) {
                        // Checks if the beginning of the string is a number
                        errors.push(`Resource value in "${pair}" must be numeric.`);
                    }
                }
            }
            return errors.length > 0 ? { value: null, errors: errors } : { value: str };
        }
        return { value: null, error: `Unknown capacity mode: ${mode}` };
    }

    /**
     * Validates a node label string (comma-separated).
     * Ensures individual labels adhere to YARN naming conventions.
     * @param {string} labelsString - The string of comma-separated labels.
     * @returns {{isValid: boolean, labels: Array<string>, message?: string}}
     *          `labels` contains an array of trimmed, non-empty, unique label segments.
     */
    static validateNodeLabelsString(labelsString) {
        const trimmedString = String(labelsString || '').trim();

        if (trimmedString === '' || trimmedString === '*') {
            return { isValid: true, labels: [trimmedString] }; // Empty or "*" are valid single states
        }

        const labels = trimmedString
            .split(',')
            .map((label) => label.trim())
            .filter((label) => label.length > 0); // Remove empty strings resulting from ,, or trailing ,

        if (labels.length === 0 && trimmedString.length > 0) {
            // This case implies input like "," which results in empty labels array after filter.
            return { isValid: false, labels: [], message: 'Invalid labels list format. Contains only delimiters.' };
        }

        const uniqueLabels = [...new Set(labels)];

        if (uniqueLabels.includes('*') && uniqueLabels.length > 1) {
            return {
                isValid: false,
                labels: uniqueLabels,
                message: "Label '*' cannot be mixed with other specific labels.",
            };
        }

        for (const label of uniqueLabels) {
            if (label === '*') continue;
            if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(label)) {
                return {
                    isValid: false,
                    labels: uniqueLabels,
                    message: `Invalid character(s) or start for label "${label}". Labels must start with a letter/number and contain only letters, numbers, '.', '_', or '-'.`,
                };
            }
        }
        return { isValid: true, labels: uniqueLabels.sort() };
    }

    /**
     * Helper to check if a queue (not already marked for deletion) can be marked for deletion.
     * Used by UI elements (e.g., QueueCardView) to enable/disable delete options.
     * Relies on data formatted by ViewDataFormatterService which includes effective children.
     * @param {Object} formattedQueueNode - The formatted queue node from ViewDataFormatterService.
     * @returns {{canDelete: boolean, reason: string}}
     */
    static checkDeletability(formattedQueueNode) {
        if (!formattedQueueNode) {
            return { canDelete: false, reason: 'Queue data not available.' };
        }
        if (formattedQueueNode.path === 'root') {
            return { canDelete: false, reason: 'Root queue cannot be deleted.' };
        }
        if (formattedQueueNode.isDeleted) {
            // Already marked for deletion
            return { canDelete: true, reason: 'Queue is already marked for deletion (can be undone).' };
        }

        let activeChildCount = 0;
        const activeChildrenNames = [];
        if (formattedQueueNode.children) {
            Object.values(formattedQueueNode.children).forEach((child) => {
                if (child && !child.isDeleted) {
                    // Consider only children not also marked for delete
                    activeChildCount++;
                    activeChildrenNames.push(child.name);
                }
            });
        }

        if (activeChildCount > 0) {
            const nameList =
                activeChildrenNames.length > 3
                    ? activeChildrenNames.slice(0, 3).join(', ') + '...'
                    : activeChildrenNames.join(', ');
            return {
                canDelete: false,
                reason: `Cannot delete queue '${formattedQueueNode.name}': it has active child queues (${nameList}). Delete children first.`,
            };
        }

        // Check if the queue is in STOPPED state (based on its effective properties)
        // This relies on formattedNode having an effective 'state' property.
        const state = formattedQueueNode.state;
        if (state && state.toUpperCase() !== 'STOPPED') {
            return {
                canDelete: false,
                reason: `Queue '${formattedQueueNode.name}' is not in STOPPED state. It should be stopped before deletion.`,
            };
        }

        return { canDelete: true, reason: '' };
    }
}
