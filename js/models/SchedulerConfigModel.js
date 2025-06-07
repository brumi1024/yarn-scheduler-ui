/**
 * @file Manages the YARN scheduler configuration using the unified QueueConfigurationManager
 */
class SchedulerConfigModel extends EventEmitter {
    constructor() {
        super();
        this._queueConfigManager = new QueueConfigurationManager();
    }

    /**
     * Loads and parses the flat scheduler configuration properties.
     * @param {Array<Object>} propertiesArray - Array of { name: string, value: string }.
     */
    loadSchedulerConfig(propertiesArray) {
        this._queueConfigManager = new QueueConfigurationManager(); // Fresh instance on each load

        try {
            this._queueConfigManager.initializeFromConfig(propertiesArray);
            this._emit('configLoaded', { success: true });
        } catch (error) {
            console.error('SchedulerConfigModel: Error initializing configuration:', error);
            this._emit('configLoaded', { success: false, error: 'Error processing configuration data' });
        }
    }

    /**
     * Retrieves the effective properties of a queue node.
     * @param {string} path - The full path of the queue (e.g., "root.default").
     * @returns {Map<string, string> | null} A map of properties or null if not found.
     */
    getQueueNodeProperties(path) {
        const node = this._queueConfigManager.getQueueNode(path);
        return node ? node.getEffectiveProperties() : null;
    }

    /**
     * Returns a copy of the Capacity Scheduler global configurations.
     * @returns {Map<string, string>}
     */
    getGlobalConfig() {
        return this._queueConfigManager.getEffectiveGlobalProperties();
    }

    /**
     * Stages a new queue for addition.
     * @param {string} queuePath - The full path of the new queue.
     * @param {Object} parameters - A map of simple configuration keys and values for the new queue.
     */
    stageAddQueue(queuePath, parameters) {
        // Convert simple parameters to full YARN keys
        const properties = PropertyKeyMapper.convertToFullKeys(parameters, queuePath);

        this._queueConfigManager.stageAddQueue(queuePath, properties);

        this._emit('pendingChangesUpdated', this._queueConfigManager);
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

        this._queueConfigManager.stageUpdateQueue(queuePath, properties);

        this._emit('pendingChangesUpdated', this._queueConfigManager);
    }

    /**
     * Stages a queue for removal.
     * @param {string} queuePath - The full path of the queue to remove.
     */
    stageRemoveQueue(queuePath) {
        this._queueConfigManager.stageDeleteQueue(queuePath);

        this._emit('pendingChangesUpdated', this._queueConfigManager);
    }

    /**
     * Stages updates for global scheduler configurations.
     * @param {Object} params - A map of full YARN property names and their new values.
     */
    stageGlobalUpdate(params) {
        this._queueConfigManager.stageGlobalUpdate(params);

        this._emit('pendingChangesUpdated', this._queueConfigManager);
    }

    /** Returns the QueueConfigurationManager instance directly. @returns {QueueConfigurationManager} */
    getChangeLog() {
        return this._queueConfigManager;
    }

    /** Clears all staged pending changes. */
    clearPendingChanges() {
        this._queueConfigManager.clearAllPendingChanges();
        this._emit('pendingChangesUpdated', this._queueConfigManager);
    }

    /** Checks if there are any pending changes. @returns {boolean} */
    hasPendingChanges() {
        return this._queueConfigManager.hasPendingChanges();
    }

    /**
     * Returns an array of all valid queue paths.
     * @returns {Array<string>}
     */
    getAllQueuePaths() {
        return this._queueConfigManager.getAllQueuePaths();
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

            return this._queueValidator.validate(this, effectiveHierarchy, schedulerInfoModel, appStateModel);
        } catch (error) {
            console.error('SchedulerConfigModel: Validation error:', error);
            return [
                {
                    type: 'VALIDATION_SYSTEM_ERROR',
                    message: `Validation system error: ${error.message}`,
                    queuePath: null,
                },
            ];
        }
    }

    /**
     * Provides the root node of the scheduler configuration.
     * @returns {QueueNode | null}
     */
    getSchedulerTrieRoot() {
        return this._queueConfigManager ? this._queueConfigManager.rootNode : null;
    }

    /**
     * Retrieves the underlying QueueConfigurationManager instance.
     * @returns {QueueConfigurationManager | null}
     */
    getTrieInstance() {
        return this._queueConfigManager;
    }
}
