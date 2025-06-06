/**
 * Service for handling node label configuration and partition-specific properties.
 * Manages accessible node labels and label-specific capacity configurations.
 */
class NodeLabelService {
    /**
     * Gets available node labels merged from both scheduler info and cluster nodes
     * @param {SchedulerInfoModel} schedulerInfo - Scheduler info model
     * @param {NodesInfoModel} [nodesInfo] - Cluster nodes info model (optional)
     * @returns {Array<string>} Array of available node labels
     */
    static getAvailableNodeLabels(schedulerInfo, nodesInfo = null) {
        const allLabels = new Set();
        
        // Get labels from scheduler info (queue configurations)
        if (schedulerInfo && schedulerInfo.nodeLabels) {
            for (const label of schedulerInfo.nodeLabels) {
                if (label && label !== '*' && label !== DEFAULT_PARTITION) {
                    allLabels.add(label);
                }
            }
        }
        
        // Get labels from cluster nodes (actual node state)
        if (nodesInfo && nodesInfo.getNodeLabels) {
            for (const label of nodesInfo.getNodeLabels()) {
                if (label && label !== '*' && label !== DEFAULT_PARTITION) {
                    allLabels.add(label);
                }
            }
        }
        
        // TODO: Simple merge logic - YARN validates, no complex UI validation needed
        // This merges labels from both scheduler configs and actual cluster nodes
        return [...allLabels].sort();
    }

    /**
     * Formats comma-separated labels string into array of label objects for UI
     * @param {string} labelsString - Comma-separated labels (e.g., "gpu,ssd")
     * @returns {Array<{name: string, enabled: boolean}>} Array of label objects
     */
    static formatLabelsForChips(labelsString) {
        if (!labelsString || labelsString === '*') {
            return [];
        }
        
        // Handle space as "no labels" indicator
        if (labelsString.trim() === ' ') {
            return [];
        }
        
        return labelsString.split(',')
            .map(label => label.trim())
            .filter(label => label && label !== '*')
            .map(label => ({ name: label, enabled: true }));
    }

    /**
     * Updates accessible labels based on chip toggle
     * @param {Array<{name: string, enabled: boolean}>} currentChips - Current label chips
     * @param {string} toggledLabel - Label that was toggled
     * @param {boolean} isEnabled - New enabled state
     * @returns {string} Updated comma-separated labels string
     */
    static updateAccessibleLabels(currentChips, toggledLabel, isEnabled) {
        const updatedChips = currentChips.map(chip => 
            chip.name === toggledLabel 
                ? { ...chip, enabled: isEnabled }
                : chip
        );
        
        // If label doesn't exist, add it
        if (!currentChips.find(chip => chip.name === toggledLabel)) {
            updatedChips.push({ name: toggledLabel, enabled: isEnabled });
        }
        
        const enabledLabels = updatedChips
            .filter(chip => chip.enabled)
            .map(chip => chip.name);
        
        // Return space if no labels (explicit "no labels")
        if (enabledLabels.length === 0) {
            return ' ';
        }
        
        return enabledLabels.join(',');
    }

    /**
     * Gets the capacity property key for a specific label
     * @param {string} queuePath - Queue path
     * @param {string} label - Node label
     * @returns {string} Full property key for label capacity
     */
    static getLabelCapacityKey(queuePath, label) {
        const baseKey = this.getAccessibleNodeLabelsKey(queuePath);
        return `${baseKey}.${label}.capacity`;
    }

    /**
     * Gets the maximum capacity property key for a specific label
     * @param {string} queuePath - Queue path
     * @param {string} label - Node label
     * @returns {string} Full property key for label maximum capacity
     */
    static getLabelMaxCapacityKey(queuePath, label) {
        const baseKey = this.getAccessibleNodeLabelsKey(queuePath);
        return `${baseKey}.${label}.maximum-capacity`;
    }

    /**
     * Checks if a queue is root (which has access to all labels)
     * @param {string} queuePath - Queue path
     * @returns {boolean} True if root queue
     */
    static isRootQueue(queuePath) {
        return queuePath === 'root';
    }
    /**
     * Gets the accessible node labels property key for a queue using metadata
     * @param {string} queuePath - Queue path
     * @returns {string} Full property key
     */
    static getAccessibleNodeLabelsKey(queuePath) {
        for (const [placeholderKey, meta] of Object.entries(NODE_LABEL_CONFIG_METADATA)) {
            if (meta.semanticRole === 'accessible-node-labels-key') {
                return placeholderKey.replace(Q_PATH_PLACEHOLDER, queuePath);
            }
        }
        throw new Error('accessible-node-labels-key not found in NODE_LABEL_CONFIG_METADATA');
    }

    /**
     * Gets the default value for accessible node labels from metadata
     * @returns {string} Default value
     */
    static getAccessibleNodeLabelsDefault() {
        for (const [placeholderKey, meta] of Object.entries(NODE_LABEL_CONFIG_METADATA)) {
            if (meta.semanticRole === 'accessible-node-labels-key') {
                return meta.defaultValue || '*';
            }
        }
        return '*';
    }
    /**
     * Populates node label data for modal display
     * @param {Object} dataForModal - Modal data object to populate
     * @param {string} queuePath - Queue path
     * @param {Map} baseProperties - Queue properties map
     */
    static populateNodeLabelData(dataForModal, queuePath, baseProperties) {
        const anlKey = NodeLabelService.getAccessibleNodeLabelsKey(queuePath);
        const anlDefault = NodeLabelService.getAccessibleNodeLabelsDefault();
        
        dataForModal.nodeLabelData.accessibleNodeLabelsString = String(baseProperties.get(anlKey) || anlDefault);

        for (const [key, value] of baseProperties.entries()) {
            const labelPrefix = `${anlKey}.`;
            if (key.startsWith(labelPrefix) && key !== anlKey) {
                const simpleSubKey = key.slice(labelPrefix.length);
                dataForModal.nodeLabelData.labelSpecificParams[simpleSubKey] = String(value);
            }
        }
    }

    /**
     * Gets accessible node labels string for a queue
     * @param {string} queuePath - Queue path
     * @param {Map} properties - Queue properties
     * @returns {string} Accessible node labels string
     */
    static getAccessibleNodeLabels(queuePath, properties) {
        const anlKey = NodeLabelService.getAccessibleNodeLabelsKey(queuePath);
        const anlDefault = NodeLabelService.getAccessibleNodeLabelsDefault();
        
        return String(properties.get(anlKey) || anlDefault);
    }

    /**
     * Applies partition-specific display capacity for formatted queue nodes
     * @param {Object} formattedNode - Formatted queue node object
     * @param {string} queuePath - Queue path
     * @param {Map} effectiveProperties - Effective properties map
     * @param {string} selectedPartition - Selected partition
     * @param {ViewDataFormatterService} viewDataFormatterService - Service for formatting display values
     */
    static applyPartitionSpecificDisplayCapacity(formattedNode, queuePath, effectiveProperties, selectedPartition, viewDataFormatterService) {
        if (selectedPartition && selectedPartition !== DEFAULT_PARTITION && selectedPartition !== '*') {
            const baseKey = NodeLabelService.getAccessibleNodeLabelsKey(queuePath);
            const labelCapacityKey = `${baseKey}.${selectedPartition}.capacity`;
            const labelMaxCapacityKey = `${baseKey}.${selectedPartition}.maximum-capacity`;

            if (effectiveProperties.has(labelCapacityKey)) {
                const labelCapacityValue = effectiveProperties.get(labelCapacityKey);
                formattedNode.capacityDisplayForLabel = viewDataFormatterService._formatCapacityForDisplay(
                    labelCapacityValue,
                    CAPACITY_MODES.PERCENTAGE,
                    '100%'
                );
                formattedNode.capacityDetailsForLabel = [];
            }
            if (effectiveProperties.has(labelMaxCapacityKey)) {
                const labelMaxCapacityValue = effectiveProperties.get(labelMaxCapacityKey);
                formattedNode.maxCapacityDisplayForLabel = viewDataFormatterService._formatCapacityForDisplay(
                    labelMaxCapacityValue,
                    CAPACITY_MODES.PERCENTAGE,
                    '100%'
                );
                formattedNode.maxCapacityDetailsForLabel = [];
            }
        }
    }


    /**
     * Populates node label info for info modal display
     * @param {Object} infoData - Info modal data object
     * @param {Object} targetNode - Target queue node
     */
    static populateNodeLabelInfo(infoData, targetNode) {
        infoData.nodeLabelInfo.push({
            label: 'Accessible Node Labels (Effective)',
            value: targetNode['accessible-node-labels'],
        });
        
        const baseKey = NodeLabelService.getAccessibleNodeLabelsKey(targetNode.path);
        const labelPrefix = `${baseKey}.`;
        for (const [key, value] of targetNode.effectiveProperties.entries()) {
            if (key.startsWith(labelPrefix) && key !== baseKey) {
                const subKey = key.slice(labelPrefix.length);
                infoData.nodeLabelInfo.push({ label: `Effective Label '${subKey}'`, value: String(value) });
            }
        }
    }
}