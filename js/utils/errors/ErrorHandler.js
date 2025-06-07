/**
 * Centralized error handling and retry logic
 */
class ErrorHandler {
    constructor() {
        this.retryConfig = {
            maxRetries: 3,
            baseDelay: 1000,
            maxDelay: 10_000,
            backoffFactor: 2,
        };
    }

    /**
     * Handles errors with optional retry logic
     * @param {Function} operation - The operation to execute
     * @param {Object} options - Retry options
     * @returns {Promise} Result of the operation
     */
    async handleWithRetry(operation, options = {}) {
        const config = { ...this.retryConfig, ...options };
        let lastError;

        for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;

                // Don't retry if it's the last attempt or error is not retryable
                if (attempt === config.maxRetries || !this._isRetryable(error)) {
                    break;
                }

                const delay = this._calculateDelay(attempt, config);
                console.warn(
                    `Operation failed (attempt ${attempt + 1}/${config.maxRetries + 1}), retrying in ${delay}ms:`,
                    error.message
                );

                await this._delay(delay);
            }
        }

        throw this._enhanceError(lastError);
    }

    /**
     * Converts raw errors to appropriate YarnSchedulerError types
     */
    _enhanceError(error) {
        if (error instanceof YarnSchedulerError) {
            return error;
        }

        // Network errors
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            return new ApiError('Network error occurred', 'NETWORK_ERROR', {
                statusCode: 0,
                originalError: error.message,
            });
        }

        // Timeout errors
        if (error.name === 'AbortError' || error.message.includes('timeout')) {
            return new ApiError('Request timed out', 'TIMEOUT_ERROR', {
                statusCode: 408,
                originalError: error.message,
            });
        }

        // Parse errors
        if (error instanceof SyntaxError) {
            return new ValidationError('Failed to parse response data', 'PARSE_ERROR', {
                originalError: error.message,
            });
        }

        // Generic API errors
        if (error.status || error.statusCode) {
            return new ApiError(error.message || 'API request failed', 'API_ERROR', {
                statusCode: error.status || error.statusCode,
                originalError: error.message,
            });
        }

        // Fallback to generic error
        return new YarnSchedulerError(error.message || 'Unknown error occurred', 'UNKNOWN_ERROR', {
            originalError: error.message,
        });
    }

    /**
     * Checks if an error is retryable
     */
    _isRetryable(error) {
        if (error instanceof YarnSchedulerError) {
            return error.isRetryable();
        }

        // Network errors are usually retryable
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            return true;
        }

        // Timeout errors are retryable
        if (error.name === 'AbortError' || error.message.includes('timeout')) {
            return true;
        }

        return false;
    }

    /**
     * Calculates exponential backoff delay
     */
    _calculateDelay(attempt, config) {
        const delay = Math.min(config.baseDelay * Math.pow(config.backoffFactor, attempt), config.maxDelay);

        // Add jitter to avoid thundering herd
        return delay + Math.random() * 1000;
    }

    /**
     * Creates a delay promise
     */
    _delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * Logs errors appropriately based on type
     */
    logError(error, context = '') {
        const logMessage = context ? `${context}: ${error.message}` : error.message;

        if (error instanceof ValidationError) {
            console.warn('Validation Error:', logMessage, error.details);
        } else if (error instanceof ApiError) {
            if (error.statusCode >= 500) {
                console.error('API Error:', logMessage, error.toJSON());
            } else {
                console.warn('API Error:', logMessage, error.details);
            }
        } else if (error instanceof ValidationError) {
            console.error('Configuration Error:', logMessage, error.details);
        } else {
            console.error('Error:', logMessage, error);
        }
    }

    /**
     * Formats errors for user notification display
     */
    formatForNotification(error) {
        const baseNotification = {
            type: 'error',
            duration: CONFIG.TIMEOUTS.NOTIFICATION_DURATION.ERROR,
        };

        if (error instanceof ValidationError) {
            return {
                ...baseNotification,
                message: error.getUserMessage(),
                type: 'warning',
                duration: CONFIG.TIMEOUTS.NOTIFICATION_DURATION.WARNING,
            };
        }

        if (error instanceof ApiError) {
            return {
                ...baseNotification,
                message: error.getUserMessage(),
                duration: error.isRetryable()
                    ? CONFIG.TIMEOUTS.NOTIFICATION_DURATION.WARNING
                    : CONFIG.TIMEOUTS.NOTIFICATION_DURATION.ERROR + 2000,
            };
        }

        return {
            ...baseNotification,
            message: error.message || 'An unexpected error occurred',
        };
    }
}
