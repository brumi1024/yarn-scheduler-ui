class MainController {
    constructor() {
        // Core models
        this.appStateModel = new AppStateModel();
        this.schedulerConfigModel = new SchedulerConfigModel();
        this.schedulerInfoModel = new SchedulerInfoModel();
        this.nodesInfoModel = new NodesInfoModel();

        // Services
        this.apiService = new ApiService(CONFIG.API_BASE_URL, CONFIG.USE_MOCKS, CONFIG.MOCK_DATA_BASE_PATH);
        this.viewDataFormatterService = new ViewDataFormatterService();

        // Views
        this.loadingView = new LoadingView(this.appStateModel);
        this.notificationView = new NotificationView();
        this.notificationView.init(); // Initialize EventBus subscriptions
        this.tabView = new TabView(this.appStateModel);
        this.controlsView = new ControlsView(this.appStateModel);
        this.batchControlsView = new BatchControlsView(this.appStateModel);
        this.globalConfigView = new GlobalConfigView(this.appStateModel);
        this.queueTreeView = new QueueTreeView(this.appStateModel);
        this.addQueueModalView = new AddQueueModalView(this);
        this.editQueueModalView = new EditQueueModalView(this);
        this.infoQueueModalView = new InfoQueueModalView(this);

        // Bulk operations
        this.bulkOperations = new BulkOperations(this.schedulerConfigModel, this.notificationView);
        this.bulkOperationsView = new BulkOperationsView(this.bulkOperations);

        // Extracted service coordinators
        this.configurationOrchestrator = new ConfigurationOrchestrator(
            this.schedulerConfigModel,
            this.schedulerInfoModel,
            this.apiService
        );
        
        this.uiStateManager = new UIStateManager(this.appStateModel, {
            tabView: this.tabView,
            controlsView: this.controlsView,
            batchControlsView: this.batchControlsView,
            globalConfigView: this.globalConfigView,
            queueTreeView: this.queueTreeView,
            addQueueModalView: this.addQueueModalView,
            editQueueModalView: this.editQueueModalView,
            infoQueueModalView: this.infoQueueModalView
        });
        
        this.changeManager = new ChangeManager(
            this.schedulerConfigModel,
            ValidationService
        );

        this.diagnosticService = new DiagnosticService(
            this.appStateModel,
            this.schedulerConfigModel,
            this.schedulerInfoModel
        );

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

        // --- NodesInfoModel Listeners ---
        this.nodesInfoModel.subscribe('nodesInfoLoaded', (result) => this._handleNodesInfoLoaded(result));

        // --- View Event Listeners ---
        this.tabView.subscribe('tabClicked', (tabId) => this.appStateModel.setCurrentTab(tabId));
        this.tabView.subscribe('diagnostic', () => this.diagnosticService.run());

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
            this.queueTreeView.subscribe('templateConfigClicked', (queuePath) => this.handleOpenTemplateConfigModal(queuePath));
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
            const [configResult, infoResult, nodesResult] = await Promise.all([
                this.apiService.fetchSchedulerConfig(),
                this.apiService.fetchSchedulerInfo(),
                this.apiService.fetchClusterNodes(),
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

            if (nodesResult.status === 200 && nodesResult.data) {
                this.nodesInfoModel.loadNodesInfo(nodesResult.data);
            } else {
                this.nodesInfoModel.loadNodesInfo(null);
                this.notificationView.showWarning(nodesResult.error ||
                    `Failed to fetch cluster nodes (status: ${nodesResult.status})`);
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
            // Use merged node labels from both scheduler info and cluster nodes
            const nodeLabels = NodeLabelService.getAvailableNodeLabels(this.schedulerInfoModel, this.nodesInfoModel);
            this.controlsView.renderNodeLabels(nodeLabels);
        }
        this._tryRenderInitialViews();
    }

    _handleNodesInfoLoaded(result) {
        if (result.success && this.controlsView) {
            // Re-render node labels with merged data when nodes info loads
            const nodeLabels = NodeLabelService.getAvailableNodeLabels(this.schedulerInfoModel, this.nodesInfoModel);
            this.controlsView.renderNodeLabels(nodeLabels);
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
            if (tabId === 'queue-config-content' || tabId === 'scheduler-config-content') {
                this.renderBatchControls();
            } else {
                this.batchControlsView.hide();
            }
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
        this.uiStateManager.renderQueueTreeView(
            { schedulerConfigModel: this.schedulerConfigModel, schedulerInfoModel: this.schedulerInfoModel, appStateModel: this.appStateModel },
            this.viewDataFormatterService,
            this.bulkOperationsView
        );
    }

    renderGlobalConfigView() {
        this.uiStateManager.renderGlobalConfigView(this.schedulerConfigModel);
    }

    renderBatchControls() {
        this.uiStateManager.renderBatchControls(
            this.schedulerConfigModel,
            this.viewDataFormatterService,
            this.appStateModel
        );
    }

    handleOpenAddQueueModal(parentPath = 'root') {
        this.uiStateManager.showAddQueueModal(this.schedulerConfigModel, parentPath);
    }

    handleAddNewQueue(formData) {
        const result = this.changeManager.stageAddQueue(
            formData,
            this.viewDataFormatterService,
            { schedulerConfigModel: this.schedulerConfigModel, schedulerInfoModel: this.schedulerInfoModel, appStateModel: this.appStateModel }
        );
        if (result.isSuccess()) {
            this.uiStateManager.hideModal('addQueueModalView');
        }
    }

    handleOpenEditQueueModal(queuePath) {
        this.uiStateManager.showEditQueueModal(
            queuePath,
            { schedulerConfigModel: this.schedulerConfigModel, schedulerInfoModel: this.schedulerInfoModel, appStateModel: this.appStateModel },
            this.viewDataFormatterService,
            this.notificationView
        );
    }

    handleAccessibleLabelsListChangeInEditModal(eventData) {
        this.changeManager.handleAccessibleLabelsChange(
            eventData,
            this.viewDataFormatterService,
            { schedulerConfigModel: this.schedulerConfigModel, schedulerInfoModel: this.schedulerInfoModel, appStateModel: this.appStateModel },
            this.editQueueModalView,
            this.uiStateManager.getCurrentEditQueuePath()
        );
    }

    handleStageQueueChanges(queuePath, formData) {
        const selectedPartition = this.appStateModel.getSelectedNodeLabel();
        const result = this.changeManager.stageUpdateQueue(
            queuePath,
            formData,
            this.viewDataFormatterService,
            selectedPartition
        );
        if (result.isSuccess()) {
            this.uiStateManager.hideModal('editQueueModalView');
        }
    }

    handleDeleteQueue(queuePath) {
        const result = this.changeManager.stageDeleteQueue(
            queuePath,
            this.viewDataFormatterService,
            { schedulerConfigModel: this.schedulerConfigModel, schedulerInfoModel: this.schedulerInfoModel, appStateModel: this.appStateModel }
        );
        // Note: Result handling is optional for delete operations as the UI updates reactively
    }

    handleUndoDeleteQueue(queuePath) {
        const result = this.changeManager.undoDeleteQueue(queuePath);
        // Note: Result handling is optional for undo operations as the UI updates reactively
    }

    handleOpenInfoQueueModal(queuePath) {
        this.uiStateManager.showInfoQueueModal(
            queuePath,
            { schedulerConfigModel: this.schedulerConfigModel, schedulerInfoModel: this.schedulerInfoModel, appStateModel: this.appStateModel },
            this.viewDataFormatterService,
            this.notificationView
        );
    }

    handleOpenTemplateConfigModal(queuePath) {
        this.uiStateManager.showTemplateConfigModal(
            queuePath,
            { schedulerConfigModel: this.schedulerConfigModel, schedulerInfoModel: this.schedulerInfoModel, appStateModel: this.appStateModel },
            this.viewDataFormatterService,
            this.notificationView
        );
    }

    handleCancelGlobalConfigEdit() {
        this.appStateModel.setGlobalConfigEditMode(false);
    }

    handleSaveGlobalConfig(formData) {
        this.configurationOrchestrator.stageGlobalConfigUpdate(formData);
        this.appStateModel.setGlobalConfigEditMode(false);
    }

    async handleApplyAllChanges() {
        this.appStateModel.setLoading(true, 'Validating changes...');
        await new Promise((resolve) => setTimeout(resolve, 50));

        const success = await this.configurationOrchestrator.applyPendingChanges(
            this.viewDataFormatterService,
            this.appStateModel
        );

        this.appStateModel.setLoading(false);
        this.renderBatchControls();
    }

    handleDiscardAllChanges() {
        const discarded = this.configurationOrchestrator.discardPendingChanges();
        if (discarded) {
            this.renderQueueRelatedViews();
            this.renderGlobalConfigView();
            this.renderBatchControls();
        }
    }

    async handleRefreshData() {
        this.appStateModel.setLoading(true, 'Refreshing all data from server...');
        await this.configurationOrchestrator.refreshConfiguration(
            this.schedulerConfigModel.hasPendingChanges()
        );
        this.appStateModel.setLoading(false);
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
        this.uiStateManager.handleBulkOperationsVisibilityChange(isVisible, this.bulkOperationsView);
    }

    // Bulk operations helper methods moved to UIStateManager

    /**
     * Handles showing the change preview modal.
     */
    handlePreviewChanges() {
        this.uiStateManager.showChangePreview(this.schedulerConfigModel);
    }
}
