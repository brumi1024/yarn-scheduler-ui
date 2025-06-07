/**
 * Base error class for YARN Scheduler UI errors
 */
class YarnSchedulerError extends Error {
    constructor(message, code, details = {}) {
        super(message);
        this.name = this.constructor.name;
        this.code = code;
        this.details = details;
        this.timestamp = new Date().toISOString();

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }

    /**
     * Returns a structured error object for API responses
     */
    toJSON() {
        return {
            name: this.name,
            message: this.message,
            code: this.code,
            details: this.details,
            timestamp: this.timestamp,
            stack: this.stack,
        };
    }

    /**
     * Returns a user-friendly error message
     */
    getUserMessage() {
        return this.message;
    }

    /**
     * Checks if this error is retryable
     */
    isRetryable() {
        return false;
    }
}
