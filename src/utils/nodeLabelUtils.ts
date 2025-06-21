import type { Queue } from '../types/Queue';

// Helper function to check if a queue is the root queue
export function isRootQueue(queuePath: string): boolean {
    return queuePath === 'root';
}

// Helper function to get parent queue path
export function getParentQueuePath(queuePath: string): string | null {
    if (isRootQueue(queuePath)) {
        return null; // Root has no parent
    }
    const parts = queuePath.split('.');
    if (parts.length <= 1) {
        return null;
    }
    return parts.slice(0, -1).join('.');
}

// Helper function to check if accessible-node-labels is set to space (default-only access)
export function isDefaultPartitionOnly(accessibleLabels: string): boolean {
    return accessibleLabels.trim() === '';
}

// Helper function to find a queue by path in a queue array
export function findQueueByPath(queues: Queue[], queuePath: string): Queue | null {
    for (const queue of queues) {
        if (queue.queuePath === queuePath) {
            return queue;
        }
        // Recursively search in children if they exist
        if (queue.queues?.queue) {
            const found = findQueueByPath(queue.queues.queue, queuePath);
            if (found) return found;
        }
    }
    return null;
}

// Helper function to resolve accessible labels with inheritance
export function getQueueAccessibleLabels(queue: Queue, allQueues: Queue[]): string[] | null {
    const accessibleLabels = (queue as Record<string, unknown>)['accessible-node-labels'];
    
    // If explicitly set, use it (even if it's empty/space)
    if (accessibleLabels !== undefined) {
        if (typeof accessibleLabels === 'string') {
            if (isDefaultPartitionOnly(accessibleLabels)) {
                return []; // Empty array means only default partition
            }
            return accessibleLabels.split(',').map(l => l.trim()).filter(l => l.length > 0);
        }
        if (Array.isArray(accessibleLabels)) {
            return accessibleLabels;
        }
    }
    
    // If not set, inherit from parent
    const parentPath = getParentQueuePath(queue.queuePath || queue.queueName);
    if (!parentPath) {
        return null; // Root queue will be handled specially
    }
    
    const parentQueue = findQueueByPath(allQueues, parentPath);
    if (parentQueue) {
        return getQueueAccessibleLabels(parentQueue, allQueues);
    }
    
    return null; // No parent found, fallback to root behavior
}

export function getQueueCapacityForLabel(
    queue: Queue, 
    label: string | null,
    allQueues?: Queue[]
): { 
    capacity: number; 
    isConfigured: boolean; 
    isInherited: boolean;
} {
    // Default case - no label selected
    if (!label) {
        return {
            capacity: queue.capacity || 0,
            isConfigured: true,
            isInherited: false,
        };
    }

    // Check if queue has access to this label
    if (!hasQueueAccessToLabel(queue, label, allQueues)) {
        return {
            capacity: 0,
            isConfigured: false,
            isInherited: false,
        };
    }

    // Check for configured capacity
    const labelCapacityKey = `accessible-node-labels.${label}.capacity`;
    const configuredCapacity = (queue as Record<string, unknown>)[labelCapacityKey];
    
    if (configuredCapacity !== undefined) {
        return {
            capacity: parseFloat(configuredCapacity),
            isConfigured: true,
            isInherited: false,
        };
    }

    // Return inherited capacity
    return {
        capacity: queue.capacity || 0,
        isConfigured: false,
        isInherited: true,
    };
}

export function hasQueueAccessToLabel(queue: Queue, label: string, allQueues?: Queue[]): boolean {
    const queuePath = queue.queuePath || queue.queueName;
    
    // Root queue always has access to all labels
    if (isRootQueue(queuePath)) {
        return true;
    }
    
    // Get accessible labels with inheritance
    const accessibleLabels = allQueues 
        ? getQueueAccessibleLabels(queue, allQueues)
        : null;
    
    // If we have explicit accessible labels (including empty array for default-only)
    if (accessibleLabels !== null) {
        return accessibleLabels.includes(label);
    }
    
    // Fallback: try to parse from queue properties directly (backward compatibility)
    const directAccessibleLabels = (queue as Record<string, unknown>)['accessible-node-labels'];
    if (directAccessibleLabels) {
        if (Array.isArray(directAccessibleLabels)) {
            return directAccessibleLabels.includes(label);
        }
        if (typeof directAccessibleLabels === 'string') {
            if (isDefaultPartitionOnly(directAccessibleLabels)) {
                return false; // Space means default-only, no labels
            }
            return directAccessibleLabels.split(',').map(l => l.trim()).includes(label);
        }
    }
    
    // Default: no access if nothing is specified and we can't resolve inheritance
    return false;
}

export function getQueueMaxCapacityForLabel(
    queue: Queue, 
    label: string | null,
    allQueues?: Queue[]
): { 
    maxCapacity: number; 
    isConfigured: boolean; 
    isInherited: boolean;
} {
    // Default case - no label selected
    if (!label) {
        return {
            maxCapacity: queue.maxCapacity || 100,
            isConfigured: true,
            isInherited: false,
        };
    }

    // Check if queue has access to this label
    if (!hasQueueAccessToLabel(queue, label, allQueues)) {
        return {
            maxCapacity: 0,
            isConfigured: false,
            isInherited: false,
        };
    }

    // Check for configured max capacity
    const labelMaxCapacityKey = `accessible-node-labels.${label}.maximum-capacity`;
    const configuredMaxCapacity = (queue as Record<string, unknown>)[labelMaxCapacityKey];
    
    if (configuredMaxCapacity !== undefined) {
        return {
            maxCapacity: parseFloat(configuredMaxCapacity as string),
            isConfigured: true,
            isInherited: false,
        };
    }

    // Return inherited max capacity
    return {
        maxCapacity: queue.maxCapacity || 100,
        isConfigured: false,
        isInherited: true,
    };
}

export function getInheritanceTooltip(
    queue: Queue,
    label: string,
    parentCapacity?: number,
    parentMaxCapacity?: number,
    allQueues?: Queue[]
): string {
    const { capacity, isInherited: isCapacityInherited } = getQueueCapacityForLabel(queue, label, allQueues);
    const { maxCapacity, isInherited: isMaxCapacityInherited } = getQueueMaxCapacityForLabel(queue, label, allQueues);
    
    const parts: string[] = [];
    
    if (!isCapacityInherited) {
        parts.push(`Configured capacity for ${label} label: ${capacity}%`);
    } else {
        parts.push(`Capacity inherited from parent: ${parentCapacity || capacity}%`);
    }
    
    if (!isMaxCapacityInherited) {
        parts.push(`Configured max capacity for ${label} label: ${maxCapacity}%`);
    } else {
        parts.push(`Max capacity inherited from parent: ${parentMaxCapacity || maxCapacity}%`);
    }
    
    if (isCapacityInherited || isMaxCapacityInherited) {
        parts.push(`(No specific ${isCapacityInherited && isMaxCapacityInherited ? 'capacities' : isCapacityInherited ? 'capacity' : 'max capacity'} configured for ${label} label)`);
    }
    
    return parts.join('\n');
}