const ADD_OP = "ADD";
const DELETE_OP = "DELETE";
const UPDATE_OP = "UPDATE";

class QueueStateStore {
    constructor() {
        this._schedulerTrieInstance = null;
        this._changes = new Map(); // path -> { op: string, change: object }
    }

    // --- Private Helper Methods ---
    _crtElement(op, change) {
        return { op: op, change: change };
    }

    _iter(op) {
        return Array.from(this._changes.entries())
            .filter(entry => entry[1].op === op)
            .map(entry => ({ path: entry[0], data: entry[1] }));
    }

    // Helper to recursively get all queue paths from the raw Trie (case-sensitive)
    _getAllQueuePathsFromTrie(trieNode, pathsSet) {
        if (!trieNode || !trieNode.isQueue) return;
        pathsSet.add(trieNode.fullPath);
        if (trieNode.children) {
            trieNode.children.forEach(childNode => { // children is a Map
                this._getAllQueuePathsFromTrie(childNode, pathsSet);
            });
        }
    }

    // Transforms a SchedulerTrieNode into a basic plain queue object.
    // No complex UI derivations here.
    _transformTrieNodeToBasicQueueObject(trieNode) {
        if (!trieNode || !trieNode.isQueue) {
            return null;
        }

        const queueObject = {
            name: trieNode.segment, // Original case name from Trie segment
            path: trieNode.fullPath, // Original case full path
            parentPath: trieNode.fullPath === 'root' ? null : trieNode.fullPath.substring(0, trieNode.fullPath.lastIndexOf('.')),
            properties: new Map(trieNode.properties), // Map of full YARN prop name -> value
            children: {}, // Stores childName (original case) -> { path: childFullPath, name: childSegment }
        };

        if (trieNode.children) {
            trieNode.children.forEach((childTrieNode, childSegmentKey) => { // childSegmentKey is original case
                if (childTrieNode.isQueue) {
                    queueObject.children[childTrieNode.segment] = {
                        path: childTrieNode.fullPath,
                        name: childTrieNode.segment // segment from the child node itself
                    };
                }
            });
        }
        return queueObject;
    }

    // --- Public API ---
    setSchedulerTrie(trieInstance) {
        this._schedulerTrieInstance = trieInstance;
    }

    getQueueHierarchy() {
        if (!this._schedulerTrieInstance) {
            console.error("Scheduler Trie not initialized in QueueStateStore.");
            return null;
        }
        return this._schedulerTrieInstance.rootNode;
    }

    getQueue(path) {
        if (!path) return null;
        const stagedChangeEntry = this._changes.get(path);
        let baseQueueObject = null;

        if (stagedChangeEntry && stagedChangeEntry.op === ADD_OP) {
            // For ADD_OP, newQueueData is the blueprint.
            baseQueueObject = JSON.parse(JSON.stringify(stagedChangeEntry.change.newQueueData));
            if (stagedChangeEntry.change.newQueueData.properties instanceof Map) {
                baseQueueObject.properties = new Map(stagedChangeEntry.change.newQueueData.properties);
            } else {
                baseQueueObject.properties = new Map(Object.entries(stagedChangeEntry.change.newQueueData.properties || {}));
            }
            baseQueueObject.changeStatus = ADD_OP;
        } else {
            if (!this._schedulerTrieInstance) {
                console.error("getQueue: Scheduler Trie not initialized.");
                return null;
            }
            const trieNode = this._schedulerTrieInstance.getQueueNode(path);
            if (!trieNode) { // Queue doesn't exist in base config
                return null;
            }
            baseQueueObject = this._transformTrieNodeToBasicQueueObject(trieNode);
            if (!baseQueueObject) return null;

            // Apply pending updates or set status
            if (stagedChangeEntry && stagedChangeEntry.op === UPDATE_OP) {
                baseQueueObject.changeStatus = UPDATE_OP;
                const modifications = stagedChangeEntry.change; // Property changes + _ui_capacityMode hint

                // Ensure properties map exists
                if (!(baseQueueObject.properties instanceof Map)) {
                    baseQueueObject.properties = new Map(Object.entries(baseQueueObject.properties || {}));
                }

                for (const propName in modifications) {
                    if (Object.hasOwnProperty.call(modifications, propName)) {
                        if (propName === '_ui_capacityMode') {
                            // Store this hint directly on the object for the formatter to use.
                            baseQueueObject._ui_capacityMode = modifications[propName];
                        } else {
                            baseQueueObject.properties.set(propName, modifications[propName]);
                        }
                    }
                }
            } else if (stagedChangeEntry && stagedChangeEntry.op === DELETE_OP) {
                baseQueueObject.changeStatus = DELETE_OP;
            } else {
                baseQueueObject.changeStatus = "UNCHANGED";
            }
        }

        // 'level' can be derived here or by the formatter. Let's keep it basic.
        // baseQueueObject.level = (baseQueueObject.path || "").split(".").length - 1;

        return baseQueueObject;
    }

    getAllQueues() {
        if (!this._schedulerTrieInstance || !this._schedulerTrieInstance.rootNode) {
            return [];
        }
        const allPaths = new Set();
        this._getAllQueuePathsFromTrie(this._schedulerTrieInstance.rootNode, allPaths);

        this._iter(ADD_OP).forEach(entry => {
            allPaths.add(entry.path);
        });

        return Array.from(allPaths)
            .map(path => this.getQueue(path))
            .filter(q => q !== null);
    }

    getPendingModifications(path) {
        const entry = this._changes.get(path);
        if (entry && entry.op === UPDATE_OP && entry.change) {
            return { ...entry.change }; // Return a clone
        }
        return {};
    }

    // newQueueData blueprint should have name, path, parentPath, and a 'properties' Map with initial raw YARN properties
    doAdd(path, changeData) {
        this._changes.set(path, this._crtElement(ADD_OP, changeData));
    }

    // modificationsFromEdit is an object: { yarn.prop.name: value, _ui_capacityMode: "mode" }
    doUpdate(path, modificationsFromEdit) {
        const existingEntry = this._changes.get(path);

        if (existingEntry && existingEntry.op === ADD_OP) {
            // Editing a PENDING NEW QUEUE's blueprint
            const blueprintToUpdate = existingEntry.change.newQueueData;
            if (!(blueprintToUpdate.properties instanceof Map)) { // Ensure properties is a Map
                blueprintToUpdate.properties = new Map(Object.entries(blueprintToUpdate.properties || {}));
            }

            for (const propName in modificationsFromEdit) {
                if (Object.hasOwnProperty.call(modificationsFromEdit, propName)) {
                    if (propName === '_ui_capacityMode') {
                        blueprintToUpdate._ui_capacityMode = modificationsFromEdit[propName];
                    } else {
                        blueprintToUpdate.properties.set(propName, modificationsFromEdit[propName]);
                    }
                }
            }
            // The blueprint now has updated raw properties and potentially the _ui_capacityMode hint.
            // No further derivations here.
            this._changes.set(path, this._crtElement(ADD_OP, { newQueueData: blueprintToUpdate }));
        } else {
            // Editing an EXISTING QUEUE (from Trie) or staging a new update
            if (!modificationsFromEdit || Object.keys(modificationsFromEdit).length === 0) {
                // All changes were reverted for this session. Clear pending update if it exists.
                if (existingEntry && existingEntry.op === UPDATE_OP) {
                    this.deleteChange(path);
                }
                return;
            }
            // Store the modifications as is. getQueue will handle applying them.
            this._changes.set(path, this._crtElement(UPDATE_OP, modificationsFromEdit));
        }
    }

    doDelete(path) {
        const currentChange = this._changes.get(path);
        if (currentChange && currentChange.op === ADD_OP) {
            this._changes.delete(path); // If it was a pending add, just remove it
        } else {
            // For existing queues or queues with pending updates, mark for delete.
            this._changes.set(path, this._crtElement(DELETE_OP, { path: path }));
        }
    }

    deleteChange(path) { return this._changes.delete(path); }
    isStateAdd(path) { return this._changes.get(path)?.op === ADD_OP; }
    isStateDelete(path) { return this._changes.get(path)?.op === DELETE_OP; }
    isStateUpdate(path) { return this._changes.get(path)?.op === UPDATE_OP; }

    countAdd() { return this._iter(ADD_OP).length; }
    countDelete() { return this._iter(DELETE_OP).length; }
    countUpdate() { return this._iter(UPDATE_OP).length; }
    size() { return this._changes.size; }

    getStagedDeletions() { return this._iter(DELETE_OP).map(entry => entry.path); }

    getStagedAdditionsForApi() {
        return this._iter(ADD_OP).map(entry => {
            const newQueue = entry.data.change.newQueueData;
            const apiParams = {};
            if (newQueue.properties instanceof Map) {
                newQueue.properties.forEach((value, key) => { apiParams[key] = value; });
            }
            // Include _ui_capacityMode if it was set, though API won't use it.
            // Or filter it out here if API is strict. For now, let modal-edit/add handle params for API.
            // Let's assume newQueue.params for API is already prepared by add/edit modal logic:
            return { queueName: newQueue.path, params: newQueue.params || apiParams };
        });
    }

    getStagedUpdatesForApi() {
        return this._iter(UPDATE_OP).map(entry => {
            const apiParams = { ...entry.data.change };
            delete apiParams._ui_capacityMode; // Ensure UI hints are not sent to API
            return { queueName: entry.path, params: apiParams };
        }).filter(update => Object.keys(update.params).length > 0); // Only send if there are actual param changes
    }

    clear() { this._changes.clear(); }

    getGlobalProperties() {
        if (!this._schedulerTrieInstance) {
            console.warn("Scheduler Trie not initialized for getGlobalProperties.");
            return new Map();
        }
        return this._schedulerTrieInstance.globalProperties;
    }
}