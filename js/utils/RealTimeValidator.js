/**
 * Real-time validation utility for form inputs.
 * Provides immediate feedback as users type or change values.
 */
class RealTimeValidator {
    constructor(form, options = {}) {
        this.form = form;
        this.options = {
            debounceDelay: 300,
            validateOnBlur: true,
            validateOnInput: true,
            showSuccessState: true,
            ...options,
        };

        this.validators = new Map();
        this.debounceTimers = new Map();
        this.validationStates = new Map();

        this._bindEvents();
    }

    /**
     * Registers a validator for a specific field.
     * @param {string} fieldId - Form field ID
     * @param {Function|Object} validator - Validation function or config
     */
    addValidator(fieldId, validator) {
        if (typeof validator === 'function') {
            this.validators.set(fieldId, { validate: validator });
        } else {
            this.validators.set(fieldId, validator);
        }
    }

    /**
     * Registers multiple validators at once.
     * @param {Object} validators - Map of field IDs to validators
     */
    addValidators(validators) {
        for (const [fieldId, validator] of Object.entries(validators)) {
            this.addValidator(fieldId, validator);
        }
    }

    /**
     * Validates a specific field immediately.
     * @param {string} fieldId - Field ID to validate
     * @returns {Object} Validation result
     */
    validateField(fieldId) {
        const field = this.form.querySelector(`#${fieldId}`);
        const validator = this.validators.get(fieldId);

        if (!field || !validator) {
            return { isValid: true, message: '' };
        }

        const value = this._getFieldValue(field);
        const result = validator.validate(value, field);

        this._updateFieldState(fieldId, result);
        this.validationStates.set(fieldId, result);

        return result;
    }

    /**
     * Validates all registered fields.
     * @returns {Object} Overall validation result
     */
    validateAll() {
        const results = {};
        let isValid = true;

        for (const fieldId of this.validators.keys()) {
            const result = this.validateField(fieldId);
            results[fieldId] = result;
            if (!result.isValid) {
                isValid = false;
            }
        }

        return { isValid, results };
    }

    /**
     * Clears validation state for all fields.
     */
    clearValidation() {
        for (const fieldId of this.validators.keys()) {
            this._clearFieldState(fieldId);
            this.validationStates.delete(fieldId);
        }
    }

    /**
     * Gets the current validation state for a field.
     * @param {string} fieldId - Field ID
     * @returns {Object|null} Validation state
     */
    getFieldState(fieldId) {
        return this.validationStates.get(fieldId) || null;
    }

    /**
     * Destroys the validator and cleans up event listeners.
     */
    destroy() {
        // Clear debounce timers
        for (const timer of this.debounceTimers.values()) {
            clearTimeout(timer);
        }

        this.validators.clear();
        this.debounceTimers.clear();
        this.validationStates.clear();
    }

    _bindEvents() {
        if (this.options.validateOnInput) {
            this.form.addEventListener('input', (event) => {
                this._handleInputChange(event);
            });
        }

        if (this.options.validateOnBlur) {
            this.form.addEventListener(
                'blur',
                (event) => {
                    this._handleFieldBlur(event);
                },
                true
            );
        }
    }

    _handleInputChange(event) {
        const fieldId = event.target.id;
        if (!fieldId || !this.validators.has(fieldId)) return;

        // Clear existing timer
        if (this.debounceTimers.has(fieldId)) {
            clearTimeout(this.debounceTimers.get(fieldId));
        }

        // Set new debounced validation
        const timer = setTimeout(() => {
            this.validateField(fieldId);
            this.debounceTimers.delete(fieldId);
        }, this.options.debounceDelay);

        this.debounceTimers.set(fieldId, timer);
    }

    _handleFieldBlur(event) {
        const fieldId = event.target.id;
        if (!fieldId || !this.validators.has(fieldId)) return;

        // Clear debounce timer and validate immediately
        if (this.debounceTimers.has(fieldId)) {
            clearTimeout(this.debounceTimers.get(fieldId));
            this.debounceTimers.delete(fieldId);
        }

        this.validateField(fieldId);
    }

    _getFieldValue(field) {
        if (field.type === 'checkbox') {
            return field.checked;
        } else if (field.type === 'radio') {
            const radioGroup = this.form.querySelectorAll(`input[name="${field.name}"]`);
            for (const radio of radioGroup) {
                if (radio.checked) return radio.value;
            }
            return '';
        } else {
            return field.value;
        }
    }

    _updateFieldState(fieldId, result) {
        const field = this.form.querySelector(`#${fieldId}`);
        const messageElement = this.form.querySelector(`#${fieldId}-validation`);

        if (!field) return;

        // Update field classes
        field.classList.remove('valid', 'invalid');
        if (result.isValid) {
            if (this.options.showSuccessState) {
                field.classList.add('valid');
            }
        } else {
            field.classList.add('invalid');
        }

        // Update message
        if (messageElement) {
            messageElement.textContent = result.message || '';
            messageElement.className = `validation-message ${result.isValid ? 'success' : 'error'}`;
        }
    }

    _clearFieldState(fieldId) {
        const field = this.form.querySelector(`#${fieldId}`);
        const messageElement = this.form.querySelector(`#${fieldId}-validation`);

        if (field) {
            field.classList.remove('valid', 'invalid');
        }

        if (messageElement) {
            messageElement.textContent = '';
            messageElement.className = 'validation-message';
        }
    }

    /**
     * Creates common validators for YARN queue properties.
     * @returns {Object} Map of common validators
     */
    static createQueueValidators() {
        return {
            queueName: {
                validate: (value) => {
                    if (!value || value.trim() === '') {
                        return { isValid: false, message: 'Queue name is required' };
                    }

                    const nameValidation = ValidationService.isValidQueueNameChars(value);
                    return {
                        isValid: nameValidation.isValid,
                        message: nameValidation.message || '',
                    };
                },
            },

            capacity: {
                validate: (value, field) => {
                    if (!value || value.trim() === '') {
                        return { isValid: false, message: 'Capacity is required' };
                    }

                    // Get capacity mode from form
                    const form = field.closest('form');
                    const capacityModeField = form.querySelector(
                        '[name="capacityMode"], #new-capacity-mode, #edit-capacity-mode'
                    );
                    const mode = capacityModeField ? capacityModeField.value : CAPACITY_MODES.PERCENTAGE;

                    const result = ValidationService.parseAndValidateCapacityValue(value, mode);
                    return {
                        isValid: !result.error && !result.errors,
                        message: result.error || (result.errors && result.errors.join(' ')) || '',
                    };
                },
            },

            maxCapacity: {
                validate: (value) => {
                    if (!value || value.trim() === '') {
                        return { isValid: false, message: 'Maximum capacity is required' };
                    }

                    // Auto-detect capacity mode for maximum capacity
                    let mode = CAPACITY_MODES.PERCENTAGE;
                    if (value.endsWith('w')) {
                        mode = CAPACITY_MODES.WEIGHT;
                    } else if (value.startsWith('[') && value.endsWith(']')) {
                        mode = CAPACITY_MODES.ABSOLUTE;
                    }

                    const result = ValidationService.parseAndValidateCapacityValue(value, mode, true);
                    return {
                        isValid: !result.error && !result.errors,
                        message: result.error || (result.errors && result.errors.join(' ')) || '',
                    };
                },
            },
        };
    }

    /**
     * Creates a validator that checks if a queue name already exists.
     * @param {Function} queueExistsCheck - Function that returns true if queue exists
     * @returns {Object} Validator configuration
     */
    static createUniqueQueueNameValidator(queueExistsCheck) {
        return {
            validate: (value, field) => {
                if (!value || value.trim() === '') {
                    return { isValid: false, message: 'Queue name is required' };
                }

                const nameValidation = ValidationService.isValidQueueNameChars(value);
                if (!nameValidation.isValid) {
                    return {
                        isValid: false,
                        message: nameValidation.message,
                    };
                }

                // Get parent path for full queue path check
                const form = field.closest('form');
                const parentField = form.querySelector('[name="parentQueue"], #new-parent-queue-select');
                const parentPath = parentField ? parentField.value : 'root';
                const fullPath = parentPath === 'root' ? `root.${value}` : `${parentPath}.${value}`;

                if (queueExistsCheck(fullPath)) {
                    return { isValid: false, message: 'Queue name already exists' };
                }

                return { isValid: true, message: '' };
            },
        };
    }
}
