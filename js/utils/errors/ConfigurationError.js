/**
 * Error thrown when configuration data is malformed or inconsistent
 */
class ConfigurationError extends YarnSchedulerError {
    constructor(message, code = 'CONFIGURATION_ERROR', details = {}) {
        super(message, code, details);
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
            case 'INVALID_CONFIG_FORMAT':
                return 'Configuration file format is invalid. Please check the XML structure.';
            case 'MISSING_REQUIRED_CONFIG':
                return `Required configuration is missing: ${this.configKey || 'unknown'}`;
            case 'INVALID_CONFIG_VALUE':
                return `Invalid configuration value for ${this.configKey || 'property'}: ${this.message}`;
            case 'CONFLICTING_CONFIG':
                return `Configuration conflict detected: ${this.message}`;
            case 'UNSUPPORTED_CONFIG':
                return `Unsupported configuration option: ${this.configKey || 'unknown'}`;
            default:
                return `Configuration error: ${this.message}`;
        }
    }

    /**
     * Creates a ConfigurationError for invalid property values
     */
    static invalidValue(configKey, actualValue, expectedFormat, configPath = null) {
        return new ConfigurationError(
            `Expected ${expectedFormat} but got "${actualValue}"`,
            'INVALID_CONFIG_VALUE',
            {
                configKey,
                actualValue,
                expectedFormat,
                configPath,
                userFriendlyMessage: `The value "${actualValue}" is not valid for ${configKey}. Expected format: ${expectedFormat}`
            }
        );
    }

    /**
     * Creates a ConfigurationError for missing required properties
     */
    static missingRequired(configKey, configPath = null) {
        return new ConfigurationError(
            `Required configuration property is missing: ${configKey}`,
            'MISSING_REQUIRED_CONFIG',
            {
                configKey,
                configPath,
                userFriendlyMessage: `Required setting "${configKey}" is missing from the configuration`
            }
        );
    }

    /**
     * Creates a ConfigurationError for conflicting properties
     */
    static conflict(message, configKeys = [], configPath = null) {
        return new ConfigurationError(
            message,
            'CONFLICTING_CONFIG',
            {
                configKeys,
                configPath,
                userFriendlyMessage: `Configuration conflict: ${message}`
            }
        );
    }
}