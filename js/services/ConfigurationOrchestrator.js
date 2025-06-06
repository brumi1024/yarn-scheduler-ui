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
        
        if (hasChanges) {
            this.notificationView.showInfo('Global settings changes staged.');
        }
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