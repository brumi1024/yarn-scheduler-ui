import type { PropertyChange } from '../../types/types';

interface QueueOperation {
    'queue-name': string;
    params: Record<string, string>;
}

interface APIPayload {
    'add-queue'?: QueueOperation[];
    'update-queue'?: QueueOperation[];
    'remove-queue'?: string[];
    'global-updates'?: Record<string, string>;
}

/**
 * Formats property changes into YARN Capacity Scheduler Mutation API format
 * @param changes Map of property changes from the store
 * @returns JSON payload for the API
 */
export function formatChangesForAPI(changes: Map<string, PropertyChange>): APIPayload {
    const payload: APIPayload = {};
    
    // Group changes by queue and operation type
    const queueOperations = new Map<string, {
        added: boolean;
        removed: boolean;
        updates: Map<string, string>;
    }>();
    
    // Track global configuration changes
    const globalUpdates = new Map<string, string>();
    
    // Track queue additions and removals by analyzing .queues property changes
    const queueListChanges = new Map<string, { oldQueues: string[], newQueues: string[] }>();
    
    // First pass: identify queue list changes
    for (const [key, change] of changes) {
        if (key.endsWith('.queues')) {
            const parentPath = change.queuePath;
            const oldQueues = change.oldValue ? change.oldValue.split(',').map(q => q.trim()) : [];
            const newQueues = change.newValue ? change.newValue.split(',').map(q => q.trim()) : [];
            queueListChanges.set(parentPath, { oldQueues, newQueues });
        }
    }
    
    // Identify added and removed queues
    const addedQueues = new Set<string>();
    const removedQueues = new Set<string>();
    
    for (const [parentPath, { oldQueues, newQueues }] of queueListChanges) {
        // Find removed queues
        for (const oldQueue of oldQueues) {
            if (!newQueues.includes(oldQueue)) {
                const queuePath = parentPath === 'root' ? `root.${oldQueue}` : `${parentPath}.${oldQueue}`;
                removedQueues.add(queuePath);
            }
        }
        
        // Find added queues
        for (const newQueue of newQueues) {
            if (!oldQueues.includes(newQueue)) {
                const queuePath = parentPath === 'root' ? `root.${newQueue}` : `${parentPath}.${newQueue}`;
                addedQueues.add(queuePath);
            }
        }
    }
    
    // Second pass: process all property changes
    for (const [key, change] of changes) {
        const queuePath = change.queuePath;
        
        // Skip .queues properties as we've already processed them
        if (key.endsWith('.queues')) {
            continue;
        }
        
        // Check if this is a global property (no queuePath or empty queuePath)
        if (!queuePath || queuePath === '') {
            // Global property - store directly with the full key
            globalUpdates.set(key, change.newValue);
            continue;
        }
        
        // Initialize queue operation tracking
        if (!queueOperations.has(queuePath)) {
            queueOperations.set(queuePath, {
                added: addedQueues.has(queuePath),
                removed: removedQueues.has(queuePath),
                updates: new Map()
            });
        }
        
        // Extract property name from the full key
        const prefix = `yarn.scheduler.capacity.${queuePath}.`;
        const propertyName = key.startsWith(prefix) ? key.substring(prefix.length) : key;
        
        // Store the update
        queueOperations.get(queuePath)!.updates.set(propertyName, change.newValue);
    }
    
    // Build the payload
    const addQueueOps: QueueOperation[] = [];
    const updateQueueOps: QueueOperation[] = [];
    
    for (const [queuePath, operation] of queueOperations) {
        if (operation.updates.size === 0) {
            continue;
        }
        
        const params: Record<string, string> = {};
        for (const [prop, value] of operation.updates) {
            params[prop] = value;
        }
        
        const queueOp: QueueOperation = {
            'queue-name': queuePath,
            params
        };
        
        if (operation.added) {
            addQueueOps.push(queueOp);
        } else if (!operation.removed) {
            updateQueueOps.push(queueOp);
        }
    }
    
    // Add operations to payload if they exist
    if (globalUpdates.size > 0) {
        payload['global-updates'] = Object.fromEntries(globalUpdates);
    }
    
    if (addQueueOps.length > 0) {
        payload['add-queue'] = addQueueOps;
    }
    
    if (updateQueueOps.length > 0) {
        payload['update-queue'] = updateQueueOps;
    }
    
    if (removedQueues.size > 0) {
        payload['remove-queue'] = Array.from(removedQueues);
    }
    
    return payload;
}