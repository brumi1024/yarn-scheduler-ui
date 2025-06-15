/**
 * Simplified Property Validation
 *
 * Direct validation functions for YARN properties.
 * Replaces the complex validation system with simple, direct functions.
 */

import { findPropertyByKey, type PropertyDefinition, type PropertyType } from './property-definitions';

export interface ValidationResult {
    valid: boolean;
    error?: string;
}

/**
 * Validate a property value based on its definition
 */
export function validateProperty(key: string, value: any): ValidationResult {
    const property = findPropertyByKey(key);
    if (!property) {
        return { valid: false, error: `Unknown property: ${key}` };
    }

    // Allow empty values for optional properties
    if ((value === undefined || value === null || value === '') && !property.required) {
        return { valid: true };
    }

    // Check required properties
    if (property.required && (value === undefined || value === null || value === '')) {
        return { valid: false, error: 'This field is required' };
    }

    return validateByType(property.type, value, property);
}

/**
 * Validate value based on property type
 */
function validateByType(type: PropertyType, value: any, property: PropertyDefinition): ValidationResult {
    switch (type) {
        case 'boolean':
            return validateBoolean(value);
        case 'number':
            return validateNumber(value, property);
        case 'percentage':
            return validatePercentage(value);
        case 'enum':
            return validateEnum(value, property.options || []);
        case 'string':
            return validateString(value);
        default:
            return { valid: false, error: `Unknown property type: ${type}` };
    }
}

/**
 * Validate boolean values
 */
function validateBoolean(value: any): ValidationResult {
    if (typeof value === 'boolean') {
        return { valid: true };
    }

    if (value === 'true' || value === 'false') {
        return { valid: true };
    }

    return { valid: false, error: 'Must be true or false' };
}

/**
 * Validate number values
 */
function validateNumber(value: any, property: PropertyDefinition): ValidationResult {
    const numValue = parseFloat(value);

    if (isNaN(numValue)) {
        return { valid: false, error: 'Must be a valid number' };
    }

    // Additional validation for specific number ranges could be added here
    if (numValue < 0) {
        return { valid: false, error: 'Must be a non-negative number' };
    }

    return { valid: true };
}

/**
 * Validate percentage values (0 to 1)
 */
function validatePercentage(value: any): ValidationResult {
    const numValue = parseFloat(value);

    if (isNaN(numValue)) {
        return { valid: false, error: 'Must be a valid number' };
    }

    if (numValue < 0 || numValue > 1) {
        return { valid: false, error: 'Must be a number between 0 and 1' };
    }

    return { valid: true };
}

/**
 * Validate enum values
 */
function validateEnum(value: any, options: string[]): ValidationResult {
    if (!options.includes(value)) {
        return { valid: false, error: `Must be one of: ${options.join(', ')}` };
    }

    return { valid: true };
}

/**
 * Validate string values
 */
function validateString(value: any): ValidationResult {
    if (typeof value !== 'string') {
        return { valid: false, error: 'Must be a string' };
    }

    return { valid: true };
}

/**
 * Validate capacity values (percentage, weight, or absolute)
 */
export function validateCapacity(value: string): ValidationResult {
    if (!value) {
        return { valid: false, error: 'Capacity is required' };
    }

    // Percentage format (e.g., "10%", "50%")
    if (value.endsWith('%')) {
        const numValue = parseFloat(value.slice(0, -1));
        if (isNaN(numValue) || numValue < 0 || numValue > 100) {
            return { valid: false, error: 'Percentage must be between 0% and 100%' };
        }
        return { valid: true };
    }

    // Weight format (e.g., "1w", "5w")
    if (value.endsWith('w')) {
        const numValue = parseFloat(value.slice(0, -1));
        if (isNaN(numValue) || numValue <= 0) {
            return { valid: false, error: 'Weight must be a positive number followed by "w"' };
        }
        return { valid: true };
    }

    // Absolute resource format (e.g., "[memory=2048,vcores=2]")
    if (value.startsWith('[') && value.endsWith(']')) {
        const resourceSpec = value.slice(1, -1);
        const parts = resourceSpec.split(',');

        for (const part of parts) {
            const [resource, amount] = part.split('=');
            if (!resource || !amount) {
                return { valid: false, error: 'Invalid absolute resource format. Use [memory=2048,vcores=2]' };
            }

            const numAmount = parseFloat(amount);
            if (isNaN(numAmount) || numAmount < 0) {
                return { valid: false, error: `Invalid resource amount: ${amount}` };
            }
        }

        return { valid: true };
    }

    return {
        valid: false,
        error: 'Invalid capacity format. Use percentage (10%), weight (1w), or absolute ([memory=2048,vcores=2])',
    };
}

/**
 * Validate node labels
 */
export function validateNodeLabels(value: string): ValidationResult {
    if (!value) {
        return { valid: true }; // Empty is valid (inherits from parent)
    }

    if (value === '*') {
        return { valid: true }; // Wildcard is valid
    }

    // Comma-separated list of labels
    const labels = value.split(',').map((l) => l.trim());

    for (const label of labels) {
        if (!/^[a-zA-Z0-9_-]+$/.test(label)) {
            return { valid: false, error: 'Node labels must contain only letters, numbers, underscores, and hyphens' };
        }
    }

    return { valid: true };
}

/**
 * Batch validate multiple properties
 */
export function validateProperties(properties: Record<string, any>): {
    valid: boolean;
    errors: Record<string, string>;
} {
    const errors: Record<string, string> = {};

    for (const [key, value] of Object.entries(properties)) {
        const result = validateProperty(key, value);
        if (!result.valid && result.error) {
            errors[key] = result.error;
        }
    }

    return {
        valid: Object.keys(errors).length === 0,
        errors,
    };
}
