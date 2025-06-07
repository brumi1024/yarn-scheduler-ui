class AddQueueModalView extends BaseModalView {
    constructor(controller) {
        super('add-queue-modal', controller); // modalId, controller
        this.viewDataFormatterService = controller.viewDataFormatterService; // For default capacity values
        this.realTimeValidator = null;
    }

    /**
     * Renders the content of the Add Queue modal.
     * @param {Object} data - Data for rendering.
     * @param {Array<{path: string, name: string}>} data.parentQueues - List of possible parent queues.
     * @param {string} [data.preselectedParentPath] - Optional parent path to preselect.
     */
    _renderContent(data) {
        if (!this.formContainer) {
            console.error('AddQueueModalView: Form container not found.');
            return;
        }
        DomUtils.empty(this.formContainer);

        const { parentQueues = [], preselectedParentPath = 'root' } = data || {};

        this.formContainer.innerHTML = this._buildHtml(parentQueues, preselectedParentPath);
        this._bindFormEvents();
        this._setupRealTimeValidation();
    }

    _buildHtml(parentQueues, preselectedParentPath) {
        const defaultPercentageCapacity = this.viewDataFormatterService._getDefaultCapacityValue(
            CAPACITY_MODES.PERCENTAGE
        );
        const defaultMaxCapacity = this.viewDataFormatterService._getDefaultMaxCapacityValue(CAPACITY_MODES.PERCENTAGE);

        // Prepare parent queue options
        let parentOptions = (parentQueues || []).map((parent) => ({
            value: parent.path,
            label: parent.path,
        }));

        if (parentOptions.length === 0 && preselectedParentPath === 'root') {
            parentOptions = [{ value: 'root', label: 'root' }];
        }

        // Define form fields using FormGenerator
        const fields = [
            {
                type: 'select',
                id: 'new-parent-queue-select',
                name: 'parentQueue',
                label: 'Parent Queue',
                value: preselectedParentPath,
                options: parentOptions,
                required: true,
            },
            {
                type: 'text',
                id: 'new-queue-name',
                name: 'queueName',
                label: 'New Queue Name',
                placeholder: 'Enter queue name (e.g., my_queue)',
                help: 'Letters, numbers, underscores, hyphens, periods allowed.',
                required: true,
            },
            {
                type: 'select',
                id: 'new-capacity-mode',
                name: 'capacityMode',
                label: 'Capacity Mode',
                value: CAPACITY_MODES.PERCENTAGE,
                options: [
                    { value: CAPACITY_MODES.PERCENTAGE, label: 'Percentage (%)' },
                    { value: CAPACITY_MODES.WEIGHT, label: 'Weight (w)' },
                    { value: CAPACITY_MODES.ABSOLUTE, label: 'Absolute Resources' },
                ],
            },
            {
                type: 'text',
                id: 'new-queue-capacity',
                name: 'capacity',
                label: 'Capacity',
                value: defaultPercentageCapacity,
                help: 'e.g., 10% or 10.0%',
            },
            {
                type: 'text',
                id: 'new-queue-max-capacity',
                name: 'maxCapacity',
                label: 'Maximum Capacity',
                value: defaultMaxCapacity,
                help: 'e.g., "100%" or "[memory=2048,vcores=2]"',
            },
            {
                type: 'select',
                id: 'new-queue-state',
                name: 'state',
                label: 'State',
                value: 'RUNNING',
                options: [
                    { value: 'RUNNING', label: 'RUNNING' },
                    { value: 'STOPPED', label: 'STOPPED' },
                ],
            },
        ];

        const actions = FormGenerator.createStandardActions({
            cancelId: 'cancel-add-queue-btn',
            submitId: 'submit-add-queue-btn',
            submitText: 'Add Queue',
            submitClass: 'btn btn-success',
        });

        return FormGenerator.generateForm(fields, {
            formId: 'add-queue-form',
            submitOnEnter: false,
            actions,
        });
    }

    _validateAndGetFormData(form) {
        let isValid = true;
        const validationMessages = {
            name: DomUtils.qs('#new-queue-name-validation', form),
            capacity: DomUtils.qs('#new-queue-capacity-validation', form),
            maxCapacity: DomUtils.qs('#new-queue-max-capacity-validation', form),
        };
        for (const element of Object.values(validationMessages)) {
            if (element) element.textContent = '';
        } // Clear previous messages

        const parentPath = DomUtils.qs('#new-parent-queue-select', form).value;
        const queueName = DomUtils.qs('#new-queue-name', form).value.trim();
        const capacityMode = DomUtils.qs('#new-capacity-mode', form).value;
        let capacity = DomUtils.qs('#new-queue-capacity', form).value.trim();
        let maxCapacity = DomUtils.qs('#new-queue-max-capacity', form).value.trim();
        const state = DomUtils.qs('#new-queue-state', form).value;

        // Validate Queue Name
        const nameValidation = ValidationService.isValidQueueNameChars(queueName);
        if (!nameValidation.isValid) {
            if (validationMessages.name) validationMessages.name.textContent = nameValidation.message;
            isValid = false;
        }

        // Validate and Format Capacity
        const capacityValidationResult = ValidationService.parseAndValidateCapacityValue(capacity, capacityMode);
        if (capacityValidationResult.errors || capacityValidationResult.error) {
            if (validationMessages.capacity)
                validationMessages.capacity.textContent = (
                    capacityValidationResult.errors || [capacityValidationResult.error]
                ).join(' ');
            isValid = false;
        } else {
            capacity = capacityValidationResult.value; // Use potentially auto-corrected value
        }

        // Validate and Format Max Capacity (can be % or absolute)
        let maxCapModeForValidation = this.viewDataFormatterService._isVectorString(maxCapacity)
            ? CAPACITY_MODES.ABSOLUTE
            : CAPACITY_MODES.PERCENTAGE;
        if (maxCapacity.endsWith('w')) maxCapModeForValidation = CAPACITY_MODES.WEIGHT; // Though not typical for max-cap

        const maxCapacityValidationResult = ValidationService.parseAndValidateCapacityValue(
            maxCapacity,
            maxCapModeForValidation,
            true
        ); // Allow empty vector for max for now
        if (maxCapacityValidationResult.errors || maxCapacityValidationResult.error) {
            if (validationMessages.maxCapacity)
                validationMessages.maxCapacity.textContent = (
                    maxCapacityValidationResult.errors || [maxCapacityValidationResult.error]
                ).join(' ');
            isValid = false;
        } else {
            maxCapacity = maxCapacityValidationResult.value;
        }

        if (!isValid) return null;

        // Prepare params with simple keys for the API structure and metadata defaults
        const parameters = {
            capacity: capacity,
            'maximum-capacity': maxCapacity,
            state: state,
            _ui_capacityMode: capacityMode, // UI hint for later processing
        };

        // Add default values for other metadata-defined properties for new queues
        for (const category of QUEUE_CONFIG_METADATA) {
            for (const meta of Object.values(category.properties)) {
                const simpleKey = meta.key;
                if (!Object.prototype.hasOwnProperty.call(parameters, simpleKey) && meta.defaultValue !== undefined) {
                    parameters[simpleKey] = String(meta.defaultValue);
                }
            }
        }

        return { parentPath, queueName, params: parameters };
    }

    _bindFormEvents() {
        const form = DomUtils.qs('#add-queue-form', this.formContainer);
        if (!form) return;

        const capacityModeSelect = DomUtils.qs('#new-capacity-mode', form);
        const capacityInput = DomUtils.qs('#new-queue-capacity', form);
        const capacityHelpText = DomUtils.qs('#new-capacity-help', form);
        const nameInput = DomUtils.qs('#new-queue-name', form);
        const nameValidationElement = DomUtils.qs('#new-queue-name-validation', form);

        if (nameInput && nameValidationElement) {
            nameInput.addEventListener('input', () => {
                const validation = ValidationService.isValidQueueNameChars(nameInput.value);
                nameValidationElement.textContent = validation.isValid ? '' : validation.message;
            });
        }

        if (capacityModeSelect && capacityInput && capacityHelpText) {
            capacityModeSelect.addEventListener('change', () => {
                const selectedMode = capacityModeSelect.value;
                capacityInput.value = this.viewDataFormatterService._getDefaultCapacityValue(selectedMode);
                switch (selectedMode) {
                    case CAPACITY_MODES.PERCENTAGE: {
                        capacityHelpText.textContent = 'e.g., 10% or 10.0%';
                        break;
                    }
                    case CAPACITY_MODES.WEIGHT: {
                        capacityHelpText.textContent = 'e.g., 1w or 1.0w';
                        break;
                    }
                    case CAPACITY_MODES.ABSOLUTE: {
                        capacityHelpText.textContent = 'e.g., [memory=1024,vcores=1]';
                        break;
                    }
                    default: {
                        capacityHelpText.textContent = '';
                    }
                }
                // Clear previous capacity validation message
                const capValueMessage = DomUtils.qs('#new-queue-capacity-validation', form);
                if (capValueMessage) capValueMessage.textContent = '';
            });
        }

        const submitButton = DomUtils.qs('#submit-add-queue-btn', this.modalEl);
        if (submitButton) {
            submitButton.addEventListener('click', () => {
                const formData = this._validateAndGetFormData(form);
                if (formData) {
                    this._emit('submitAddQueue', formData); // Emits to MainController
                }
                // If formData is null, validation messages are already shown.
            });
        }

        const cancelButton = DomUtils.qs('#cancel-add-queue-btn', this.modalEl);
        if (cancelButton) {
            cancelButton.addEventListener('click', () => this.hide({ Canceled: true }));
        }
    }

    /**
     * Sets up real-time validation for form fields.
     */
    _setupRealTimeValidation() {
        const form = DomUtils.qs('#add-queue-form', this.formContainer);
        if (!form) return;

        // Clean up existing validator
        if (this.realTimeValidator) {
            this.realTimeValidator.destroy();
        }

        // Create new validator
        this.realTimeValidator = new RealTimeValidator(form, {
            debounceDelay: 300,
            validateOnBlur: true,
            validateOnInput: true,
            showSuccessState: true,
        });

        // Add validators for each field
        const validators = RealTimeValidator.createQueueValidators();

        // Add unique queue name validator
        validators.queueName = RealTimeValidator.createUniqueQueueNameValidator((queuePath) => {
            // Check if queue already exists via controller
            return this.controller.schedulerConfigModel.getAllQueuePaths().includes(queuePath);
        });

        this.realTimeValidator.addValidators({
            'new-queue-name': validators.queueName,
            'new-queue-capacity': validators.capacity,
            'new-queue-max-capacity': validators.maxCapacity,
        });
    }

    /**
     * Cleans up resources when modal is hidden.
     */
    hide(result) {
        if (this.realTimeValidator) {
            this.realTimeValidator.destroy();
            this.realTimeValidator = null;
        }
        super.hide(result);
    }
}
