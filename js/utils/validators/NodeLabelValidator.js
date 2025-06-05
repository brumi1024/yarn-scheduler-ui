/**
 * Validates node label configuration and consistency
 */
class NodeLabelValidator {
    validate(configModel, formattedHierarchy, schedulerInfoModel) {
        const errors = [];
        const availableLabels = this._getAvailableLabels(schedulerInfoModel);
        this._validateNode(formattedHierarchy, errors, availableLabels);
        return errors;
    }

    _validateNode(node, errors, availableLabels) {
        if (!node || !node.effectiveProperties) return;

        const accessibleLabels = this._getAccessibleLabelsValue(node);
        if (accessibleLabels && accessibleLabels !== '*') {
            const labels = accessibleLabels.split(',').map(label => label.trim());
            for (const label of labels) {
                if (label && !availableLabels.has(label)) {
                    errors.push({
                        type: 'INVALID_NODE_LABEL',
                        message: `Queue "${node.path}" references non-existent node label: "${label}"`,
                        queuePath: node.path,
                        details: { invalidLabel: label, availableLabels: [...availableLabels] }
                    });
                }
            }
        }

        if (node.children) {
            for (const child of Object.values(node.children)) {
                if (!child.isDeleted) {
                    this._validateNode(child, errors, availableLabels);
                }
            }
        }
    }

    _getAccessibleLabelsValue(node) {
        if (!node.effectiveProperties) return null;
        const labelsKey = PropertyKeyMapper.createFullKey(node.path, 'accessible-node-labels');
        return node.effectiveProperties.get ? 
            node.effectiveProperties.get(labelsKey) : 
            node.effectiveProperties[labelsKey];
    }

    _getAvailableLabels(schedulerInfoModel) {
        const labels = new Set(['']); // Empty label is always available
        if (schedulerInfoModel) {
            const partitions = schedulerInfoModel.getPartitions();
            for (const partition of partitions) {
                labels.add(partition);
            }
        }
        return labels;
    }
}