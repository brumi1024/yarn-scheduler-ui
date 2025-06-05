/**
 * Validates queue states and state transitions
 */
class QueueStateValidator {
    validate(configModel, formattedHierarchy) {
        const errors = [];
        this._validateNode(formattedHierarchy, errors);
        return errors;
    }

    _validateNode(node, errors) {
        if (!node) return;

        if (node.isDeleted && this._hasRunningApplications(node)) {
            errors.push({
                type: 'DELETE_QUEUE_WITH_RUNNING_APPS',
                message: `Cannot delete queue "${node.path}": has running applications`,
                queuePath: node.path
            });
        }

        const state = this._getStateValue(node);
        if (state && !['RUNNING', 'STOPPED'].includes(state)) {
            errors.push({
                type: 'INVALID_QUEUE_STATE',
                message: `Queue "${node.path}" has invalid state: "${state}". Must be RUNNING or STOPPED`,
                queuePath: node.path
            });
        }

        if (node.children) {
            for (const child of Object.values(node.children)) {
                this._validateNode(child, errors);
            }
        }
    }

    _getStateValue(node) {
        if (!node.effectiveProperties) return null;
        const stateKey = PropertyKeyMapper.createFullKey(node.path, 'state');
        return node.effectiveProperties.get ? 
            node.effectiveProperties.get(stateKey) : 
            node.effectiveProperties[stateKey];
    }

    _hasRunningApplications(node) {
        return node.liveData?.numApplications > 0 || node.liveData?.numRunningApplications > 0;
    }
}