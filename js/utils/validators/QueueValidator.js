/**
 * Unified queue validator that performs all validation checks in a single pass
 * Replaces ValidationPipeline + individual validators for better performance
 */
class QueueValidator {
    validate(configModel, formattedHierarchy, schedulerInfoModel, appStateModel) {
        const errors = [];
        const queueNames = new Set();

        // Get legacy mode status for mode-specific validation
        const globalConfig = configModel.getGlobalConfig();
        const isLegacyMode = appStateModel.isLegacyModeEnabled(globalConfig);

        // In legacy mode, check for absolute mode mixing across entire hierarchy
        if (isLegacyMode) {
            this._validateHierarchyCapacityModes(formattedHierarchy, errors);
        }

        this._validateNode(formattedHierarchy, errors, queueNames, '', isLegacyMode);

        return errors;
    }

    /**
     * Validates that absolute capacity mode is not mixed with percentage/weight modes
     * anywhere in the entire hierarchy (legacy mode only)
     */
    _validateHierarchyCapacityModes(rootNode, errors) {
        const allQueues = [];
        this._collectAllQueues(rootNode, allQueues);

        const queuesByMode = {
            percentage: [],
            weight: [],
            absolute: [],
        };

        // Categorize all queues by their capacity mode
        for (const queue of allQueues) {
            const mode = this._getEffectiveCapacityMode(queue);
            switch (mode) {
            case CAPACITY_MODES.PERCENTAGE: {
                queuesByMode.percentage.push(queue.path);
            
            break;
            }
            case CAPACITY_MODES.WEIGHT: {
                queuesByMode.weight.push(queue.path);
            
            break;
            }
            case CAPACITY_MODES.ABSOLUTE: {
                queuesByMode.absolute.push(queue.path);
            
            break;
            }
            // No default
            }
        }

        const hasAbsolute = queuesByMode.absolute.length > 0;
        const hasPercentage = queuesByMode.percentage.length > 0;
        const hasWeight = queuesByMode.weight.length > 0;

        // Check for absolute mode mixing with other modes anywhere in hierarchy
        if (hasAbsolute && (hasPercentage || hasWeight)) {
            // Concise message for batch controls
            const message = `Mixed capacity modes in hierarchy (absolute + ${hasPercentage ? 'percentage' : 'weight'})`;

            // Detailed message for preview changes window
            let detailedMessage = `❌ Absolute mode cannot be mixed with other modes anywhere in the hierarchy:\n\n`;

            if (queuesByMode.percentage.length > 0) {
                detailedMessage += `📊 Percentage mode (${queuesByMode.percentage.length}): ${queuesByMode.percentage.map((q) => `"${q}"`).join(', ')}\n`;
            }
            if (queuesByMode.weight.length > 0) {
                detailedMessage += `⚖️ Weight mode (${queuesByMode.weight.length}): ${queuesByMode.weight.map((q) => `"${q}"`).join(', ')}\n`;
            }
            if (queuesByMode.absolute.length > 0) {
                detailedMessage += `📦 Absolute mode (${queuesByMode.absolute.length}): ${queuesByMode.absolute.map((q) => `"${q}"`).join(', ')}\n`;
            }

            detailedMessage += `\n💡 To fix: In legacy mode, the entire hierarchy must use the same capacity type. `;
            detailedMessage += `Change all queues to use absolute mode, or change absolute queues to percentage/weight mode.`;

            errors.push({
                type: 'ABSOLUTE_MODE_MIXING_LEGACY',
                message: message,
                detailedMessage: detailedMessage,
                queuePath: 'root', // Hierarchy-wide error
                details: {
                    modes:
                        hasPercentage && hasWeight
                            ? ['absolute', 'percentage', 'weight']
                            : hasPercentage
                              ? ['absolute', 'percentage']
                              : ['absolute', 'weight'],
                    queuesByMode: queuesByMode,
                },
            });
        }
    }

    /**
     * Recursively collects all queues from the hierarchy into a flat array
     */
    _collectAllQueues(node, allQueues) {
        if (!node) return;

        // Add current node to collection (skip root if it doesn't have capacity)
        if (node.path && node.path !== 'root') {
            allQueues.push(node);
        }

        // Recursively collect children
        if (node.children) {
            for (const child of Object.values(node.children)) {
                if (!child.isDeleted) {
                    this._collectAllQueues(child, allQueues);
                }
            }
        }
    }

    _validateNode(node, errors, queueNames, _parentPath, isLegacyMode = true) {
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

        if (node.children) {
            const children = Object.values(node.children).filter((child) => !child.isDeleted);

            if (children.length > 0) {
                // Group children by their effective capacity mode (considering pending changes)
                const percentageChildren = children.filter((child) => {
                    return this._getEffectiveCapacityMode(child) === CAPACITY_MODES.PERCENTAGE;
                });

                const weightChildren = children.filter((child) => {
                    return this._getEffectiveCapacityMode(child) === CAPACITY_MODES.WEIGHT;
                });

                // absoluteChildren only needed for percentage sum validation
                const absoluteChildren = children.filter((child) => {
                    return this._getEffectiveCapacityMode(child) === CAPACITY_MODES.ABSOLUTE;
                });

                // Mode-specific validation logic
                if (isLegacyMode) {
                    // Legacy mode rules:
                    // 1. Sibling queues under a parent must all use the same mode (percentage OR weight, not mixed)
                    // Note: Absolute mode mixing is checked at hierarchy level, not sibling level

                    const hasPercentage = percentageChildren.length > 0;
                    const hasWeight = weightChildren.length > 0;

                    // Check for percentage/weight mixing among siblings (not allowed in legacy mode)
                    if (hasPercentage && hasWeight) {
                        const queuesByMode = {
                            percentage: percentageChildren.map((child) => child.path),
                            weight: weightChildren.map((child) => child.path),
                        };

                        // Concise message for batch controls
                        const message = `Mixed capacity modes under "${fullPath}" (percentage + weight)`;

                        // Detailed message for preview changes window
                        let detailedMessage = `❌ Mixed percentage and weight modes detected under "${fullPath}":\n\n`;

                        detailedMessage += `📊 Percentage mode (${queuesByMode.percentage.length}): ${queuesByMode.percentage.map((q) => `"${q}"`).join(', ')}\n`;
                        detailedMessage += `⚖️ Weight mode (${queuesByMode.weight.length}): ${queuesByMode.weight.map((q) => `"${q}"`).join(', ')}\n`;

                        detailedMessage += `\n💡 To fix: In legacy mode, sibling queues must all use the same capacity mode. `;
                        detailedMessage += `Change all queues to use either percentage or weight mode.`;

                        errors.push({
                            type: 'MIXED_PERCENTAGE_WEIGHT_LEGACY',
                            message: message,
                            detailedMessage: detailedMessage,
                            queuePath: fullPath,
                            details: {
                                modes: ['percentage', 'weight'],
                                queuesByMode: queuesByMode,
                                percentageCount: percentageChildren.length,
                                weightCount: weightChildren.length,
                            },
                        });
                    }
                }
                // Both legacy and non-legacy: validate percentage sum if ALL children use percentages
                if (percentageChildren.length > 0 && weightChildren.length === 0 && absoluteChildren.length === 0) {
                    this._validatePercentageCapacitySum(percentageChildren, fullPath, errors);
                }

                for (const child of children) {
                    this._validateNode(child, errors, queueNames, fullPath, isLegacyMode);
                }
            }
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

    /**
     * Gets the effective capacity mode for a queue, considering both the capacity value format
     * and any pending UI capacity mode changes
     */
    _getEffectiveCapacityMode(node) {
        // First check if there's a pending UI capacity mode change
        const uiCapacityMode = this._getPropertyValue(node, '_ui_capacityMode');
        if (uiCapacityMode) {
            return uiCapacityMode;
        }

        // Fall back to inferring from capacity value format
        const capacity = this._getCapacityValue(node);
        if (!capacity) return CAPACITY_MODES.PERCENTAGE; // Default

        if (capacity.endsWith('w')) {
            return CAPACITY_MODES.WEIGHT;
        } else if (capacity.startsWith('[')) {
            return CAPACITY_MODES.ABSOLUTE;
        } else {
            return CAPACITY_MODES.PERCENTAGE;
        }
    }

    _calculateCapacitySum(children) {
        let sum = 0;
        for (const child of children) {
            const capacity = this._getCapacityValue(child);
            if (!capacity || capacity.endsWith('w') || capacity.startsWith('[')) continue;
            sum += Number.parseFloat(capacity) || 0;
        }
        return sum;
    }

    _validatePercentageCapacitySum(percentageChildren, fullPath, errors) {
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
}
