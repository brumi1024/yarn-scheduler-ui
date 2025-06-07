/**
 * @file ChangeManager - Handles staging, previewing, and applying configuration changes
 */
class ChangeManager {
    constructor(schedulerConfigModel, validationService) {
        this.schedulerConfigModel = schedulerConfigModel;
        this.validationService = validationService;
    }

    /**
     * Stages a new queue for addition with validation
     * @param {Object} formData - Form data from add queue modal
     * @param {ViewDataFormatterService} viewDataFormatterService - For validation and formatting
     * @param {Object} dataModels - Data models for validation
     * @returns {Result<boolean>} Result containing success status or error
     */
    stageAddQueue(formData, viewDataFormatterService, dataModels) {
        const { parentPath, queueName, params } = formData;

        // Validate queue name
        const nameValidation = this.validationService.isValidQueueNameChars(queueName);
        if (!nameValidation.isValid) {
            getEventBus().emit('notification:error', nameValidation.message);
            return Result.failure(nameValidation.message);
        }

        // Validate capacity
        const capacityValidation = this.validationService.parseAndValidateCapacityValue(
            params.capacity,
            params._ui_capacityMode
        );
        if (capacityValidation.errors || capacityValidation.error) {
            const errorMsg = `Capacity: ${(capacityValidation.errors || [capacityValidation.error]).join('; ')}`;
            getEventBus().emit('notification:error', errorMsg);
            return Result.failure(errorMsg);
        }
        params.capacity = capacityValidation.value;

        // Validate max capacity
        const maxCapModeForValidation = viewDataFormatterService._isVectorString(params['maximum-capacity'])
            ? CAPACITY_MODES.ABSOLUTE
            : CAPACITY_MODES.PERCENTAGE;
        const maxCapacityValidation = this.validationService.parseAndValidateCapacityValue(
            params['maximum-capacity'],
            maxCapModeForValidation,
            true
        );
        if (maxCapacityValidation.errors || maxCapacityValidation.error) {
            const errorMsg = `Max Capacity: ${(maxCapacityValidation.errors || [maxCapacityValidation.error]).join('; ')}`;
            getEventBus().emit('notification:error', errorMsg);
            return Result.failure(errorMsg);
        }
        params['maximum-capacity'] = maxCapacityValidation.value;

        // Check for duplicate queue names
        const newPath = parentPath === 'root' ? `root.${queueName}` : `${parentPath}.${queueName}`;
        const duplicateResult = this._isQueueNameDuplicate(
            newPath,
            parentPath,
            queueName,
            viewDataFormatterService,
            dataModels
        );
        if (duplicateResult.isFailure()) {
            return duplicateResult;
        }

        // Stage the addition
        this.schedulerConfigModel.stageAddQueue(newPath, params);
        getEventBus().emit('notification:success', `Queue "${queueName}" staged for addition under "${parentPath}".`);
        return Result.success(true);
    }

    /**
     * Stages queue updates with validation
     * @param {string} queuePath - Path of queue to update
     * @param {Object} formData - Form data from edit modal
     * @param {ViewDataFormatterService} viewDataFormatterService - For validation
     * @param {string} selectedPartition - Currently selected partition/node label
     * @returns {Result<boolean>} Result containing success status or error
     */
    stageUpdateQueue(queuePath, formData, viewDataFormatterService, selectedPartition = DEFAULT_PARTITION) {
        const { params, customProperties } = formData;

        // Validate capacity if changed
        if (Object.prototype.hasOwnProperty.call(params, 'capacity')) {
            const modeForValidation =
                params._ui_capacityMode ||
                viewDataFormatterService._determineEffectiveCapacityMode(
                    queuePath,
                    this.schedulerConfigModel.getQueueNodeProperties(queuePath) ||
                        new Map(Object.entries(params).map(([k, v]) => [PropertyKeyMapper.toFullKey(queuePath, k), v]))
                );

            const capacityValidation = this.validationService.parseAndValidateCapacityValue(
                params.capacity,
                modeForValidation
            );
            if (capacityValidation.errors || capacityValidation.error) {
                const errorMsg = `Invalid Capacity: ${(capacityValidation.errors || [capacityValidation.error]).join('; ')}`;
                getEventBus().emit('notification:error', errorMsg);
                return Result.failure(errorMsg);
            }
            params.capacity = capacityValidation.value;
        }

        // Validate max capacity if changed
        if (Object.prototype.hasOwnProperty.call(params, 'maximum-capacity')) {
            const maxCapMode = viewDataFormatterService._isVectorString(params['maximum-capacity'])
                ? CAPACITY_MODES.ABSOLUTE
                : CAPACITY_MODES.PERCENTAGE;
            const maxCapacityValidation = this.validationService.parseAndValidateCapacityValue(
                params['maximum-capacity'],
                maxCapMode,
                true
            );
            if (maxCapacityValidation.errors || maxCapacityValidation.error) {
                const errorMsg = `Invalid Max Capacity: ${(maxCapacityValidation.errors || [maxCapacityValidation.error]).join('; ')}`;
                getEventBus().emit('notification:error', errorMsg);
                return Result.failure(errorMsg);
            }
            params['maximum-capacity'] = maxCapacityValidation.value;
        }

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
     * Stages a queue for deletion with validation
     * @param {string} queuePath - Path of queue to delete
     * @param {ViewDataFormatterService} viewDataFormatterService - For validation
     * @param {Object} dataModels - Data models for validation
     * @returns {Result<boolean>} Result containing success status or error
     */
    stageDeleteQueue(queuePath, viewDataFormatterService, dataModels) {
        if (
            !globalThis.confirm(
                `Are you sure you want to mark queue "${queuePath}" for deletion? \nThis will also remove any other staged changes for this queue.`
            )
        ) {
            return Result.failure('User cancelled deletion');
        }

        // Validate deletability
        const effectiveHierarchy = viewDataFormatterService.formatQueueHierarchyForView(
            dataModels.schedulerConfigModel,
            dataModels.schedulerInfoModel,
            dataModels.appStateModel,
            true
        );

        let nodeToValidate = null;
        if (effectiveHierarchy) {
            nodeToValidate = this._findNodeInHierarchy(effectiveHierarchy, queuePath);
        }

        if (nodeToValidate) {
            const deletability = this.validationService.checkDeletability(nodeToValidate);
            if (!deletability.canDelete) {
                getEventBus().emit('notification:warning', deletability.reason);
                return Result.failure(deletability.reason);
            }
        } else if (queuePath !== 'root') {
            getEventBus().emit(
                'notification:warning',
                `Could not fully validate deletability for ${queuePath}. Staging deletion.`
            );
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

    // Private helper methods

    /**
     * Checks if a queue name would be duplicate
     * @private
     * @returns {Result<boolean>} Result indicating if duplicate exists
     */
    _isQueueNameDuplicate(newPath, parentPath, queueName, viewDataFormatterService, dataModels) {
        const currentHierarchyForValidation = viewDataFormatterService.formatQueueHierarchyForView(
            dataModels.schedulerConfigModel,
            dataModels.schedulerInfoModel,
            dataModels.appStateModel,
            true
        );

        let parentNodeToCheck = currentHierarchyForValidation;
        if (parentPath !== 'root' && parentNodeToCheck) {
            parentNodeToCheck = this._findNodeInHierarchy(currentHierarchyForValidation, parentPath);
        }

        if (
            parentNodeToCheck &&
            parentNodeToCheck.children &&
            parentNodeToCheck.children[queueName] &&
            !parentNodeToCheck.children[queueName].isDeleted
        ) {
            const errorMsg = `A queue named "${queueName}" effectively already exists under "${parentPath}".`;
            getEventBus().emit('notification:error', errorMsg);
            return Result.failure(errorMsg);
        }
        return Result.success(false);
    }

    /**
     * Finds a node in the hierarchy by path
     * @private
     */
    _findNodeInHierarchy(rootNode, targetPath) {
        const findNode = (node, path) => {
            if (!node) return null;
            if (node.path === path) return node;
            if (node.children) {
                for (const childName in node.children) {
                    const found = findNode(node.children[childName], path);
                    if (found) return found;
                }
            }
            return null;
        };
        return findNode(rootNode, targetPath);
    }
}
