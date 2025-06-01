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
        return { op: op, change: change };
    }

    _iter(op) {
        return Array.from(this._changes.entries())
            .filter(entry => entry[1].op === op)
            .map(entry => ({ path: entry[0], data: entry[1] })); // Return more structured data
    }

    _displayCapacity(mode, value) {
        if (value === undefined || value === null) return "N/A";
        const capMode = mode || CAPACITY_MODES.PERCENTAGE; // Default to percentage if mode is undefined

        switch (capMode) {
            case CAPACITY_MODES.PERCENTAGE:
                return String(value).endsWith('%') ? value : `${parseFloat(value) || 0}%`;
            case CAPACITY_MODES.WEIGHT:
                return String(value).endsWith('w') ? value : `${parseFloat(value) || 0}w`;
            case CAPACITY_MODES.ABSOLUTE:
            case CAPACITY_MODES.VECTOR:
                return String(value); // Assumes value is already like "[memory=...]" or a specific vector string
            default:
                return String(value);
        }
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

    getQueue(path) {
        const hierarchy = this.getQueueHierarchy();
        let baseQueue = null;

        if (hierarchy && typeof findQueueByPath === 'function') { // findQueueByPath from modal-helpers.js
            baseQueue = findQueueByPath(path, hierarchy);
        }

        const stagedChangeEntry = this._changes.get(path); // entry is {op, change}
        let queueToReturn = null;

        if (baseQueue) {
            queueToReturn = JSON.parse(JSON.stringify(baseQueue)); // Deep clone
            if (baseQueue.properties instanceof Map) {
                queueToReturn.properties = new Map(Object.entries(baseQueue.properties));
            } else {
                queueToReturn.properties = new Map(Object.entries(baseQueue.properties || {}));
            }
        } else if (stagedChangeEntry && stagedChangeEntry.op === ADD_OP) {
            const newQueueBlueprint = stagedChangeEntry.change.newQueueData || stagedChangeEntry.change;
            queueToReturn = JSON.parse(JSON.stringify(newQueueBlueprint));
            if (newQueueBlueprint.properties instanceof Map) {
                queueToReturn.properties = new Map(Object.entries(newQueueBlueprint.properties));
            } else {
                queueToReturn.properties = new Map(Object.entries(newQueueBlueprint.properties || {}));
            }
            queueToReturn.children = queueToReturn.children || {};
            queueToReturn.path = queueToReturn.path || path;
        } else {
            return null;
        }

        if (stagedChangeEntry) {
            queueToReturn.changeStatus = stagedChangeEntry.op;
            const changeData = stagedChangeEntry.change;

            if ((stagedChangeEntry.op === UPDATE_OP || stagedChangeEntry.op === ADD_OP) && changeData) {
                const modifications = (stagedChangeEntry.op === ADD_OP) 
                                      ? (changeData.params || changeData.properties) // For ADD, props are in .params for API, or .properties for card
                                      : changeData.modifications; // For UPDATE, they are in .modifications

                if (modifications) {
                    // Ensure queueToReturn.properties is a Map
                    if (!(queueToReturn.properties instanceof Map)) {
                        queueToReturn.properties = new Map(Object.entries(queueToReturn.properties || {}));
                    }

                    for (const keyInModifications in modifications) {
                        const value = modifications[keyInModifications];
                        if (keyInModifications === '_ui_capacityMode') {
                            queueToReturn.capacityMode = value;
                        } else {
                            let simpleKey = keyInModifications;
                            // Check if keyInModifications is a full YARN path
                            if (keyInModifications.startsWith(`yarn.scheduler.capacity.`)) {
                                if (keyInModifications.startsWith(`yarn.scheduler.capacity.${queueToReturn.path}.`)) {
                                    simpleKey = keyInModifications.substring(`yarn.scheduler.capacity.${queueToReturn.path}.`.length);
                                } else { // Could be a new property for a new queue, extract last part
                                    simpleKey = keyInModifications.substring(keyInModifications.lastIndexOf('.') + 1);
                                }
                            }
                            queueToReturn.properties.set(simpleKey, value);
                            if (simpleKey === 'capacity') queueToReturn.capacity = value;
                            if (simpleKey === 'state') queueToReturn.state = value;
                            if (simpleKey === 'maximum-capacity') queueToReturn.maxCapacity = value;
                        }
                    }
                }
            }
        } else {
            queueToReturn.changeStatus = "UNCHANGED";
        }
        
        // Update top-level convenience fields and display strings from properties
        queueToReturn.capacity = queueToReturn.properties.get('capacity');
        queueToReturn.state = queueToReturn.properties.get('state');
        queueToReturn.maxCapacity = queueToReturn.properties.get('maximum-capacity');

        let currentMode = queueToReturn.capacityMode;
        if (currentMode === undefined && queueToReturn.capacity !== undefined) {
            const capStr = String(queueToReturn.capacity);
            if (capStr.endsWith('w')) currentMode = CAPACITY_MODES.WEIGHT;
            else if (capStr.startsWith('[')) currentMode = CAPACITY_MODES.ABSOLUTE;
            else currentMode = CAPACITY_MODES.PERCENTAGE;
            queueToReturn.capacityMode = currentMode;
        }
        
        queueToReturn.capacityDisplay = this._displayCapacity(currentMode, queueToReturn.capacity);
        queueToReturn.level = queueToReturn.path ? queueToReturn.path.split(".").length - 1 : 0;

        return queueToReturn;
    }

    allQueue() {
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

    // --- Staged Change Management Methods ---
    doAdd(path, changeData) { // changeData should be { newQueueData: object }
        this._changes.set(path, this._crtElement(ADD_OP, changeData));
    }

    doDelete(path) { // No extensive changeData needed, path is key
        this._changes.set(path, this._crtElement(DELETE_OP, { path: path }));
    }

    doUpdate(path, changeData) { // changeData should be { modifications: object }
        this._changes.set(path, this._crtElement(UPDATE_OP, changeData));
    }

    deleteChange(path) {
        return this._changes.delete(path);
    }

    isStateAdd(path) { return this._changes.get(path)?.op === ADD_OP; }
    isStateDelete(path) { return this._changes.get(path)?.op === DELETE_OP; }
    isStateUpdate(path) { return this._changes.get(path)?.op === UPDATE_OP; }

    countAdd() { return this._iter(ADD_OP).length; }
    countDelete() { return this._iter(DELETE_OP).length; }
    countUpdate() { return this._iter(UPDATE_OP).length; }

    size() { return this._changes.size; }

    clear() {
        this._changes.clear();
        // _cachedQueueHierarchy is usually invalidated by setSchedulerTrie,
        // but if clear means full reset without new data, clearing cache might be good too.
        // For now, it's mainly for clearing pending user edits.
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

// Instantiate and export the single instance
const queueStateStore = new QueueStateStore();
window.queueStateStore = queueStateStore;
