import { nanoid } from 'nanoid';
import type { ChangeSet } from '../types/Configuration';
import type { Queue } from '../types/Queue';
import { QUEUE_PROPERTIES } from '../config';
import { globalProperties } from '../config/globalProperties';

/**
 * Converts form data values to the string format required by YARN configuration.
 * @param propertyKey The key of the property (e.g., 'capacity').
 * @param value The value from the form.
 * @returns A string formatted for YARN configuration.
 */
function convertFormValueToYarnValue(propertyKey: string, value: unknown): string {
    // Check queue properties first, then global properties
    const queueDefinition = QUEUE_PROPERTIES[propertyKey];
    const globalDefinition = globalProperties[propertyKey];
    const definition = queueDefinition || globalDefinition;

    if (value === null || value === undefined) {
        return '';
    }

    if (!definition) {
        // Fallback for unknown properties - handle common cases
        if (typeof value === 'boolean') {
            return value.toString();
        }
        if (Array.isArray(value)) {
            return value.join(',');
        }
        return String(value ?? '');
    }

    // For queue 'capacity' type, the value is already in the correct string format (e.g., "10%", "5w").
    if (queueDefinition && queueDefinition.type === 'capacity') {
        return String(value);
    }

    // Handle boolean values specifically
    if (typeof value === 'boolean') {
        return value.toString();
    }

    // Handle array values (like accessible-node-labels)
    if (Array.isArray(value)) {
        return value.join(',');
    }

    // Default: convert to string
    return String(value);
}

/**
 * Creates an array of ChangeSet objects by comparing form data with the current queue state.
 * This function is now data-driven by QUEUE_PROPERTIES.
 * @param queuePath The full path of the queue being modified.
 * @param formData The data submitted from the form.
 * @param currentQueue The current state of the queue object.
 * @returns An array of ChangeSet objects representing the changes.
 */
/**
 * Converts a sanitized form field name back to the original property key
 * @param sanitizedKey The sanitized key (e.g., "auto-queue-creation-v2_enabled")
 * @returns The original property key (e.g., "auto-queue-creation-v2.enabled")
 */
function convertSanitizedKeyToPropertyKey(sanitizedKey: string): string {
    // Convert underscores back to dots for property keys
    // This reverses the sanitization done in PropertyFormField
    return sanitizedKey.replace(/_/g, '.');
}

export function createChangeSetsFromFormData(
    queuePath: string,
    formData: Record<string, unknown>,
    currentQueue: Queue | null
): ChangeSet[] {
    const changes: ChangeSet[] = [];
    const timestamp = new Date();

    for (const [sanitizedKey, newValue] of Object.entries(formData)) {
        // Convert sanitized key back to original property key
        const propertyKey = convertSanitizedKeyToPropertyKey(sanitizedKey);
        const definition = QUEUE_PROPERTIES[propertyKey];

        if (!definition || !currentQueue) {
            continue; // Skip properties not defined in our master list or if no queue is selected
        }

        // Get the original value from the queue object using the dedicated function
        const oldValue = definition.getValueFromQueue(currentQueue);

        // Compare the new value from the form with the old value.
        // Note: We compare the raw form value with the raw queue value.
        // The final value for the API will be stringified later.
        if (String(newValue) !== String(oldValue)) {
            changes.push({
                id: nanoid(),
                type: 'PROPERTY_UPDATE',
                timestamp,
                queuePath: queuePath,
                property: propertyKey, // Use the original property key, not the sanitized one
                oldValue: String(oldValue),
                newValue: String(newValue),
            });
        }
    }

    return changes;
}

/**
 * Converts an array of ChangeSet objects into the format required for the YARN API update call.
 * @param changes The array of ChangeSet objects.
 * @returns An object structured for the ConfigurationUpdateRequest.
 */
export function convertChangesToApiRequest(changes: ChangeSet[]) {
    const globalChanges: Record<string, string> = {};
    const queueChanges: Record<string, Record<string, string>> = {};
    const addQueues: Array<{ 'queue-name': string; params: Record<string, string> }> = [];
    const removeQueues: string[] = [];

    changes.forEach((change) => {
        if (change.type === 'ADD_QUEUE') {
            // Handle queue addition
            const newQueueParams: Record<string, string> = {};
            if (change.newValue) {
                Object.entries(change.newValue).forEach(([key, value]) => {
                    newQueueParams[key] = convertFormValueToYarnValue(key, value);
                });
            }

            addQueues.push({
                'queue-name': change.property, // Queue name is stored in property field
                params: newQueueParams,
            });
        } else if (change.type === 'DELETE_QUEUE') {
            // Handle queue deletion
            removeQueues.push(change.queuePath);
        } else if (change.type === 'PROPERTY_UPDATE') {
            // Handle property updates (existing logic)
            if (change.queuePath === '_global') {
                // Handle global configuration changes
                globalChanges[change.property] = convertFormValueToYarnValue(change.property, change.newValue);
            } else {
                // Handle queue-specific changes
                if (!queueChanges[change.queuePath]) {
                    queueChanges[change.queuePath] = {};
                }
                queueChanges[change.queuePath][change.property] = convertFormValueToYarnValue(
                    change.property,
                    change.newValue
                );
            }
        }
    });

    const result: Record<string, unknown> = {};

    // Add global updates if any
    if (Object.keys(globalChanges).length > 0) {
        result['global-updates'] = globalChanges;
    }

    // Add queue updates if any
    if (Object.keys(queueChanges).length > 0) {
        result['update-queue'] = Object.entries(queueChanges).map(([queuePath, params]) => ({
            'queue-name': queuePath,
            params,
        }));
    }

    // Add queue additions if any
    if (addQueues.length > 0) {
        result['add-queue'] = addQueues;
    }

    // Add queue removals if any
    if (removeQueues.length > 0) {
        result['remove-queue'] = removeQueues;
    }

    return result;
}

/**
 * Merges a queue's original data with any staged changes for that queue.
 * This is used to show the current "working state" of a queue in forms and displays.
 * @param queue The original queue data
 * @param stagedChanges Array of all staged changes
 * @returns Queue data with staged changes applied
 */
export function mergeQueueWithStagedChanges(queue: Queue, stagedChanges: ChangeSet[]): Queue {
    if (!queue || !stagedChanges || stagedChanges.length === 0) {
        return queue;
    }

    const queuePath = ((queue as Record<string, unknown>).queuePath as string) || queue.queueName;

    // Find all changes that apply to this queue
    const relevantChanges = stagedChanges.filter(
        (change) => change.queuePath === queuePath && change.type === 'PROPERTY_UPDATE'
    );

    if (relevantChanges.length === 0) {
        return queue;
    }

    // Apply changes to a copy of the queue
    const modifiedQueue = { ...queue };

    relevantChanges.forEach((change) => {
        // Apply the staged value to the queue copy
        (modifiedQueue as Record<string, unknown>)[change.property] = change.newValue;
    });

    return modifiedQueue;
}
