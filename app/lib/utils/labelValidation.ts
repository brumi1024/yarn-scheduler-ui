/**
 * Node label validation utilities according to YARN Capacity Scheduler specification
 * 
 * - Pattern: ^[0-9a-zA-Z][0-9a-zA-Z-_]*$
 * - Maximum length: 255 characters
 * - Cannot use "DEFAULT" as label name (reserved)
 * - Must be unique in cluster
 */

import { SPECIAL_VALUES } from '~/lib/types';

export type ValidationResult = {
    valid: boolean;
    error?: string;
};

/**
 * Validates a node label name according to YARN specification
 * @param labelName The label name to validate
 * @param existingLabels Optional array of existing label names to check for duplicates
 * @returns Validation result with error message if invalid
 */
export function validateLabelName(labelName: string, existingLabels?: string[]): ValidationResult {
    const trimmedName = labelName.trim();
    
    // Empty name check
    if (!trimmedName) {
        return { valid: false, error: 'Label name is required' };
    }
    
    // YARN pattern validation: must start with alphanumeric, then alphanumeric, hyphen, or underscore
    const YARN_LABEL_PATTERN = /^[0-9a-zA-Z][0-9a-zA-Z-_]*$/;
    if (!YARN_LABEL_PATTERN.test(trimmedName)) {
        return { 
            valid: false, 
            error: 'Label name must start with a letter or number, and can only contain letters, numbers, hyphens, and underscores' 
        };
    }
    
    // Maximum length validation (YARN limit)
    const MAX_LABEL_LENGTH = 255;
    if (trimmedName.length > MAX_LABEL_LENGTH) {
        return { 
            valid: false, 
            error: `Label name cannot exceed ${MAX_LABEL_LENGTH} characters` 
        };
    }
    
    // Reserved name validation
    if (trimmedName.toUpperCase() === 'DEFAULT') {
        return { 
            valid: false, 
            error: 'Cannot use "DEFAULT" as a label name (reserved)' 
        };
    }
    
    // Duplicate name validation
    if (existingLabels && existingLabels.includes(trimmedName)) {
        return { 
            valid: false, 
            error: 'Label already exists' 
        };
    }
    
    return { valid: true };
}

/**
 * Validates if a label name is safe to remove
 * @param labelName The label name to check
 * @param nodeAssignments Map of nodeId -> assigned labels to check if label is in use
 * @param queueConfigurations Map of queuePath -> accessible labels to check if queues use this label
 * @returns Validation result with error if label cannot be removed
 */
export function validateLabelRemoval(
    labelName: string,
    nodeAssignments: Map<string, string[]>,
    queueConfigurations?: Map<string, string[]>
): ValidationResult {
    // Check if any nodes are assigned to this label
    const nodesWithLabel = Array.from(nodeAssignments.entries())
        .filter(([_, labels]) => labels.includes(labelName))
        .map(([nodeId]) => nodeId);
    
    if (nodesWithLabel.length > 0) {
        return {
            valid: false,
            error: `Cannot remove label "${labelName}": ${nodesWithLabel.length} node(s) are assigned to this label. Reassign nodes first.`
        };
    }
    
    // Check if any queues are configured to use this label
    if (queueConfigurations) {
        const queuesWithLabel = Array.from(queueConfigurations.entries())
            .filter(([_, labels]) => labels.includes(labelName))
            .map(([queuePath]) => queuePath);
        
        if (queuesWithLabel.length > 0) {
            return {
                valid: false,
                error: `Cannot remove label "${labelName}": ${queuesWithLabel.length} queue(s) are configured to use this label. Update queue configurations first.`
            };
        }
    }
    
    return { valid: true };
}

/**
 * Validates label capacity assignments for a set of sibling queues
 * @param siblingQueues Array of queue paths that are siblings under the same parent
 * @param labelName The label to validate capacities for
 * @param capacities Map of queuePath -> capacity percentage for the label
 * @returns Validation result with error if capacities don't sum to 100%
 */
export function validateLabelCapacities(
    siblingQueues: string[],
    labelName: string,
    capacities: Map<string, number>
): ValidationResult {
    const totalCapacity = siblingQueues.reduce((sum, queuePath) => {
        return sum + (capacities.get(queuePath) || 0);
    }, 0);
    
    // Allow small floating point tolerance
    const tolerance = 0.001;
    if (Math.abs(totalCapacity - 100) > tolerance) {
        return {
            valid: false,
            error: `Label "${labelName}" capacities must sum to 100% across sibling queues (current: ${totalCapacity.toFixed(1)}%)`
        };
    }
    
    return { valid: true };
}

/**
 * Validates that a queue can access a specific label based on parent queue configuration
 * @param queuePath The queue path to validate
 * @param labelName The label the queue wants to access
 * @param parentAccessibleLabels Labels that the parent queue can access
 * @returns Validation result with error if queue cannot access the label
 */
export function validateQueueLabelAccess(
    queuePath: string,
    labelName: string,
    parentAccessibleLabels: string[]
): ValidationResult {
    // Root queue can access any label (represented as "*")
    if (queuePath === SPECIAL_VALUES.ROOT_QUEUE_NAME) {
        return { valid: true };
    }
    
    // If parent has access to "*", child can access any label
    if (parentAccessibleLabels.includes(SPECIAL_VALUES.ALL_USERS_ACL)) {
        return { valid: true };
    }
    
    // Child can only access labels that parent can access
    if (!parentAccessibleLabels.includes(labelName)) {
        return {
            valid: false,
            error: `Queue "${queuePath}" cannot access label "${labelName}": parent queue does not have access to this label`
        };
    }
    
    return { valid: true };
}