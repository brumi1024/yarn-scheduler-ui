/**
 * Mutation builder for YARN Capacity Scheduler configuration updates
 *
 * This module provides utilities for building mutation requests from staged changes
 * to be sent to the YARN REST API for applying configuration updates.
 */

import type { StagedChange, SchedConfUpdateInfo } from '../types';
import { SPECIAL_VALUES, MUTATION_OPERATIONS } from '~/types';
import { groupBy } from 'es-toolkit';

/**
 * Builds a complete mutation request from staged changes
 *
 * Groups changes by type (update, add, remove) and queue, then formats them
 * according to the YARN scheduler configuration API requirements.
 *
 * @param stagedChanges Array of staged changes to build into a request
 * @returns SchedConfUpdateInfo object ready to be sent to the API
 */
export function buildMutationRequest(stagedChanges: StagedChange[]): SchedConfUpdateInfo {
    const request: SchedConfUpdateInfo = {
        [MUTATION_OPERATIONS.UPDATE_QUEUE]: [],
        [MUTATION_OPERATIONS.ADD_QUEUE]: [],
        [MUTATION_OPERATIONS.REMOVE_QUEUE]: [],
        [MUTATION_OPERATIONS.GLOBAL_UPDATES]: {},
    };

    // Separate global changes from queue-specific changes
    const globalChanges = stagedChanges.filter(change => change.queuePath === SPECIAL_VALUES.GLOBAL_QUEUE_PATH);
    const queueChanges = stagedChanges.filter(change => change.queuePath !== SPECIAL_VALUES.GLOBAL_QUEUE_PATH);

    // Group queue changes by path for efficient processing
    const changesByQueue = groupBy(queueChanges, change => change.queuePath);

    const updatesByQueue = new Map<string, Record<string, string>>();
    const addsByQueue = new Map<string, Record<string, string>>();
    const removals: string[] = [];
    const globalUpdates: Record<string, string> = {};

    // Process global changes
    for (const change of globalChanges) {
        if (change.property && change.newValue !== undefined) {
            globalUpdates[change.property] = change.newValue;
        }
    }

    // Process queue changes efficiently using grouped data
    for (const [queuePath, changes] of Object.entries(changesByQueue)) {
        for (const change of changes) {
            switch (change.type) {
                case 'update': {
                    if (!change.property || change.newValue === undefined) continue;

                    const updates = updatesByQueue.get(queuePath) || {};
                    updates[change.property] = change.newValue;
                    updatesByQueue.set(queuePath, updates);
                    break;
                }
                case 'add': {
                    if (!change.property || change.newValue === undefined) continue;

                    const adds = addsByQueue.get(queuePath) || {};
                    adds[change.property] = change.newValue;
                    addsByQueue.set(queuePath, adds);
                    break;
                }
                case 'remove': {
                    removals.push(queuePath);
                    break;
                }
            }
        }
    }

    if (updatesByQueue.size > 0) {
        request[MUTATION_OPERATIONS.UPDATE_QUEUE] = Array.from(updatesByQueue.entries()).map(([queuePath, params]) => ({
            'queue-name': queuePath,
            params,
        }));
    }

    if (addsByQueue.size > 0) {
        request[MUTATION_OPERATIONS.ADD_QUEUE] = Array.from(addsByQueue.entries()).map(([queuePath, params]) => ({
            'queue-name': queuePath,
            params,
        }));
    }

    if (removals.length > 0) {
        request[MUTATION_OPERATIONS.REMOVE_QUEUE] = removals;
    }

    if (Object.keys(globalUpdates).length > 0) {
        request[MUTATION_OPERATIONS.GLOBAL_UPDATES] = globalUpdates;
    }

    return request;
}


/**
 * Builds a queue mutation object for update operations
 *
 * @param queuePath The queue path to update
 * @param changes Array of changes for this queue
 * @returns Mutation object for the queue
 */
export function buildQueueMutation(queuePath: string, changes: StagedChange[]): { 'queue-name': string; params: Record<string, string> } {
    const params: Record<string, string> = {};

    for (const change of changes) {
        if (change.queuePath === queuePath && change.property && change.newValue !== undefined) {
            params[change.property] = change.newValue;
        }
    }

    return {
        'queue-name': queuePath,
        params,
    };
}

/**
 * Extracts global property updates from staged changes
 *
 * @param changes Array of staged changes
 * @returns Record of global property updates
 */
export function buildGlobalMutation(changes: StagedChange[]): Record<string, string> {
    const globalUpdates: Record<string, string> = {};

    for (const change of changes) {
        if (change.queuePath === SPECIAL_VALUES.GLOBAL_QUEUE_PATH && change.property && change.newValue !== undefined) {
            globalUpdates[change.property] = change.newValue;
        }
    }

    return globalUpdates;
}

/**
 * Builds an add queue mutation object
 *
 * @param queuePath The queue path to add
 * @param changes Array of changes for the new queue
 * @returns Mutation object for adding the queue
 */
export function buildAddQueueMutation(queuePath: string, changes: StagedChange[]): { 'queue-name': string; params: Record<string, string> } {
    const params: Record<string, string> = {};

    for (const change of changes) {
        if (change.queuePath === queuePath && change.type === 'add' && change.property && change.newValue !== undefined) {
            params[change.property] = change.newValue;
        }
    }

    return {
        'queue-name': queuePath,
        params,
    };
}

/**
 * Extracts queue paths to remove from staged changes
 *
 * @param changes Array of staged changes
 * @returns Array of queue paths to remove
 */
export function buildRemoveQueueMutation(changes: StagedChange[]): string[] {
    const removals = new Set<string>();

    for (const change of changes) {
        if (change.type === 'remove') {
            removals.add(change.queuePath);
        }
    }

    return Array.from(removals);
}

/**
 * Groups staged changes by queue path
 *
 * @param changes Array of staged changes
 * @returns Map of queue paths to their changes
 */
export function groupChangesByQueue(changes: StagedChange[]): Map<string, StagedChange[]> {
    const grouped = groupBy(changes, change => change.queuePath);
    return new Map(Object.entries(grouped));
}

/**
 * Validates a mutation request for common issues
 *
 * @param request The mutation request to validate
 * @returns Object with valid flag and optional error message
 */
export function validateMutationRequest(request: SchedConfUpdateInfo): { valid: boolean; message?: string } {

    if (request[MUTATION_OPERATIONS.UPDATE_QUEUE]) {
        for (const update of request[MUTATION_OPERATIONS.UPDATE_QUEUE]) {
            if (!update['queue-name'] || update['queue-name'].trim() === '') {
                return { valid: false, message: 'Queue name cannot be empty' };
            }

            for (const [key, value] of Object.entries(update.params || {})) {
                if (value === '') {
                    return { valid: false, message: 'Property value cannot be empty' };
                }

                if (key === 'capacity' || key === 'maximum-capacity') {
                    const numValue = parseFloat(value);
                    if (isNaN(numValue)) {
                        return { valid: false, message: 'Capacity must be a valid number' };
                    } else if (numValue < 0 || numValue > 100) {
                        return { valid: false, message: 'Capacity must be between 0 and 100' };
                    }
                }
            }
        }
    }

    if (request[MUTATION_OPERATIONS.ADD_QUEUE]) {
        for (const add of request[MUTATION_OPERATIONS.ADD_QUEUE]) {
            if (!add['queue-name'] || add['queue-name'].trim() === '') {
                return { valid: false, message: 'Queue name cannot be empty' };
            }

            if (!add.params || !add.params.capacity) {
                return { valid: false, message: 'New queues must have capacity property' };
            }
        }
    }

    if (request[MUTATION_OPERATIONS.REMOVE_QUEUE]) {
        for (const queuePath of request[MUTATION_OPERATIONS.REMOVE_QUEUE]) {
            if (!queuePath || queuePath.trim() === '') {
                return { valid: false, message: 'Queue path cannot be empty' };
            }
        }
    }

    return { valid: true };
}
