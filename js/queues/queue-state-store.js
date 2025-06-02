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

    _syncConvenienceFieldsOnBlueprint(blueprint) {
        if (!blueprint || !(blueprint.properties instanceof Map)) return;

        const props = blueprint.properties;
        const path = blueprint.path; // Path of the new queue

        // Define full YARN names for common convenience properties
        const capFullName = `yarn.scheduler.capacity.${path}.capacity`;
        const maxCapFullName = `yarn.scheduler.capacity.${path}.maximum-capacity`;
        const stateFullName = `yarn.scheduler.capacity.${path}.state`;
        // Add others if your blueprint structure has more (e.g., userLimitFactor)

        if (props.has(capFullName)) blueprint.capacity = props.get(capFullName);
        if (props.has(maxCapFullName)) blueprint.maxCapacity = props.get(maxCapFullName);
        if (props.has(stateFullName)) blueprint.state = props.get(stateFullName);

        // Ensure capacityMode (UI hint) is consistent
        if (blueprint.capacityMode === undefined && blueprint.capacity !== undefined) {
            const capStr = String(blueprint.capacity);
            if (capStr.endsWith('w')) blueprint.capacityMode = CAPACITY_MODES.WEIGHT;
            else if (capStr.startsWith('[')) blueprint.capacityMode = CAPACITY_MODES.ABSOLUTE;
            else blueprint.capacityMode = CAPACITY_MODES.PERCENTAGE;
        } else if (blueprint.capacityMode === undefined) {
            blueprint.capacityMode = CAPACITY_MODES.PERCENTAGE;
        }
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
        const rawHierarchy = this.getQueueHierarchy();
        let baseQueueNodeFromTrie = null;
        if (rawHierarchy) {
            baseQueueNodeFromTrie = this._findNodeInRawHierarchy(path, rawHierarchy);
        }

        const stagedChangeEntry = this._changes.get(path);
        let queueToReturn = null;

        if (stagedChangeEntry && stagedChangeEntry.op === ADD_OP) {
            const newQueueBlueprint = stagedChangeEntry.change.newQueueData;
            // Clone the blueprint. It should be self-consistent due to _syncConvenienceFieldsOnBlueprint.
            queueToReturn = JSON.parse(JSON.stringify(newQueueBlueprint));
            // Restore the 'properties' as a Map instance (with full YARN names)
            if (newQueueBlueprint.properties instanceof Map) {
                queueToReturn.properties = new Map(newQueueBlueprint.properties);
            } else {
                queueToReturn.properties = new Map(Object.entries(newQueueBlueprint.properties || {}));
            }
            queueToReturn.changeStatus = ADD_OP;
            // Ensure essential fields like children, level are present
            queueToReturn.children = queueToReturn.children || {};
            queueToReturn.level = (queueToReturn.path || "").split(".").length - 1;


        } else if (baseQueueNodeFromTrie) {
            queueToReturn = JSON.parse(JSON.stringify(baseQueueNodeFromTrie));
            if (baseQueueNodeFromTrie.properties instanceof Map) {
                queueToReturn.properties = new Map(baseQueueNodeFromTrie.properties);
            } else {
                queueToReturn.properties = new Map(Object.entries(baseQueueNodeFromTrie.properties || {}));
            }
            queueToReturn.children = queueToReturn.children || {};
            queueToReturn.level = (queueToReturn.path || "").split(".").length - 1;

            if (stagedChangeEntry && stagedChangeEntry.op === UPDATE_OP) {
                queueToReturn.changeStatus = UPDATE_OP;
                const modifications = stagedChangeEntry.change; // Cumulative, full YARN names
                if (modifications) {
                    for (const fullYarnPropName in modifications) {
                        if (Object.hasOwnProperty.call(modifications, fullYarnPropName)) {
                            const value = modifications[fullYarnPropName];
                            if (fullYarnPropName === '_ui_capacityMode') {
                                queueToReturn.capacityMode = value;
                            } else {
                                queueToReturn.properties.set(fullYarnPropName, value);
                            }
                        }
                    }
                    // After applying updates to .properties, sync convenience fields
                    this._syncConvenienceFieldsOnBlueprint(queueToReturn); // Re-use helper
                }
            } else if (stagedChangeEntry && stagedChangeEntry.op === DELETE_OP) {
                queueToReturn.changeStatus = DELETE_OP;
            } else {
                queueToReturn.changeStatus = "UNCHANGED";
            }
        } else {
            return null; // Not in Trie, not a pending ADD
        }

        // Final check for capacityMode if still not set (e.g. for UNCHANGED queues from Trie)
        if (!queueToReturn.capacityMode && queueToReturn.properties) {
            const capFullName = `yarn.scheduler.capacity.${path}.capacity`;
            const capVal = queueToReturn.properties.get(capFullName);
            if (capVal !== undefined) {
                const capStr = String(capVal);
                if (capStr.endsWith('w')) queueToReturn.capacityMode = CAPACITY_MODES.WEIGHT;
                else if (capStr.startsWith('[')) queueToReturn.capacityMode = CAPACITY_MODES.ABSOLUTE;
                else queueToReturn.capacityMode = CAPACITY_MODES.PERCENTAGE;
            } else {
                queueToReturn.capacityMode = CAPACITY_MODES.PERCENTAGE; // Overall default
            }
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
     * @param {object} modificationsFromEdit - The full set of pending modifications for this queue.
     */
    doUpdate(path, modificationsFromEdit) {
        const existingEntry = this._changes.get(path);

        if (existingEntry && existingEntry.op === ADD_OP) {
            // --- Editing a PENDING NEW QUEUE ---
            const blueprintToUpdate = existingEntry.change.newQueueData;

            // Ensure properties map exists on the blueprint
            if (!(blueprintToUpdate.properties instanceof Map)) {
                blueprintToUpdate.properties = new Map(Object.entries(blueprintToUpdate.properties || {}));
            }

            // Apply modifications from the edit session to this blueprint
            for (const fullYarnPropName in modificationsFromEdit) {
                if (Object.hasOwnProperty.call(modificationsFromEdit, fullYarnPropName)) {
                    const value = modificationsFromEdit[fullYarnPropName];
                    if (fullYarnPropName === '_ui_capacityMode') {
                        blueprintToUpdate.capacityMode = value; // Update UI hint on blueprint
                    } else {
                        // Update the properties map (which has full YARN names)
                        blueprintToUpdate.properties.set(fullYarnPropName, value);
                    }
                }
            }

            // IMPORTANT: Sync top-level convenience fields on the blueprint from its updated properties map
            // This ensures the blueprint itself is consistent.
            this._syncConvenienceFieldsOnBlueprint(blueprintToUpdate);

            // Re-stage as ADD_OP with the *updated* newQueueData (blueprintToUpdate)
            this._changes.set(path, this._crtElement(ADD_OP, {newQueueData: blueprintToUpdate}));

        } else {
            // --- Editing an EXISTING QUEUE (from Trie) or staging a new update for one ---
            // modificationsFromEdit here is already the *new cumulative set* of pending changes for this path,
            // as prepared by stageQueueChanges in modal-edit-queue.js.

            if (!modificationsFromEdit || Object.keys(modificationsFromEdit).length === 0) {
                // If modifications are empty, it means all changes were reverted. Clear pending update.
                const entry = this._changes.get(path);
                if (entry && entry.op === UPDATE_OP) {
                    this.deleteChange(path);
                }
                return;
            }
            this._changes.set(path, this._crtElement(UPDATE_OP, modificationsFromEdit));
        }
    }

    // deleteChange should also clear any pending UPDATE for the same path if called for ADD/DELETE op.
    doDelete(path) {
        // If there was a pending ADD, simply remove it.
        // If there were pending UPDATEs, mark for DELETE. DELETE takes precedence.
        const currentChange = this._changes.get(path);
        if (currentChange && currentChange.op === ADD_OP) {
            this._changes.delete(path);
        } else {
            this._changes.set(path, this._crtElement(DELETE_OP, {path: path}));
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

    countAdd() {
        return this._iter(ADD_OP).length;
    }

    countDelete() {
        return this._iter(DELETE_OP).length;
    } // Counts actual DELETE_OP entries
    countUpdate() {
        return this._iter(UPDATE_OP).length;
    }

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
                const apiParams = {...entry.change};
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
