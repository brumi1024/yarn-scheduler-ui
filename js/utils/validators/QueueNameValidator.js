/**
 * Validates queue names and hierarchy constraints
 */
class QueueNameValidator {
    validate(configModel, formattedHierarchy) {
        const errors = [];
        const queueNames = new Set();
        this._validateNode(formattedHierarchy, errors, queueNames, '');
        return errors;
    }

    _validateNode(node, errors, queueNames, parentPath) {
        if (!node) return;

        const fullPath = node.path || 'root';
        
        if (queueNames.has(fullPath)) {
            errors.push({
                type: 'DUPLICATE_QUEUE_NAME',
                message: `Duplicate queue path: "${fullPath}"`,
                queuePath: fullPath
            });
        } else {
            queueNames.add(fullPath);
        }

        if (node.children) {
            for (const [childName, child] of Object.entries(node.children)) {
                if (child.isDeleted) continue;
                
                if (!ValidationService.isValidQueueNameChars(childName).isValid) {
                    errors.push({
                        type: 'INVALID_QUEUE_NAME',
                        message: `Invalid queue name "${childName}": ${ValidationService.isValidQueueNameChars(childName).message}`,
                        queuePath: child.path
                    });
                }

                this._validateNode(child, errors, queueNames, fullPath);
            }
        }
    }
}