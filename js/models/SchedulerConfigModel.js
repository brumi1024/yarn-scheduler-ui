/**
 * @file Manages the YARN scheduler configuration, including the queue hierarchy (via SchedulerConfigTrie),
 * global settings, and pending changes.
 */
class SchedulerConfigModel extends EventEmitter {
    constructor() {
        super();
        this._trieInstance = new SchedulerConfigTrie(); // Holds the actual Trie data structure
        this._globalConfig = new Map(); // full.yarn.property.name -> value, specifically for CS global props
        this._pendingChanges = this._getInitialPendingChanges();
    }

    /**
     * Initializes the structure for pending changes.
     * @returns {object} The initial pending changes object.
     * @private
     */
    _getInitialPendingChanges() {
        return {
            addQueues: [],
            updateQueues: [],
            removeQueues: [],
            globalUpdates: {}
        };
    }

    /**
     * Loads and parses the flat scheduler configuration properties using SchedulerConfigTrie.
     * @param {Array<Object>} propertiesArray - Array of { name: string, value: string }.
     */
    loadSchedulerConfig(propertiesArray) {
        this._trieInstance = new SchedulerConfigTrie(); // Fresh instance on each load
        this.clearPendingChanges(); // Clear any old pending changes

        try {
            this._trieInstance.initializeFromConfig(propertiesArray);
            // Separate CS global properties from other global properties collected by the Trie
            this._globalConfig.clear();
            const allGlobals = this._trieInstance.getGlobalConfigs();
            allGlobals.forEach((value, key) => {
                if (key.startsWith(CONFIG.API_ENDPOINTS.SCHEDULER_CONF.slice(0, -5))) { // Check if it's a CS global
                    if (!key.substring(CONFIG.API_ENDPOINTS.SCHEDULER_CONF.slice(0, -5).length).startsWith("root.")) {
                        this._globalConfig.set(key, value);
                    }
                }
            });
            this._emit('configLoaded', { success: true });
        } catch (error) {
            console.error("SchedulerConfigModel: Error initializing Trie from config:", error);
            this._emit('configLoaded', { success: false, error: "Error processing configuration data" });
        }
    }

    /**
     * Retrieves the raw properties of a queue node from the Trie.
     * @param {string} path - The full path of the queue (e.g., "root.default").
     * @returns {Map<string, string> | null} A map of properties or null if not found.
     */
    getQueueNodeProperties(path) {
        const node = this._trieInstance.getQueueNode(path);
        return node ? new Map(node.properties) : null;
    }

    /**
     * Returns a copy of the Capacity Scheduler global configurations.
     * @returns {Map<string, string>}
     */
    getGlobalConfig() {
        return new Map(this._globalConfig);
    }

    /**
     * Stages a new queue for addition.
     * @param {string} queuePath - The full path of the new queue.
     * @param {Object} params - A map of simple configuration keys and values for the new queue.
     */
    stageAddQueue(queuePath, params) {
        this._pendingChanges.removeQueues = this._pendingChanges.removeQueues.filter(p => p !== queuePath);
        this._pendingChanges.updateQueues = this._pendingChanges.updateQueues.filter(item => item.queueName !== queuePath);

        const existingAddIndex = this._pendingChanges.addQueues.findIndex(item => item.queueName === queuePath);
        if (existingAddIndex > -1) {
            this._pendingChanges.addQueues[existingAddIndex].params = params;
        } else {
            this._pendingChanges.addQueues.push({ queueName: queuePath, params });
        }
        this._emit('pendingChangesUpdated', this.getRawPendingChanges());
    }

    /**
     * Stages updates for an existing or pending-add queue.
     * The params object uses simple keys (e.g., 'capacity').
     * For node label properties (e.g., accessible-node-labels, accessible-node-labels.X.capacity),
     * the key in params should reflect the specific property being changed
     * (e.g., 'accessible-node-labels' or 'accessible-node-labels.X.capacity').
     * @param {string} queuePath - The full path of the queue to update.
     * @param {Object} params - Map of simple config keys (or specific label keys) to values.
     */
    stageUpdateQueue(queuePath, params) {
        const pendingAddEntry = this._pendingChanges.addQueues.find(item => item.queueName === queuePath);
        if (pendingAddEntry) {
            // If it's a new queue being staged, merge updates into its params.
            // This includes handling complex keys like "accessible-node-labels.X.capacity" directly.
            pendingAddEntry.params = { ...pendingAddEntry.params, ...params };
        } else {
            let updateEntry = this._pendingChanges.updateQueues.find(item => item.queueName === queuePath);
            if (updateEntry) {
                updateEntry.params = { ...updateEntry.params, ...params };
            } else {
                this._pendingChanges.updateQueues.push({ queueName: queuePath, params });
            }
        }
        this._emit('pendingChangesUpdated', this.getRawPendingChanges());
    }


    /**
     * Stages a queue for removal.
     * @param {string} queuePath - The full path of the queue to remove.
     */
    stageRemoveQueue(queuePath) {
        this._pendingChanges.addQueues = this._pendingChanges.addQueues.filter(item => item.queueName !== queuePath);
        this._pendingChanges.updateQueues = this._pendingChanges.updateQueues.filter(item => item.queueName !== queuePath);
        if (!this._pendingChanges.removeQueues.includes(queuePath)) {
            this._pendingChanges.removeQueues.push(queuePath);
        }
        this._emit('pendingChangesUpdated', this.getRawPendingChanges());
    }

    /**
     * Stages updates for global scheduler configurations.
     * @param {Object} params - A map of full YARN property names and their new values.
     */
    stageGlobalUpdate(params) {
        this._pendingChanges.globalUpdates = { ...this._pendingChanges.globalUpdates, ...params };
        this._emit('pendingChangesUpdated', this.getRawPendingChanges());
    }

    /** Returns a deep copy of all pending changes. @returns {Object} */
    getRawPendingChanges() { return JSON.parse(JSON.stringify(this._pendingChanges)); }

    /** Clears all staged pending changes. */
    clearPendingChanges() {
        this._pendingChanges = this._getInitialPendingChanges();
        this._emit('pendingChangesUpdated', this.getRawPendingChanges());
    }

    /** Checks if there are any pending changes. @returns {boolean} */
    hasPendingChanges() {
        return this._pendingChanges.addQueues.length > 0 ||
            this._pendingChanges.updateQueues.length > 0 ||
            this._pendingChanges.removeQueues.length > 0 ||
            Object.keys(this._pendingChanges.globalUpdates).length > 0;
    }

    /**
     * Returns an array of all valid queue paths from the current Trie.
     * @returns {Array<string>}
     */
    getAllQueuePaths() {
        const paths = new Set();
        if (!this._trieInstance || !this._trieInstance.rootNode) return [];
        function collectPaths(node) {
            if (node.isQueue) paths.add(node.fullPath);
            node.children.forEach(collectPaths);
        }
        collectPaths(this._trieInstance.rootNode);
        return Array.from(paths).sort();
    }

    /**
     * Performs stateful validation of pending changes against the current configuration.
     * @returns {Array<Object>} An array of error objects { message: string, queuePath?: string }.
     */
    performStatefulValidation() {
        // This method will be complex and rely on an "effective hierarchy" view.
        // For now, it's a placeholder. ViewDataFormatterService will be crucial here.
        const errors = [];
        // Example: If adding queue 'root.new.child' but 'root.new' doesn't exist and isn't being added.
        // Example: Check capacity sums at each level of the effective hierarchy.
        return errors;
    }

    /**
     * Provides the root node of the scheduler configuration Trie.
     * @returns {SchedulerTrieNode | null}
     */
    getSchedulerTrieRoot() {
        return this._trieInstance ? this._trieInstance.rootNode : null;
    }

    /**
     * Retrieves the underlying Trie instance. Primarily for ViewDataFormatterService.
     * @returns {SchedulerConfigTrie | null}
     */
    getTrieInstance() {
        return this._trieInstance;
    }
}