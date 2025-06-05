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
        return PropertyKeyMapper.toFullKey(queuePath, simpleOrPartialKey);
    }

    formatQueueHierarchyForView(schedulerConfigModel, schedulerInfoModel, appStateModel, forValidationOnly = false) {
        const configManager = schedulerConfigModel.getSchedulerTrieRoot();
        if (!configManager) return null;

        const selectedPartition = appStateModel.getSelectedPartition();

        return this._formatQueueNodeRecursive(configManager, null, schedulerInfoModel, selectedPartition, forValidationOnly);
    }

    // This method is no longer needed with unified QueueConfigurationManager
    // Properties are now unified in QueueNode.getEffectiveProperties()

    // This method is no longer needed with unified QueueConfigurationManager
    // Pending additions are now handled directly in the QueueNode children

    _formatQueueNodeRecursive(queueNode, parentPath, schedulerInfoModel, selectedPartition, forValidationOnly) {
        const basePath = queueNode.fullPath;

        // Skip deleted nodes
        if (queueNode.isDeleted()) {
            return null;
        }

        // Skip non-queue nodes unless they have queue children
        if (!queueNode.isQueue && queueNode.children.size === 0) {
            return null;
        }

        let operationType = null;
        let uiCapacityModeHint = null;
        const effectiveProperties = queueNode.getEffectiveProperties();

        // Extract UI capacity mode hint from properties
        for (const [fullKey, value] of effectiveProperties) {
            const simpleKey = PropertyKeyMapper.toSimpleKey(fullKey);
            if (simpleKey === '_ui_capacityMode') {
                uiCapacityModeHint = value;
                break;
            }
        }

        // Determine operation type
        if (queueNode.isNew()) {
            operationType = OPERATION_TYPES.ADD;
        } else if (queueNode.hasPendingChanges()) {
            operationType = OPERATION_TYPES.UPDATE;
        }

        const formattedNode = this._formatSingleQueueNode(
            basePath,
            queueNode.segment,
            parentPath,
            effectiveProperties,
            schedulerInfoModel,
            selectedPartition,
            operationType,
            queueNode, // Pass the queueNode for pending changes detection
            uiCapacityModeHint,
            forValidationOnly
        );

        formattedNode.children = {};
        let activeChildrenCount = 0;

        // Process children
        for (const [childSegment, childNode] of queueNode.children) {
            if (childNode.isQueue || childNode.children.size > 0) {
                const formattedChild = this._formatQueueNodeRecursive(
                    childNode, basePath, schedulerInfoModel, selectedPartition, forValidationOnly
                );
                if (formattedChild) {
                    formattedNode.children[childSegment] = formattedChild;
                    activeChildrenCount++;
                }
            }
        }

        formattedNode.queueType = activeChildrenCount > 0 ? 'parent' : 'leaf';
        return formattedNode;
    }

    // This method is no longer needed with unified QueueConfigurationManager
    // Root additions are handled the same as any other queue in the unified structure

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
        queueNode, // QueueNode instead of pending changes
        explicitUiModeHint,
        forValidationOnly = false
    ) {
        const isNew = changeOperationType === OPERATION_TYPES.ADD;
        const isPendingUpdate = changeOperationType === OPERATION_TYPES.UPDATE;

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
        return CapacityValueParser.determineMode(queuePath, effectiveProperties);
    }

    _getDefaultCapacityValue(mode) {
        return CapacityValueParser.getDefaultValue(mode);
    }

    _getDefaultMaxCapacityValue() {
        return CapacityValueParser.getDefaultMaxValue(CAPACITY_MODES.PERCENTAGE);
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
            tooltip: `The capacity mode. In Hadoop YARN's Capacity Scheduler, queue capacity modes determine how cluster resources are allocated. Each mode offers different levels of flexibility and control, catering to various organizational requirements for resource management.`,
        });

        const configState = formattedNode.state || 'RUNNING';
        labels.push({
            text: configState === 'STOPPED' ? '🛑 Config: Stopped' : '▶️ Config: Running',
            cssClass: `queue-tag tag-state ${configState === 'STOPPED' ? 'tag-stopped' : 'tag-running'}`,
            tooltip: `The configured queue state. In Hadoop YARN's Capacity Scheduler, the state property defines a queue's operational status. Setting it to RUNNING allows new applications to be submitted to the queue, while STOPPED prevents new submissions but lets existing applications complete, enabling graceful queue draining.`,
        });

        if (formattedNode.liveState && formattedNode.liveState !== configState) {
            labels.push({
                text: formattedNode.liveState === 'STOPPED' ? '‼️ Live: Stopped' : '✳️ Live: Running',
                cssClass: `queue-tag tag-state ${formattedNode.liveState === 'STOPPED' ? 'tag-stopped-live' : 'tag-running-live'}`,
                tooltip: `The actual queue state what we can see in the running Resource Manager.`,
            });
        }

        const autoCreateEnabled = String(formattedNode['auto-create-child-queue.enabled']).toLowerCase() === 'true';
        if (autoCreateEnabled) {
            labels.push({
                text: '⚡ Auto-Create',
                cssClass: 'queue-tag tag-auto-create',
                tooltip: 'Auto Queue Creation. When auto-creation is enabled on a YARN Capacity Scheduler parent queue, it dynamically generates child leaf queues based on user or group mappings, facilitating flexible and scalable resource allocation without manual configuration. These auto-created queues inherit properties from their parent and the parent\'s auto-creation template configurations. It can be automatically deleted after a period of inactivity, typically 300 seconds, unless configured otherwise.',
            });
        }
        return labels;
    }

    formatQueueDataForEditModal(queuePath, schedulerConfigModel, schedulerInfoModel, appStateModel) {
        const configManager = schedulerConfigModel.getTrieInstance();
        const queueNode = configManager.getQueueNode(queuePath);
        
        if (!queueNode) {
            console.warn(
                `ViewDataFormatterService: QueueNode not found for queue path "${queuePath}" in formatQueueDataForEditModal.`
            );
            return null;
        }

        let baseProperties = queueNode.getEffectiveProperties();
        let displayName = queueNode.segment;
        let uiCapacityModeHint = null;
        
        // Extract UI capacity mode hint
        for (const [fullKey, value] of baseProperties) {
            const simpleKey = PropertyKeyMapper.toSimpleKey(fullKey);
            if (simpleKey === '_ui_capacityMode') {
                uiCapacityModeHint = value;
                break;
            }
        }

        // Get global config to determine legacy mode
        const globalConfig = schedulerConfigModel.getGlobalConfig();
        const isLegacyMode = appStateModel.isLegacyModeEnabled(globalConfig);
        
        // Check if queue has children (important for auto-creation validation)
        const hasChildren = queueNode.children && queueNode.children.size > 0;
        
        const dataForModal = {
            path: queuePath,
            displayName: displayName,
            properties: {},
            propertyDefaults: {}, // Track which properties are defaults
            nodeLabelData: {
                accessibleNodeLabelsString: '',
                labelSpecificParams: {},
            },
            autoCreationData: {
                enabled: false,
                hasChildren: hasChildren,
                templateProperties: {},
            },
            effectiveCapacityMode:
                uiCapacityModeHint || this._determineEffectiveCapacityMode(queuePath, baseProperties),
            isNew: queueNode.isNew(),
            allPartitions: schedulerInfoModel ? schedulerInfoModel.getPartitions() : [DEFAULT_PARTITION],
            isLegacyMode: isLegacyMode,
        };

        for (const category of QUEUE_CONFIG_METADATA) {
            for (const [placeholderKey, meta] of Object.entries(category.properties)) {
                const fullYarnKey = placeholderKey.replace(Q_PATH_PLACEHOLDER, queuePath);
                const value = baseProperties.get(fullYarnKey);
                const isDefault = value === undefined;
                // Show empty string for unconfigured properties, actual value for configured ones
                dataForModal.properties[meta.key] = isDefault ? '' : String(value);
                dataForModal.propertyDefaults[meta.key] = isDefault;
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

        // Populate auto-creation data
        this._populateAutoCreationData(dataForModal, queuePath, baseProperties);

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

    _populateAutoCreationData(dataForModal, queuePath, baseProperties) {
        // Check if auto-creation is enabled (check both v1 and v2)
        const v1AutoCreateKey = `yarn.scheduler.capacity.${queuePath}.auto-create-child-queue.enabled`;
        const v2AutoCreateKey = `yarn.scheduler.capacity.${queuePath}.auto-queue-creation-v2.enabled`;
        const v1AutoCreateValue = baseProperties.get(v1AutoCreateKey);
        const v2AutoCreateValue = baseProperties.get(v2AutoCreateKey);
        
        // Auto-creation is enabled if either v1 or v2 is enabled
        dataForModal.autoCreationData.enabled = 
            String(v1AutoCreateValue).toLowerCase() === 'true' || 
            String(v2AutoCreateValue).toLowerCase() === 'true';
            
        // Store which mode is enabled
        dataForModal.autoCreationData.v1Enabled = String(v1AutoCreateValue).toLowerCase() === 'true';
        dataForModal.autoCreationData.v2Enabled = String(v2AutoCreateValue).toLowerCase() === 'true';

        // Populate non-template properties from AUTO_CREATION_CONFIG_METADATA
        dataForModal.autoCreationData.nonTemplateProperties = {};
        for (const [placeholderKey, meta] of Object.entries(AUTO_CREATION_CONFIG_METADATA)) {
            const fullKey = placeholderKey.replace(Q_PATH_PLACEHOLDER, queuePath);
            const value = baseProperties.get(fullKey);
            const isDefault = value === undefined;
            
            dataForModal.autoCreationData.nonTemplateProperties[meta.key] = {
                value: isDefault ? '' : String(value),
                isDefault: isDefault,
                meta: meta,
            };
        }

        // Populate template properties dynamically from QUEUE_CONFIG_METADATA
        dataForModal.autoCreationData.templateProperties = {};
        
        // v1 template properties: yarn.scheduler.capacity.<queue-path>.leaf-queue-template.<property>
        dataForModal.autoCreationData.v1TemplateProperties = {};
        
        // v2 template properties with different scopes
        dataForModal.autoCreationData.v2TemplateProperties = {
            template: {}, // yarn.scheduler.capacity.<queue-path>.auto-queue-creation-v2.template.<property>
            parentTemplate: {}, // yarn.scheduler.capacity.<queue-path>.auto-queue-creation-v2.parent-template.<property>
            leafTemplate: {}, // yarn.scheduler.capacity.<queue-path>.auto-queue-creation-v2.leaf-template.<property>
        };

        // Generate template properties from queue metadata
        for (const category of QUEUE_CONFIG_METADATA) {
            for (const [placeholderKey, meta] of Object.entries(category.properties)) {
                if (meta.availableInTemplate) {
                    // v1 template property
                    const v1FullKey = `yarn.scheduler.capacity.${queuePath}.leaf-queue-template.${meta.key}`;
                    const v1Value = baseProperties.get(v1FullKey);
                    const v1IsDefault = v1Value === undefined;
                    
                    dataForModal.autoCreationData.v1TemplateProperties[meta.key] = {
                        value: v1IsDefault ? '' : String(v1Value),
                        isDefault: v1IsDefault,
                        meta: meta,
                    };

                    // v2 template properties
                    const v2Scopes = ['template', 'parent-template', 'leaf-template'];
                    for (const scope of v2Scopes) {
                        const v2FullKey = `yarn.scheduler.capacity.${queuePath}.auto-queue-creation-v2.${scope}.${meta.key}`;
                        const v2Value = baseProperties.get(v2FullKey);
                        const v2IsDefault = v2Value === undefined;
                        
                        // Convert 'parent-template' -> 'parentTemplate', 'leaf-template' -> 'leafTemplate'
                        const scopeKey = scope.includes('-') ? 
                            scope.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase()) : 
                            scope;
                        
                        // Ensure the nested object exists
                        if (!dataForModal.autoCreationData.v2TemplateProperties[scopeKey]) {
                            dataForModal.autoCreationData.v2TemplateProperties[scopeKey] = {};
                        }
                        
                        dataForModal.autoCreationData.v2TemplateProperties[scopeKey][meta.key] = {
                            value: v2IsDefault ? '' : String(v2Value),
                            isDefault: v2IsDefault,
                            meta: meta,
                        };
                    }
                }
            }
        }
    }
}
