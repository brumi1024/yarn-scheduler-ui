/**
 * Unified change log for tracking scheduler configuration modifications.
 * Simplifies the complex nested structure used in pending changes.
 */
class ChangeLog {
    constructor() {
        this.changes = [];
        this._changeId = 0;
    }

    /**
     * Adds a change to the log
     * @param {Object} change - Change object
     * @param {string} change.type - 'add'|'update'|'delete'
     * @param {string} change.target - 'queue'|'global'
     * @param {string} change.path - Queue path or 'global'
     * @param {Map<string, string>} change.properties - Full YARN keys to values
     * @param {Map<string, string>} [change.oldProperties] - Original values for updates
     */
    addChange(change) {
        const changeEntry = {
            id: this._generateChangeId(),
            type: change.type,
            target: change.target,
            path: change.path,
            properties: new Map(change.properties),
            oldProperties: change.oldProperties ? new Map(change.oldProperties) : new Map(),
            timestamp: Date.now()
        };
        
        this._removeConflictingChanges(changeEntry);
        this.changes.push(changeEntry);
    }

    /**
     * Removes changes that conflict with the new change
     */
    _removeConflictingChanges(newChange) {
        if (newChange.type === 'delete' && newChange.target === 'queue') {
            this.changes = this.changes.filter(change => 
                !(change.target === 'queue' && 
                  (change.path === newChange.path || change.path.startsWith(newChange.path + '.')))
            );
        } else if (newChange.target === 'queue' && newChange.path) {
            const existingIndex = this.changes.findIndex(change => 
                change.target === 'queue' && change.path === newChange.path
            );
            if (existingIndex !== -1) {
                if (newChange.type === 'add') {
                    this.changes.splice(existingIndex, 1);
                } else if (newChange.type === 'update') {
                    const existing = this.changes[existingIndex];
                    if (existing.type === 'add') {
                        for (const [key, value] of newChange.properties) {
                            existing.properties.set(key, value);
                        }
                        return;
                    } else {
                        this.changes.splice(existingIndex, 1);
                    }
                }
            }
        }
    }

    /**
     * Gets all changes for a specific queue path
     */
    getChangesForPath(path) {
        return this.changes.filter(change => change.path === path);
    }

    /**
     * Gets all queue additions
     */
    getQueueAdditions() {
        return this.changes.filter(change => 
            change.type === 'add' && change.target === 'queue'
        );
    }

    /**
     * Gets all queue updates
     */
    getQueueUpdates() {
        return this.changes.filter(change => 
            change.type === 'update' && change.target === 'queue'
        );
    }

    /**
     * Gets all queue deletions
     */
    getQueueDeletions() {
        return this.changes.filter(change => 
            change.type === 'delete' && change.target === 'queue'
        );
    }

    /**
     * Gets all global configuration changes
     */
    getGlobalChanges() {
        return this.changes.filter(change => change.target === 'global');
    }


    /**
     * Converts to API payload format
     */
    getApiPayload() {
        const payload = {
            addQueues: [],
            updateQueues: [],
            removeQueues: [],
            globalUpdates: {}
        };

        for (const change of this.changes) {
            if (change.target === 'queue') {
                if (change.type === 'add') {
                    const params = {};
                    for (const [fullKey, value] of change.properties) {
                        const simpleKey = PropertyKeyMapper.toSimpleKey(fullKey);
                        if (simpleKey && simpleKey !== '_ui_capacityMode') {
                            params[simpleKey] = value;
                        }
                    }
                    payload.addQueues.push({
                        queueName: change.path,
                        params
                    });
                } else if (change.type === 'update') {
                    const params = {};
                    for (const [fullKey, value] of change.properties) {
                        const simpleKey = PropertyKeyMapper.toSimpleKey(fullKey);
                        if (simpleKey && simpleKey !== '_ui_capacityMode') {
                            params[simpleKey] = value;
                        }
                    }
                    payload.updateQueues.push({
                        queueName: change.path,
                        params
                    });
                } else if (change.type === 'delete') {
                    payload.removeQueues.push(change.path);
                }
            } else if (change.target === 'global') {
                for (const [fullKey, value] of change.properties) {
                    payload.globalUpdates[fullKey] = value;
                }
            }
        }

        return payload;
    }

    /**
     * Checks if there are any pending changes
     */
    hasChanges() {
        return this.changes.length > 0;
    }

    /**
     * Clears all changes
     */
    clear() {
        this.changes = [];
        this._changeId = 0;
    }

    /**
     * Removes a specific change by ID
     */
    removeChange(changeId) {
        this.changes = this.changes.filter(change => change.id !== changeId);
    }

    /**
     * Gets change summary for UI display
     */
    getSummary() {
        const summary = {
            added: 0,
            modified: 0,
            deleted: 0,
            global: 0
        };

        for (const change of this.changes) {
            if (change.target === 'queue') {
                if (change.type === 'add') summary.added++;
                else if (change.type === 'update') summary.modified++;
                else if (change.type === 'delete') summary.deleted++;
            } else if (change.target === 'global') {
                summary.global++;
            }
        }

        return summary;
    }

    /**
     * Gets all changes in format expected by ChangePreview
     * @returns {Array} Array of changes with ChangePreview-compatible format
     */
    getChanges() {
        const formattedChanges = [];
        
        for (const change of this.changes) {
            if (change.target === 'queue') {
                if (change.type === 'delete') {
                    // For deletions, just add one change for the entire queue
                    formattedChanges.push({
                        id: change.id,
                        operation: OPERATION_TYPES.DELETE,
                        queuePath: change.path,
                        propertyKey: null,
                        oldValue: 'Queue',
                        newValue: null,
                        timestamp: change.timestamp
                    });
                } else {
                    // For additions and updates, create one change per property
                    for (const [fullKey, value] of change.properties) {
                        // Skip UI helper fields
                        const simpleKey = PropertyKeyMapper.toSimpleKey(fullKey);
                        if (simpleKey === '_ui_capacityMode') continue;
                        
                        const oldValue = change.type === 'update' 
                            ? (change.oldProperties ? change.oldProperties.get(fullKey) : null)
                            : undefined;
                        
                        formattedChanges.push({
                            id: `${change.id}-${fullKey}`,
                            operation: change.type === 'add' ? OPERATION_TYPES.ADD : OPERATION_TYPES.UPDATE,
                            queuePath: change.path,
                            propertyKey: fullKey,
                            oldValue: oldValue,
                            newValue: value,
                            timestamp: change.timestamp
                        });
                    }
                }
            } else if (change.target === 'global') {
                // For global changes, create one change per property
                for (const [fullKey, value] of change.properties) {
                    formattedChanges.push({
                        id: `${change.id}-${fullKey}`,
                        operation: OPERATION_TYPES.UPDATE,
                        queuePath: null,
                        propertyKey: fullKey,
                        oldValue: null,
                        newValue: value,
                        timestamp: change.timestamp
                    });
                }
            }
        }
        
        return formattedChanges;
    }

    _generateChangeId() {
        return `change_${++this._changeId}_${Date.now()}`;
    }
}