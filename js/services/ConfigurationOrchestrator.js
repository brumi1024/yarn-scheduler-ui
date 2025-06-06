/**
 * @file ConfigurationOrchestrator - Coordinates config loading, validation, and mutation workflows
 */
class ConfigurationOrchestrator {
    constructor(schedulerConfigModel, schedulerInfoModel, apiService, notificationView) {
        this.schedulerConfigModel = schedulerConfigModel;
        this.schedulerInfoModel = schedulerInfoModel;
        this.apiService = apiService;
        this.notificationView = notificationView;
    }

    /**
     * Initializes configuration data from the API
     * @returns {Promise<{configSuccess: boolean, infoSuccess: boolean}>}
     */
    async initializeConfiguration() {
        try {
            const [configResult, infoResult] = await Promise.all([
                this.apiService.fetchSchedulerConfig(),
                this.apiService.fetchSchedulerInfo(),
            ]);

            const configSuccess = this._handleConfigResult(configResult);
            const infoSuccess = this._handleInfoResult(infoResult);

            return { configSuccess, infoSuccess };
        } catch (error) {
            console.error('ConfigurationOrchestrator init error:', error);
            this.notificationView.showError(`Configuration initialization failed: ${error.message}`);
            this.schedulerConfigModel.loadSchedulerConfig([]);
            this.schedulerInfoModel.loadSchedulerInfo(null);
            return { configSuccess: false, infoSuccess: false };
        }
    }

    /**
     * Refreshes configuration data from the server
     * @param {boolean} hasPendingChanges - Whether there are pending changes to warn about
     * @returns {Promise<boolean>} Success status
     */
    async refreshConfiguration(hasPendingChanges = false) {
        if (hasPendingChanges) {
            if (!globalThis.confirm('Refreshing data from the server will discard any unapplied local changes. Continue?')) {
                return false;
            }
            this.schedulerConfigModel.clearPendingChanges();
        }

        const result = await this.initializeConfiguration();
        if (result.configSuccess) {
            this.notificationView.showSuccess('Data refreshed from server.');
        }
        return result.configSuccess;
    }

    /**
     * Validates and applies all pending changes
     * @param {ViewDataFormatterService} viewDataFormatterService - For validation
     * @param {AppStateModel} appStateModel - Current app state
     * @returns {Promise<boolean>} Success status
     */
    async applyPendingChanges(viewDataFormatterService, appStateModel) {
        // Validate changes first
        const validationErrors = this.schedulerConfigModel.performStatefulValidation(
            viewDataFormatterService,
            appStateModel
        );

        if (validationErrors.length > 0) {
            this.notificationView.show({
                message: `Cannot apply: ${validationErrors.map((e) => e.message).join('; ')}`,
                type: 'error',
                duration: CONFIG.TIMEOUTS.NOTIFICATION_DURATION.ERROR + 2000,
            });
            return false;
        }

        if (!this.schedulerConfigModel.hasPendingChanges()) {
            this.notificationView.showInfo('No changes to apply.');
            return true;
        }

        // Apply changes via API
        const changeLog = this.schedulerConfigModel.getChangeLog();
        const apiPayload = changeLog.getApiPayload();
        const result = await this.apiService.putSchedulerChanges(apiPayload);

        if (this._isSuccessfulResponse(result)) {
            this.notificationView.showSuccess('Configuration changes applied successfully!');
            this.schedulerConfigModel.clearPendingChanges();
            
            // Reload configuration from server
            await this.initializeConfiguration();
            return true;
        } else {
            const errorDetail = result.error || 
                (typeof result.data === 'string' ? result.data : 'Unknown YARN error or non-string response.');
            this.notificationView.show({
                message: `Failed to apply changes: ${errorDetail}`,
                type: 'error',
                duration: CONFIG.TIMEOUTS.NOTIFICATION_DURATION.ERROR + 7000,
            });
            return false;
        }
    }

    /**
     * Discards all pending changes with confirmation
     * @returns {boolean} Whether changes were discarded
     */
    discardPendingChanges() {
        if (!this.schedulerConfigModel.hasPendingChanges()) {
            this.notificationView.showInfo('No pending changes to discard.');
            return false;
        }

        if (globalThis.confirm('Are you sure you want to discard all pending local changes? This action cannot be undone.')) {
            this.schedulerConfigModel.clearPendingChanges();
            this.notificationView.showInfo('All pending changes discarded.');
            return true;
        }
        return false;
    }

    /**
     * Stages global configuration updates
     * @param {Object} formData - Global config form data
     */
    stageGlobalConfigUpdate(formData) {
        const { params, customProperties } = formData;
        let hasChanges = false;
        
        // Check if Legacy Queue Mode is being changed before staging global updates
        const legacyModeChange = this._detectLegacyModeChange(params);
        
        // Stage standard global property updates
        if (params && Object.keys(params).length > 0) {
            this.schedulerConfigModel.stageGlobalUpdate(params);
            hasChanges = true;
        }
        
        // Stage custom global property updates
        if (customProperties && Object.keys(customProperties).length > 0) {
            this.schedulerConfigModel.stageGlobalUpdate(customProperties);
            hasChanges = true;
        }
        
        // Auto-stage queue configuration updates if Legacy Queue Mode changed
        if (legacyModeChange) {
            const queueUpdates = this._stageAutoCreationModeTransitions(legacyModeChange);
            if (queueUpdates > 0) {
                this.notificationView.showInfo(`Global settings changes staged. Automatically updated ${queueUpdates} queue auto-creation configurations.`);
                return; // Early return to avoid duplicate notification
            }
        }
        
        if (hasChanges) {
            this.notificationView.showInfo('Global settings changes staged.');
        }
    }
    
    /**
     * Detects if Legacy Queue Mode is being changed and returns transition info.
     * @param {Object} params - Global config parameters
     * @returns {Object|null} Transition info or null if no change
     * @private
     */
    _detectLegacyModeChange(params) {
        if (!params) return null;
        
        const legacyModeProperty = 'yarn.scheduler.capacity.legacy-queue-mode.enabled';
        if (!(legacyModeProperty in params)) return null;
        
        // Get current effective value
        const currentGlobalConfig = this.schedulerConfigModel.getGlobalConfig();
        const currentValue = currentGlobalConfig.get(legacyModeProperty);
        const currentLegacyMode = String(currentValue || 'true').toLowerCase() === 'true';
        
        // Get new value
        const newLegacyMode = String(params[legacyModeProperty]).toLowerCase() === 'true';
        
        if (currentLegacyMode === newLegacyMode) return null; // No change
        
        return {
            from: currentLegacyMode,
            to: newLegacyMode,
            property: legacyModeProperty
        };
    }
    
    /**
     * Stages auto-creation mode transitions for all queues when Legacy Queue Mode changes.
     * @param {Object} legacyModeChange - Legacy mode transition info
     * @returns {number} Number of queues updated
     * @private
     */
    _stageAutoCreationModeTransitions(legacyModeChange) {
        const { from: fromLegacyMode, to: toLegacyMode } = legacyModeChange;
        let updatedQueues = 0;
        
        // Get all queue paths
        const allQueuePaths = this.schedulerConfigModel.getAllQueuePaths();
        
        for (const queuePath of allQueuePaths) {
            const queueUpdates = this._stageQueueAutoCreationModeTransition(queuePath, fromLegacyMode, toLegacyMode);
            if (queueUpdates) {
                updatedQueues++;
            }
        }
        
        return updatedQueues;
    }
    
    /**
     * Stages auto-creation mode transition for a specific queue.
     * @param {string} queuePath - The queue path
     * @param {boolean} fromLegacyMode - Previous legacy mode setting
     * @param {boolean} toLegacyMode - New legacy mode setting
     * @returns {boolean} Whether any updates were staged
     * @private
     */
    _stageQueueAutoCreationModeTransition(queuePath, fromLegacyMode, toLegacyMode) {
        // Get queue properties to check current auto-creation state
        const queueProperties = this.schedulerConfigModel.getQueueNodeProperties(queuePath);
        if (!queueProperties) return false;
        
        // Check if queue has auto-creation enabled (either v1 or v2)
        const v1Enabled = String(queueProperties.get(`yarn.scheduler.capacity.${queuePath}.auto-create-child-queue.enabled`) || 'false').toLowerCase() === 'true';
        const v2Enabled = String(queueProperties.get(`yarn.scheduler.capacity.${queuePath}.auto-queue-creation-v2.enabled`) || 'false').toLowerCase() === 'true';
        
        if (!v1Enabled && !v2Enabled) return false; // No auto-creation enabled, nothing to do
        
        // Determine capacity mode to understand current/future auto-creation mode
        const capacityValue = queueProperties.get(`yarn.scheduler.capacity.${queuePath}.capacity`) || '';
        const capacityMode = this._determineCapacityMode(capacityValue);
        
        // Determine what auto-creation mode should be used
        const fromAutoCreationMode = this._determineAutoCreationMode(capacityMode, fromLegacyMode);
        const toAutoCreationMode = this._determineAutoCreationMode(capacityMode, toLegacyMode);
        
        if (fromAutoCreationMode === toAutoCreationMode) return false; // No mode change needed
        
        // Stage the transition
        const updateParams = {};
        
        if (fromAutoCreationMode === 'v1' && toAutoCreationMode === 'v2') {
            // v1 → v2: disable v1, enable v2
            if (v1Enabled) {
                updateParams['auto-create-child-queue.enabled'] = 'false';
            }
            updateParams['auto-queue-creation-v2.enabled'] = 'true';
        } else if (fromAutoCreationMode === 'v2' && toAutoCreationMode === 'v1') {
            // v2 → v1: disable v2, enable v1  
            if (v2Enabled) {
                updateParams['auto-queue-creation-v2.enabled'] = 'false';
            }
            updateParams['auto-create-child-queue.enabled'] = 'true';
        }
        
        if (Object.keys(updateParams).length > 0) {
            this.schedulerConfigModel.stageUpdateQueue(queuePath, updateParams);
            return true;
        }
        
        return false;
    }
    
    /**
     * Determines capacity mode from capacity value.
     * @param {string} capacityValue - The capacity value
     * @returns {string} The capacity mode
     * @private
     */
    _determineCapacityMode(capacityValue) {
        if (capacityValue.endsWith('w')) return 'weight';
        if (capacityValue.startsWith('[') && capacityValue.endsWith(']')) return 'vector';
        if (capacityValue.includes('%') || !isNaN(parseFloat(capacityValue))) return 'percentage';
        return 'percentage'; // Default fallback
    }
    
    /**
     * Determines auto-creation mode based on capacity mode and legacy setting.
     * @param {string} capacityMode - The capacity mode
     * @param {boolean} isLegacyMode - Whether legacy mode is enabled
     * @returns {string} The auto-creation mode ('v1' or 'v2')
     * @private
     */
    _determineAutoCreationMode(capacityMode, isLegacyMode) {
        if (!isLegacyMode) {
            // Non-legacy mode: always v2
            return 'v2';
        }
        
        // Legacy mode: v2 for weight, v1 for others
        return capacityMode === 'weight' ? 'v2' : 'v1';
    }

    /**
     * Handles scheduler configuration API result
     * @private
     */
    _handleConfigResult(configResult) {
        if (configResult.status === 200 && configResult.data) {
            this.schedulerConfigModel.loadSchedulerConfig(configResult.data.property || []);
            return true;
        } else {
            this.schedulerConfigModel.loadSchedulerConfig([]);
            this.notificationView.showError(configResult.error ||
                `Failed to fetch scheduler configuration (status: ${configResult.status})`);
            return false;
        }
    }

    /**
     * Handles scheduler info API result
     * @private
     */
    _handleInfoResult(infoResult) {
        if (infoResult.status === 200 && infoResult.data) {
            this.schedulerInfoModel.loadSchedulerInfo(infoResult.data);
            return true;
        } else {
            this.schedulerInfoModel.loadSchedulerInfo(null);
            this.notificationView.showWarning(infoResult.error ||
                `Failed to fetch scheduler info (status: ${infoResult.status})`);
            return false;
        }
    }

    /**
     * Checks if API response indicates success
     * @private
     */
    _isSuccessfulResponse(result) {
        return result.status === 200 && 
               result.data && 
               typeof result.data === 'string' && 
               result.data.toLowerCase().includes('successfully applied');
    }
}