/**
 * @file Service responsible for transforming raw model data into
 * richly formatted objects suitable for direct consumption by View components.
 */
class ViewDataFormatterService {
    constructor() {
        // Helper for parsing resource strings like "[memory=1024,vcores=1]"
        // This is similar to the one in the old QueueViewDataFormatter
        this.resourceVectorParser = (resourceString) => {
            if (!resourceString || typeof resourceString !== 'string') return [];
            let cleanStr = resourceString.trim();
            if (cleanStr.startsWith("[") && cleanStr.endsWith("]")) cleanStr = cleanStr.slice(1, -1);
            if (!cleanStr) return [];

            return cleanStr.split(',').map(pair => {
                const parts = pair.split('=');
                const key = parts[0] ? parts[0].trim() : null;
                const valuePart = parts[1] ? parts[1].trim() : "";
                const match = valuePart.match(/^([0-9.]+)(.*)/); // Match number and optional unit
                let value = valuePart;
                let unit = "";
                if (match) { value = match[1]; unit = match[2].trim(); }
                return { key, value, unit };
            }).filter(item => item.key && item.value !== "");
        };
    }

    /**
     * Formats the full queue hierarchy for display in the QueueTreeView.
     * It combines base configuration, pending changes, and live scheduler info.
     * @param {SchedulerConfigModel} schedulerConfigModel
     * @param {SchedulerInfoModel} schedulerInfoModel
     * @param {AppStateModel} appStateModel
     * @returns {Object | null} The root of the formatted queue hierarchy, or null.
     */
    formatQueueHierarchyForView(schedulerConfigModel, schedulerInfoModel, appStateModel) {
        const trieRoot = schedulerConfigModel.getSchedulerTrieRoot();
        if (!trieRoot) return null;

        const pendingChanges = schedulerConfigModel.getRawPendingChanges();
        const selectedPartition = appStateModel.getSelectedPartition();

        // Recursive function to build the effective and formatted hierarchy
        const formatNodeRecursive = (trieNode, parentPath = null) => {
            const basePath = trieNode.fullPath;
            const isStagedForDelete = pendingChanges.removeQueues.includes(basePath);
            if (isStagedForDelete) return null; // Skip rendering if marked for deletion

            // Start with base properties from Trie
            const effectiveProperties = new Map(trieNode.properties);
            let uiCapacityModeHint = null;

            // Overlay with pending updates for this queue
            const updateEntry = pendingChanges.updateQueues.find(u => u.queueName === basePath);
            if (updateEntry) {
                for (const [simpleKey, value] of Object.entries(updateEntry.params)) {
                    // Need to map simpleKey to full YARN key if it's a standard prop
                    // Or handle specific keys like 'accessible-node-labels' or 'accessible-node-labels.X.capacity'
                    if (simpleKey === '_ui_capacityMode') {
                        uiCapacityModeHint = value;
                        continue;
                    }
                    const fullKey = this._mapSimpleKeyToFullYarnKey(basePath, simpleKey, QUEUE_CONFIG_METADATA, NODE_LABEL_CONFIG_METADATA);
                    if (fullKey) effectiveProperties.set(fullKey, value);
                    else effectiveProperties.set(simpleKey, value); // Assume it's already a full/special key
                }
            }

            const formattedNode = this._formatSingleQueueNode(
                basePath,
                trieNode.segment,
                parentPath,
                effectiveProperties,
                schedulerInfoModel,
                selectedPartition,
                OPERATION_TYPES.UPDATE, // Assuming existing node that might be updated
                uiCapacityModeHint
            );

            formattedNode.children = {};
            let effectiveChildrenCount = 0;

            // Process existing children from Trie
            trieNode.children.forEach(childTrieNode => {
                const formattedChild = formatNodeRecursive(childTrieNode, basePath);
                if (formattedChild) {
                    formattedNode.children[childTrieNode.segment] = formattedChild;
                    if (!formattedChild.isDeleted) effectiveChildrenCount++;
                }
            });

            // Process staged new children for this parent
            pendingChanges.addQueues.forEach(addEntry => {
                const newQueueParentPath = addEntry.queueName.substring(0, addEntry.queueName.lastIndexOf('.'));
                if (newQueueParentPath === basePath) {
                    const newQueueNameSegment = addEntry.queueName.substring(addEntry.queueName.lastIndexOf('.') + 1);
                    if (!formattedNode.children[newQueueNameSegment]) { // Avoid double-adding if somehow in Trie too
                        const newQueueFullProps = new Map();
                        for (const [simpleKey, value] of Object.entries(addEntry.params)) {
                            if (simpleKey === '_ui_capacityMode') {
                                uiCapacityModeHint = value; // Store hint for this new node
                                continue;
                            }
                            const fullKey = this._mapSimpleKeyToFullYarnKey(addEntry.queueName, simpleKey, QUEUE_CONFIG_METADATA, NODE_LABEL_CONFIG_METADATA);
                            if (fullKey) newQueueFullProps.set(fullKey, value);
                            else newQueueFullProps.set(simpleKey, value); // Assume special key
                        }

                        const formattedNewChild = this._formatSingleQueueNode(
                            addEntry.queueName,
                            newQueueNameSegment,
                            basePath,
                            newQueueFullProps,
                            schedulerInfoModel,
                            selectedPartition,
                            OPERATION_TYPES.ADD,
                            addEntry.params._ui_capacityMode || null // Pass UI mode hint for new queue
                        );
                        formattedNode.children[newQueueNameSegment] = formattedNewChild;
                        if (!formattedNewChild.isDeleted) effectiveChildrenCount++;
                    }
                }
            });

            formattedNode.queueType = effectiveChildrenCount > 0 ? 'parent' : 'leaf';
            return formattedNode;
        };
        return formatNodeRecursive(trieRoot);
    }

    /**
     * Helper to map a simple property key (like 'capacity') to its full YARN property name.
     * @private
     */
    _mapSimpleKeyToFullYarnKey(queuePath, simpleKey, queueMeta, nodeLabelMeta) {
        // Check standard queue properties
        for (const category of queueMeta) {
            for (const placeholderPropName in category.properties) {
                if (category.properties[placeholderPropName].key === simpleKey) {
                    return placeholderPropName.replace(Q_PATH_PLACEHOLDER, queuePath);
                }
            }
        }
        // Check node label list property
        const mainLabelListKey = nodeLabelMeta[`yarn.scheduler.capacity.${Q_PATH_PLACEHOLDER}.accessible-node-labels`]?.key;
        if (mainLabelListKey === simpleKey) {
            return `yarn.scheduler.capacity.${queuePath}.accessible-node-labels`;
        }
        // Check per-label properties (e.g. accessible-node-labels.X.capacity)
        // This case is more complex as 'simpleKey' might be "accessible-node-labels.X.capacity"
        // If the simpleKey already contains "accessible-node-labels", assume it's specific enough.
        if (simpleKey.includes("accessible-node-labels")) {
            return `yarn.scheduler.capacity.${queuePath}.${simpleKey}`;
        }
        // console.warn(`ViewDataFormatterService: Could not map simple key "${simpleKey}" for path "${queuePath}"`);
        return null; // Or return simpleKey if it's intended to be a direct sub-property key
    }

    /**
     * Formats a single queue node with its effective properties, live data, and UI hints.
     * @private
     */
    _formatSingleQueueNode(queuePath, segment, parentPath, effectiveProperties,
                           schedulerInfoModel, selectedPartition, changeOp, explicitUiModeHint) {

        const isNew = changeOp === OPERATION_TYPES.ADD;
        const isPendingUpdate = changeOp === OPERATION_TYPES.UPDATE &&
            schedulerConfigModel.getRawPendingChanges().updateQueues.some(q => q.queueName === queuePath); // More precise

        const formattedNode = {
            path: queuePath,
            name: segment,
            displayName: segment,
            displayNameTitle: `${queuePath} ${isNew ? '(New)' : (isPendingUpdate ? '(Modified)' : '')}`,
            parentPath: parentPath,
            level: queuePath.split(".").length - 1,
            isRoot: queuePath === 'root',
            isNew: isNew,
            isDeleted: false, // Deletions are filtered out before this stage
            hasPendingChanges: isPendingUpdate || isNew,
            statusClass: '', // Will be set below
            // Store effective properties (full YARN key -> value) for modals
            propertiesForEditModal: new Map(effectiveProperties),
        };

        // Determine effective capacity mode
        formattedNode.effectiveCapacityMode = explicitUiModeHint ||
            this._determineEffectiveCapacityMode(queuePath, effectiveProperties);

        // Get values for core display properties, applying defaults from metadata if not set
        QUEUE_CONFIG_METADATA.forEach(category => {
            Object.entries(category.properties).forEach(([placeholderKey, meta]) => {
                const fullKey = placeholderKey.replace(Q_PATH_PLACEHOLDER, queuePath);
                let value = effectiveProperties.get(fullKey);
                if (value === undefined && meta.defaultValue !== undefined) {
                    value = meta.defaultValue;
                }
                // Store simple key version on formattedNode for easier access in cards/info
                if (meta.key) formattedNode[meta.key] = value;

                // Specific handling for capacity/maxCapacity display
                if (meta.key === 'capacity') {
                    formattedNode.capacityDisplay = this._formatCapacityForDisplay(value, formattedNode.effectiveCapacityMode, meta.defaultValue);
                    formattedNode.capacityDetails = this._isVectorString(value) ? this.resourceVectorParser(value) : [];
                } else if (meta.key === 'maximum-capacity') {
                    formattedNode.maxCapacityDisplay = this._formatCapacityForDisplay(value, CAPACITY_MODES.ABSOLUTE, meta.defaultValue); // Max cap can be vector or %
                    formattedNode.maxCapacityDetails = this._isVectorString(value) ? this.resourceVectorParser(value) : [];
                } else if (meta.key === 'state') {
                    formattedNode.state = String(value || meta.defaultValue);
                }
            });
        });
        // Handle accessible-node-labels related properties using NODE_LABEL_CONFIG_METADATA
        // This will involve getting the list and then capacities for specific labels if selectedPartition matters
        this._formatNodeLabelProperties(formattedNode, effectiveProperties, queuePath, selectedPartition);


        // Apply status class
        if (isNew) formattedNode.statusClass = 'new-queue';
        else if (isPendingUpdate) formattedNode.statusClass = 'pending-changes';

        // Integrate live data from SchedulerInfoModel
        const liveQueueInfo = schedulerInfoModel.getQueueRuntimeInfo(queuePath);
        if (liveQueueInfo) {
            formattedNode.numApplications = liveQueueInfo.numApplications !== undefined ? liveQueueInfo.numApplications : 0;
            formattedNode.absoluteUsedCapacityDisplay = liveQueueInfo.absoluteUsedCapacity !== undefined ? `${liveQueueInfo.absoluteUsedCapacity.toFixed(1)}%` : 'N/A';
            // ... more live data based on SCHEDULER_INFO_METADATA
        } else {
            formattedNode.numApplications = 0;
            formattedNode.absoluteUsedCapacityDisplay = 'N/A';
        }

        formattedNode.uiLabels = this._generateUILabels(formattedNode);

        const deletability = ValidationService.checkDeletability // Assuming moved to ValidationService
            ? ValidationService.checkDeletability(queuePath, schedulerConfigModel) // Pass the model instance
            : { canDelete: !formattedNode.isRoot, reason: "" };
        formattedNode.canBeDeletedForDropdown = deletability.canDelete;
        formattedNode.deletionReason = deletability.reason;

        return formattedNode;
    }

    /**
     * Formats node label related properties for display or editing.
     * @private
     */
    _formatNodeLabelProperties(formattedNode, effectiveProperties, queuePath, selectedPartition) {
        const labelsListKey = `yarn.scheduler.capacity.${queuePath}.accessible-node-labels`;
        formattedNode.accessibleNodeLabels = String(effectiveProperties.get(labelsListKey) || "*"); // Default to *

        // If a specific partition (label) is selected, try to find its specific capacity
        if (selectedPartition && selectedPartition !== DEFAULT_PARTITION && selectedPartition !== "*") {
            const labelCapacityKey = `yarn.scheduler.capacity.${queuePath}.accessible-node-labels.${selectedPartition}.capacity`;
            const labelMaxCapacityKey = `yarn.scheduler.capacity.${queuePath}.accessible-node-labels.${selectedPartition}.maximum-capacity`;

            if (effectiveProperties.has(labelCapacityKey)) {
                const labelCapacity = effectiveProperties.get(labelCapacityKey);
                // Override generic capacityDisplay if specific label capacity exists for selected partition
                formattedNode.capacityDisplayForLabel = this._formatCapacityForDisplay(labelCapacity, CAPACITY_MODES.PERCENTAGE, "100%"); // Label capacities are usually %
                formattedNode.capacityDetailsForLabel = []; // Typically not vector for label capacity
            }
            if (effectiveProperties.has(labelMaxCapacityKey)) {
                const labelMaxCapacity = effectiveProperties.get(labelMaxCapacityKey);
                formattedNode.maxCapacityDisplayForLabel = this._formatCapacityForDisplay(labelMaxCapacity, CAPACITY_MODES.PERCENTAGE, "100%");
                formattedNode.maxCapacityDetailsForLabel = [];
            }
        }
        // Data for Edit Modal: create an object for node label specific params
        formattedNode.nodeLabelParams = {};
        effectiveProperties.forEach((value, key) => {
            if (key.startsWith(`yarn.scheduler.capacity.${queuePath}.accessible-node-labels.`)) {
                if (key !== labelsListKey) { // Don't include the list itself here
                    const simpleLabelSubKey = key.substring(labelsListKey.length + 1); // e.g., "X.capacity"
                    formattedNode.nodeLabelParams[simpleLabelSubKey] = value;
                }
            }
        });
    }


    /**
     * Determines the effective capacity mode for a queue.
     * @private
     */
    _determineEffectiveCapacityMode(queuePath, effectiveProperties) {
        // Look for UI hint first (handled by caller via explicitUiModeHint)
        const rawCapacityString = effectiveProperties.get(`yarn.scheduler.capacity.${queuePath}.capacity`);
        if (rawCapacityString !== undefined) {
            const capStr = String(rawCapacityString);
            if (capStr.endsWith('w')) return CAPACITY_MODES.WEIGHT;
            if (this._isVectorString(capStr)) return CAPACITY_MODES.ABSOLUTE; // Or VECTOR
        }
        return CAPACITY_MODES.PERCENTAGE; // Default
    }

    _isVectorString(valStr) {
        return typeof valStr === 'string' && valStr.startsWith('[') && valStr.endsWith(']');
    }

    /**
     * Formats a capacity value string for display, ensuring correct suffix.
     * @private
     */
    _formatCapacityForDisplay(rawValue, mode, defaultValueForEmptyOrInvalid) {
        let valStr = (rawValue !== undefined && rawValue !== null) ? String(rawValue).trim() : "";
        if (valStr === "") valStr = String(defaultValueForEmptyOrInvalid);

        if (mode === CAPACITY_MODES.PERCENTAGE) {
            return valStr.endsWith('%') ? valStr : `${parseFloat(valStr) || 0.0}%`;
        } else if (mode === CAPACITY_MODES.WEIGHT) {
            return valStr.endsWith('w') ? valStr : `${parseFloat(valStr) || 0.0}w`;
        }
        // For ABSOLUTE/VECTOR, return as is if it's a vector, otherwise try to make it a sensible default
        return this._isVectorString(valStr) ? valStr : String(defaultValueForEmptyOrInvalid);
    }

    /**
     * Generates UI-friendly labels/tags for a queue card.
     * @private
     */
    _generateUILabels(formattedNode) {
        const labels = [];
        const modeIcons = { percentage: "📊", weight: "⚖️", absolute: "🎯" }; // Vector uses absolute
        const mode = formattedNode.effectiveCapacityMode || CAPACITY_MODES.PERCENTAGE;
        const modeText = mode.charAt(0).toUpperCase() + mode.slice(1);
        labels.push({ text: `${modeIcons[mode] || "📊"} ${modeText}`, cssClass: "queue-tag tag-mode", title: `Capacity Mode: ${modeText}`});

        const state = formattedNode.state || 'RUNNING';
        labels.push({
            text: state === "STOPPED" ? "🛑 Stopped" : "▶️ Running",
            cssClass: `queue-tag tag-state ${state === "STOPPED" ? 'tag-stopped' : 'tag-running'}`,
            title: `Queue State: ${state}`
        });

        const rawAutoCreate = formattedNode.propertiesForEditModal.get(`yarn.scheduler.capacity.${formattedNode.path}.auto-create-child-queue.enabled`);
        if (String(rawAutoCreate).toLowerCase() === 'true') {
            labels.push({ text: "⚡ Auto-Create", cssClass: "queue-tag tag-auto-create", title: "Auto Queue Creation Enabled"});
        }
        return labels;
    }

    /**
     * Prepares detailed data specifically for the Edit Queue Modal.
     * @param {string} queuePath
     * @param {SchedulerConfigModel} schedulerConfigModel
     * @param {Object} nodeLabelConfigMetadata - From `config-metadata-node-labels.js`
     * @returns {Object | null} Data object for the modal.
     */
    formatQueueDataForEditModal(queuePath, schedulerConfigModel, nodeLabelConfigMetadata) {
        const trieNode = schedulerConfigModel.getTrieInstance().getQueueNode(queuePath);
        if (!trieNode) return null;

        const pendingChanges = schedulerConfigModel.getRawPendingChanges();
        const updateEntry = pendingChanges.updateQueues.find(u => u.queueName === queuePath);
        const addEntry = pendingChanges.addQueues.find(a => a.queueName === queuePath);

        const effectiveProperties = new Map(trieNode.properties);
        let uiCapacityModeHint = null;

        if (addEntry) { // If it's a new queue, its params are the source of truth
            for (const [simpleKey, value] of Object.entries(addEntry.params)) {
                if (simpleKey === '_ui_capacityMode') { uiCapacityModeHint = value; continue; }
                const fullKey = this._mapSimpleKeyToFullYarnKey(queuePath, simpleKey, QUEUE_CONFIG_METADATA, nodeLabelConfigMetadata);
                if(fullKey) effectiveProperties.set(fullKey, value);
                else effectiveProperties.set(simpleKey, value);
            }
        } else if (updateEntry) { // Overlay existing with pending updates
            for (const [simpleKey, value] of Object.entries(updateEntry.params)) {
                if (simpleKey === '_ui_capacityMode') { uiCapacityModeHint = value; continue; }
                const fullKey = this._mapSimpleKeyToFullYarnKey(queuePath, simpleKey, QUEUE_CONFIG_METADATA, nodeLabelConfigMetadata);
                if(fullKey) effectiveProperties.set(fullKey, value);
                else effectiveProperties.set(simpleKey, value);
            }
        }

        const dataForModal = {
            path: queuePath,
            displayName: trieNode.segment,
            properties: {}, // simpleKey -> value for standard props
            nodeLabelData: { // Structured for node label editing
                accessibleNodeLabelsString: String(effectiveProperties.get(`yarn.scheduler.capacity.${queuePath}.accessible-node-labels`) || "*"),
                labelSpecificParams: {} // "X.capacity": "value"
            },
            effectiveCapacityMode: uiCapacityModeHint || this._determineEffectiveCapacityMode(queuePath, effectiveProperties),
            isNew: !!addEntry,
        };

        // Populate standard properties
        QUEUE_CONFIG_METADATA.forEach(category => {
            Object.values(category.properties).forEach(meta => {
                const fullKey = meta.displayName.startsWith('Capacity') // Special hack for these simple keys.
                    ? `yarn.scheduler.capacity.${queuePath}.${meta.key}`
                    : meta.displayName.startsWith('Maximum Capacity')
                        ? `yarn.scheduler.capacity.${queuePath}.${meta.key}`
                        : meta.displayName.startsWith('State')
                            ? `yarn.scheduler.capacity.${queuePath}.${meta.key}`
                            : Object.keys(meta)[0].replace(Q_PATH_PLACEHOLDER, queuePath); // Get the full YARN key from metadata structure

                const val = effectiveProperties.get(fullKey);
                dataForModal.properties[meta.key] = (val !== undefined) ? String(val) : String(meta.defaultValue);
            });
        });


        // Populate node-label specific parameters
        effectiveProperties.forEach((value, key) => {
            const labelPrefix = `yarn.scheduler.capacity.${queuePath}.accessible-node-labels.`;
            if (key.startsWith(labelPrefix) && key !== `${labelPrefix}*` && key !== `yarn.scheduler.capacity.${queuePath}.accessible-node-labels`) {
                // e.g. key = yarn.scheduler.capacity.root.default.accessible-node-labels.gpu.capacity
                // simpleSubKey = gpu.capacity
                const simpleSubKey = key.substring(labelPrefix.length);
                dataForModal.nodeLabelData.labelSpecificParams[simpleSubKey] = String(value);
            }
        });
        return dataForModal;
    }


    /**
     * Prepares detailed data for the Info Queue Modal.
     * @param {string} queuePath
     * @param {SchedulerConfigModel} schedulerConfigModel
     * @param {SchedulerInfoModel} schedulerInfoModel
     * @param {AppStateModel} appStateModel
     * @param {Object} schedulerInfoMetadata - from `config-metadata-scheduler-info.js`
     * @returns {Object | null} Formatted data object for the modal.
     */
    formatQueueDataForInfoModal(queuePath, schedulerConfigModel, schedulerInfoModel, appStateModel, schedulerInfoMetadata) {
        const formattedHierarchy = this.formatQueueHierarchyForView(schedulerConfigModel, schedulerInfoModel, appStateModel);
        if (!formattedHierarchy) return null;

        // Find the specific formatted node from the hierarchy
        let targetNode = null;
        function findNode(node, path) {
            if (node.path === path) return node;
            if (node.children) {
                for (const childName in node.children) {
                    const found = findNode(node.children[childName], path);
                    if (found) return found;
                }
            }
            return null;
        }
        targetNode = findNode(formattedHierarchy, queuePath);
        if (!targetNode) return null; // Should not happen if hierarchy is correct

        const liveQueueInfo = schedulerInfoModel.getQueueRuntimeInfo(queuePath);

        const infoData = {
            config: [], // Array of {displayName, value} from effective config
            live: []    // Array of {displayName, value} from schedulerInfo API
        };

        // Populate with configured properties (using QUEUE_CONFIG_METADATA and NODE_LABEL_CONFIG_METADATA)
        // This uses the already formatted values from targetNode like targetNode.capacityDisplay
        infoData.config.push({displayName: "Path", value: targetNode.path});
        infoData.config.push({displayName: "Configured State", value: targetNode.state});
        infoData.config.push({displayName: "Effective Capacity Mode", value: targetNode.effectiveCapacityMode});
        infoData.config.push({displayName: "Configured Capacity", value: targetNode.capacityDisplay});
        if(targetNode.capacityDetails && targetNode.capacityDetails.length > 0) {
            infoData.config.push({displayName: "Capacity Breakdown", value: targetNode.capacityDetails.map(d => `${d.key}: ${d.value}${d.unit||""}`).join(', ')});
        }
        infoData.config.push({displayName: "Configured Max Capacity", value: targetNode.maxCapacityDisplay});
        if(targetNode.maxCapacityDetails && targetNode.maxCapacityDetails.length > 0) {
            infoData.config.push({displayName: "Max Capacity Breakdown", value: targetNode.maxCapacityDetails.map(d => `${d.key}: ${d.value}${d.unit||""}`).join(', ')});
        }
        // Add other configured properties from targetNode.propertiesForEditModal, mapped through QUEUE_CONFIG_METADATA
        QUEUE_CONFIG_METADATA.forEach(cat => {
            Object.values(cat.properties).forEach(meta => {
                if (meta.key !== 'capacity' && meta.key !== 'maximum-capacity' && meta.key !== 'state') {
                    const val = targetNode.propertiesForEditModal.get(meta.displayName.startsWith('Capacity') || meta.displayName.startsWith('Maximum Capacity') || meta.displayName.startsWith('State') ? `yarn.scheduler.capacity.${queuePath}.${meta.key}` : Object.keys(meta)[0].replace(Q_PATH_PLACEHOLDER, queuePath));
                    if (val !== undefined) infoData.config.push({displayName: meta.displayName, value: String(val)});
                }
            });
        });
        // Add node label config
        infoData.config.push({ displayName: "Accessible Node Labels (Config)", value: targetNode.accessibleNodeLabels });
        Object.entries(targetNode.nodeLabelParams || {}).forEach(([key, value]) => {
            infoData.config.push({displayName: `Label Conf: ${key}`, value: String(value)});
        });


        // Populate with live properties from schedulerInfo API
        if (liveQueueInfo) {
            Object.entries(schedulerInfoMetadata).forEach(([apiKey, meta]) => {
                let value = liveQueueInfo[apiKey];
                if (apiKey === 'resourcesUsed' && liveQueueInfo.resourcesUsed) {
                    value = `Mem: ${liveQueueInfo.resourcesUsed.memory || 0}MB, VCores: ${liveQueueInfo.resourcesUsed.vCores || 0}`;
                }
                // Add more specific formatting for nested objects if needed
                if (value !== undefined) {
                    infoData.live.push({ displayName: meta.displayName, value: `${value}${meta.unit || ''}` });
                }
            });
        }
        return infoData;
    }
}