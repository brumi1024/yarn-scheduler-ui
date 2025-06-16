import { nanoid } from 'nanoid';
import type { ChangeSet } from '../types/Configuration';
import type { Queue } from '../types/Queue';
import { QUEUE_PROPERTIES } from '../config/properties';

/**
 * Converts form data values to the string format required by YARN configuration.
 * @param propertyKey The key of the property (e.g., 'capacity').
 * @param value The value from the form.
 * @returns A string formatted for YARN configuration.
 */
function convertFormValueToYarnValue(propertyKey: string, value: unknown): string {
    const definition = QUEUE_PROPERTIES[propertyKey];
    if (!definition) {
        // Fallback for unknown properties
        return String(value ?? '');
    }

    if (value === null || value === undefined) {
        return '';
    }

    // For 'capacity' type, the value is already in the correct string format (e.g., "10%", "5w").
    if (definition.type === 'capacity') {
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
export function createChangeSetsFromFormData(
    queuePath: string,
    formData: Record<string, unknown>,
    currentQueue: Queue | null
): ChangeSet[] {
    const changes: ChangeSet[] = [];
    const timestamp = new Date();

    for (const [key, newValue] of Object.entries(formData)) {
        const definition = QUEUE_PROPERTIES[key];
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
                timestamp,
                queuePath: queuePath,
                property: key,
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
    const changesByQueue = changes.reduce(
        (acc, change) => {
            if (!acc[change.queuePath]) {
                acc[change.queuePath] = {};
            }
            // The YARN API expects the property key without the full path prefix
            const yarnPropertyKey = change.property;
            acc[change.queuePath][yarnPropertyKey] = convertFormValueToYarnValue(yarnPropertyKey, change.newValue);
            return acc;
        },
        {} as Record<string, Record<string, string>>
    );

    return {
        'update-queue': Object.entries(changesByQueue).map(([queuePath, params]) => ({
            'queue-name': queuePath,
            params,
        })),
    };
}
