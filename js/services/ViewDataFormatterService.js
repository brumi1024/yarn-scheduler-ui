class ViewDataFormatterService {
    constructor() {
        this._resourceVectorParser = (resourceString) => {
            if (!resourceString || typeof resourceString !== 'string') return [];
            let cleanString = resourceString.trim();
            if (cleanString.startsWith('[') && cleanString.endsWith(']')) cleanString = cleanString.slice(1, -1);
            if (!cleanString) return [];

            return cleanString
                .split(',')
                .map((pair) => {
                    const parts = pair.split('=');
                    const key = parts[0] ? parts[0].trim() : null;
                    const valuePart = parts[1] ? parts[1].trim() : '';
                    const match = valuePart.match(/^([0-9.]+)(.*)/);
                    let value = valuePart;
                    let unit = '';
                    if (match) {
                        value = match[1];
                        unit = match[2].trim();
                    }
                    return { key, value, unit };
                })
                .filter((item) => item.key && item.value !== '');
        };
    }

    _isVectorString(valueString) {
        return typeof valueString === 'string' && valueString.startsWith('[') && valueString.endsWith(']');
    }

    _mapSimpleKeyToFullYarnKey(queuePath, simpleOrPartialKey) {
        for (const category of QUEUE_CONFIG_METADATA) {
            for (const placeholderKey in category.properties) {
                if (category.properties[placeholderKey].key === simpleOrPartialKey) {
                    return placeholderKey.replace(Q_PATH_PLACEHOLDER, queuePath);
                }
            }
        }
        const mainLabelListFullPlaceholder = `yarn.scheduler.capacity.${Q_PATH_PLACEHOLDER}.accessible-node-labels`;
        if (NODE_LABEL_CONFIG_METADATA[mainLabelListFullPlaceholder]?.key === simpleOrPartialKey) {
            return `yarn.scheduler.capacity.${queuePath}.accessible-node-labels`;
        }
        if (simpleOrPartialKey.startsWith('accessible-node-labels.')) {
            return `yarn.scheduler.capacity.${queuePath}.${simpleOrPartialKey}`;
        }
        return null;
    }

    formatQueueHierarchyForView(schedulerConfigModel, schedulerInfoModel, appStateModel, forValidationOnly = false) {
        const trieRoot = schedulerConfigModel.getSchedulerTrieRoot();
        if (!trieRoot) return null;

        const pendingChanges = schedulerConfigModel.getRawPendingChanges();
        const selectedPartition = appStateModel.getSelectedPartition();

        const formatNodeRecursive = (trieNode, parentPath = null) => {
            const basePath = trieNode.fullPath;

            if (pendingChanges.removeQueues.includes(basePath)) {
                return null;
            }

            const effectiveProperties = new Map(trieNode.properties);
            let operationType = null;
            let uiCapacityModeHint = null;

            const addEntry = pendingChanges.addQueues.find((a) => a.queueName === basePath);
            const updateEntry = pendingChanges.updateQueues.find((u) => u.queueName === basePath);

            if (addEntry) {
                operationType = OPERATION_TYPES.ADD;
                effectiveProperties.clear();
                for (const [simpleKey, value] of Object.entries(addEntry.params)) {
                    if (simpleKey === '_ui_capacityMode') {
                        uiCapacityModeHint = value;
                        continue;
                    }
                    const fullKey =
                        this._mapSimpleKeyToFullYarnKey(basePath, simpleKey) ||
                        `yarn.scheduler.capacity.${basePath}.${simpleKey}`;
                    effectiveProperties.set(fullKey, value);
                }
            } else if (updateEntry) {
                operationType = OPERATION_TYPES.UPDATE;
                // Apply updates on top of base properties from Trie
                for (const [simpleKey, value] of Object.entries(updateEntry.params)) {
                    if (simpleKey === '_ui_capacityMode') {
                        uiCapacityModeHint = value;
                        continue;
                    }
                    const fullKey =
                        this._mapSimpleKeyToFullYarnKey(basePath, simpleKey) ||
                        `yarn.scheduler.capacity.${basePath}.${simpleKey}`;
                    effectiveProperties.set(fullKey, value);
                }
            }

            const formattedNode = this._formatSingleQueueNode(
                basePath,
                trieNode.segment,
                parentPath,
                effectiveProperties,
                schedulerInfoModel,
                selectedPartition,
                operationType,
                pendingChanges,
                uiCapacityModeHint,
                forValidationOnly
            );

            formattedNode.children = {};
            let activeChildrenCount = 0;

            trieNode.children.forEach((childTrieNode) => {
                if (childTrieNode.isQueue) {
                    const formattedChild = formatNodeRecursive(childTrieNode, basePath);
                    if (formattedChild) {
                        formattedNode.children[childTrieNode.segment] = formattedChild;
                        activeChildrenCount++;
                    }
                }
            });

            for (const newChildEntry of pendingChanges.addQueues) {
                const newQueueParentPath = newChildEntry.queueName.slice(
                    0,
                    Math.max(0, newChildEntry.queueName.lastIndexOf('.'))
                );
                if (newQueueParentPath === basePath) {
                    const newChildSegment = newChildEntry.queueName.slice(
                        Math.max(0, newChildEntry.queueName.lastIndexOf('.') + 1)
                    );
                    if (!formattedNode.children[newChildSegment]) {
                        const newChildEffectiveProperties = new Map();
                        let newChildUiModeHint = null;
                        for (const [simpleKey, value] of Object.entries(newChildEntry.params)) {
                            if (simpleKey === '_ui_capacityMode') {
                                newChildUiModeHint = value;
                                continue;
                            }
                            const fullKey =
                                this._mapSimpleKeyToFullYarnKey(newChildEntry.queueName, simpleKey) ||
                                `yarn.scheduler.capacity.${newChildEntry.queueName}.${simpleKey}`;
                            newChildEffectiveProperties.set(fullKey, value);
                        }
                        formattedNode.children[newChildSegment] = this._formatSingleQueueNode(
                            newChildEntry.queueName,
                            newChildSegment,
                            basePath,
                            newChildEffectiveProperties,
                            schedulerInfoModel,
                            selectedPartition,
                            OPERATION_TYPES.ADD,
                            pendingChanges,
                            newChildUiModeHint,
                            forValidationOnly
                        );
                        activeChildrenCount++;
                    }
                }
            }
            formattedNode.queueType = activeChildrenCount > 0 ? 'parent' : 'leaf';
            return formattedNode;
        };

        const rootAddEntry = pendingChanges.addQueues.find((a) => a.queueName === 'root');
        if (rootAddEntry) {
            const rootEffectiveProperties = new Map();
            let rootUiModeHint = null;
            for (const [simpleKey, value] of Object.entries(rootAddEntry.params)) {
                if (simpleKey === '_ui_capacityMode') {
                    rootUiModeHint = value;
                    continue;
                }
                const fullKey =
                    this._mapSimpleKeyToFullYarnKey('root', simpleKey) || `yarn.scheduler.capacity.root.${simpleKey}`;
                rootEffectiveProperties.set(fullKey, value);
            }
            return this._formatSingleQueueNode(
                'root',
                'root',
                null,
                rootEffectiveProperties,
                schedulerInfoModel,
                selectedPartition,
                OPERATION_TYPES.ADD,
                pendingChanges,
                rootUiModeHint,
                forValidationOnly
            );
        }

        return formatNodeRecursive(trieRoot);
    }

    /**
     * Formats a single queue node with its effective properties, live data, and UI hints.
     * @private
     */
    _formatSingleQueueNode(
        queuePath,
        segment,
        parentPath,
        effectiveProperties,
        schedulerInfoModel,
        selectedPartition,
        changeOperationType,
        pendingChanges, // Added pendingChanges parameter
        explicitUiModeHint,
        forValidationOnly = false
    ) {
        const isNew = changeOperationType === OPERATION_TYPES.ADD;
        // Correctly determine if there's a PENDING update for an EXISTING queue
        const isPendingUpdate = !isNew && pendingChanges.updateQueues.some((q) => q.queueName === queuePath);

        const formattedNode = {
            path: queuePath,
            name: segment,
            displayName: segment,
            displayNameTitle: `${queuePath} ${isNew ? '(New)' : isPendingUpdate ? '(Modified)' : ''}`,
            parentPath: parentPath,
            level: queuePath.split('.').length - 1,
            isRoot: queuePath === 'root',
            isNew: isNew,
            isDeleted: false,
            hasPendingChanges: isNew || isPendingUpdate,
            statusClass: '',
            effectiveProperties: effectiveProperties,
        };

        // --- Determine Effective Capacity Mode ---
        formattedNode.effectiveCapacityMode =
            explicitUiModeHint || this._determineEffectiveCapacityMode(queuePath, effectiveProperties);

        // --- Populate Core Configurable Properties ---
        this._populateConfiguredProperties(formattedNode, queuePath, effectiveProperties);

        // --- Format Capacities for Display ---
        const maxCapacityMode = this._isVectorString(String(formattedNode['maximum-capacity'] || '').trim())
            ? CAPACITY_MODES.ABSOLUTE
            : CAPACITY_MODES.PERCENTAGE;

        formattedNode.capacityDisplay = this._formatCapacityForDisplay(
            formattedNode.capacity,
            formattedNode.effectiveCapacityMode,
            this._getDefaultCapacityValue(formattedNode.effectiveCapacityMode)
        );
        formattedNode.maxCapacityDisplay = this._formatCapacityForDisplay(
            formattedNode['maximum-capacity'],
            maxCapacityMode, // Max capacity can be % or vector, treat as absolute for formatting if not clearly %
            this._getDefaultMaxCapacityValue(formattedNode.effectiveCapacityMode)
        );

        formattedNode.capacityDetails = this._isVectorString(formattedNode.capacityDisplay)
            ? this._resourceVectorParser(formattedNode.capacityDisplay)
            : [];
        formattedNode.maxCapacityDetails = this._isVectorString(formattedNode.maxCapacityDisplay)
            ? this._resourceVectorParser(formattedNode.maxCapacityDisplay)
            : [];

        // Sortable capacity logic (using the just formatted display values)
        if (
            formattedNode.effectiveCapacityMode === CAPACITY_MODES.PERCENTAGE ||
            formattedNode.effectiveCapacityMode === CAPACITY_MODES.WEIGHT
        ) {
            formattedNode.sortableCapacity =
                Number.parseFloat(String(formattedNode.capacityDisplay).replaceAll(/[^\d.-]/g, '')) || 0;
        } else if (this._isVectorString(formattedNode.capacityDisplay)) {
            let memoryValue = 0;
            const memResource = formattedNode.capacityDetails.find(
                (r) => r.key && (r.key.toLowerCase() === 'memory' || r.key.toLowerCase() === 'memory-mb')
            );
            if (memResource && memResource.value) memoryValue = Number.parseFloat(memResource.value) || 0;
            formattedNode.sortableCapacity = memoryValue;
        } else {
            formattedNode.sortableCapacity = 0; // Fallback
        }

        // --- Handle Node Label Specific Capacities for Display ---
        this._applyPartitionSpecificDisplayCapacity(formattedNode, queuePath, effectiveProperties, selectedPartition);

        if (forValidationOnly) return formattedNode;

        // --- Apply Status Class ---
        if (isNew) formattedNode.statusClass = 'new-queue';
        else if (isPendingUpdate) formattedNode.statusClass = 'pending-changes';

        // --- Integrate Live Data ---
        if (schedulerInfoModel) {
            const liveQueueInfo = schedulerInfoModel.getQueueRuntimeInfo(queuePath, selectedPartition);
            if (liveQueueInfo) {
                formattedNode.numApplications =
                    liveQueueInfo.numApplications === undefined
                        ? liveQueueInfo.numActiveApplications === undefined
                          ? 0
                          : liveQueueInfo.numActiveApplications + (liveQueueInfo.numPendingApplications || 0)
                        : liveQueueInfo.numApplications;
                formattedNode.absoluteCapacity = liveQueueInfo.absoluteCapacity; // Use the raw value for sankey width
                formattedNode.absoluteCapacityDisplay =
                    liveQueueInfo.absoluteCapacity === undefined
                        ? 'N/A'
                        : `${Number.parseFloat(liveQueueInfo.absoluteCapacity).toFixed(1)}%`;
                formattedNode.absoluteUsedCapacityDisplay =
                    liveQueueInfo.absoluteUsedCapacity === undefined
                        ? 'N/A'
                        : `${Number.parseFloat(liveQueueInfo.absoluteUsedCapacity).toFixed(1)}%`;
                formattedNode.liveState = liveQueueInfo.state;
            } else {
                formattedNode.numApplications = 0;
                formattedNode.absoluteUsedCapacityDisplay = 'N/A';
            }
        }

        // --- Generate UI Labels and Deletion Info ---
        formattedNode.uiLabels = this._generateUILabels(formattedNode);

        // Pass formattedNode for deletability check, as it contains effective state/children info.
        // This implies ValidationService.checkDeletability might need to be more nuanced if it needs more than formattedNode gives.
        // For a simple check based on type (not root) and effective children (which _formatSingleQueueNode doesn't yet fully compute),
        // we might defer the most accurate deletability to controller or a final pass in formatQueueHierarchyForView.
        // For now, simple root check:
        formattedNode.canBeDeletedForDropdown = !formattedNode.isRoot;
        formattedNode.deletionReason = formattedNode.isRoot
            ? 'Root queue cannot be deleted.'
            : formattedNode.state !== 'STOPPED' && !isNew
              ? 'Queue should be STOPPED before deletion.'
              : '';

        return formattedNode;
    }

    _populateConfiguredProperties(formattedNode, queuePath, effectiveProperties) {
        for (const category of QUEUE_CONFIG_METADATA) {
            for (const [placeholderKey, meta] of Object.entries(category.properties)) {
                const fullKey = placeholderKey.replace(Q_PATH_PLACEHOLDER, queuePath);
                let value = effectiveProperties.get(fullKey);
                if (value === undefined && meta.defaultValue !== undefined) {
                    value = meta.defaultValue;
                }
                formattedNode[meta.key] = value;
            }
        }
        const labelsListKey = `yarn.scheduler.capacity.${queuePath}.accessible-node-labels`;
        const anlFullPlaceholderKey = `yarn.scheduler.capacity.${Q_PATH_PLACEHOLDER}.accessible-node-labels`;
        const anlDefault = NODE_LABEL_CONFIG_METADATA[anlFullPlaceholderKey]?.defaultValue || '*';
        formattedNode['accessible-node-labels'] = String(effectiveProperties.get(labelsListKey) || anlDefault);
    }

    _applyPartitionSpecificDisplayCapacity(formattedNode, queuePath, effectiveProperties, selectedPartition) {
        if (selectedPartition && selectedPartition !== DEFAULT_PARTITION && selectedPartition !== '*') {
            const labelCapacityKey = `yarn.scheduler.capacity.${queuePath}.accessible-node-labels.${selectedPartition}.capacity`;
            const labelMaxCapacityKey = `yarn.scheduler.capacity.${queuePath}.accessible-node-labels.${selectedPartition}.maximum-capacity`;

            if (effectiveProperties.has(labelCapacityKey)) {
                const labelCapacityValue = effectiveProperties.get(labelCapacityKey);
                formattedNode.capacityDisplayForLabel = this._formatCapacityForDisplay(
                    labelCapacityValue,
                    CAPACITY_MODES.PERCENTAGE,
                    '100%'
                );
                formattedNode.capacityDetailsForLabel = [];
            }
            if (effectiveProperties.has(labelMaxCapacityKey)) {
                const labelMaxCapacityValue = effectiveProperties.get(labelMaxCapacityKey);
                formattedNode.maxCapacityDisplayForLabel = this._formatCapacityForDisplay(
                    labelMaxCapacityValue,
                    CAPACITY_MODES.PERCENTAGE,
                    '100%'
                );
                formattedNode.maxCapacityDetailsForLabel = [];
            }
        }
    }

    _determineEffectiveCapacityMode(queuePath, effectiveProperties) {
        const rawCapacityString = effectiveProperties.get(`yarn.scheduler.capacity.${queuePath}.capacity`);
        if (rawCapacityString !== undefined) {
            const capString = String(rawCapacityString).trim();
            if (capString.endsWith('w')) return CAPACITY_MODES.WEIGHT;
            if (this._isVectorString(capString)) return CAPACITY_MODES.ABSOLUTE;
        }
        return CAPACITY_MODES.PERCENTAGE;
    }

    _getDefaultCapacityValue(mode) {
        // Make this directly usable by views if needed
        if (mode === CAPACITY_MODES.WEIGHT) return '1.0w';
        if (mode === CAPACITY_MODES.ABSOLUTE || mode === CAPACITY_MODES.VECTOR) return '[memory=1024,vcores=1]';
        return '10.0%';
    }

    _getDefaultMaxCapacityValue() {
        // Make this directly usable by views
        return '100.0%';
    }

    _formatCapacityForDisplay(rawValue, mode, defaultValueForEmptyOrInvalid) {
        let valueString = rawValue !== undefined && rawValue !== null ? String(rawValue).trim() : '';

        if (valueString === '' || valueString === null || valueString === undefined) {
            valueString = String(defaultValueForEmptyOrInvalid).trim();
        }

        if (!Number.isNaN(Number.parseFloat(valueString))) {
            const number_ = Number.parseFloat(valueString);
            if (mode === CAPACITY_MODES.PERCENTAGE) return `${number_.toFixed(1)}%`;
            if (mode === CAPACITY_MODES.WEIGHT) return `${number_.toFixed(1)}w`;
        }

        if (mode === CAPACITY_MODES.PERCENTAGE && valueString.endsWith('%')) return valueString;
        if (mode === CAPACITY_MODES.WEIGHT && valueString.endsWith('w')) return valueString;
        if ((mode === CAPACITY_MODES.ABSOLUTE || mode === CAPACITY_MODES.VECTOR) && this._isVectorString(valueString))
            return valueString;

        if (!Number.isNaN(Number.parseFloat(valueString))) {
            // Check again if it was just a number but wrong mode initially
            const number_ = Number.parseFloat(valueString);
            if (mode === CAPACITY_MODES.PERCENTAGE) return `${number_.toFixed(1)}%`;
            if (mode === CAPACITY_MODES.WEIGHT) return `${number_.toFixed(1)}w`;
        }

        // If it's supposed to be absolute/vector but isn't, return default vector
        if ((mode === CAPACITY_MODES.ABSOLUTE || mode === CAPACITY_MODES.VECTOR) && !this._isVectorString(valueString)) {
            return this._getDefaultCapacityValue(CAPACITY_MODES.ABSOLUTE);
        }

        return String(defaultValueForEmptyOrInvalid); // Last resort
    }

    _generateUILabels(formattedNode) {
        const labels = [];
        const modeIcons = {
            [CAPACITY_MODES.PERCENTAGE]: '📊',
            [CAPACITY_MODES.WEIGHT]: '⚖️',
            [CAPACITY_MODES.ABSOLUTE]: '🎯',
            [CAPACITY_MODES.VECTOR]: '📐',
        };
        const mode = formattedNode.effectiveCapacityMode || CAPACITY_MODES.PERCENTAGE;
        const modeText = mode.charAt(0).toUpperCase() + mode.slice(1);
        labels.push({
            text: `${modeIcons[mode] || '📊'} ${modeText}`,
            cssClass: 'queue-tag tag-mode',
            title: `Capacity Mode: ${modeText}`,
        });

        const configState = formattedNode.state || 'RUNNING';
        labels.push({
            text: configState === 'STOPPED' ? '🛑 Config: Stopped' : '▶️ Config: Running',
            cssClass: `queue-tag tag-state ${configState === 'STOPPED' ? 'tag-stopped' : 'tag-running'}`,
            title: `Configured State: ${configState}`,
        });

        if (formattedNode.liveState && formattedNode.liveState !== configState) {
            labels.push({
                text: formattedNode.liveState === 'STOPPED' ? '‼️ Live: Stopped' : '✳️ Live: Running',
                cssClass: `queue-tag tag-state ${formattedNode.liveState === 'STOPPED' ? 'tag-stopped-live' : 'tag-running-live'}`,
                title: `Live State: ${formattedNode.liveState}`,
            });
        }

        const autoCreateEnabled = String(formattedNode['auto-create-child-queue.enabled']).toLowerCase() === 'true';
        if (autoCreateEnabled) {
            labels.push({
                text: '⚡ Auto-Create',
                cssClass: 'queue-tag tag-auto-create',
                title: 'Auto Queue Creation Enabled',
            });
        }
        return labels;
    }

    formatQueueDataForEditModal(queuePath, schedulerConfigModel, schedulerInfoModel, appStateModel) {
        const pendingChanges = schedulerConfigModel.getRawPendingChanges();
        const addEntry = pendingChanges.addQueues.find((a) => a.queueName === queuePath);
        const updateEntry = pendingChanges.updateQueues.find((u) => u.queueName === queuePath);

        let baseProperties = new Map();
        let displayName = queuePath.split('.').pop();
        let uiCapacityModeHint = null;

        if (addEntry) {
            for (const [simpleKey, value] of Object.entries(addEntry.params)) {
                if (simpleKey === '_ui_capacityMode') {
                    uiCapacityModeHint = value;
                } else {
                    const fullKey =
                        this._mapSimpleKeyToFullYarnKey(queuePath, simpleKey) ||
                        `yarn.scheduler.capacity.${queuePath}.${simpleKey}`;
                    baseProperties.set(fullKey, value);
                }
            }
            displayName = queuePath.slice(Math.max(0, queuePath.lastIndexOf('.') + 1));
        } else {
            const trieNode = schedulerConfigModel.getTrieInstance().getQueueNode(queuePath);
            if (!trieNode) {
                console.warn(
                    `ViewDataFormatterService: TrieNode not found for existing queue path "${queuePath}" in formatQueueDataForEditModal.`
                );
                return null;
            }
            baseProperties = new Map(trieNode.properties);
            displayName = trieNode.segment;
            if (updateEntry) {
                for (const [simpleKey, value] of Object.entries(updateEntry.params)) {
                    if (simpleKey === '_ui_capacityMode') {
                        uiCapacityModeHint = value;
                    } else {
                        const fullKey =
                            this._mapSimpleKeyToFullYarnKey(queuePath, simpleKey) ||
                            `yarn.scheduler.capacity.${queuePath}.${simpleKey}`;
                        baseProperties.set(fullKey, value);
                    }
                }
            }
        }

        const dataForModal = {
            path: queuePath,
            displayName: displayName,
            properties: {},
            nodeLabelData: {
                accessibleNodeLabelsString: '',
                labelSpecificParams: {},
            },
            effectiveCapacityMode:
                uiCapacityModeHint || this._determineEffectiveCapacityMode(queuePath, baseProperties),
            isNew: !!addEntry,
            allPartitions: schedulerInfoModel ? schedulerInfoModel.getPartitions() : [DEFAULT_PARTITION],
        };

        for (const category of QUEUE_CONFIG_METADATA) {
            for (const [placeholderKey, meta] of Object.entries(category.properties)) {
                const fullYarnKey = placeholderKey.replace(Q_PATH_PLACEHOLDER, queuePath);
                const value = baseProperties.get(fullYarnKey);
                dataForModal.properties[meta.key] = value === undefined ? String(meta.defaultValue) : String(value);
            }
        }

        const anlKey = `yarn.scheduler.capacity.${queuePath}.accessible-node-labels`;
        const anlFullPlaceholderKey = `yarn.scheduler.capacity.${Q_PATH_PLACEHOLDER}.accessible-node-labels`;
        const anlDefault = NODE_LABEL_CONFIG_METADATA[anlFullPlaceholderKey]?.defaultValue || '*';
        dataForModal.nodeLabelData.accessibleNodeLabelsString = String(baseProperties.get(anlKey) || anlDefault);

        for (const [key, value] of baseProperties.entries()) {
            const labelPrefix = `yarn.scheduler.capacity.${queuePath}.accessible-node-labels.`;
            if (key.startsWith(labelPrefix) && key !== anlKey) {
                const simpleSubKey = key.slice(labelPrefix.length);
                dataForModal.nodeLabelData.labelSpecificParams[simpleSubKey] = String(value);
            }
        }

        return dataForModal;
    }

    formatQueueDataForInfoModal(queuePath, schedulerConfigModel, schedulerInfoModel, appStateModel) {
        const formattedHierarchyRoot = this.formatQueueHierarchyForView(
            schedulerConfigModel,
            schedulerInfoModel,
            appStateModel
        );
        if (!formattedHierarchyRoot) return null;

        let targetNode = null;
        function findNodeInFormatted(node, path) {
            if (!node) return null;
            if (node.path === path) return node;
            if (node.children) {
                for (const childSegment in node.children) {
                    const found = findNodeInFormatted(node.children[childSegment], path);
                    if (found) return found;
                }
            }
            return null;
        }
        targetNode = findNodeInFormatted(formattedHierarchyRoot, queuePath);

        if (!targetNode) {
            console.warn(`InfoModal: Formatted node for path "${queuePath}" not found in hierarchy.`);
            return null;
        }

        const liveQueueInfo = schedulerInfoModel.getQueueRuntimeInfo(queuePath, appStateModel.getSelectedPartition());

        const infoData = {
            displayName: targetNode.displayName,
            basicInfo: [],
            capacityResourceDetails: [],
            liveUsage: [],
            otherConfigured: [],
            nodeLabelInfo: [],
        };

        infoData.basicInfo.push({ label: 'Name', value: targetNode.displayName }, { label: 'Path', value: targetNode.path }, { label: 'Configured State', value: targetNode.state });
        if (targetNode.liveState && targetNode.liveState !== targetNode.state) {
            infoData.basicInfo.push({ label: 'Live State', value: targetNode.liveState });
        }
        infoData.basicInfo.push({ label: 'Effective Type', value: targetNode.queueType });

        infoData.capacityResourceDetails.push({
            label: 'Effective Capacity Mode',
            value: targetNode.effectiveCapacityMode,
        });
        const capDisp = targetNode.capacityDisplayForLabel || targetNode.capacityDisplay;
        const maxCapDisp = targetNode.maxCapacityDisplayForLabel || targetNode.maxCapacityDisplay;
        const capDet = targetNode.capacityDetailsForLabel || targetNode.capacityDetails;
        const maxCapDet = targetNode.maxCapacityDetailsForLabel || targetNode.maxCapacityDetails;

        infoData.capacityResourceDetails.push({
            label: `Capacity (Partition: ${appStateModel.getSelectedPartition() || 'default'})`,
            value: capDisp,
        });
        if (capDet && capDet.length > 0) {
            infoData.capacityResourceDetails.push({
                label: 'Capacity Breakdown',
                value: capDet.map((d) => `${d.key}: ${d.value}${d.unit || ''}`).join(', '),
            });
        }
        infoData.capacityResourceDetails.push({
            label: `Max Capacity (Partition: ${appStateModel.getSelectedPartition() || 'default'})`,
            value: maxCapDisp,
        });
        if (maxCapDet && maxCapDet.length > 0) {
            infoData.capacityResourceDetails.push({
                label: 'Max Capacity Breakdown',
                value: maxCapDet.map((d) => `${d.key}: ${d.value}${d.unit || ''}`).join(', '),
            });
        }

        infoData.liveUsage.push({
            label: 'Absolute Capacity (Live)',
            value: targetNode.absoluteCapacityDisplay || 'N/A',
        }, {
            label: 'Absolute Used Capacity (Live)',
            value: targetNode.absoluteUsedCapacityDisplay || 'N/A',
        }, {
            label: 'Number of Applications (Live)',
            value: targetNode.numApplications === undefined ? 'N/A' : targetNode.numApplications,
        });
        if (liveQueueInfo) {
            for (const [apiKey, meta] of Object.entries(SCHEDULER_INFO_METADATA)) {
                if (
                    apiKey !== 'queueName' &&
                    apiKey !== 'queuePath' &&
                    apiKey !== 'state' &&
                    apiKey !== 'type' &&
                    apiKey !== 'capacity' &&
                    apiKey !== 'usedCapacity' &&
                    apiKey !== 'maxCapacity' &&
                    apiKey !== 'absoluteCapacity' &&
                    apiKey !== 'absoluteMaxCapacity' &&
                    apiKey !== 'absoluteUsedCapacity' &&
                    apiKey !== 'numApplications' &&
                    !infoData.liveUsage.some((item) => item.label === meta.displayName) &&
                    !infoData.basicInfo.some((item) => item.label === meta.displayName) &&
                    !infoData.capacityResourceDetails.some((item) => item.label === meta.displayName)
                ) {
                    let value = liveQueueInfo[apiKey];
                    if (apiKey === 'resourcesUsed' && liveQueueInfo.resourcesUsed) {
                        value = `Mem: ${liveQueueInfo.resourcesUsed.memory || 0}MB, VCores: ${liveQueueInfo.resourcesUsed.vCores || 0}`;
                    } else if (typeof value === 'object' && value !== null) {
                        value = JSON.stringify(value);
                    }

                    if (value !== undefined) {
                        infoData.liveUsage.push({
                            label: meta.displayName + ' (Live)',
                            value: `${value}${meta.unit || ''}`,
                        });
                    }
                }
            }
        }

        const coreDisplayProperties = new Set(['capacity', 'maximum-capacity', 'state', 'accessible-node-labels']);
        for (const [fullKey, value] of targetNode.effectiveProperties.entries()) {
            let matchedMeta = null;
            for (const category of QUEUE_CONFIG_METADATA) {
                for (const phKey in category.properties) {
                    if (phKey.replace(Q_PATH_PLACEHOLDER, targetNode.path) === fullKey) {
                        matchedMeta = category.properties[phKey];
                        break;
                    }
                }
                if (matchedMeta) break;
            }

            if (matchedMeta && !coreDisplayProperties.has(matchedMeta.key)) {
                if (!infoData.otherConfigured.some((item) => item.label === matchedMeta.displayName)) {
                    infoData.otherConfigured.push({ label: matchedMeta.displayName, value: String(value) });
                }
            } else if (
                !matchedMeta &&
                fullKey.startsWith(`yarn.scheduler.capacity.${targetNode.path}.`) &&
                !fullKey.includes('accessible-node-labels.')
            ) {
                const simpleKey = fullKey.slice(`yarn.scheduler.capacity.${targetNode.path}.`.length);
                if (
                    !coreDisplayProperties.has(simpleKey) &&
                    !infoData.otherConfigured.some((item) => item.label === simpleKey)
                ) {
                    infoData.otherConfigured.push({ label: simpleKey + ' (Custom)', value: String(value) });
                }
            }
        }

        infoData.nodeLabelInfo.push({
            label: 'Accessible Node Labels (Effective)',
            value: targetNode['accessible-node-labels'],
        });
        const labelPrefix = `yarn.scheduler.capacity.${targetNode.path}.accessible-node-labels.`;
        for (const [key, value] of targetNode.effectiveProperties.entries()) {
            if (
                key.startsWith(labelPrefix) &&
                key !== `yarn.scheduler.capacity.${targetNode.path}.accessible-node-labels`
            ) {
                const subKey = key.slice(labelPrefix.length);
                infoData.nodeLabelInfo.push({ label: `Effective Label '${subKey}'`, value: String(value) });
            }
        }

        return infoData;
    }
}
