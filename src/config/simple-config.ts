/**
 * Simplified Configuration API
 * 
 * Simple, direct API for working with YARN configuration properties.
 * Replaces the complex ConfigService with straightforward functions.
 */

import {
    QUEUE_PROPERTIES,
    AUTO_CREATION_PROPERTIES,
    GLOBAL_PROPERTIES,
    NODE_LABEL_PROPERTIES,
    SCHEDULER_INFO_FIELDS,
    findPropertyByKey,
    getAllQueueProperties,
    getAllGlobalProperties,
    type PropertyDefinition,
    type PropertyGroup,
} from './property-definitions';

import {
    validateProperty,
    validateProperties,
    validateCapacity,
    validateNodeLabels,
    type ValidationResult,
} from './property-validation';

/**
 * Get queue property groups for UI organization
 */
export function getQueuePropertyGroups(): PropertyGroup[] {
    return [
        ...QUEUE_PROPERTIES,
        {
            groupName: 'Auto-Queue Creation',
            properties: AUTO_CREATION_PROPERTIES,
        },
    ];
}

/**
 * Get global property groups for UI organization
 */
export function getGlobalPropertyGroups(): PropertyGroup[] {
    return GLOBAL_PROPERTIES;
}

/**
 * Get node label properties
 */
export function getNodeLabelProperties(): PropertyDefinition[] {
    return NODE_LABEL_PROPERTIES;
}

/**
 * Get scheduler info display fields
 */
export function getSchedulerInfoFields() {
    return SCHEDULER_INFO_FIELDS;
}

/**
 * Get property definition by key
 */
export function getPropertyDefinition(key: string): PropertyDefinition | undefined {
    return findPropertyByKey(key);
}

/**
 * Get properties available in templates
 */
export function getTemplateProperties(): PropertyDefinition[] {
    return getAllQueueProperties().filter(property => 
        // Basic properties that make sense in templates
        ['capacity', 'maximum-capacity', 'user-limit-factor', 'ordering-policy'].includes(property.key)
    );
}

/**
 * Validate a single property
 */
export function validateSingleProperty(key: string, value: any): ValidationResult {
    return validateProperty(key, value);
}

/**
 * Validate multiple properties at once
 */
export function validateMultipleProperties(properties: Record<string, any>): { valid: boolean; errors: Record<string, string> } {
    return validateProperties(properties);
}

/**
 * Build full YARN property key for a queue
 */
export function buildYarnPropertyKey(queuePath: string, propertyKey: string): string {
    return `yarn.scheduler.capacity.${queuePath}.${propertyKey}`;
}

/**
 * Extract queue path from full YARN property key
 */
export function extractQueuePath(fullPropertyKey: string): string | null {
    const prefix = 'yarn.scheduler.capacity.';
    if (!fullPropertyKey.startsWith(prefix)) {
        return null;
    }

    const afterPrefix = fullPropertyKey.substring(prefix.length);
    const parts = afterPrefix.split('.');

    if (parts.length < 2) {
        return null;
    }

    // Remove the last part (property name) to get the queue path
    return parts.slice(0, -1).join('.');
}

/**
 * Get default value for a property
 */
export function getDefaultValue(key: string): any {
    const property = findPropertyByKey(key);
    return property?.defaultValue;
}

/**
 * Check if a property is required
 */
export function isPropertyRequired(key: string): boolean {
    const property = findPropertyByKey(key);
    return property?.required || false;
}

/**
 * Get property type
 */
export function getPropertyType(key: string): string | undefined {
    const property = findPropertyByKey(key);
    return property?.type;
}

/**
 * Get enum options for a property (if applicable)
 */
export function getPropertyOptions(key: string): string[] | undefined {
    const property = findPropertyByKey(key);
    return property?.options;
}

/**
 * Specialized validation functions
 */
export const validation = {
    capacity: validateCapacity,
    nodeLabels: validateNodeLabels,
    property: validateProperty,
    properties: validateProperties,
};

/**
 * Property organization helpers
 */
export const properties = {
    queue: {
        groups: getQueuePropertyGroups,
        all: getAllQueueProperties,
        template: getTemplateProperties,
    },
    global: {
        groups: getGlobalPropertyGroups,
        all: getAllGlobalProperties,
    },
    nodeLabel: {
        all: getNodeLabelProperties,
    },
};

/**
 * Utility functions
 */
export const utils = {
    buildYarnKey: buildYarnPropertyKey,
    extractQueuePath,
    getDefaultValue,
    isRequired: isPropertyRequired,
    getType: getPropertyType,
    getOptions: getPropertyOptions,
    findProperty: getPropertyDefinition,
};

// Re-export key types and interfaces
export type {
    PropertyDefinition,
    PropertyGroup,
    PropertyType,
} from './property-definitions';

export type {
    ValidationResult,
} from './property-validation';