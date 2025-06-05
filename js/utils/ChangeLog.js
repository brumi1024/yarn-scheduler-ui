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
     */
    addChange(change) {
        const changeEntry = {
            id: this._generateChangeId(),
            type: change.type,
            target: change.target,
            path: change.path,
            properties: new Map(change.properties),
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
     * Converts to legacy API format for backward compatibility
     */
    toLegacyFormat() {
        const legacy = {
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
                        if (simpleKey) {
                            params[simpleKey] = value;
                        }
                    }
                    legacy.addQueues.push({
                        queueName: change.path,
                        params
                    });
                } else if (change.type === 'update') {
                    const params = {};
                    for (const [fullKey, value] of change.properties) {
                        const simpleKey = PropertyKeyMapper.toSimpleKey(fullKey);
                        if (simpleKey) {
                            params[simpleKey] = value;
                        }
                    }
                    legacy.updateQueues.push({
                        queueName: change.path,
                        params
                    });
                } else if (change.type === 'delete') {
                    legacy.removeQueues.push(change.path);
                }
            } else if (change.target === 'global') {
                for (const [fullKey, value] of change.properties) {
                    legacy.globalUpdates[fullKey] = value;
                }
            }
        }

        return legacy;
    }

    /**
     * Converts to API payload format
     */
    getApiPayload() {
        return this.toLegacyFormat();
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
            updated: 0,
            deleted: 0,
            global: 0
        };

        for (const change of this.changes) {
            if (change.target === 'queue') {
                if (change.type === 'add') summary.added++;
                else if (change.type === 'update') summary.updated++;
                else if (change.type === 'delete') summary.deleted++;
            } else if (change.target === 'global') {
                summary.global++;
            }
        }

        return summary;
    }

    _generateChangeId() {
        return `change_${++this._changeId}_${Date.now()}`;
    }
}