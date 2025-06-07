/**
 * @file ChangeManager - Handles staging configuration changes (validation done elsewhere)
 */
class ChangeManager {
    constructor(schedulerConfigModel) {
        this.schedulerConfigModel = schedulerConfigModel;
    }

    /**
     * Stages a new queue for addition (validation must be done before calling this)
     * @param {Object} formData - Validated form data from add queue modal
     * @returns {Result<boolean>} Result containing success status or error
     */
    stageAddQueue(formData) {
        const { parentPath, queueName, params } = formData;
        const newPath = parentPath === 'root' ? `root.${queueName}` : `${parentPath}.${queueName}`;

        // Convert simple keys to full keys for staging
        const mappedParams = PropertyKeyMapper.convertToFullKeys(params, newPath);

        // Stage the addition
        this.schedulerConfigModel.stageAddQueue(newPath, mappedParams);
        getEventBus().emit('notification:success', `Queue "${queueName}" staged for addition under "${parentPath}".`);
        return Result.success(true);
    }

    /**
     * Stages queue updates (validation must be done before calling this)
     * @param {string} queuePath - Path of queue to update
     * @param {Object} formData - Validated form data from edit modal
     * @param {string} selectedPartition - Currently selected partition/node label
     * @returns {Result<boolean>} Result containing success status or error
     */
    stageUpdateQueue(queuePath, formData, selectedPartition = DEFAULT_PARTITION) {
        const { params, customProperties } = formData;

        const mappedParams = PropertyKeyMapper.convertToFullKeys(params, queuePath, selectedPartition);

        this.schedulerConfigModel.getTrieInstance().stageUpdateQueue(queuePath, mappedParams);

        this.schedulerConfigModel._emit('pendingChangesUpdated', this.schedulerConfigModel.getTrieInstance());

        if (customProperties && Object.keys(customProperties).length > 0) {
            this.schedulerConfigModel.stageGlobalUpdate(customProperties);
        }

        getEventBus().emit('notification:success', `Changes for queue "${queuePath.split('.').pop()}" staged.`);
        return Result.success(true);
    }

    /**
     * Stages a queue for deletion (validation must be done before calling this)
     * @param {string} queuePath - Path of queue to delete
     * @returns {Result<boolean>} Result containing success status or error
     */
    stageDeleteQueue(queuePath) {
        if (
            !globalThis.confirm(
                `Are you sure you want to mark queue "${queuePath}" for deletion? \nThis will also remove any other staged changes for this queue.`
            )
        ) {
            return Result.failure('User cancelled deletion');
        }

        this.schedulerConfigModel.stageRemoveQueue(queuePath);
        getEventBus().emit('notification:info', `Queue "${queuePath}" marked for deletion.`);
        return Result.success(true);
    }

    /**
     * Undoes a queue deletion
     * @param {string} queuePath - Path of queue to undelete
     * @returns {Result<boolean>} Result containing success status or error
     */
    undoDeleteQueue(queuePath) {
        const changeLog = this.schedulerConfigModel.getChangeLog();
        const deletions = changeLog.getQueueDeletions();
        const deleteChange = deletions.find((change) => change.path === queuePath);

        if (deleteChange) {
            changeLog.removeChange(deleteChange.id);
            this.schedulerConfigModel._emit('pendingChangesUpdated', changeLog);
            getEventBus().emit('notification:info', `Deletion mark for "${queuePath}" undone.`);
            return Result.success(true);
        } else {
            const errorMsg = `Queue "${queuePath}" was not marked for deletion.`;
            getEventBus().emit('notification:warning', errorMsg);
            return Result.failure(errorMsg);
        }
    }

    /**
     * Handles accessible labels list changes in edit modal
     * @param {Object} eventData - Event data from edit modal
     * @param {ViewDataFormatterService} viewDataFormatterService - For data formatting
     * @param {Object} dataModels - Data models
     * @param {EditQueueModalView} editQueueModalView - Modal view to update
     * @param {string} currentEditQueuePath - Current queue being edited
     * @returns {boolean} Success status
     */
    handleAccessibleLabelsChange(
        eventData,
        viewDataFormatterService,
        dataModels,
        editQueueModalView,
        currentEditQueuePath
    ) {
        const { queuePath, newLabelsString, currentFormParams } = eventData;
        if (currentEditQueuePath !== queuePath) return false;

        // Build temporary effective properties for the modal refresh
        const baseTrieNode = this.schedulerConfigModel.getTrieInstance().getQueueNode(queuePath);
        const temporaryEffectiveProperties = new Map(baseTrieNode ? baseTrieNode.properties : undefined);

        const changeLog = this.schedulerConfigModel.getChangeLog();
        const addChanges = changeLog.getQueueAdditions().filter((change) => change.path === queuePath);

        if (addChanges.length > 0) {
            // For new queues, clear properties and use form params
            temporaryEffectiveProperties.clear();
            for (const [simpleKey, value] of Object.entries(currentFormParams)) {
                if (simpleKey === '_ui_capacityMode') continue;
                const fullKey =
                    PropertyKeyMapper.toFullKey(queuePath, simpleKey) ||
                    `yarn.scheduler.capacity.${queuePath}.${simpleKey}`;
                temporaryEffectiveProperties.set(fullKey, value);
            }
        } else {
            // For existing queues, apply pending updates and form params
            const updateChanges = changeLog.getQueueUpdates().filter((change) => change.path === queuePath);
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
                    PropertyKeyMapper.toFullKey(queuePath, simpleKey) ||
                    `yarn.scheduler.capacity.${queuePath}.${simpleKey}`;
                temporaryEffectiveProperties.set(fullKey, value);
            }
        }

        // Set the new accessible node labels using metadata-driven key
        const anlFullKey = NodeLabelService.getAccessibleNodeLabelsKey(queuePath);
        temporaryEffectiveProperties.set(anlFullKey, newLabelsString);

        // Create mock objects for data formatting
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
                    p === queuePath
                        ? temporaryTrieNodeLike
                        : this.schedulerConfigModel.getTrieInstance().getQueueNode(p),
            }),
            getChangeLog: () => this.schedulerConfigModel.getChangeLog(),
        };

        // Refresh modal data
        const refreshedModalData = viewDataFormatterService.formatQueueDataForEditModal(
            queuePath,
            mockSchedulerConfigModelForFormatter,
            dataModels.schedulerInfoModel,
            dataModels.appStateModel
        );

        if (refreshedModalData) {
            editQueueModalView.show(refreshedModalData);
            getEventBus().emit('notification:info', 'Node label fields updated. Please review.');
            return true;
        } else {
            getEventBus().emit('notification:error', 'Error refreshing node label fields in modal.');
            return false;
        }
    }
}
