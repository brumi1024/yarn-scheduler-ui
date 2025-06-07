/**
 * Unified queue validator that performs all validation checks in a single pass
 * Replaces ValidationPipeline + individual validators for better performance
 */
class QueueValidator {
    validate(configModel, formattedHierarchy, schedulerInfoModel, appStateModel) {
        const errors = [];
        const queueNames = new Set();
        const nodeLabels = this._getAvailableNodeLabels(schedulerInfoModel);

        this._validateNode(formattedHierarchy, errors, queueNames, nodeLabels);

        return errors;
    }

    _validateNode(node, errors, queueNames, nodeLabels, parentPath = '') {
        if (!node) return;

        const fullPath = node.path || 'root';

        if (queueNames.has(fullPath)) {
            errors.push({
                type: 'DUPLICATE_QUEUE_NAME',
                message: `Duplicate queue path: "${fullPath}"`,
                queuePath: fullPath,
            });
        } else {
            queueNames.add(fullPath);
        }

        const queueName = fullPath.split('.').pop();
        if (!this._isValidQueueName(queueName)) {
            errors.push({
                type: 'INVALID_QUEUE_NAME',
                message: `Invalid queue name: "${queueName}". Names must contain only letters, numbers, hyphens, and underscores.`,
                queuePath: fullPath,
            });
        }

        if (node.effectiveProperties) {
            const state = this._getPropertyValue(node, 'state');
            if (state && !['RUNNING', 'STOPPED'].includes(state)) {
                errors.push({
                    type: 'INVALID_QUEUE_STATE',
                    message: `Invalid queue state: "${state}". Must be RUNNING or STOPPED.`,
                    queuePath: fullPath,
                });
            }
        }

        // TODO: Disabled for now - node label existence validation not needed

        if (node.children) {
            const children = Object.values(node.children).filter((child) => !child.isDeleted);

            if (children.length > 0) {
                const percentageChildren = children.filter((child) => {
                    const capacity = this._getCapacityValue(child);
                    return capacity && !capacity.endsWith('w') && !capacity.startsWith('[');
                });

                const weightChildren = children.filter((child) => {
                    const capacity = this._getCapacityValue(child);
                    return capacity && capacity.endsWith('w');
                });

                const absoluteChildren = children.filter((child) => {
                    const capacity = this._getCapacityValue(child);
                    return capacity && capacity.startsWith('[');
                });

                if (percentageChildren.length > 0 && weightChildren.length === 0 && absoluteChildren.length === 0) {
                    const capacitySum = this._calculateCapacitySum(percentageChildren);
                    if (Math.abs(capacitySum - 100) > 0.01) {
                        errors.push({
                            type: 'CAPACITY_SUM_ERROR',
                            message: `Queue "${fullPath}" children capacity sum is ${capacitySum.toFixed(2)}%, must equal 100%`,
                            queuePath: fullPath,
                            details: { actualSum: capacitySum, expectedSum: 100 },
                        });
                    }
                }

                for (const child of children) {
                    this._validateNode(child, errors, queueNames, nodeLabels, fullPath);
                }
            }
        }
    }

    _getAvailableNodeLabels(schedulerInfoModel) {
        if (!schedulerInfoModel) return new Set();

        try {
            const nodeLabels = schedulerInfoModel.getNodeLabels();
            return new Set(nodeLabels.map((label) => label.name));
        } catch (error) {
            return new Set();
        }
    }

    _isValidQueueName(name) {
        if (!name || typeof name !== 'string') return false;
        return /^[a-zA-Z0-9_-]+$/.test(name);
    }

    _getPropertyValue(node, propertyKey) {
        if (!node.effectiveProperties) return null;

        const fullKey = PropertyKeyMapper.createFullKey(node.path, propertyKey);
        return node.effectiveProperties.get ? node.effectiveProperties.get(fullKey) : node.effectiveProperties[fullKey];
    }

    _getCapacityValue(node) {
        return this._getPropertyValue(node, 'capacity');
    }

    _calculateCapacitySum(children) {
        return children.reduce((sum, child) => {
            const capacity = this._getCapacityValue(child);
            if (!capacity || capacity.endsWith('w') || capacity.startsWith('[')) return sum;
            return sum + (Number.parseFloat(capacity) || 0);
        }, 0);
    }

    _validateAccessibleLabels(accessibleLabels, availableLabels, queuePath, errors) {
        if (accessibleLabels === '*') return;

        const labels = accessibleLabels.split(',').map((label) => label.trim());
        for (const label of labels) {
            if (label && !availableLabels.has(label)) {
                errors.push({
                    type: 'INVALID_NODE_LABEL',
                    message: `Queue "${queuePath}" references non-existent node label: "${label}"`,
                    queuePath: queuePath,
                    details: {
                        invalidLabel: label,
                        availableLabels: Array.from(availableLabels),
                    },
                });
            }
        }
    }
}
