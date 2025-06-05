/**
 * @file Manages the YARN scheduler configuration, including the queue hierarchy (via SchedulerConfigTrie),
 * global settings, and pending changes.
 */
class SchedulerConfigModel extends EventEmitter {
    constructor() {
        super();
        this._trieInstance = new SchedulerConfigTrie(); // Holds the actual Trie data structure
        this._globalConfig = new Map(); // full.yarn.property.name -> value, specifically for CS global props
        this._changeLog = new ChangeLog(); // Unified change tracking
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
            for (const [key, value] of allGlobals.entries()) {
                if (key.startsWith(CONFIG.API_ENDPOINTS.SCHEDULER_CONF.slice(0, -5)) && // Check if it's a CS global
                    !key.slice(CONFIG.API_ENDPOINTS.SCHEDULER_CONF.slice(0, -5).length).startsWith('root.')) {
                        this._globalConfig.set(key, value);
                    }
            }
            this._emit('configLoaded', { success: true });
        } catch (error) {
            console.error('SchedulerConfigModel: Error initializing Trie from config:', error);
            this._emit('configLoaded', { success: false, error: 'Error processing configuration data' });
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
     * @param {Object} parameters - A map of simple configuration keys and values for the new queue.
     */
    stageAddQueue(queuePath, parameters) {
        // Convert simple parameters to full YARN keys
        const properties = PropertyKeyMapper.convertToFullKeys(parameters, queuePath);
        
        this._changeLog.addChange({
            type: 'add',
            target: 'queue',
            path: queuePath,
            properties: properties
        });
        
        this._emit('pendingChangesUpdated', this._changeLog);
    }

    /**
     * Stages updates for an existing or pending-add queue.
     * The parameters object uses simple keys (e.g., 'capacity').
     * For node label properties (e.g., accessible-node-labels, accessible-node-labels.X.capacity),
     * the key in parameters should reflect the specific property being changed
     * (e.g., 'accessible-node-labels' or 'accessible-node-labels.X.capacity').
     * @param {string} queuePath - The full path of the queue to update.
     * @param {Object} parameters - Map of simple config keys (or specific label keys) to values.
     */
    stageUpdateQueue(queuePath, parameters) {
        // Convert simple parameters to full YARN keys
        const properties = PropertyKeyMapper.convertToFullKeys(parameters, queuePath);
        
        // Get current values for oldProperties
        const queueNode = this._trieInstance.getQueueNode(queuePath);
        const oldProperties = new Map();
        if (queueNode) {
            for (const [fullKey] of properties) {
                const currentValue = queueNode.properties.get(fullKey);
                if (currentValue !== undefined) {
                    oldProperties.set(fullKey, currentValue);
                }
            }
        }
        
        this._changeLog.addChange({
            type: 'update',
            target: 'queue',
            path: queuePath,
            properties: properties,
            oldProperties: oldProperties
        });
        
        this._emit('pendingChangesUpdated', this._changeLog);
    }

    /**
     * Stages a queue for removal.
     * @param {string} queuePath - The full path of the queue to remove.
     */
    stageRemoveQueue(queuePath) {
        this._changeLog.addChange({
            type: 'delete',
            target: 'queue',
            path: queuePath,
            properties: new Map() // No properties needed for deletion
        });
        
        this._emit('pendingChangesUpdated', this._changeLog);
    }

    /**
     * Stages updates for global scheduler configurations.
     * @param {Object} params - A map of full YARN property names and their new values.
     */
    stageGlobalUpdate(params) {
        const properties = new Map(Object.entries(params));
        
        this._changeLog.addChange({
            type: 'update',
            target: 'global',
            path: 'global',
            properties: properties
        });
        
        this._emit('pendingChangesUpdated', this._changeLog);
    }

    /** Returns the ChangeLog instance directly. @returns {ChangeLog} */
    getChangeLog() {
        return this._changeLog;
    }

    /** Clears all staged pending changes. */
    clearPendingChanges() {
        this._changeLog.clear();
        this._emit('pendingChangesUpdated', this._changeLog);
    }

    /** Checks if there are any pending changes. @returns {boolean} */
    hasPendingChanges() {
        return this._changeLog.hasChanges();
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
            for (const childNode of (node.children || new Map()).values()) {
                collectPaths(childNode);
            }
        }
        collectPaths(this._trieInstance.rootNode);
        return [...paths].sort();
    }

    /**
     * Performs stateful validation of pending changes against the current configuration.
     * @param {ViewDataFormatterService} viewDataFormatterService - For building effective hierarchy
     * @param {AppStateModel} appStateModel - Current app state
     * @param {SchedulerInfoModel} schedulerInfoModel - Optional scheduler info for advanced validation
     * @returns {Array<Object>} An array of error objects { type: string, message: string, queuePath?: string }.
     */
    performStatefulValidation(viewDataFormatterService, appStateModel, schedulerInfoModel = null) {
        if (!viewDataFormatterService || !appStateModel) {
            return [];
        }

        try {
            const effectiveHierarchy = viewDataFormatterService.formatQueueHierarchyForView(
                this,
                schedulerInfoModel,
                appStateModel,
                true // Include pending changes
            );

            if (!effectiveHierarchy) {
                return [];
            }

            if (!this._queueValidator) {
                this._queueValidator = new QueueValidator();
            }

            return this._queueValidator.validate(
                this,
                effectiveHierarchy,
                schedulerInfoModel,
                appStateModel
            );
        } catch (error) {
            console.error('SchedulerConfigModel: Validation error:', error);
            return [{
                type: 'VALIDATION_SYSTEM_ERROR',
                message: `Validation system error: ${error.message}`,
                queuePath: null
            }];
        }
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
