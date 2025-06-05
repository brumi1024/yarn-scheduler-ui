/**
 * Error thrown when configuration validation fails
 */
class ValidationError extends YarnSchedulerError {
    constructor(message, code = 'VALIDATION_ERROR', details = {}) {
        super(message, code, details);
        this.severity = details.severity || 'error';
        this.fieldPath = details.fieldPath || null;
        this.validationRule = details.validationRule || null;
    }

    getUserMessage() {
        if (this.details.userFriendlyMessage) {
            return this.details.userFriendlyMessage;
        }

        switch (this.code) {
            case 'CAPACITY_SUM_ERROR':
                return `Queue capacity configuration is invalid: ${this.message}`;
            case 'INVALID_QUEUE_NAME':
                return `Queue name is invalid: ${this.message}`;
            case 'INVALID_NODE_LABEL':
                return `Node label configuration is invalid: ${this.message}`;
            case 'INVALID_QUEUE_STATE':
                return `Queue state is invalid: ${this.message}`;
            case 'DELETE_QUEUE_WITH_RUNNING_APPS':
                return `Cannot delete queue: ${this.message}`;
            default:
                return `Configuration validation failed: ${this.message}`;
        }
    }

    /**
     * Gets the validation errors in a format suitable for UI display
     */
    getUIErrors() {
        if (this.details.validationErrors && Array.isArray(this.details.validationErrors)) {
            return this.details.validationErrors.map(error => ({
                message: error.message,
                queuePath: error.queuePath,
                type: error.type,
                severity: this.severity
            }));
        }

        return [{
            message: this.getUserMessage(),
            queuePath: this.fieldPath,
            type: this.code,
            severity: this.severity
        }];
    }
}