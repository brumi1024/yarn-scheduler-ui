import { QUEUE_PROPERTIES } from '../config';
import { globalProperties } from '../config/globalProperties';
import type { ParsedQueue } from '../types/Queue';

/**
 * Converts a queue object to form data format using actual property keys.
 * No sanitization needed - we use the real property keys.
 */
export function queueToFormData(queue: ParsedQueue): Record<string, unknown> {
    const formData: Record<string, unknown> = {};

    Object.entries(QUEUE_PROPERTIES).forEach(([key, definition]) => {
        const value = definition.getValueFromQueue(queue);
        if (value !== undefined) {
            formData[key] = value;
        }
    });

    return formData;
}

/**
 * Extracts changed fields by comparing form data with original values.
 * Returns a map of property paths to new values.
 */
export function extractChangedFields(
    formData: Record<string, unknown>,
    originalData: Record<string, unknown>
): Map<string, unknown> {
    const changes = new Map<string, unknown>();

    Object.entries(formData).forEach(([key, newValue]) => {
        const originalValue = originalData[key];

        // Compare values (handle different types appropriately)
        if (!valuesEqual(originalValue, newValue)) {
            changes.set(key, newValue);
        }
    });

    return changes;
}

/**
 * Compares two values for equality, handling different types.
 */
function valuesEqual(a: unknown, b: unknown): boolean {
    // Handle null/undefined
    if (a == null && b == null) return true;
    if (a == null || b == null) return false;

    // Handle arrays
    if (Array.isArray(a) && Array.isArray(b)) {
        return a.length === b.length && a.every((val, idx) => val === b[idx]);
    }

    // Handle objects (shallow comparison)
    if (typeof a === 'object' && typeof b === 'object') {
        const aObj = a as Record<string, unknown>;
        const bObj = b as Record<string, unknown>;
        const aKeys = Object.keys(aObj);
        const bKeys = Object.keys(bObj);
        return aKeys.length === bKeys.length && aKeys.every((key) => valuesEqual(aObj[key], bObj[key]));
    }

    // Convert to strings for comparison (handles numbers, booleans, etc.)
    return String(a) === String(b);
}

/**
 * Builds the full property path for config store.
 * @param queuePath The queue path (e.g., "root.a.b")
 * @param propertyKey The property key (e.g., "capacity")
 * @returns The full path (e.g., "queues.root.a.b.capacity")
 */
export function buildConfigPath(queuePath: string, propertyKey: string): string {
    if (queuePath === '_global') {
        return `global.${propertyKey}`;
    }
    return `queues.${queuePath}.${propertyKey}`;
}

/**
 * Converts form value to YARN API format.
 */
export function convertToYarnValue(propertyKey: string, value: unknown): string {
    const definition = QUEUE_PROPERTIES[propertyKey] || globalProperties[propertyKey];

    if (value === null || value === undefined) {
        return '';
    }

    // For capacity type, value is already in correct format
    if (definition?.type === 'capacity') {
        return String(value);
    }

    // Handle boolean values
    if (typeof value === 'boolean') {
        return value.toString();
    }

    // Handle array values
    if (Array.isArray(value)) {
        return value.join(',');
    }

    return String(value);
}
