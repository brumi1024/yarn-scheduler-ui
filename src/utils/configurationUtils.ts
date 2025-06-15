/**
 * Utility functions for converting form data to YARN configuration format
 * and creating ChangeSet objects for the staged changes system
 */

import { nanoid } from 'nanoid';
import type { ChangeSet } from '../types/Configuration';
import type { Queue } from '../types/Queue';

/**
 * Maps form field names to human-readable descriptions
 */
const PROPERTY_DESCRIPTIONS: Record<string, string> = {
    capacity: 'Queue Capacity',
    'maximum-capacity': 'Maximum Queue Capacity',
    state: 'Queue State',
    'user-limit-factor': 'User Limit Factor',
    'max-parallel-apps': 'Maximum Parallel Applications',
    'ordering-policy': 'Application Ordering Policy',
    disable_preemption: 'Preemption Disabled',
    'auto-create-child-queue.enabled': 'Auto-Create Child Queues',
    'auto-queue-creation-v2.enabled': 'Auto-Queue Creation V2',
    'auto-queue-creation-v2.max-queues': 'Maximum Auto-Created Queues',
    'minimum-user-limit-percent': 'Minimum User Limit Percent',
    'maximum-applications': 'Maximum Applications',
    'maximum-am-resource-percent': 'Maximum AM Resource Percent',
    priority: 'Queue Priority',
    acl_submit_applications: 'Submit Applications ACL',
    acl_administer_queue: 'Administer Queue ACL',
    'accessible-node-labels': 'Accessible Node Labels',
    'default-node-label-expression': 'Default Node Label Expression',
    'intra-queue-preemption.disable_preemption': 'Intra-Queue Preemption Disabled',
};

/**
 * Converts form data values to appropriate YARN configuration format
 */
function convertFormValueToYarnValue(property: string, value: unknown): string {
    if (value === null || value === undefined) {
        return '';
    }

    // Handle boolean values
    if (typeof value === 'boolean') {
        return value.toString();
    }

    // Handle capacity percentages - remove % suffix if present
    if ((property === 'capacity' || property === 'maximum-capacity') && typeof value === 'string') {
        return value.replace('%', '');
    }

    // Handle array values (like accessible-node-labels)
    if (Array.isArray(value)) {
        return value.join(',');
    }

    // Default: convert to string
    return String(value);
}

/**
 * Gets the current value of a property from a queue object for comparison
 */
function getCurrentQueuePropertyValue(
    queue: Queue | Record<string, unknown> | null | undefined,
    property: string
): string {
    if (!queue) return '';

    switch (property) {
        case 'capacity':
            return String(queue.capacity || 0);
        case 'maximum-capacity':
            return String(queue.maxCapacity || 100);
        case 'state':
            return String(queue.state || 'RUNNING');
        case 'user-limit-factor':
            return String(queue.userLimitFactor || 1);
        case 'max-parallel-apps':
            return String(queue.maxApplications || '');
        case 'ordering-policy':
            return String(queue.orderingPolicy || 'fifo');
        case 'disable_preemption':
            return String(queue.preemptionDisabled || false);
        case 'auto-create-child-queue.enabled':
            return String(queue.autoCreateChildQueueEnabled || false);
        case 'minimum-user-limit-percent':
            return String((queue as Record<string, unknown>).minimumUserLimitPercent || 100);
        case 'maximum-applications':
            return String(queue.maxApplications || -1);
        case 'maximum-am-resource-percent':
            return String((queue as Record<string, unknown>).maxAMResourcePercent || 0.1);
        case 'priority':
            return String(queue.priority || 0);
        case 'acl_submit_applications':
            return String((queue as Record<string, unknown>).submitACL || '');
        case 'acl_administer_queue':
            return String((queue as Record<string, unknown>).adminACL || '');
        case 'accessible-node-labels': {
            const labels = queue.accessibleNodeLabels;
            return Array.isArray(labels) ? labels.join(',') : String(labels || '');
        }
        case 'default-node-label-expression':
            return String(queue.defaultNodeLabelExpression || '');
        case 'intra-queue-preemption.disable_preemption':
            return String(queue.intraQueuePreemptionDisabled || false);
        default: {
            // Try to get from properties object or return empty string
            const properties = (queue as Record<string, unknown>).properties as Record<string, unknown> | undefined;
            return String(properties?.[property] || '');
        }
    }
}

/**
 * Creates ChangeSet objects from form data changes
 */
export function createChangeSetsFromFormData(
    queuePath: string,
    formData: Record<string, unknown>,
    currentQueue?: Queue | Record<string, unknown>
): ChangeSet[] {
    const changes: ChangeSet[] = [];
    const timestamp = new Date();

    for (const [formFieldName, newValue] of Object.entries(formData)) {
        // Skip template properties for now - they need special handling
        if (formFieldName.startsWith('leaf-queue-template.')) {
            continue;
        }

        // Build YARN property key
        const yarnProperty = formFieldName;

        // Convert form value to YARN format
        const yarnValue = convertFormValueToYarnValue(yarnProperty, newValue);

        // Get current value for comparison
        const currentValue = currentQueue ? getCurrentQueuePropertyValue(currentQueue, yarnProperty) : '';

        // Only create change if value actually changed
        if (yarnValue !== currentValue) {
            const description = PROPERTY_DESCRIPTIONS[formFieldName] || formFieldName;

            changes.push({
                id: nanoid(),
                timestamp,
                type: 'update-queue',
                queueName: queuePath,
                property: yarnProperty,
                oldValue: currentValue,
                newValue: yarnValue,
                description: `Update ${description} for queue ${queuePath}: ${currentValue} → ${yarnValue}`,
            });
        }
    }

    return changes;
}

/**
 * Converts form data to YARN configuration update format
 * This format is used when actually applying changes to the YARN API
 */
export function convertFormDataToYarnConfig(formData: Record<string, unknown>): Record<string, string> {
    const yarnConfig: Record<string, string> = {};

    for (const [formFieldName, value] of Object.entries(formData)) {
        // Skip template properties for now
        if (formFieldName.startsWith('leaf-queue-template.')) {
            continue;
        }

        const yarnProperty = formFieldName;
        yarnConfig[yarnProperty] = convertFormValueToYarnValue(yarnProperty, value);
    }

    return yarnConfig;
}

/**
 * Validates that a change can be applied (basic validation)
 */
export function validateChange(change: ChangeSet): { valid: boolean; error?: string } {
    if (!change.queueName) {
        return { valid: false, error: 'Queue name is required' };
    }

    if (!change.property) {
        return { valid: false, error: 'Property name is required' };
    }

    if (change.newValue === undefined || change.newValue === null) {
        return { valid: false, error: 'New value is required' };
    }

    // Add property-specific validations
    switch (change.property) {
        case 'capacity':
        case 'maximum-capacity': {
            const numValue = parseFloat(change.newValue);
            if (isNaN(numValue) || numValue < 0 || numValue > 100) {
                return { valid: false, error: 'Capacity must be a number between 0 and 100' };
            }
            break;
        }

        case 'state':
            if (!['RUNNING', 'STOPPED'].includes(change.newValue)) {
                return { valid: false, error: 'State must be RUNNING or STOPPED' };
            }
            break;

        case 'user-limit-factor': {
            const ulfValue = parseFloat(change.newValue);
            if (isNaN(ulfValue) || ulfValue < 0) {
                return { valid: false, error: 'User limit factor must be a positive number' };
            }
            break;
        }
    }

    return { valid: true };
}

/**
 * Creates a summary description of multiple changes for display
 */
export function createChangesSummary(changes: ChangeSet[]): string {
    if (changes.length === 0) {
        return 'No changes';
    }

    if (changes.length === 1) {
        return changes[0].description;
    }

    const queueNames = [...new Set(changes.map((c) => c.queueName))];
    const properties = [...new Set(changes.map((c) => c.property))];

    if (queueNames.length === 1) {
        return `${changes.length} changes to queue ${queueNames[0]} (${properties.join(', ')})`;
    } else {
        return `${changes.length} changes across ${queueNames.length} queues`;
    }
}
