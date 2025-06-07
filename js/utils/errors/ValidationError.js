/**
 * Error thrown when configuration validation or data format issues occur
 * Consolidates both validation errors and configuration errors
 */
class ValidationError extends YarnSchedulerError {
    constructor(message, code = 'VALIDATION_ERROR', details = {}) {
        super(message, code, details);
        this.severity = details.severity || 'error';
        this.fieldPath = details.fieldPath || null;
        this.validationRule = details.validationRule || null;

        // Support configuration error properties
        this.configPath = details.configPath || null;
        this.configKey = details.configKey || null;
        this.expectedFormat = details.expectedFormat || null;
        this.actualValue = details.actualValue || null;
    }

    getUserMessage() {
        if (this.details.userFriendlyMessage) {
            return this.details.userFriendlyMessage;
        }

        switch (this.code) {
            // Queue validation errors
            case 'CAPACITY_SUM_ERROR': {
                return `Queue capacity configuration is invalid: ${this.message}`;
            }
            case 'INVALID_QUEUE_NAME': {
                return `Queue name is invalid: ${this.message}`;
            }
            case 'INVALID_NODE_LABEL': {
                return `Node label configuration is invalid: ${this.message}`;
            }
            case 'INVALID_QUEUE_STATE': {
                return `Queue state is invalid: ${this.message}`;
            }
            case 'DELETE_QUEUE_WITH_RUNNING_APPS': {
                return `Cannot delete queue: ${this.message}`;
            }

            // Configuration format errors (merged from ConfigurationError)
            case 'INVALID_CONFIG_FORMAT': {
                return 'Configuration file format is invalid. Please check the XML structure.';
            }
            case 'MISSING_REQUIRED_CONFIG': {
                return `Required configuration is missing: ${this.configKey || 'unknown'}`;
            }
            case 'INVALID_CONFIG_VALUE': {
                return `Invalid configuration value for ${this.configKey || 'property'}: ${this.message}`;
            }
            case 'CONFLICTING_CONFIG': {
                return `Configuration conflict detected: ${this.message}`;
            }
            case 'UNSUPPORTED_CONFIG': {
                return `Unsupported configuration option: ${this.configKey || 'unknown'}`;
            }

            default: {
                return `Configuration validation failed: ${this.message}`;
            }
        }
    }

    /**
     * Gets the validation errors in a format suitable for UI display
     */
    getUIErrors() {
        if (this.details.validationErrors && Array.isArray(this.details.validationErrors)) {
            return this.details.validationErrors.map((error) => ({
                message: error.message,
                queuePath: error.queuePath,
                type: error.type,
                severity: this.severity,
            }));
        }

        return [
            {
                message: this.getUserMessage(),
                queuePath: this.fieldPath,
                type: this.code,
                severity: this.severity,
            },
        ];
    }
}
