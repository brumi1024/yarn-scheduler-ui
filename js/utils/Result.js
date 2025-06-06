/**
 * Result pattern for standardized error handling.
 * Provides a functional approach to handling success/failure states.
 */
class Result {
    constructor(isSuccess, value, error) {
        this._isSuccess = isSuccess;
        this._value = value;
        this._error = error;
    }

    /**
     * Create a successful result
     * @param {*} value - Success value
     * @returns {Result} Success result
     */
    static success(value) {
        return new Result(true, value, null);
    }

    /**
     * Create a failure result
     * @param {*} error - Error value
     * @returns {Result} Failure result
     */
    static failure(error) {
        return new Result(false, null, error);
    }

    /**
     * Create result from a try/catch operation
     * @param {Function} operation - Function to execute
     * @returns {Result} Result of operation
     */
    static try(operation) {
        try {
            const value = operation();
            return Result.success(value);
        } catch (error) {
            return Result.failure(error);
        }
    }

    /**
     * Create result from a Promise
     * @param {Promise} promise - Promise to wrap
     * @returns {Promise<Result>} Promise that resolves to Result
     */
    static async fromPromise(promise) {
        try {
            const value = await promise;
            return Result.success(value);
        } catch (error) {
            return Result.failure(error);
        }
    }

    /**
     * Check if result is successful
     * @returns {boolean} True if success
     */
    isSuccess() {
        return this._isSuccess;
    }

    /**
     * Check if result is failure
     * @returns {boolean} True if failure
     */
    isFailure() {
        return !this._isSuccess;
    }

    /**
     * Get success value or throw if failure
     * @returns {*} Success value
     * @throws {Error} If result is failure
     */
    getValue() {
        if (this._isSuccess) {
            return this._value;
        }
        throw new Error(`Attempted to get value from failure result: ${this._error}`);
    }

    /**
     * Get error or throw if success
     * @returns {*} Error value
     * @throws {Error} If result is success
     */
    getError() {
        if (!this._isSuccess) {
            return this._error;
        }
        throw new Error('Attempted to get error from success result');
    }

    /**
     * Get value or return default if failure
     * @param {*} defaultValue - Default value for failure
     * @returns {*} Value or default
     */
    getValueOr(defaultValue) {
        return this._isSuccess ? this._value : defaultValue;
    }

    /**
     * Transform success value
     * @param {Function} mapper - Transform function
     * @returns {Result} New result with transformed value
     */
    map(mapper) {
        if (this._isSuccess) {
            try {
                const newValue = mapper(this._value);
                return Result.success(newValue);
            } catch (error) {
                return Result.failure(error);
            }
        }
        return this;
    }

    /**
     * Transform error value
     * @param {Function} mapper - Transform function
     * @returns {Result} New result with transformed error
     */
    mapError(mapper) {
        if (!this._isSuccess) {
            try {
                const newError = mapper(this._error);
                return Result.failure(newError);
            } catch (error) {
                return Result.failure(error);
            }
        }
        return this;
    }

    /**
     * Chain operations that return Results
     * @param {Function} operation - Function that returns Result
     * @returns {Result} Result of chained operation
     */
    flatMap(operation) {
        if (this._isSuccess) {
            try {
                return operation(this._value);
            } catch (error) {
                return Result.failure(error);
            }
        }
        return this;
    }

    /**
     * Execute function if result is success
     * @param {Function} onSuccess - Function to execute on success
     * @returns {Result} This result (for chaining)
     */
    onSuccess(onSuccess) {
        if (this._isSuccess) {
            onSuccess(this._value);
        }
        return this;
    }

    /**
     * Execute function if result is failure
     * @param {Function} onFailure - Function to execute on failure
     * @returns {Result} This result (for chaining)
     */
    onFailure(onFailure) {
        if (!this._isSuccess) {
            onFailure(this._error);
        }
        return this;
    }

    /**
     * Convert to JSON representation
     * @returns {Object} JSON representation
     */
    toJSON() {
        return {
            isSuccess: this._isSuccess,
            value: this._isSuccess ? this._value : undefined,
            error: this._isSuccess ? undefined : this._error
        };
    }

    /**
     * String representation
     * @returns {string} String representation
     */
    toString() {
        if (this._isSuccess) {
            return `Success(${JSON.stringify(this._value)})`;
        }
        return `Failure(${JSON.stringify(this._error)})`;
    }
}

/**
 * Validation result with multiple errors
 */
class ValidationResult {
    constructor(errors = []) {
        this.errors = Array.isArray(errors) ? errors : [errors];
    }

    /**
     * Create successful validation
     * @returns {ValidationResult} Success validation
     */
    static success() {
        return new ValidationResult([]);
    }

    /**
     * Create failed validation
     * @param {string|Array} errors - Error messages
     * @returns {ValidationResult} Failed validation
     */
    static failure(errors) {
        return new ValidationResult(errors);
    }

    /**
     * Check if validation passed
     * @returns {boolean} True if valid
     */
    isValid() {
        return this.errors.length === 0;
    }

    /**
     * Check if validation failed
     * @returns {boolean} True if invalid
     */
    isInvalid() {
        return this.errors.length > 0;
    }

    /**
     * Add error to validation
     * @param {string} error - Error message
     * @returns {ValidationResult} This result (for chaining)
     */
    addError(error) {
        this.errors.push(error);
        return this;
    }

    /**
     * Combine with another validation result
     * @param {ValidationResult} other - Other validation result
     * @returns {ValidationResult} Combined result
     */
    combine(other) {
        return new ValidationResult([...this.errors, ...other.errors]);
    }

    /**
     * Convert to Result
     * @returns {Result} Result representation
     */
    toResult() {
        if (this.isValid()) {
            return Result.success(null);
        }
        return Result.failure(this.errors);
    }
}

// Export for use in other modules
window.Result = Result;
window.ValidationResult = ValidationResult;