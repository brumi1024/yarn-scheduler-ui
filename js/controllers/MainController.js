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

        // Initialize bulk operations
        this.bulkOperations = new BulkOperations(this.schedulerConfigModel, this.notificationView);
        this.bulkOperationsView = new BulkOperationsView(this.bulkOperations);

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
        this.appStateModel.subscribe('loadingStateChanged', ({ isLoading }) => {
            if (!isLoading && this.appStateModel.getCurrentTab() === 'queue-config-content' && this.queueTreeView && this.queueTreeView.getCurrentFormattedHierarchy()) {
                    this.queueTreeView._scheduleConnectorDraw(this.queueTreeView.getCurrentFormattedHierarchy());
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
            this.controlsView.subscribe('partitionSelected', (partition) =>
                this.appStateModel.setSelectedPartition(partition)
            );
            this.controlsView.subscribe('addQueueClicked', () => this.handleOpenAddQueueModal());
            this.controlsView.subscribe('searchTermChanged', (term) => this.appStateModel.setCurrentSearchTerm(term));
            this.controlsView.subscribe('sortCriteriaChanged', (criteria) =>
                this.appStateModel.setCurrentSortCriteria(criteria)
            );
            this.controlsView.subscribe('refreshDataClicked', () => this.handleRefreshData());
            this.controlsView.subscribe('bulkOperationsClicked', () => this.handleBulkOperationsToggle());
        }

        if (this.batchControlsView) {
            this.batchControlsView.subscribe('applyAllClicked', () => this.handleApplyAllChanges());
            this.batchControlsView.subscribe('discardAllClicked', () => this.handleDiscardAllChanges());
            this.batchControlsView.subscribe('previewChangesClicked', () => this.handlePreviewChanges());
        }

        if (this.globalConfigView) {
            this.globalConfigView.subscribe('editGlobalConfigClicked', () =>
                this.appStateModel.setGlobalConfigEditMode(true)
            );
            this.globalConfigView.subscribe('cancelGlobalConfigClicked', () => this.handleCancelGlobalConfigEdit());
            this.globalConfigView.subscribe('saveGlobalConfigClicked', (formData) =>
                this.handleSaveGlobalConfig(formData)
            );
            this.globalConfigView.subscribe('showNotification', (notifData) => this.notificationView.show(notifData));
        }

        if (this.queueTreeView) {
            this.queueTreeView.subscribe('editQueueClicked', (queuePath) => this.handleOpenEditQueueModal(queuePath));
            this.queueTreeView.subscribe('infoQueueClicked', (queuePath) => this.handleOpenInfoQueueModal(queuePath));
            this.queueTreeView.subscribe('addChildQueueClicked', (parentPath) =>
                this.handleOpenAddQueueModal(parentPath)
            );
            this.queueTreeView.subscribe('deleteQueueClicked', (queuePath) => this.handleDeleteQueue(queuePath));
            this.queueTreeView.subscribe('undoDeleteQueueClicked', (queuePath) =>
                this.handleUndoDeleteQueue(queuePath)
            );
        }

        this.addQueueModalView.subscribe('submitAddQueue', (formData) => this.handleAddNewQueue(formData));
        this.addQueueModalView.subscribe('modalHidden', () => {});

        this.editQueueModalView.subscribe('submitEditQueue', (eventData) =>
            this.handleStageQueueChanges(eventData.queuePath, eventData.formData)
        );
        this.editQueueModalView.subscribe('accessibleLabelsListChanged', (eventData) =>
            this.handleAccessibleLabelsListChangeInEditModal(eventData)
        );
        this.editQueueModalView.subscribe('modalHidden', (reason) => {
            if (reason.modalId === 'edit-modal') this.currentEditQueuePath = null;
        });

        this.infoQueueModalView.subscribe('modalHidden', () => {});

        // Bulk operations events
        if (this.bulkOperationsView) {
            this.bulkOperationsView.subscribe('selectAllRequested', () => this.handleSelectAllQueues());
            this.bulkOperationsView.subscribe('visibilityChanged', (isVisible) => this.handleBulkOperationsVisibilityChange(isVisible));
        }
    }

    async init() {
        this.appStateModel.setLoading(true, 'Initializing application...');
        let configSuccess = false;

        try {
            const [configResult, infoResult] = await Promise.all([
                this.apiService.fetchSchedulerConfig(),
                this.apiService.fetchSchedulerInfo(),
            ]);

            if (configResult.status === 200 && configResult.data) {
                this.schedulerConfigModel.loadSchedulerConfig(configResult.data.property || []);
                configSuccess = true;
            } else {
                this.schedulerConfigModel.loadSchedulerConfig([]);
                this.notificationView.showError(configResult.error ||
                    `Failed to fetch scheduler configuration (status: ${configResult.status})`);
            }

            if (infoResult.status === 200 && infoResult.data) {
                this.schedulerInfoModel.loadSchedulerInfo(infoResult.data);
            } else {
                this.schedulerInfoModel.loadSchedulerInfo(null);
                this.notificationView.showWarning(infoResult.error ||
                    `Failed to fetch scheduler info (status: ${infoResult.status})`);
            }
        } catch (error) {
            console.error('MainController init error:', error);
            this.notificationView.showError(`Application initialization failed: ${error.message}`);
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
            this.notificationView.showError(result.error || 'Configuration data is invalid.');
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
            this.renderInitialUI();
            this.appStateModel.setLoading(false);
        }
    }

    renderInitialUI() {
        if (this.tabView) this.tabView.render();
        this._handleTabChange(this.appStateModel.getCurrentTab());
        if (this.controlsView) this.controlsView.render();
        this.renderBatchControls();
    }

    renderQueueRelatedViews() {
        this.renderQueueTreeView();
    }

    _handleTabChange(tabId) {
        this.appStateModel.setGlobalConfigEditMode(false);
        if (tabId !== 'queue-config-content' && this.queueTreeView) {
            this.queueTreeView.clearConnectors();
        }
        if (this.batchControlsView) {
            if (tabId === 'queue-config-content') this.renderBatchControls();
            else this.batchControlsView.hide();
        }

        switch (tabId) {
            case 'queue-config-content': {
                this.renderQueueTreeView();
                break;
            }
            case 'scheduler-config-content': {
                this.renderGlobalConfigView();
                break;
            }
            default: {
                console.log(`Switched to tab: ${tabId} (Content View TBD)`);
                break;
            }
        }
    }

    renderQueueTreeView() {
        if (!this.queueTreeView || !this.schedulerConfigModel.getSchedulerTrieRoot()) {
            if (this.queueTreeView) this.queueTreeView.render(null, false);
            return;
        }
        const formattedHierarchy = this.viewDataFormatterService.formatQueueHierarchyForView(
            this.schedulerConfigModel,
            this.schedulerInfoModel,
            this.appStateModel
        );
        if (this.queueTreeView) {
            this.queueTreeView.render(formattedHierarchy, true);
            
            // Re-add bulk selection checkboxes if bulk operations is visible
            if (this.bulkOperationsView && this.bulkOperationsView.isVisible) {
                setTimeout(() => {
                    this._addBulkSelectionToQueueCards();
                    if (this.bulkOperationsView) {
                        this.bulkOperationsView.updateCheckboxStates();
                    }
                }, 50); // Small delay to ensure DOM is ready
            }
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
            const changeLog = this.schedulerConfigModel.getChangeLog();
            const summary = changeLog.getSummary();
            // Include global changes in modified count for UI display
            const counts = {
                added: summary.added,
                modified: summary.modified + summary.global,
                deleted: summary.deleted
            };
            const totalChanges = counts.added + counts.modified + counts.deleted;
            let validationErrors = [];
            if (totalChanges > 0) {
                validationErrors = this.schedulerConfigModel.performStatefulValidation(
                    this.viewDataFormatterService,
                    this.appStateModel
                );
            }
            this.batchControlsView.render(counts, validationErrors);
        }
    }

    handleOpenAddQueueModal(parentPath = 'root') {
        if (!this.addQueueModalView) return;
        const parentQueues = this.schedulerConfigModel
            .getAllQueuePaths()
            .map((p) => ({ path: p, name: p.slice(Math.max(0, p.lastIndexOf('.') + 1)) || p }));

        let effectiveParentPath = parentPath;
        if (!parentQueues.some((p) => p.path === parentPath)) {
            effectiveParentPath = 'root';
        }
        if (parentQueues.length === 0 || !parentQueues.some((p) => p.path === 'root')) {
            parentQueues.unshift({ path: 'root', name: 'root' });
        }

        this.addQueueModalView.show({ parentQueues, preselectedParentPath: effectiveParentPath });
    }

    handleAddNewQueue(formData) {
        const { parentPath, queueName, params } = formData;

        const nameValidation = this.validationService.isValidQueueNameChars(queueName);
        if (!nameValidation.isValid) {
            this.notificationView.showError(nameValidation.message);
            return;
        }
        const capacityValidation = this.validationService.parseAndValidateCapacityValue(
            params.capacity,
            params._ui_capacityMode
        );
        if (capacityValidation.errors || capacityValidation.error) {
            this.notificationView.showError(`Capacity: ${(capacityValidation.errors || [capacityValidation.error]).join('; ')}`);
            return;
        }
        params.capacity = capacityValidation.value;

        const maxCapModeForValidation = this.viewDataFormatterService._isVectorString(params['maximum-capacity'])
            ? CAPACITY_MODES.ABSOLUTE
            : CAPACITY_MODES.PERCENTAGE;
        const maxCapacityValidation = this.validationService.parseAndValidateCapacityValue(
            params['maximum-capacity'],
            maxCapModeForValidation,
            true
        );
        if (maxCapacityValidation.errors || maxCapacityValidation.error) {
            this.notificationView.showError(`Max Capacity: ${(maxCapacityValidation.errors || [maxCapacityValidation.error]).join('; ')}`);
            return;
        }
        params['maximum-capacity'] = maxCapacityValidation.value;

        const newPath = parentPath === 'root' ? `root.${queueName}` : `${parentPath}.${queueName}`;
        const currentHierarchyForValidation = this.viewDataFormatterService.formatQueueHierarchyForView(
            this.schedulerConfigModel,
            this.schedulerInfoModel,
            this.appStateModel,
            true
        );

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
            };
            parentNodeToCheck = findParent(currentHierarchyForValidation, parentPath);
        }
        if (
            parentNodeToCheck &&
            parentNodeToCheck.children &&
            parentNodeToCheck.children[queueName] &&
            !parentNodeToCheck.children[queueName].isDeleted
        ) {
            this.notificationView.showError(`A queue named "${queueName}" effectively already exists under "${parentPath}".`);
            return;
        }

        this.schedulerConfigModel.stageAddQueue(newPath, params);
        this.addQueueModalView.hide();
        this.notificationView.showSuccess(`Queue "${queueName}" staged for addition under "${parentPath}".`);
    }

    handleOpenEditQueueModal(queuePath) {
        this.currentEditQueuePath = queuePath;
        const editData = this.viewDataFormatterService.formatQueueDataForEditModal(
            queuePath,
            this.schedulerConfigModel,
            this.schedulerInfoModel,
            this.appStateModel
        );
        if (editData) {
            this.editQueueModalView.show(editData);
        } else {
            this.notificationView.showError(`Could not load data for queue: ${queuePath}`);
        }
    }

    handleAccessibleLabelsListChangeInEditModal(eventData) {
        const { queuePath, newLabelsString, currentFormParams } = eventData;
        if (!this.editQueueModalView || this.currentEditQueuePath !== queuePath) return;

        const baseTrieNode = this.schedulerConfigModel.getTrieInstance().getQueueNode(queuePath);
        const temporaryEffectiveProperties = new Map(baseTrieNode ? baseTrieNode.properties : undefined);

        const changeLog = this.schedulerConfigModel.getChangeLog();
        const addChanges = changeLog.getQueueAdditions().filter(change => change.path === queuePath);
        if (addChanges.length > 0) {
            temporaryEffectiveProperties.clear();
            for (const [simpleKey, value] of Object.entries(currentFormParams)) {
                if (simpleKey === '_ui_capacityMode') continue;
                const fullKey =
                    this.viewDataFormatterService._mapSimpleKeyToFullYarnKey(queuePath, simpleKey) ||
                    `yarn.scheduler.capacity.${queuePath}.${simpleKey}`;
                temporaryEffectiveProperties.set(fullKey, value);
            }
        } else {
            const updateChanges = changeLog.getQueueUpdates().filter(change => change.path === queuePath);
            if (updateChanges.length > 0) {
                for (const [fullKey, value] of updateChanges[0].properties) {
                    const simpleKey = PropertyKeyMapper.toSimpleKey(fullKey);
                    if (simpleKey === '_ui_capacityMode') continue;
                    temporaryEffectiveProperties.set(fullKey, value);
                }
            }
            for (const [simpleKey, value] of Object.entries(currentFormParams)) {
                if (simpleKey === '_ui_capacityMode') continue;
                const fullKey =
                    this.viewDataFormatterService._mapSimpleKeyToFullYarnKey(queuePath, simpleKey) ||
                    `yarn.scheduler.capacity.${queuePath}.${simpleKey}`;
                temporaryEffectiveProperties.set(fullKey, value);
            }
        }
        const anlFullKey = `yarn.scheduler.capacity.${queuePath}.accessible-node-labels`;
        temporaryEffectiveProperties.set(anlFullKey, newLabelsString);

        const temporaryTrieNodeLike = {
            fullPath: queuePath,
            segment: queuePath.split('.').pop(),
            properties: temporaryEffectiveProperties,
            children: baseTrieNode ? baseTrieNode.children : new Map(),
            isQueue: true,
        };
        const mockSchedulerConfigModelForFormatter = {
            getTrieInstance: () => ({
                getQueueNode: (p) =>
                    p === queuePath ? temporaryTrieNodeLike : this.schedulerConfigModel.getTrieInstance().getQueueNode(p),
            }),
            getChangeLog: () => this.schedulerConfigModel.getChangeLog(),
        };

        const refreshedModalData = this.viewDataFormatterService.formatQueueDataForEditModal(
            queuePath,
            mockSchedulerConfigModelForFormatter,
            this.schedulerInfoModel,
            this.appStateModel
        );

        if (refreshedModalData) {
            this.editQueueModalView.show(refreshedModalData);
            this.notificationView.showInfo('Node label fields updated. Please review.');
        } else {
            this.notificationView.showError('Error refreshing node label fields in modal.');
        }
    }

    handleStageQueueChanges(queuePath, formData) {
        const { params } = formData;
        if (Object.prototype.hasOwnProperty.call(params,'capacity')) {
            // Also check _ui_capacityMode from params for validation
            const modeForValidation =
                params._ui_capacityMode ||
                this.viewDataFormatterService._determineEffectiveCapacityMode(
                    queuePath,
                    this.schedulerConfigModel.getQueueNodeProperties(queuePath) ||
                        new Map(
                            Object.entries(params).map(([k, v]) => [
                                this.viewDataFormatterService._mapSimpleKeyToFullYarnKey(queuePath, k),
                                v,
                            ])
                        )
                );
            const capacityValidation = this.validationService.parseAndValidateCapacityValue(
                params.capacity,
                modeForValidation
            );
            if (capacityValidation.errors || capacityValidation.error) {
                this.notificationView.showError(`Invalid Capacity: ${(capacityValidation.errors || [capacityValidation.error]).join('; ')}`);
                return;
            }
            params.capacity = capacityValidation.value;
        }
        if (Object.prototype.hasOwnProperty.call(params, 'maximum-capacity')) {
            const maxCapMode = this.viewDataFormatterService._isVectorString(params['maximum-capacity'])
                ? CAPACITY_MODES.ABSOLUTE
                : CAPACITY_MODES.PERCENTAGE;
            const maxCapacityValidation = this.validationService.parseAndValidateCapacityValue(
                params['maximum-capacity'],
                maxCapMode,
                true
            );
            if (maxCapacityValidation.errors || maxCapacityValidation.error) {
                this.notificationView.showError(`Invalid Max Capacity: ${(maxCapacityValidation.errors || [maxCapacityValidation.error]).join('; ')}`);
                return;
            }
            params['maximum-capacity'] = maxCapacityValidation.value;
        }

        this.schedulerConfigModel.stageUpdateQueue(queuePath, params);
        this.editQueueModalView.hide();
        this.notificationView.showSuccess(`Changes for queue "${queuePath.split('.').pop()}" staged.`);
    }

    handleDeleteQueue(queuePath) {
        if (
            globalThis.confirm(
                `Are you sure you want to mark queue "${queuePath}" for deletion? \nThis will also remove any other staged changes for this queue.`
            )
        ) {
            const effectiveHierarchy = this.viewDataFormatterService.formatQueueHierarchyForView(
                this.schedulerConfigModel,
                this.schedulerInfoModel,
                this.appStateModel,
                true
            );
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
                    this.notificationView.showWarning(deletability.reason);
                    return;
                }
            } else if (queuePath !== 'root') {
                this.notificationView.showWarning(`Could not fully validate deletability for ${queuePath}. Staging deletion.`);
            }
            this.schedulerConfigModel.stageRemoveQueue(queuePath);
            this.notificationView.showInfo(`Queue "${queuePath}" marked for deletion.`);
        }
    }

    handleUndoDeleteQueue(queuePath) {
        const changeLog = this.schedulerConfigModel.getChangeLog();
        const deletions = changeLog.getQueueDeletions();
        const deleteChange = deletions.find(change => change.path === queuePath);
        if (deleteChange) {
            changeLog.removeChange(deleteChange.id);
            this.schedulerConfigModel._emit('pendingChangesUpdated', changeLog);
            this.notificationView.showInfo(`Deletion mark for "${queuePath}" undone.`);
        } else {
            this.notificationView.showWarning(`Queue "${queuePath}" was not marked for deletion.`);
        }
    }

    handleOpenInfoQueueModal(queuePath) {
        const infoData = this.viewDataFormatterService.formatQueueDataForInfoModal(
            queuePath,
            this.schedulerConfigModel,
            this.schedulerInfoModel,
            this.appStateModel
        );
        if (infoData) {
            this.infoQueueModalView.show(infoData);
        } else {
            this.notificationView.showError(`Could not load info for queue: ${queuePath}`);
        }
    }

    handleCancelGlobalConfigEdit() {
        this.appStateModel.setGlobalConfigEditMode(false);
    }

    handleSaveGlobalConfig(formData) {
        if (formData && formData.params && Object.keys(formData.params).length > 0) {
            this.schedulerConfigModel.stageGlobalUpdate(formData.params);
            this.notificationView.showInfo('Global settings changes staged.');
        }
        this.appStateModel.setGlobalConfigEditMode(false);
    }

    async handleApplyAllChanges() {
        this.appStateModel.setLoading(true, 'Validating changes...');
        await new Promise((resolve) => setTimeout(resolve, 50));

        const validationErrors = this.schedulerConfigModel.performStatefulValidation(
            this.viewDataFormatterService,
            this.appStateModel
        );

        if (validationErrors.length > 0) {
            this.notificationView.show({
                message: `Cannot apply: ${validationErrors.map((e) => e.message).join('; ')}`,
                type: 'error',
                duration: CONFIG.TIMEOUTS.NOTIFICATION_DURATION.ERROR + 2000,
            });
            this.appStateModel.setLoading(false);
            this.renderBatchControls();
            return;
        }

        if (!this.schedulerConfigModel.hasPendingChanges()) {
            this.notificationView.showInfo('No changes to apply.');
            this.appStateModel.setLoading(false);
            return;
        }

        this.appStateModel.setLoading(true, 'Applying configuration changes...');
        const changeLog = this.schedulerConfigModel.getChangeLog();
        const apiPayload = changeLog.getApiPayload();

        const result = await this.apiService.putSchedulerChanges(apiPayload);

        if (
            result.status === 200 &&
            result.data &&
            typeof result.data === 'string' &&
            result.data.toLowerCase().includes('successfully applied')
        ) {
            this.notificationView.showSuccess('Configuration changes applied successfully!');
            this.schedulerConfigModel.clearPendingChanges();
            this.appStateModel.setLoading(true, 'Reloading configuration from server...');
            await this.init();
        } else {
            const errorDetail =
                result.error ||
                (typeof result.data === 'string' ? result.data : 'Unknown YARN error or non-string response.');
            this.notificationView.show({
                message: `Failed to apply changes: ${errorDetail}`,
                type: 'error',
                duration: CONFIG.TIMEOUTS.NOTIFICATION_DURATION.ERROR + 7000,
            });
            this.appStateModel.setLoading(false);
        }
        this.renderBatchControls();
    }

    handleDiscardAllChanges() {
        if (this.schedulerConfigModel.hasPendingChanges()) {
            if (
                globalThis.confirm(
                    'Are you sure you want to discard all pending local changes? This action cannot be undone.'
                )
            ) {
                this.schedulerConfigModel.clearPendingChanges();
                this.notificationView.showInfo('All pending changes discarded.');
                this.renderQueueRelatedViews();
                this.renderGlobalConfigView();
                this.renderBatchControls();
            }
        } else {
            this.notificationView.showInfo( 'No pending changes to discard.');
        }
    }

    async handleRefreshData() {
        if (this.schedulerConfigModel.hasPendingChanges()) {
            if (
                !globalThis.confirm('Refreshing data from the server will discard any unapplied local changes. Continue?')
            ) {
                return;
            }
            this.schedulerConfigModel.clearPendingChanges();
        }
        this.appStateModel.setLoading(true, 'Refreshing all data from server...');
        await this.init();
        this.notificationView.showSuccess('Data refreshed from server.');
    }

    /**
     * Handles toggling the bulk operations view.
     */
    handleBulkOperationsToggle() {
        if (this.bulkOperationsView) {
            this.bulkOperationsView.toggle();
        }
    }

    /**
     * Handles select all queues request from bulk operations.
     */
    handleSelectAllQueues() {
        // Get all queue paths from the current hierarchy
        const allQueuePaths = this.schedulerConfigModel.getAllQueuePaths();
        
        // Filter out root if it exists
        const selectableQueuePaths = allQueuePaths.filter(path => path !== 'root');
        
        if (this.bulkOperations) {
            this.bulkOperations.selectAll(selectableQueuePaths);
        }
    }

    /**
     * Handles bulk operations toolbar visibility changes.
     * @param {boolean} isVisible - Whether the toolbar is visible
     */
    handleBulkOperationsVisibilityChange(isVisible) {
        if (isVisible) {
            // Add checkboxes to queue cards
            this._addBulkSelectionToQueueCards();
            // Adjust queue positioning for bulk toolbar
            this._adjustQueueLayoutForBulkBar(true);
        } else {
            // Remove checkboxes from queue cards
            this._removeBulkSelectionFromQueueCards();
            // Restore normal queue positioning
            this._adjustQueueLayoutForBulkBar(false);
        }
    }

    /**
     * Adds selection checkboxes to all queue cards.
     */
    _addBulkSelectionToQueueCards() {
        if (!this.bulkOperationsView) return;
        
        const queueCards = document.querySelectorAll('.queue-card');
        for (const card of queueCards) {
            const queuePath = card.dataset.queuePath;
            if (queuePath && queuePath !== 'root') {
                this.bulkOperationsView.addSelectionCheckbox(card, queuePath);
            }
        }
    }

    /**
     * Removes selection checkboxes from all queue cards.
     */
    _removeBulkSelectionFromQueueCards() {
        if (this.bulkOperationsView) {
            this.bulkOperationsView.removeSelectionCheckboxes();
        }
    }

    /**
     * Adjusts queue layout when bulk operations bar is shown/hidden.
     * @param {boolean} showingBulkBar - Whether the bulk bar is being shown
     */
    _adjustQueueLayoutForBulkBar(showingBulkBar) {
        const treeContainer = document.getElementById('queue-tree');
        if (!treeContainer) return;

        if (showingBulkBar) {
            // Add margin/padding to account for bulk toolbar
            treeContainer.style.marginTop = '80px'; // Adjust based on toolbar height
        } else {
            // Remove the adjustment
            treeContainer.style.marginTop = '';
        }

        // Re-render connectors after layout change
        setTimeout(() => {
            if (this.queueTreeView && this.queueTreeView.getCurrentFormattedHierarchy()) {
                this.queueTreeView.clearConnectors();
                this.queueTreeView._scheduleConnectorDraw(this.queueTreeView.getCurrentFormattedHierarchy());
            }
        }, 100);
    }

    /**
     * Handles showing the change preview modal.
     */
    handlePreviewChanges() {
        if (this.batchControlsView) {
            // Get ChangeLog directly
            const changeLog = this.schedulerConfigModel.getChangeLog();
            
            // Update the preview with current changes
            this.batchControlsView.updateChangePreview(changeLog);
            
            // Show the preview modal
            this.batchControlsView.showPreviewModal();
        }
    }
}
