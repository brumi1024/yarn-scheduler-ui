/**
 * @file UIStateManager - Manages view state, modal states, and UI synchronization
 */
class UIStateManager {
    constructor(appStateModel, allViews) {
        this.appStateModel = appStateModel;
        this.views = allViews;
        this.currentEditQueuePath = null;

        this._bindStateEvents();
    }

    /**
     * Binds app state change events to trigger appropriate view updates
     * @private
     */
    _bindStateEvents() {
        // Tab changes
        this.appStateModel.subscribe('currentTabChanged', (tabId) => this._handleTabChange(tabId));

        // Partition changes - search/sort are handled by MainController
        this.appStateModel.subscribe('selectedPartitionChanged', () => this._renderQueueRelatedViews());

        // Global config edit mode
        this.appStateModel.subscribe('globalConfigEditModeChanged', () => {
            if (this.appStateModel.getCurrentTab() === 'scheduler-config-content') {
                this._renderGlobalConfigView();
            }
        });

        // Loading state changes
        this.appStateModel.subscribe('loadingStateChanged', ({ isLoading }) => {
            if (
                !isLoading &&
                this.appStateModel.getCurrentTab() === 'queue-config-content' &&
                this.views.queueTreeView &&
                this.views.queueTreeView.getCurrentFormattedHierarchy()
            ) {
                this.views.queueTreeView._scheduleConnectorDraw(
                    this.views.queueTreeView.getCurrentFormattedHierarchy()
                );
            }
        });
    }

    /**
     * Renders the initial UI after data is loaded
     * @param {Object} dataModels - Contains schedulerConfigModel, schedulerInfoModel
     */
    renderInitialUI(dataModels) {
        if (this.views.tabView) this.views.tabView.render();
        this._handleTabChange(this.appStateModel.getCurrentTab());
        if (this.views.controlsView) this.views.controlsView.render();
        this._renderBatchControls(dataModels.schedulerConfigModel);
    }

    /**
     * Renders all queue-related views
     * @param {Object} dataModels - Data models for rendering
     * @param {ViewDataFormatterService} viewDataFormatterService - For formatting data
     * @param {BulkOperationsView} bulkOperationsView - For bulk operations
     */
    renderQueueRelatedViews(dataModels, viewDataFormatterService, bulkOperationsView) {
        this._renderQueueTreeView(dataModels, viewDataFormatterService, bulkOperationsView);
    }

    /**
     * Renders the queue tree view with bulk operations support
     * @param {Object} dataModels - Data models for rendering
     * @param {ViewDataFormatterService} viewDataFormatterService - For formatting data
     * @param {BulkOperationsView} bulkOperationsView - For bulk operations
     */
    renderQueueTreeView(dataModels, viewDataFormatterService, bulkOperationsView) {
        this._renderQueueTreeView(dataModels, viewDataFormatterService, bulkOperationsView);
    }

    /**
     * Renders the global configuration view
     * @param {SchedulerConfigModel} schedulerConfigModel - Config model
     */
    renderGlobalConfigView(schedulerConfigModel) {
        this._renderGlobalConfigView(schedulerConfigModel);
    }

    /**
     * Renders the batch controls view
     * @param {SchedulerConfigModel} schedulerConfigModel - Config model
     * @param {ViewDataFormatterService} viewDataFormatterService - For validation
     * @param {AppStateModel} appStateModel - For validation context
     */
    renderBatchControls(schedulerConfigModel, viewDataFormatterService, appStateModel) {
        this._renderBatchControls(schedulerConfigModel, viewDataFormatterService, appStateModel);
    }

    /**
     * Shows the add queue modal
     * @param {SchedulerConfigModel} schedulerConfigModel - For getting available queues
     * @param {string} parentPath - Preselected parent path
     */
    showAddQueueModal(schedulerConfigModel, parentPath = 'root') {
        if (!this.views.addQueueModalView) return;

        const parentQueues = schedulerConfigModel
            .getAllQueuePaths()
            .map((p) => ({ path: p, name: p.slice(Math.max(0, p.lastIndexOf('.') + 1)) || p }));

        let effectiveParentPath = parentPath;
        if (!parentQueues.some((p) => p.path === parentPath)) {
            effectiveParentPath = 'root';
        }
        if (parentQueues.length === 0 || !parentQueues.some((p) => p.path === 'root')) {
            parentQueues.unshift({ path: 'root', name: 'root' });
        }

        this.views.addQueueModalView.show({ parentQueues, preselectedParentPath: effectiveParentPath });
    }

    /**
     * Hides a modal but does not destroy it (to allow reuse)
     * @param {string} modalName - Name of the modal in views
     */
    hideModal(modalName) {
        const modal = this.views[modalName];
        if (modal) {
            modal.hide();
            // Don't call destroy() - modals need to be reusable
            // destroy() is only called when the app is shutting down
        }
    }

    /**
     * Shows the edit queue modal
     * @param {string} queuePath - Queue to edit
     * @param {Object} dataModels - Data models for modal
     * @param {ViewDataFormatterService} viewDataFormatterService - For formatting data
     * @param {NotificationView} notificationView - For error notifications
     */
    showEditQueueModal(queuePath, dataModels, viewDataFormatterService, notificationView) {
        this.currentEditQueuePath = queuePath;
        const editData = viewDataFormatterService.formatQueueDataForEditModal(
            queuePath,
            dataModels.schedulerConfigModel,
            dataModels.schedulerInfoModel,
            dataModels.appStateModel
        );
        if (editData) {
            this.views.editQueueModalView.show(editData);
        } else {
            notificationView.showError(`Could not load data for queue: ${queuePath}`);
        }
    }

    /**
     * Shows the info queue modal
     * @param {string} queuePath - Queue to show info for
     * @param {Object} dataModels - Data models for modal
     * @param {ViewDataFormatterService} viewDataFormatterService - For formatting data
     * @param {NotificationView} notificationView - For error notifications
     */
    showInfoQueueModal(queuePath, dataModels, viewDataFormatterService, notificationView) {
        const infoData = viewDataFormatterService.formatQueueDataForInfoModal(
            queuePath,
            dataModels.schedulerConfigModel,
            dataModels.schedulerInfoModel,
            dataModels.appStateModel
        );
        if (infoData) {
            this.views.infoQueueModalView.show(infoData);
        } else {
            notificationView.showError(`Could not load info for queue: ${queuePath}`);
        }
    }

    /**
     * Shows the template configuration modal for auto-creation queues
     * @param {string} queuePath - Queue to show template config for
     * @param {Object} dataModels - Data models for modal
     * @param {ViewDataFormatterService} viewDataFormatterService - For formatting data
     * @param {NotificationView} notificationView - For error notifications
     */
    showTemplateConfigModal(queuePath, dataModels, viewDataFormatterService, notificationView) {
        const editData = viewDataFormatterService.formatQueueDataForEditModal(
            queuePath,
            dataModels.schedulerConfigModel,
            dataModels.schedulerInfoModel,
            dataModels.appStateModel
        );
        if (
            editData &&
            editData.autoCreationData &&
            (editData.autoCreationData.v1Enabled || editData.autoCreationData.v2Enabled)
        ) {
            // Use the edit modal but show only auto-creation templates
            this.views.editQueueModalView.showTemplateConfigOnly(editData);
        } else {
            notificationView.showError(`No auto-creation templates configured for queue: ${queuePath}`);
        }
    }

    /**
     * Clears the current edit queue path (called when modal is hidden)
     */
    clearEditQueuePath() {
        this.currentEditQueuePath = null;
    }

    // UI Event Coordination Methods (Phase 2.1)

    /**
     * Handles request to open add queue modal
     * @param {SchedulerConfigModel} schedulerConfigModel - For getting available queues
     * @param {string} parentPath - Preselected parent path
     */
    handleOpenAddQueueModal(schedulerConfigModel, parentPath = 'root') {
        this.showAddQueueModal(schedulerConfigModel, parentPath);
    }

    /**
     * Handles request to edit a queue
     * @param {string} queuePath - Queue to edit
     * @param {Object} dataModels - Data models for modal
     * @param {ViewDataFormatterService} viewDataFormatterService - For formatting data
     * @param {NotificationView} notificationView - For error notifications
     */
    handleEditQueueRequest(queuePath, dataModels, viewDataFormatterService, notificationView) {
        this.showEditQueueModal(queuePath, dataModels, viewDataFormatterService, notificationView);
    }

    /**
     * Handles request to show queue info
     * @param {string} queuePath - Queue to show info for
     * @param {Object} dataModels - Data models for modal
     * @param {ViewDataFormatterService} viewDataFormatterService - For formatting data
     * @param {NotificationView} notificationView - For error notifications
     */
    handleInfoQueueRequest(queuePath, dataModels, viewDataFormatterService, notificationView) {
        this.showInfoQueueModal(queuePath, dataModels, viewDataFormatterService, notificationView);
    }

    /**
     * Handles request to show template configuration
     * @param {string} queuePath - Queue to show template config for
     * @param {Object} dataModels - Data models for modal
     * @param {ViewDataFormatterService} viewDataFormatterService - For formatting data
     * @param {NotificationView} notificationView - For error notifications
     */
    handleTemplateConfigRequest(queuePath, dataModels, viewDataFormatterService, notificationView) {
        this.showTemplateConfigModal(queuePath, dataModels, viewDataFormatterService, notificationView);
    }

    /**
     * Handles bulk operations toggle request
     * @param {BulkOperationsView} bulkOperationsView - Bulk operations view
     */
    handleBulkOperationsToggle(bulkOperationsView) {
        if (bulkOperationsView) {
            bulkOperationsView.toggle();
        }
    }

    /**
     * Handles refresh data request
     * @param {Function} refreshCallback - Callback to refresh data
     */
    handleRefreshData(refreshCallback) {
        if (refreshCallback) {
            refreshCallback();
        }
    }

    /**
     * Handles preview changes request
     * @param {SchedulerConfigModel} schedulerConfigModel - For getting changes
     */
    handlePreviewChanges(schedulerConfigModel) {
        this.showChangePreview(schedulerConfigModel);
    }

    /**
     * Gets the current edit queue path
     * @returns {string|null}
     */
    getCurrentEditQueuePath() {
        return this.currentEditQueuePath;
    }

    /**
     * Handles bulk operations visibility changes
     * @param {boolean} isVisible - Whether bulk operations is visible
     * @param {BulkOperationsView} bulkOperationsView - Bulk operations view
     */
    handleBulkOperationsVisibilityChange(isVisible, bulkOperationsView) {
        if (isVisible) {
            this._addBulkSelectionToQueueCards(bulkOperationsView);
            this._adjustQueueLayoutForBulkBar(true);
        } else {
            this._removeBulkSelectionFromQueueCards(bulkOperationsView);
            this._adjustQueueLayoutForBulkBar(false);
        }
    }

    /**
     * Shows the change preview modal
     * @param {SchedulerConfigModel} schedulerConfigModel - For getting changes
     */
    showChangePreview(schedulerConfigModel) {
        if (this.views.batchControlsView) {
            const changeLog = schedulerConfigModel.getChangeLog();

            // Get validation errors to show in preview
            let validationErrors = [];
            if (schedulerConfigModel && this.views.queueTreeView) {
                const summary = changeLog.getSummary();
                const totalChanges = summary.added + summary.modified + summary.deleted + summary.global;

                if (totalChanges > 0) {
                    // Find the ViewDataFormatterService and AppStateModel from the controller
                    // This is a bit indirect, but needed for validation
                    try {
                        const controller =
                            this.views.queueTreeView.controller ||
                            this.views.editQueueModalView?.controller ||
                            globalThis.mainController; // Fallback to global

                        if (controller && controller.viewDataFormatterService && controller.appStateModel) {
                            validationErrors = schedulerConfigModel.performStatefulValidation(
                                controller.viewDataFormatterService,
                                controller.appStateModel
                            );
                        }
                    } catch (error) {
                        console.warn('Could not get validation errors for preview:', error);
                    }
                }
            }

            this.views.batchControlsView.updateChangePreview(changeLog, validationErrors);
            this.views.batchControlsView.showPreviewModal();
        }
    }

    // Private methods

    /**
     * Handles tab changes
     * @private
     */
    _handleTabChange(tabId) {
        this.appStateModel.setGlobalConfigEditMode(false);
        if (tabId !== 'queue-config-content' && this.views.queueTreeView) {
            this.views.queueTreeView.clearConnectors();
        }
        if (this.views.batchControlsView) {
            if (tabId === 'queue-config-content') {
                // Batch controls will be rendered separately
            } else {
                this.views.batchControlsView.hide();
            }
        }

        switch (tabId) {
            case 'queue-config-content': {
                // Queue tree will be rendered separately
                break;
            }
            case 'scheduler-config-content': {
                // Global config will be rendered separately
                break;
            }
            default: {
                console.log(`Switched to tab: ${tabId} (Content View TBD)`);
                break;
            }
        }
    }

    /**
     * Renders queue tree view
     * @private
     */
    _renderQueueTreeView(dataModels, viewDataFormatterService, bulkOperationsView) {
        if (!this.views.queueTreeView || !dataModels.schedulerConfigModel.getSchedulerTrieRoot()) {
            if (this.views.queueTreeView) this.views.queueTreeView.render(null, false);
            return;
        }

        // Get validation errors to mark affected queues in the tree
        let validationErrors = [];
        if (dataModels.schedulerConfigModel && viewDataFormatterService && dataModels.appStateModel) {
            const changeLog = dataModels.schedulerConfigModel.getChangeLog();
            const summary = changeLog.getSummary();
            const totalChanges = summary.added + summary.modified + summary.deleted + summary.global;

            if (totalChanges > 0) {
                validationErrors = dataModels.schedulerConfigModel.performStatefulValidation(
                    viewDataFormatterService,
                    dataModels.appStateModel
                );
            }
        }

        const formattedHierarchy = viewDataFormatterService.formatQueueHierarchyForView(
            dataModels.schedulerConfigModel,
            dataModels.schedulerInfoModel,
            dataModels.appStateModel,
            false, // forValidationOnly
            validationErrors
        );

        if (this.views.queueTreeView) {
            this.views.queueTreeView.render(formattedHierarchy, true);

            // Re-add bulk selection checkboxes if bulk operations is visible
            if (bulkOperationsView && bulkOperationsView.isVisible) {
                setTimeout(() => {
                    this._addBulkSelectionToQueueCards(bulkOperationsView);
                    bulkOperationsView.updateCheckboxStates();
                }, 50); // Small delay to ensure DOM is ready
            }
        }
    }

    /**
     * Renders global config view
     * @private
     */
    _renderGlobalConfigView(schedulerConfigModel) {
        if (this.views.globalConfigView && schedulerConfigModel) {
            const configData = schedulerConfigModel.getGlobalConfig();
            const pendingChanges = schedulerConfigModel._queueConfigManager
                ? schedulerConfigModel._queueConfigManager.pendingGlobalChanges
                : new Map();
            this.views.globalConfigView.render(configData, pendingChanges);
        }
    }

    /**
     * Renders batch controls
     * @private
     */
    _renderBatchControls(schedulerConfigModel, viewDataFormatterService, appStateModel) {
        if (this.views.batchControlsView && schedulerConfigModel) {
            const changeLog = schedulerConfigModel.getChangeLog();
            const summary = changeLog.getSummary();

            // Include global changes in modified count for UI display
            const counts = {
                added: summary.added,
                modified: summary.modified + summary.global,
                deleted: summary.deleted,
            };

            const totalChanges = counts.added + counts.modified + counts.deleted;
            let validationErrors = [];
            if (totalChanges > 0 && viewDataFormatterService && appStateModel) {
                validationErrors = schedulerConfigModel.performStatefulValidation(
                    viewDataFormatterService,
                    appStateModel
                );
            }
            this.views.batchControlsView.render(counts, validationErrors);
        }
    }

    /**
     * Renders queue-related views (helper)
     * @private
     */
    _renderQueueRelatedViews() {
        // This will be called by the main controller with proper parameters
        // keeping it simple to avoid circular dependencies
    }

    /**
     * Adds bulk selection checkboxes to queue cards
     * @private
     */
    _addBulkSelectionToQueueCards(bulkOperationsView) {
        if (!bulkOperationsView) return;

        const queueCards = document.querySelectorAll('.queue-card');
        for (const card of queueCards) {
            const queuePath = card.dataset.queuePath;
            if (queuePath && queuePath !== 'root') {
                bulkOperationsView.addSelectionCheckbox(card, queuePath);
            }
        }
    }

    /**
     * Removes bulk selection checkboxes from queue cards
     * @private
     */
    _removeBulkSelectionFromQueueCards(bulkOperationsView) {
        if (bulkOperationsView) {
            bulkOperationsView.removeSelectionCheckboxes();
        }
    }

    /**
     * Adjusts queue layout for bulk operations bar
     * @private
     */
    _adjustQueueLayoutForBulkBar() {
        // With the new smooth animation system, the bulk toolbar handles its own spacing
        // No need to manually adjust margins which can cause scrollbar issues

        // Only re-render connectors after a brief delay to account for animations
        setTimeout(() => {
            if (this.views.queueTreeView && this.views.queueTreeView.getCurrentFormattedHierarchy()) {
                this.views.queueTreeView.clearConnectors();
                this.views.queueTreeView._scheduleConnectorDraw(
                    this.views.queueTreeView.getCurrentFormattedHierarchy()
                );
            }
        }, 350); // Slightly longer delay to account for animation duration
    }
}
