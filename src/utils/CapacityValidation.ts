/**
 * Shared utilities for capacity property validation and identification
 */

/**
 * Capacity property keys that should use the CapacityEditor component
 */
export const CAPACITY_PROPERTY_KEYS = [
    'capacity',
    'maximum-capacity',
    'leaf-queue-template.capacity',
    'leaf-queue-template.maximum-capacity',
    'auto-queue-creation-v2.template.capacity',
    'auto-queue-creation-v2.template.maximum-capacity',
] as const;

/**
 * Check if a property key represents a capacity property that should use CapacityEditor
 */
export function isCapacityProperty(propertyKey: string): boolean {
    return CAPACITY_PROPERTY_KEYS.includes(propertyKey as any);
}

/**
 * Check if a property key represents a maximum capacity property
 */
export function isMaximumCapacityProperty(propertyKey: string): boolean {
    return propertyKey.includes('maximum-capacity');
}

/**
 * Check if a property key represents a template capacity property
 */
export function isTemplateCapacityProperty(propertyKey: string): boolean {
    return propertyKey.includes('template.capacity');
}

/**
 * Parse numeric value from property value, returning default if invalid
 */
export function parseNumericProperty(value: string | undefined, defaultValue: number = 0): number {
    if (!value) return defaultValue;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Parse integer value from property value, returning default if invalid
 */
export function parseIntProperty(value: string | undefined, defaultValue: number = 0): number {
    if (!value) return defaultValue;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Parse boolean value from property value
 */
export function parseBooleanProperty(value: string | undefined, defaultValue: boolean = false): boolean {
    if (!value) return defaultValue;
    return value.toLowerCase() === 'true';
}

/**
 * Parse string array from comma-separated value
 */
export function parseStringArray(value: string | undefined): string[] {
    if (!value) return [];
    return value
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
}

/**
 * Validate capacity value format based on mode
 */
export interface CapacityValidationResult {
    isValid: boolean;
    error?: string;
    normalizedValue?: string;
}

export function validateCapacityValue(value: string): CapacityValidationResult {
    if (!value || value.trim() === '') {
        return { isValid: false, error: 'Capacity value is required' };
    }

    const trimmedValue = value.trim();

    // Percentage mode: ends with %
    if (trimmedValue.endsWith('%')) {
        const numericPart = trimmedValue.slice(0, -1);
        const numericValue = parseFloat(numericPart);
        
        if (isNaN(numericValue)) {
            return { isValid: false, error: 'Invalid percentage value' };
        }
        
        if (numericValue < 0 || numericValue > 100) {
            return { isValid: false, error: 'Percentage must be between 0 and 100' };
        }
        
        return { isValid: true, normalizedValue: `${numericValue}%` };
    }

    // Weight mode: ends with w
    if (trimmedValue.endsWith('w')) {
        const numericPart = trimmedValue.slice(0, -1);
        const numericValue = parseFloat(numericPart);
        
        if (isNaN(numericValue)) {
            return { isValid: false, error: 'Invalid weight value' };
        }
        
        if (numericValue <= 0) {
            return { isValid: false, error: 'Weight must be greater than 0' };
        }
        
        return { isValid: true, normalizedValue: `${numericValue}w` };
    }

    // Absolute mode: [resource=value,resource=value]
    if (trimmedValue.startsWith('[') && trimmedValue.endsWith(']')) {
        const resourcePart = trimmedValue.slice(1, -1);
        
        if (resourcePart.trim() === '') {
            return { isValid: false, error: 'Resource specification cannot be empty' };
        }

        // Basic validation for resource format
        const resourcePairs = resourcePart.split(',');
        for (const pair of resourcePairs) {
            const [resource, value] = pair.split('=');
            if (!resource || !value || isNaN(parseFloat(value))) {
                return { isValid: false, error: 'Invalid resource format. Use [resource=value,resource=value]' };
            }
        }
        
        return { isValid: true, normalizedValue: trimmedValue };
    }

    // If it doesn't match any format, it might be a raw number (assume percentage)
    const numericValue = parseFloat(trimmedValue);
    if (!isNaN(numericValue)) {
        if (numericValue < 0 || numericValue > 100) {
            return { isValid: false, error: 'Numeric value must be between 0 and 100 (assumed percentage)' };
        }
        return { isValid: true, normalizedValue: `${numericValue}%` };
    }

    return { isValid: false, error: 'Invalid capacity format. Use percentage (10%), weight (5w), or absolute ([memory=1024,vcores=2])' };
}