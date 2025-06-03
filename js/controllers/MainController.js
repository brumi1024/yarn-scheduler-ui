class MainController {
    constructor() {
        this.appStateModel = new AppStateModel();
        this.schedulerConfigModel = new SchedulerConfigModel();
        this.schedulerInfoModel = new SchedulerInfoModel();

        this.apiService = new ApiService(CONFIG.API_BASE_URL, CONFIG.USE_MOCKS, CONFIG.MOCK_DATA_BASE_PATH);
        this.validationService = ValidationService;
        this.viewDataFormatterService = new ViewDataFormatterService();

        this.loadingView = new LoadingView(this.appStateModel);
        this.notificationView = new NotificationView();
        this.tabView = new TabView(this.appStateModel);

        this.controlsView = new ControlsView(this.appStateModel);
        this.batchControlsView = new BatchControlsView(this.appStateModel);
        this.globalConfigView = new GlobalConfigView(this.appStateModel);
        this.queueTreeView = new QueueTreeView(this.appStateModel);

        this.addQueueModalView = new AddQueueModalView(this);
        this.editQueueModalView = new EditQueueModalView(this);
        this.infoQueueModalView = new InfoQueueModalView(this);

        this.currentEditQueuePath = null;

        this._bindAppEvents();
    }

    _bindAppEvents() {
        // --- AppStateModel Listeners ---
        this.appStateModel.subscribe('currentTabChanged', (tabId) => this._handleTabChange(tabId));
        this.appStateModel.subscribe('selectedPartitionChanged', () => this.renderQueueRelatedViews());
        this.appStateModel.subscribe('searchTermChanged', () => this.renderQueueTreeView());
        this.appStateModel.subscribe('sortCriteriaChanged', () => this.renderQueueTreeView());
        this.appStateModel.subscribe('globalConfigEditModeChanged', () => {
            if (this.appStateModel.getCurrentTab() === 'scheduler-config-content') {
                this.renderGlobalConfigView();
            }
        });
        this.appStateModel.subscribe('loadingStateChanged', ({isLoading}) => {
            if (!isLoading && this.appStateModel.getCurrentTab() === 'queue-config-content') {
                if (this.queueTreeView && this.queueTreeView.getCurrentFormattedHierarchy()) {
                    this.queueTreeView._scheduleConnectorDraw(this.queueTreeView.getCurrentFormattedHierarchy());
                }
            }
        });

        // --- SchedulerConfigModel Listeners ---
        this.schedulerConfigModel.subscribe('configLoaded', (result) => this._handleConfigLoaded(result));
        this.schedulerConfigModel.subscribe('pendingChangesUpdated', () => this._handlePendingChangesUpdate());

        // --- SchedulerInfoModel Listeners ---
        this.schedulerInfoModel.subscribe('infoLoaded', (result) => this._handleSchedulerInfoLoaded(result));

        // --- View Event Listeners ---
        this.tabView.subscribe('tabClicked', (tabId) => this.appStateModel.setCurrentTab(tabId));

        if (this.controlsView) {
            this.controlsView.subscribe('partitionSelected', (partition) => this.appStateModel.setSelectedPartition(partition));
            this.controlsView.subscribe('addQueueClicked', () => this.handleOpenAddQueueModal());
            this.controlsView.subscribe('searchTermChanged', (term) => this.appStateModel.setCurrentSearchTerm(term));
            this.controlsView.subscribe('sortCriteriaChanged', (criteria) => this.appStateModel.setCurrentSortCriteria(criteria));
            this.controlsView.subscribe('refreshDataClicked', () => this.handleRefreshData());
        }

        if (this.batchControlsView) {
            this.batchControlsView.subscribe('applyAllClicked', () => this.handleApplyAllChanges());
            this.batchControlsView.subscribe('discardAllClicked', () => this.handleDiscardAllChanges());
        }

        if (this.globalConfigView) {
            this.globalConfigView.subscribe('editGlobalConfigClicked', () => this.appStateModel.setGlobalConfigEditMode(true));
            this.globalConfigView.subscribe('cancelGlobalConfigClicked', () => this.handleCancelGlobalConfigEdit());
            this.globalConfigView.subscribe('saveGlobalConfigClicked', (formData) => this.handleSaveGlobalConfig(formData));
            this.globalConfigView.subscribe('showNotification', (notifData) => this.notificationView.show(notifData));
        }

        if (this.queueTreeView) {
            this.queueTreeView.subscribe('editQueueClicked', (queuePath) => this.handleOpenEditQueueModal(queuePath));
            this.queueTreeView.subscribe('infoQueueClicked', (queuePath) => this.handleOpenInfoQueueModal(queuePath));
            this.queueTreeView.subscribe('addChildQueueClicked', (parentPath) => this.handleOpenAddQueueModal(parentPath));
            this.queueTreeView.subscribe('deleteQueueClicked', (queuePath) => this.handleDeleteQueue(queuePath));
            this.queueTreeView.subscribe('undoDeleteQueueClicked', (queuePath) => this.handleUndoDeleteQueue(queuePath));
        }

        this.addQueueModalView.subscribe('submitAddQueue', (formData) => this.handleAddNewQueue(formData));
        this.addQueueModalView.subscribe('modalHidden', () => {
        });

        this.editQueueModalView.subscribe('submitEditQueue', (eventData) => this.handleStageQueueChanges(eventData.queuePath, eventData.formData));
        this.editQueueModalView.subscribe('accessibleLabelsListChanged', (eventData) => this.handleAccessibleLabelsListChangeInEditModal(eventData));
        this.editQueueModalView.subscribe('modalHidden', (reason) => {
            if (reason.modalId === 'edit-modal') this.currentEditQueuePath = null;
        });

        this.infoQueueModalView.subscribe('modalHidden', () => {
        });
    }

    async init() {
        this.appStateModel.setLoading(true, 'Initializing application...');
        let configSuccess = false;

        try {
            const [configResult, infoResult] = await Promise.all([
                this.apiService.fetchSchedulerConfig(),
                this.apiService.fetchSchedulerInfo()
            ]);

            if (configResult.status === 200 && configResult.data) {
                this.schedulerConfigModel.loadSchedulerConfig(configResult.data.property || []);
                configSuccess = true;
            } else {
                this.schedulerConfigModel.loadSchedulerConfig([]);
                this.notificationView.show({
                    message: configResult.error || `Failed to fetch scheduler configuration (status: ${configResult.status})`,
                    type: 'error'
                });
            }

            if (infoResult.status === 200 && infoResult.data) {
                this.schedulerInfoModel.loadSchedulerInfo(infoResult.data);
            } else {
                this.schedulerInfoModel.loadSchedulerInfo(null);
                this.notificationView.show({
                    message: infoResult.error || `Failed to fetch scheduler info (status: ${infoResult.status})`,
                    type: 'warning'
                });
            }
        } catch (error) {
            console.error("MainController init error:", error);
            this.notificationView.show({message: `Application initialization failed: ${error.message}`, type: 'error'});
            this.schedulerConfigModel.loadSchedulerConfig([]);
            this.schedulerInfoModel.loadSchedulerInfo(null);
        } finally {
            if (!configSuccess) {
                this._tryRenderInitialViews();
                this.appStateModel.setLoading(false);
            }
            if (this.appStateModel.isLoading()) {
                setTimeout(() => this.appStateModel.setLoading(false), 100);
            }
        }
    }

    _handleConfigLoaded(result) {
        if (result.success) {
            this._tryRenderInitialViews();
        } else {
            this.notificationView.show({message: result.error || 'Configuration data is invalid.', type: 'error'});
            this.appStateModel.setLoading(false);
        }
    }

    _handleSchedulerInfoLoaded(result) {
        if (result.success && this.controlsView) {
            this.controlsView.renderPartitions(this.schedulerInfoModel.getPartitions());
        }
        this._tryRenderInitialViews();
    }

    _handlePendingChangesUpdate() {
        this.renderBatchControls();
        this.renderQueueTreeView();
    }

    _tryRenderInitialViews() {
        if (this.schedulerConfigModel.getSchedulerTrieRoot() && this.schedulerInfoModel.getPartitions().length > 0) {
            this.renderInitialUI(true);
            this.appStateModel.setLoading(false);
        } else if (!this.schedulerConfigModel.getSchedulerTrieRoot() && this.appStateModel.isLoading()) {
        }
    }

    renderInitialUI(drawConnectorsNow = true) {
        if (this.tabView) this.tabView.render();
        this._handleTabChange(this.appStateModel.getCurrentTab(), drawConnectorsNow);
        if (this.controlsView) this.controlsView.render();
        this.renderBatchControls();
    }

    renderQueueRelatedViews() {
        this.renderQueueTreeView(true);
    }

    _handleTabChange(tabId, drawConnectorsOnQueueTab = true) {
        this.appStateModel.setGlobalConfigEditMode(false);
        if (tabId !== 'queue-config-content' && this.queueTreeView) {
            this.queueTreeView.clearConnectors();
        }
        if (this.batchControlsView) {
            if (tabId === 'queue-config-content') this.renderBatchControls();
            else this.batchControlsView.hide();
        }

        switch (tabId) {
            case 'queue-config-content':
                this.renderQueueTreeView(drawConnectorsOnQueueTab);
                break;
            case 'scheduler-config-content':
                this.renderGlobalConfigView();
                break;
            default:
                console.log(`Switched to tab: ${tabId} (Content View TBD)`);
                break;
        }
    }

    renderQueueTreeView(drawConnectors = true) {
        if (!this.queueTreeView || !this.schedulerConfigModel.getSchedulerTrieRoot()) {
            if (this.queueTreeView) this.queueTreeView.render(null, false);
            return;
        }
        const formattedHierarchy = this.viewDataFormatterService.formatQueueHierarchyForView(
            this.schedulerConfigModel, this.schedulerInfoModel, this.appStateModel
        );
        if (this.queueTreeView) {
            this.queueTreeView.render(formattedHierarchy, drawConnectors);
        }
    }

    renderGlobalConfigView() {
        if (this.globalConfigView && this.schedulerConfigModel) {
            const configData = this.schedulerConfigModel.getGlobalConfig();
            const editMode = this.appStateModel.isGlobalConfigInEditMode();
            this.globalConfigView.render(configData, editMode);
        }
    }

    renderBatchControls() {
        if (this.batchControlsView && this.schedulerConfigModel) {
            const rawChanges = this.schedulerConfigModel.getRawPendingChanges();
            const counts = {
                added: rawChanges.addQueues.length,
                modified: rawChanges.updateQueues.length,
                deleted: rawChanges.removeQueues.length,
                global: Object.keys(rawChanges.globalUpdates).length
            };
            const totalChanges = counts.added + counts.modified + counts.deleted + counts.global;
            let validationErrors = [];
            if (totalChanges > 0) {
                validationErrors = this.schedulerConfigModel.performStatefulValidation(this.viewDataFormatterService, this.appStateModel);
            }
            this.batchControlsView.render(counts, validationErrors);
        }
    }

    handleOpenAddQueueModal(parentPath = 'root') {
        if (!this.addQueueModalView) return;
        const parentQueues = this.schedulerConfigModel.getAllQueuePaths()
            .map(p => ({path: p, name: p.substring(p.lastIndexOf('.') + 1) || p}));

        let effectiveParentPath = parentPath;
        if (!parentQueues.some(p => p.path === parentPath)) {
            effectiveParentPath = 'root';
        }
        if (parentQueues.length === 0 || !parentQueues.some(p => p.path === 'root')) {
            parentQueues.unshift({path: 'root', name: 'root'});
        }

        this.addQueueModalView.show({parentQueues, preselectedParentPath: effectiveParentPath});
    }

    handleAddNewQueue(formData) {
        const {parentPath, queueName, params} = formData;

        const nameValidation = this.validationService.isValidQueueNameChars(queueName);
        if (!nameValidation.isValid) {
            this.notificationView.show({message: nameValidation.message, type: 'error'});
            return;
        }
        const capacityValidation = this.validationService.parseAndValidateCapacityValue(params.capacity, params._ui_capacityMode);
        if (capacityValidation.errors || capacityValidation.error) {
            this.notificationView.show({
                message: `Capacity: ${(capacityValidation.errors || [capacityValidation.error]).join('; ')}`,
                type: 'error'
            });
            return;
        }
        params.capacity = capacityValidation.value;

        const maxCapModeForValidation = this.viewDataFormatterService._isVectorString(params['maximum-capacity']) ? CAPACITY_MODES.ABSOLUTE : CAPACITY_MODES.PERCENTAGE;
        const maxCapacityValidation = this.validationService.parseAndValidateCapacityValue(params['maximum-capacity'], maxCapModeForValidation, true);
        if (maxCapacityValidation.errors || maxCapacityValidation.error) {
            this.notificationView.show({
                message: `Max Capacity: ${(maxCapacityValidation.errors || [maxCapacityValidation.error]).join('; ')}`,
                type: 'error'
            });
            return;
        }
        params['maximum-capacity'] = maxCapacityValidation.value;

        const newPath = parentPath === 'root' ? `root.${queueName}` : `${parentPath}.${queueName}`;
        const currentHierarchyForValidation = this.viewDataFormatterService.formatQueueHierarchyForView(this.schedulerConfigModel, this.schedulerInfoModel, this.appStateModel, true);

        let parentNodeToCheck = currentHierarchyForValidation;
        if (parentPath !== 'root' && parentNodeToCheck) {
            const findParent = (node, pPath) => {
                if (!node) return null;
                if (node.path === pPath) return node;
                if (node.children) {
                    for (const childName in node.children) {
                        const found = findParent(node.children[childName], pPath);
                        if (found) return found;
                    }
                }
                return null;
            }
            parentNodeToCheck = findParent(currentHierarchyForValidation, parentPath);
        }
        if (parentNodeToCheck && parentNodeToCheck.children && parentNodeToCheck.children[queueName] && !parentNodeToCheck.children[queueName].isDeleted) {
            this.notificationView.show({
                message: `A queue named "${queueName}" effectively already exists under "${parentPath}".`,
                type: 'error'
            });
            return;
        }

        this.schedulerConfigModel.stageAddQueue(newPath, params);
        this.addQueueModalView.hide();
        this.notificationView.show({
            message: `Queue "${queueName}" staged for addition under "${parentPath}".`,
            type: 'success'
        });
    }

    handleOpenEditQueueModal(queuePath) {
        this.currentEditQueuePath = queuePath;
        const editData = this.viewDataFormatterService.formatQueueDataForEditModal(
            queuePath, this.schedulerConfigModel, this.schedulerInfoModel, this.appStateModel
        );
        if (editData) {
            this.editQueueModalView.show(editData);
        } else {
            this.notificationView.show({message: `Could not load data for queue: ${queuePath}`, type: 'error'});
        }
    }

    handleAccessibleLabelsListChangeInEditModal(eventData) {
        const {queuePath, newLabelsString, currentFormParams} = eventData;
        if (!this.editQueueModalView || this.currentEditQueuePath !== queuePath) return;

        const baseTrieNode = this.schedulerConfigModel.getTrieInstance().getQueueNode(queuePath);
        let tempEffectiveProperties = new Map(baseTrieNode ? baseTrieNode.properties : undefined);

        const addEntry = this.schedulerConfigModel.getRawPendingChanges().addQueues.find(a => a.queueName === queuePath);
        if (addEntry) {
            tempEffectiveProperties.clear();
            Object.entries(currentFormParams).forEach(([simpleKey, value]) => {
                if (simpleKey === '_ui_capacityMode') return;
                const fullKey = this.viewDataFormatterService._mapSimpleKeyToFullYarnKey(queuePath, simpleKey) || `yarn.scheduler.capacity.${queuePath}.${simpleKey}`;
                tempEffectiveProperties.set(fullKey, value);
            });
        } else {
            const existingPendingUpdate = this.schedulerConfigModel.getRawPendingChanges().updateQueues.find(u => u.queueName === queuePath);
            if (existingPendingUpdate) {
                Object.entries(existingPendingUpdate.params).forEach(([simpleKey, value]) => {
                    if (simpleKey === '_ui_capacityMode') return;
                    const fullKey = this.viewDataFormatterService._mapSimpleKeyToFullYarnKey(queuePath, simpleKey) || `yarn.scheduler.capacity.${queuePath}.${simpleKey}`;
                    tempEffectiveProperties.set(fullKey, value);
                });
            }
            Object.entries(currentFormParams).forEach(([simpleKey, value]) => {
                if (simpleKey === '_ui_capacityMode') return;
                const fullKey = this.viewDataFormatterService._mapSimpleKeyToFullYarnKey(queuePath, simpleKey) || `yarn.scheduler.capacity.${queuePath}.${simpleKey}`;
                tempEffectiveProperties.set(fullKey, value);
            });
        }
        const anlFullKey = `yarn.scheduler.capacity.${queuePath}.accessible-node-labels`;
        tempEffectiveProperties.set(anlFullKey, newLabelsString);

        const tempTrieNodeLike = {
            fullPath: queuePath, segment: queuePath.split('.').pop(),
            properties: tempEffectiveProperties,
            children: baseTrieNode ? baseTrieNode.children : new Map(),
            isQueue: true
        };
        const mockSchedulerConfigModelForFormatter = {
            getTrieInstance: () => ({getQueueNode: (p) => (p === queuePath ? tempTrieNodeLike : this.schedulerConfigModel.getTrieInstance().getQueueNode(p))}),
            getRawPendingChanges: () => ({...this.schedulerConfigModel.getRawPendingChanges()})
        };

        const refreshedModalData = this.viewDataFormatterService.formatQueueDataForEditModal(
            queuePath, mockSchedulerConfigModelForFormatter, this.schedulerInfoModel, this.appStateModel
        );

        if (refreshedModalData) {
            this.editQueueModalView.show(refreshedModalData);
            this.notificationView.show({message: "Node label fields updated. Please review.", type: "info"});
        } else {
            this.notificationView.show({message: "Error refreshing node label fields in modal.", type: "error"});
        }
    }

    handleStageQueueChanges(queuePath, formData) {
        const {params} = formData;
        if (params.hasOwnProperty('capacity')) { // Also check _ui_capacityMode from params for validation
            const modeForValidation = params._ui_capacityMode || this.viewDataFormatterService._determineEffectiveCapacityMode(queuePath, this.schedulerConfigModel.getQueueNodeProperties(queuePath) || new Map(Object.entries(params).map(([k, v]) => [this.viewDataFormatterService._mapSimpleKeyToFullYarnKey(queuePath, k), v])));
            const capacityValidation = this.validationService.parseAndValidateCapacityValue(params.capacity, modeForValidation);
            if (capacityValidation.errors || capacityValidation.error) {
                this.notificationView.show({
                    message: `Invalid Capacity: ${(capacityValidation.errors || [capacityValidation.error]).join('; ')}`,
                    type: 'error'
                });
                return;
            }
            params.capacity = capacityValidation.value;
        }
        if (params.hasOwnProperty('maximum-capacity')) {
            const maxCapMode = this.viewDataFormatterService._isVectorString(params['maximum-capacity']) ? CAPACITY_MODES.ABSOLUTE : CAPACITY_MODES.PERCENTAGE;
            const maxCapacityValidation = this.validationService.parseAndValidateCapacityValue(params['maximum-capacity'], maxCapMode, true);
            if (maxCapacityValidation.errors || maxCapacityValidation.error) {
                this.notificationView.show({
                    message: `Invalid Max Capacity: ${(maxCapacityValidation.errors || [maxCapacityValidation.error]).join('; ')}`,
                    type: 'error'
                });
                return;
            }
            params['maximum-capacity'] = maxCapacityValidation.value;
        }

        this.schedulerConfigModel.stageUpdateQueue(queuePath, params);
        this.editQueueModalView.hide();
        this.notificationView.show({
            message: `Changes for queue "${queuePath.split('.').pop()}" staged.`,
            type: 'success'
        });
    }

    handleDeleteQueue(queuePath) {
        if (window.confirm(`Are you sure you want to mark queue "${queuePath}" for deletion? \nThis will also remove any other staged changes for this queue.`)) {
            const effectiveHierarchy = this.viewDataFormatterService.formatQueueHierarchyForView(this.schedulerConfigModel, this.schedulerInfoModel, this.appStateModel, true);
            let nodeToValidate = null;
            const findNode = (node, path) => {
                if (!node) return null;
                if (node.path === path) return node;
                if (node.children) {
                    for (const name in node.children) {
                        const found = findNode(node.children[name], path);
                        if (found) return found;
                    }
                }
                return null;
            };
            if (effectiveHierarchy) nodeToValidate = findNode(effectiveHierarchy, queuePath);

            if (nodeToValidate) {
                const deletability = this.validationService.checkDeletability(nodeToValidate);
                if (!deletability.canDelete) {
                    this.notificationView.show({message: deletability.reason, type: 'warning'});
                    return;
                }
            } else if (queuePath !== 'root') {
                this.notificationView.show({
                    message: `Could not fully validate deletability for ${queuePath}. Staging deletion.`,
                    type: 'warning'
                });
            }
            this.schedulerConfigModel.stageRemoveQueue(queuePath);
            this.notificationView.show({message: `Queue "${queuePath}" marked for deletion.`, type: 'info'});
        }
    }

    handleUndoDeleteQueue(queuePath) {
        const pending = this.schedulerConfigModel.getRawPendingChanges();
        if (pending.removeQueues.includes(queuePath)) {
            this.schedulerConfigModel._pendingChanges.removeQueues = pending.removeQueues.filter(p => p !== queuePath);
            this.schedulerConfigModel._emit('pendingChangesUpdated');
            this.notificationView.show({message: `Deletion mark for "${queuePath}" undone.`, type: 'info'});
        } else {
            this.notificationView.show({message: `Queue "${queuePath}" was not marked for deletion.`, type: 'warning'});
        }
    }

    handleOpenInfoQueueModal(queuePath) {
        const infoData = this.viewDataFormatterService.formatQueueDataForInfoModal(
            queuePath, this.schedulerConfigModel, this.schedulerInfoModel, this.appStateModel
        );
        if (infoData) {
            this.infoQueueModalView.show(infoData);
        } else {
            this.notificationView.show({message: `Could not load info for queue: ${queuePath}`, type: 'error'});
        }
    }

    handleCancelGlobalConfigEdit() {
        this.appStateModel.setGlobalConfigEditMode(false);
    }

    handleSaveGlobalConfig(formData) {
        if (formData && formData.params && Object.keys(formData.params).length > 0) {
            this.schedulerConfigModel.stageGlobalUpdate(formData.params);
            this.notificationView.show({message: 'Global settings changes staged.', type: 'info'});
        }
        this.appStateModel.setGlobalConfigEditMode(false);
    }

    async handleApplyAllChanges() {
        this.appStateModel.setLoading(true, "Validating changes...");
        await new Promise(resolve => setTimeout(resolve, 50));

        const validationErrors = this.schedulerConfigModel.performStatefulValidation(this.viewDataFormatterService, this.appStateModel);

        if (validationErrors.length > 0) {
            this.notificationView.show({
                message: `Cannot apply: ${validationErrors.map(e => e.message).join('; ')}`,
                type: 'error',
                duration: CONFIG.TIMEOUTS.NOTIFICATION_DURATION.ERROR + 2000
            });
            this.appStateModel.setLoading(false);
            this.renderBatchControls();
            return;
        }

        if (!this.schedulerConfigModel.hasPendingChanges()) {
            this.notificationView.show({message: "No changes to apply.", type: "info"});
            this.appStateModel.setLoading(false);
            return;
        }

        this.appStateModel.setLoading(true, "Applying configuration changes...");
        const rawPendingChanges = this.schedulerConfigModel.getRawPendingChanges();
        const apiPayload = {
            addQueues: rawPendingChanges.addQueues,
            updateQueues: rawPendingChanges.updateQueues,
            removeQueues: rawPendingChanges.removeQueues,
            globalUpdates: rawPendingChanges.globalUpdates
        };

        const result = await this.apiService.putSchedulerChanges(apiPayload);

        if (result.status === 200 && result.data && typeof result.data === 'string' && result.data.toLowerCase().includes("successfully applied")) {
            this.notificationView.show({message: "Configuration changes applied successfully!", type: 'success'});
            this.schedulerConfigModel.clearPendingChanges();
            this.appStateModel.setLoading(true, 'Reloading configuration from server...');
            await this.init();
        } else {
            const errorDetail = result.error || (typeof result.data === 'string' ? result.data : 'Unknown YARN error or non-string response.');
            this.notificationView.show({
                message: `Failed to apply changes: ${errorDetail}`,
                type: 'error',
                duration: CONFIG.TIMEOUTS.NOTIFICATION_DURATION.ERROR + 7000
            });
            this.appStateModel.setLoading(false);
        }
        this.renderBatchControls();
    }

    handleDiscardAllChanges() {
        if (this.schedulerConfigModel.hasPendingChanges()) {
            if (window.confirm("Are you sure you want to discard all pending local changes? This action cannot be undone.")) {
                this.schedulerConfigModel.clearPendingChanges();
                this.notificationView.show({message: "All pending changes discarded.", type: 'info'});
                this.renderQueueRelatedViews();
                this.renderGlobalConfigView();
                this.renderBatchControls();
            }
        } else {
            this.notificationView.show({message: "No pending changes to discard.", type: 'info'});
        }
    }

    async handleRefreshData() {
        if (this.schedulerConfigModel.hasPendingChanges()) {
            if (!window.confirm("Refreshing data from the server will discard any unapplied local changes. Continue?")) {
                return;
            }
            this.schedulerConfigModel.clearPendingChanges();
        }
        this.appStateModel.setLoading(true, 'Refreshing all data from server...');
        await this.init();
        this.notificationView.show({message: 'Data refreshed from server.', type: 'success'});
    }
}