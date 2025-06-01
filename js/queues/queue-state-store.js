const ADD_OP = "ADD";
const DELETE_OP = "DELETE";
const UPDATE_OP = "UPDATE";

class QueueStateStore {
    constructor() {
        this._schedulerTrieInstance = null;
        this._cachedQueueHierarchy = null;
        this._changes = new Map(); // Stores staged changes: { path -> { op: string, change: object } }
    }

    // --- Private Helper Methods (by convention or using # if desired) ---
    _crtElement(op, change) {
        return {op: op, change: change};
    }

    _iter(op) {
        return Array.from(this._changes.entries())
            .filter(entry => entry[1].op === op)
            .map(entry => ({path: entry[0], data: entry[1]})); // Return more structured data
    }

    _getAllQueuePathsFromHierarchy(currentQueueNode, pathsSet) {
        if (!currentQueueNode || !currentQueueNode.path) return;
        pathsSet.add(currentQueueNode.path);
        if (currentQueueNode.children) {
            for (const childName in currentQueueNode.children) {
                this._getAllQueuePathsFromHierarchy(currentQueueNode.children[childName], pathsSet);
            }
        }
    }

    /**
     * Private helper to recursively find a queue node within a plain hierarchy object.
     * This hierarchy object is the one returned by _schedulerTrieInstance.buildQueueHierarchyObject().
     * @param {string} path - The path of the queue to find.
     * @param {Object} currentQueueNode - The current node in the hierarchy to search from.
     * @returns {Object|null} The queue node if found, otherwise null.
     */
    _findNodeInRawHierarchy(path, currentQueueNode) {
        if (!currentQueueNode) {
            return null;
        }
        if (currentQueueNode.path === path) {
            return currentQueueNode;
        }
        if (currentQueueNode.children) {
            for (const childName in currentQueueNode.children) {
                // Ensure it's a direct property, not from prototype
                if (Object.prototype.hasOwnProperty.call(currentQueueNode.children, childName)) {
                    const found = this._findNodeInRawHierarchy(path, currentQueueNode.children[childName]);
                    if (found) {
                        return found;
                    }
                }
            }
        }
        return null;
    }

    // --- Public API ---
    setSchedulerTrie(trieInstance) {
        this._schedulerTrieInstance = trieInstance;
        this._cachedQueueHierarchy = null; // Invalidate cache
        // console.log("Scheduler Trie set in QueueStateStore instance:", this._schedulerTrieInstance);
    }

    getQueueHierarchy() {
        if (!this._schedulerTrieInstance) {
            console.error("Scheduler Trie not initialized in QueueStateStore.");
            return null;
        }
        if (this._cachedQueueHierarchy) {
            return this._cachedQueueHierarchy;
        }
        this._cachedQueueHierarchy = this._schedulerTrieInstance.buildQueueHierarchyObject();
        return this._cachedQueueHierarchy;
    }

    /**
     * Retrieves the effective state of a queue, including pending changes.
     * @param {string} path - The full path of the queue.
     * @returns {Object|null} The queue object with changes applied, or null if not found.
     */
    getQueue(path) {
        const rawHierarchy = this.getQueueHierarchy(); // Gets base structure from Trie
        let baseQueueNode = null;

        if (rawHierarchy) {
            // Use the NEW private helper to search the raw hierarchy object
            baseQueueNode = this._findNodeInRawHierarchy(path, rawHierarchy);
        }

        const stagedChangeEntry = this._changes.get(path);
        let queueToReturn = null;

        if (baseQueueNode) {
            queueToReturn = JSON.parse(JSON.stringify(baseQueueNode));
            queueToReturn.properties = new Map(Object.entries(baseQueueNode.properties || {}));
        } else if (stagedChangeEntry && stagedChangeEntry.op === ADD_OP) {
            // This is a new queue, not in the base hierarchy.
            const newQueueBlueprint = stagedChangeEntry.change.newQueueData || stagedChangeEntry.change;
            queueToReturn = JSON.parse(JSON.stringify(newQueueBlueprint)); // Clone blueprint
            // Ensure 'properties' is a Map and core fields are present
            queueToReturn.properties = new Map(Object.entries(newQueueBlueprint.properties || {}));
            queueToReturn.children = queueToReturn.children || {};
            queueToReturn.path = queueToReturn.path || path;
            queueToReturn.name = queueToReturn.name || path.split('.').pop();
            // New queues don't have a 'level' from the trie, so calculate it.
            queueToReturn.level = (queueToReturn.path || "").split(".").length - 1;
        } else {
            // Queue not found in base hierarchy and not a pending addition.
            return null;
        }

        // Apply pending property modifications if it's an UPDATE operation.
        // The 'change' object for UPDATE_OP stores full YARN property names as keys.
        if (stagedChangeEntry && stagedChangeEntry.op === UPDATE_OP) {
            const modifications = stagedChangeEntry.change; // This is the cumulativeModifications object
            if (modifications) {
                for (const fullYarnPropName in modifications) {
                    if (Object.hasOwnProperty.call(modifications, fullYarnPropName)) {
                        const value = modifications[fullYarnPropName];
                        if (fullYarnPropName === '_ui_capacityMode') {
                            queueToReturn.capacityMode = value; // Apply UI hint directly
                        } else {
                            // Extract simpleKey for the properties map
                            let simpleKey = fullYarnPropName;
                            const prefixToRemove = `yarn.scheduler.capacity.${path}.`;
                            if (fullYarnPropName.startsWith(prefixToRemove)) {
                                simpleKey = fullYarnPropName.substring(prefixToRemove.length);
                            } else { // Fallback if not path specific (e.g. older format or error)
                                simpleKey = fullYarnPropName.substring(fullYarnPropName.lastIndexOf('.') + 1);
                            }
                            queueToReturn.properties.set(simpleKey, value);
                        }
                    }
                }
            }
        }

        // Ensure top-level convenience fields are synced with the (potentially modified) properties map.
        // This needs to be done for both existing queues (baseQueueNode was found) and new queues.
        if (queueToReturn.properties.has('capacity')) {
            queueToReturn.capacity = queueToReturn.properties.get('capacity');
        }
        if (queueToReturn.properties.has('state')) {
            queueToReturn.state = queueToReturn.properties.get('state');
        }
        if (queueToReturn.properties.has('maximum-capacity')) { // Or whatever your simpleKey is
            queueToReturn.maxCapacity = queueToReturn.properties.get('maximum-capacity');
        }
        // ... other convenience fields ...

        // Re-detect/ensure capacityMode if not set by _ui_capacityMode
        if (!queueToReturn.capacityMode && queueToReturn.capacity !== undefined) {
            const capStr = String(queueToReturn.capacity);
            if (capStr.endsWith('w')) queueToReturn.capacityMode = CAPACITY_MODES.WEIGHT;
            else if (capStr.startsWith('[')) queueToReturn.capacityMode = CAPACITY_MODES.ABSOLUTE; // or VECTOR
            else queueToReturn.capacityMode = CAPACITY_MODES.PERCENTAGE;
        } else if (!queueToReturn.capacityMode) { // If capacity is also undefined
            queueToReturn.capacityMode = CAPACITY_MODES.PERCENTAGE; // Default
        }

        // Set change status (useful for QueueViewDataFormatter)
        if (stagedChangeEntry) {
            queueToReturn.changeStatus = stagedChangeEntry.op;
        } else {
            queueToReturn.changeStatus = "UNCHANGED";
        }

        // Ensure level is set if not already (especially for baseQueueNode)
        if (queueToReturn.level === undefined && queueToReturn.path) {
            queueToReturn.level = (queueToReturn.path).split(".").length - 1;
        }


        return queueToReturn;
    }

    getAllQueues() {
        const hierarchy = this.getQueueHierarchy();
        const allPaths = new Set();

        if (hierarchy) {
            this._getAllQueuePathsFromHierarchy(hierarchy, allPaths);
        }

        this._iter(ADD_OP).forEach(entry => {
            allPaths.add(entry.path);
        });

        return Array.from(allPaths)
            .map(path => this.getQueue(path))
            .filter(q => q !== null);
    }

    /**
     * Retrieves the current pending modifications for a queue if it's marked for UPDATE.
     * @param {string} path - The queue path.
     * @returns {object} A clone of the pending modifications, or an empty object.
     */
    getPendingModifications(path) {
        const entry = this._changes.get(path);
        if (entry && entry.op === UPDATE_OP && entry.change) {
            // Return a clone to prevent direct modification of the store's internal object
            return {...entry.change};
        }
        return {}; // No pending updates or not an update operation
    }

    // --- Staged Change Management Methods ---
    doAdd(path, changeData) { // changeData should be { newQueueData: object }
        this._changes.set(path, this._crtElement(ADD_OP, changeData));
    }

    /**
     * Stages an update for a queue. The changeData should be the
     * complete set of all currently pending modifications.
     * @param {string} path - The queue path.
     * @param {object} cumulativeModifications - The full set of pending modifications for this queue.
     */
    doUpdate(path, cumulativeModifications) {
        if (!cumulativeModifications || Object.keys(cumulativeModifications).length === 0) {
            // If an empty modification set is explicitly passed, clear any pending update.
            const entry = this._changes.get(path);
            if (entry && entry.op === UPDATE_OP) {
                this.deleteChange(path); // deleteChange is just this._changes.delete(path)
            }
            return;
        }
        // Otherwise, always set/overwrite the update.
        this._changes.set(path, this._crtElement(UPDATE_OP, cumulativeModifications));
        // console.log(`Store: Path '${path}' updated. Current _changes size: ${this._changes.size}`);
    }

    // deleteChange should also clear any pending UPDATE for the same path if called for ADD/DELETE op.
    doDelete(path) {
        // If there was a pending ADD, simply remove it.
        // If there were pending UPDATEs, mark for DELETE. DELETE takes precedence.
        const currentChange = this._changes.get(path);
        if (currentChange && currentChange.op === ADD_OP) {
            this._changes.delete(path);
        } else {
            this._changes.set(path, this._crtElement(DELETE_OP, { path: path }));
        }
    }

    deleteChange(path) {
        return this._changes.delete(path);
    }

    isStateAdd(path) {
        return this._changes.get(path)?.op === ADD_OP;
    }

    isStateDelete(path) {
        return this._changes.get(path)?.op === DELETE_OP;
    }

    isStateUpdate(path) {
        return this._changes.get(path)?.op === UPDATE_OP;
    }

    countAdd() { return this._iter(ADD_OP).length; }
    countDelete() { return this._iter(DELETE_OP).length; } // Counts actual DELETE_OP entries
    countUpdate() { return this._iter(UPDATE_OP).length; }

    size() {
        return this._changes.size;
    }

    /**
     * Returns an array of queue paths marked for deletion.
     * @returns {string[]}
     */
    getStagedDeletions() {
        const deletions = [];
        for (const [path, entry] of this._changes.entries()) {
            if (entry.op === DELETE_OP) {
                deletions.push(path);
            }
        }
        return deletions;
    }

    /**
     * Returns an array of new queues formatted for the API.
     * Each object will have { queueName: fullPath, params: apiParams }.
     * @returns {Array<Object>}
     */
    getStagedAdditionsForApi() {
        const additions = [];
        for (const entry of this._changes.values()) {
            if (entry.op === ADD_OP && entry.change && entry.change.newQueueData) {
                const newQueue = entry.change.newQueueData;
                additions.push({
                    queueName: newQueue.path, // API expects the full path here for new queues
                    params: newQueue.params || {} // 'params' should hold full YARN prop names
                });
            }
        }
        return additions;
    }

    /**
     * Returns an array of updated queues formatted for the API.
     * Each object will have { queueName: fullPath, params: cumulativeModifications }.
     * @returns {Array<Object>}
     */
    getStagedUpdatesForApi() {
        const updates = [];
        for (const [path, entry] of this._changes.entries()) {
            if (entry.op === UPDATE_OP && entry.change) {
                // 'entry.change' should be the cumulative modifications object
                // Filter out internal UI hints like _ui_capacityMode before sending to API
                const apiParams = { ...entry.change };
                delete apiParams._ui_capacityMode; // Example of removing UI-specific hint

                if (Object.keys(apiParams).length > 0) { // Only include if there are actual param changes
                    updates.push({
                        queueName: path,
                        params: apiParams
                    });
                }
            }
        }
        return updates;
    }

    /**
     * Clears all staged changes.
     */
    clear() {
        this._changes.clear();
        // console.log("QueueStateStore: All staged changes cleared.");
    }

    // Getter for global properties from the Trie
    getGlobalProperties() {
        if (!this._schedulerTrieInstance) {
            console.warn("Scheduler Trie not initialized when trying to get global properties.");
            return new Map();
        }
        return this._schedulerTrieInstance.globalProperties;
    }
}
