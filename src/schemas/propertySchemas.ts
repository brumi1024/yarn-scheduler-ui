import { z } from 'zod';
import type { ConfigProperty } from '../config/types';

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
 * Zod schema for capacity values with custom validation
 */
export const capacityValueSchema = z
    .string()
    .min(1, 'Capacity value is required')
    .refine(
        (value) => {
            const trimmedValue = value.trim();

            // Percentage mode: ends with %
            if (trimmedValue.endsWith('%')) {
                const numericPart = trimmedValue.slice(0, -1);
                const numericValue = parseFloat(numericPart);
                return !isNaN(numericValue) && numericValue >= 0 && numericValue <= 100;
            }

            // Weight mode: ends with w
            if (trimmedValue.endsWith('w')) {
                const numericPart = trimmedValue.slice(0, -1);
                const numericValue = parseFloat(numericPart);
                return !isNaN(numericValue) && numericValue > 0;
            }

            // Absolute mode: [resource=value,resource=value]
            if (trimmedValue.startsWith('[') && trimmedValue.endsWith(']')) {
                const resourcePart = trimmedValue.slice(1, -1);
                if (resourcePart.trim() === '') return false;

                const resourcePairs = resourcePart.split(',');
                return resourcePairs.every((pair) => {
                    const [resource, value] = pair.split('=');
                    return resource && value && !isNaN(parseFloat(value));
                });
            }

            // Raw number (assume percentage)
            const numericValue = parseFloat(trimmedValue);
            return !isNaN(numericValue) && numericValue >= 0 && numericValue <= 100;
        },
        {
            message: 'Invalid capacity format. Use percentage (10%), weight (5w), or absolute ([memory=1024,vcores=2])',
        }
    );

/**
 * Zod schema for string properties
 */
export const stringPropertySchema = z.string().optional();

/**
 * Zod schema for number properties
 */
export const numberPropertySchema = z
    .union([
        z.number(),
        z.string().transform((val) => {
            const parsed = parseFloat(val);
            if (isNaN(parsed)) throw new Error('Invalid number');
            return parsed;
        }),
    ])
    .optional();

/**
 * Zod schema for boolean properties
 */
export const booleanPropertySchema = z
    .union([z.boolean(), z.string().transform((val) => val.toLowerCase() === 'true')])
    .optional();

/**
 * Zod schema for percentage properties (0-1 range)
 */
export const percentagePropertySchema = z
    .union([
        z.number().min(0).max(1),
        z.string().transform((val) => {
            const parsed = parseFloat(val);
            if (isNaN(parsed) || parsed < 0 || parsed > 1) {
                throw new Error('Percentage must be between 0 and 1');
            }
            return parsed;
        }),
    ])
    .optional();

/**
 * Zod schema for enum properties
 */
export function enumPropertySchema(options: string[]) {
    return z.enum(options as [string, ...string[]]).optional();
}

/**
 * Create a Zod schema for a ConfigProperty
 */
export function createPropertySchema(property: ConfigProperty) {
    if (isCapacityProperty(property.key)) {
        return capacityValueSchema;
    }

    switch (property.type) {
        case 'boolean':
            return booleanPropertySchema;
        case 'enum':
            return property.options ? enumPropertySchema(property.options) : stringPropertySchema;
        case 'number':
            return numberPropertySchema;
        case 'percentage':
            return percentagePropertySchema;
        default: // 'string'
            return stringPropertySchema;
    }
}

/**
 * Create a Zod schema for a form with multiple properties
 */
export function createFormSchema(properties: Record<string, ConfigProperty>) {
    const schemaShape: Record<string, z.ZodTypeAny> = {};

    Object.entries(properties).forEach(([key, property]) => {
        schemaShape[key] = createPropertySchema(property);
    });

    return z.object(schemaShape);
}

/**
 * Parse utility functions for backward compatibility
 */
export function parseNumericProperty(value: string | undefined, defaultValue: number = 0): number {
    if (!value) return defaultValue;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
}

export function parseIntProperty(value: string | undefined, defaultValue: number = 0): number {
    if (!value) return defaultValue;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
}

export function parseBooleanProperty(value: string | undefined, defaultValue: boolean = false): boolean {
    if (!value) return defaultValue;
    return value.toLowerCase() === 'true';
}

export function parseStringArray(value: string | undefined): string[] {
    if (!value) return [];
    return value
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
}
