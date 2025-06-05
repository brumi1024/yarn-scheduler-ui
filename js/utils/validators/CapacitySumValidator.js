/**
 * Validates capacity sums at each queue level
 */
class CapacitySumValidator {
    validate(configModel, formattedHierarchy) {
        const errors = [];
        this._validateNode(formattedHierarchy, errors);
        return errors;
    }

    _validateNode(node, errors) {
        if (!node || !node.children) return;

        const children = Object.values(node.children).filter(child => !child.isDeleted);
        if (children.length === 0) return;

        const capacitySum = this._calculateCapacitySum(children);
        const hasPercentageCapacities = children.some(child => {
            const capacity = this._getCapacityValue(child);
            return capacity && !capacity.endsWith('w') && !capacity.startsWith('[');
        });

        // TODO: Capacity SUM should only be relevant in legacy queue mode, disable this in new queue mode
        if (hasPercentageCapacities && Math.abs(capacitySum - 100) > 0.01) {
            errors.push({
                type: 'CAPACITY_SUM_ERROR',
                message: `Queue "${node.path}" children capacity sum is ${capacitySum.toFixed(2)}%, must equal 100%`,
                queuePath: node.path,
                details: { actualSum: capacitySum, expectedSum: 100 }
            });
        }

        for (const child of children) {
            this._validateNode(child, errors);
        }
    }

    _calculateCapacitySum(children) {
        return children.reduce((sum, child) => {
            const capacity = this._getCapacityValue(child);
            if (!capacity || capacity.endsWith('w') || capacity.startsWith('[')) return sum;
            return sum + Number.parseFloat(capacity) || 0;
        }, 0);
    }

    _getCapacityValue(node) {
        if (!node.effectiveProperties) return null;
        const capacityKey = PropertyKeyMapper.createFullKey(node.path, 'capacity');
        return node.effectiveProperties.get ? 
            node.effectiveProperties.get(capacityKey) : 
            node.effectiveProperties[capacityKey];
    }
}