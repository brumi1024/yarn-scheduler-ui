import { useMemo } from 'react';
import { useConfigParser } from '../../../yarn-parser/useConfigParser';
import { useChangesStore } from '../../../store';
import { useConfigurationQuery } from '../../../hooks/useYarnApi';
import type { ChangeSet } from '../../../types/Configuration';
import type { ParsedQueue } from '../../../types/Queue';

/**
 * Apply staged changes to a deep copy of the parsed queue hierarchy
 */
function applyChangesToHierarchy(hierarchy: ParsedQueue, changes: ChangeSet[]): ParsedQueue {
    // Use structuredClone for better performance than JSON parse/stringify
    const clonedHierarchy = structuredClone ? structuredClone(hierarchy) : JSON.parse(JSON.stringify(hierarchy));

    // Sort changes chronologically
    const sortedChanges = [...changes].sort((a, b) => (a.timestamp?.getTime() || 0) - (b.timestamp?.getTime() || 0));

    for (const change of sortedChanges) {
        applyChangeToQueue(clonedHierarchy, change);
    }

    return clonedHierarchy;
}

function applyChangeToQueue(queue: ParsedQueue, change: ChangeSet): boolean {
    // Apply change if this is the target queue
    if (queue.path === change.queuePath) {
        switch (change.type) {
            case 'PROPERTY_UPDATE':
                // Update the property in the queue's properties map
                queue.properties[change.property] = change.newValue;

                // Update parsed values for key properties
                if (change.property === 'capacity') {
                    queue.capacity = {
                        raw: String(change.newValue),
                        numericValue: parseFloat(String(change.newValue)),
                        mode: 'percentage', // Will be determined by parser
                    };
                } else if (change.property === 'maximum-capacity') {
                    queue.maxCapacity = {
                        raw: String(change.newValue),
                        numericValue: parseFloat(String(change.newValue)),
                        mode: 'percentage',
                    };
                } else if (change.property === 'state') {
                    queue.state = change.newValue as 'RUNNING' | 'STOPPED';
                }

                // Mark as modified (unless it's new)
                if (!queue.stagedStatus || queue.stagedStatus !== 'new') {
                    queue.stagedStatus = 'modified';
                }
                return true;

            case 'DELETE_QUEUE':
                queue.stagedStatus = 'deleted';
                return true;

            case 'ADD_QUEUE':
                // For ADD_QUEUE, we need to add to parent's children
                return false; // Handle in parent
        }
    }

    // Check if this queue should add a new child
    if (change.type === 'ADD_QUEUE') {
        const parentPath = change.queuePath.substring(0, change.queuePath.lastIndexOf('.'));
        if (queue.path === parentPath) {
            const newQueueName = change.queuePath.split('.').pop() || '';
            const newQueueData = change.newValue as Record<string, any>;

            const newQueue: ParsedQueue = {
                name: newQueueName,
                path: change.queuePath,
                parent: parentPath,
                capacity: {
                    raw: String(newQueueData.capacity || '0'),
                    numericValue: parseFloat(String(newQueueData.capacity || '0')),
                    mode: 'percentage',
                },
                maxCapacity: {
                    raw: String(newQueueData['maximum-capacity'] || '100'),
                    numericValue: parseFloat(String(newQueueData['maximum-capacity'] || '100')),
                    mode: 'percentage',
                },
                state: (newQueueData.state || 'RUNNING') as 'RUNNING' | 'STOPPED',
                properties: { ...newQueueData },
                children: [],
                isLeaf: true,
                stagedStatus: 'new',
            };

            if (!queue.children) {
                queue.children = [];
            }
            queue.children.push(newQueue);
            queue.isLeaf = false;

            // Mark parent as modified
            if (!queue.stagedStatus || queue.stagedStatus !== 'new') {
                queue.stagedStatus = 'modified';
            }
            return true;
        }
    }

    // Recursively apply to children
    let applied = false;
    for (const child of queue.children || []) {
        if (applyChangeToQueue(child, change)) {
            applied = true;
        }
    }

    return applied;
}

export function useQueueConfiguration() {
    const configQuery = useConfigurationQuery();
    const { data: parseResult, isLoading: isParsing, error: parseError } = useConfigParser(configQuery.data);
    const stagedChanges = useChangesStore((state) => state.stagedChanges);

    const processedHierarchy = useMemo(() => {
        if (!parseResult?.queues?.[0]) {
            return null;
        }

        // Apply staged changes to the parsed configuration
        return applyChangesToHierarchy(parseResult.queues[0], stagedChanges);
    }, [parseResult, stagedChanges]);

    const getQueueByPath = (path: string): ParsedQueue | null => {
        if (!processedHierarchy) return null;

        const findQueue = (queue: ParsedQueue): ParsedQueue | null => {
            if (queue.path === path) {
                return queue;
            }

            for (const child of queue.children || []) {
                const found = findQueue(child);
                if (found) return found;
            }

            return null;
        };

        return findQueue(processedHierarchy);
    };

    return {
        hierarchy: processedHierarchy,
        getQueueByPath,
        isLoading: configQuery.isLoading || isParsing,
        error: configQuery.error || parseError,
    };
}
