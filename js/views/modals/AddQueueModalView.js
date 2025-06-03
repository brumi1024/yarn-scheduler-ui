class AddQueueModalView extends BaseModalView {
    constructor(controller) {
        super('add-queue-modal', controller); // modalId, controller
        this.viewDataFormatterService = controller.viewDataFormatterService; // For default capacity values
    }

    /**
     * Renders the content of the Add Queue modal.
     * @param {Object} data - Data for rendering.
     * @param {Array<{path: string, name: string}>} data.parentQueues - List of possible parent queues.
     * @param {string} [data.preselectedParentPath] - Optional parent path to preselect.
     */
    _renderContent(data) {
        if (!this.formContainer) {
            console.error("AddQueueModalView: Form container not found.");
            return;
        }
        DomUtils.empty(this.formContainer);

        const { parentQueues = [], preselectedParentPath = 'root' } = data || {};

        this.formContainer.innerHTML = this._buildHtml(parentQueues, preselectedParentPath);
        this._bindFormEvents();
    }

    _buildHtml(parentQueues, preselectedParentPath) {
        let parentOptionsHtml = (parentQueues || []).map(parent => {
            const selected = parent.path === preselectedParentPath ? 'selected' : '';
            return `<option value="${DomUtils.escapeXml(parent.path)}" ${selected}>${DomUtils.escapeXml(parent.path)}</option>`;
        }).join('');

        if (!parentOptionsHtml && preselectedParentPath === 'root') { // Ensure root is option if list is empty
            parentOptionsHtml = `<option value="root" selected>root</option>`;
        }


        const defaultPercentageCapacity = this.viewDataFormatterService._getDefaultCapacityValue(CAPACITY_MODES.PERCENTAGE);
        const defaultMaxCapacity = this.viewDataFormatterService._getDefaultMaxCapacityValue(CAPACITY_MODES.PERCENTAGE); // Max usually percentage

        // Only include core properties for Add modal, defaults for others applied by model/controller.
        return `
            <form id="add-queue-form" onsubmit="return false;"> <!-- Prevent default form submission -->
                <div class="form-group">
                    <label class="form-label" for="new-parent-queue-select">Parent Queue</label>
                    <select class="form-input" id="new-parent-queue-select">${parentOptionsHtml}</select>
                </div>
                <div class="form-group">
                    <label class="form-label" for="new-queue-name">New Queue Name</label>
                    <input type="text" class="form-input" id="new-queue-name" placeholder="Enter queue name (e.g., my_queue)" required>
                    <small class="form-help">Letters, numbers, underscores, hyphens, periods allowed.</small>
                    <div class="validation-message" id="new-queue-name-validation"></div>
                </div>
                <div class="form-group">
                    <label class="form-label" for="new-capacity-mode">Capacity Mode</label>
                    <select class="form-input" id="new-capacity-mode">
                        <option value="${CAPACITY_MODES.PERCENTAGE}" selected>Percentage (%)</option>
                        <option value="${CAPACITY_MODES.WEIGHT}">Weight (w)</option>
                        <option value="${CAPACITY_MODES.ABSOLUTE}">Absolute Resources</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label" for="new-queue-capacity">Capacity</label>
                    <input type="text" class="form-input" id="new-queue-capacity" value="${defaultPercentageCapacity}">
                    <small class="form-help" id="new-capacity-help">e.g., 10% or 10.0%</small>
                    <div class="validation-message" id="new-queue-capacity-validation"></div>
                </div>
                <div class="form-group">
                    <label class="form-label" for="new-queue-max-capacity">Maximum Capacity</label>
                    <input type="text" class="form-input" id="new-queue-max-capacity" value="${defaultMaxCapacity}">
                    <small class="form-help">e.g., "100%" or "[memory=2048,vcores=2]".</small>
                    <div class="validation-message" id="new-queue-max-capacity-validation"></div>
                </div>
                <div class="form-group">
                    <label class="form-label" for="new-queue-state">State</label>
                    <select class="form-input" id="new-queue-state">
                        <option value="RUNNING" selected>RUNNING</option>
                        <option value="STOPPED">STOPPED</option>
                    </select>
                </div>
            </form>
            <div class="modal-actions">
                <button class="btn btn-secondary" id="cancel-add-queue-btn">Cancel</button>
                <button class="btn btn-success" id="submit-add-queue-btn">Add Queue</button>
            </div>
        `;
    }

    _validateAndGetFormData(form) {
        let isValid = true;
        const validationMessages = {
            name: DomUtils.qs('#new-queue-name-validation', form),
            capacity: DomUtils.qs('#new-queue-capacity-validation', form),
            maxCapacity: DomUtils.qs('#new-queue-max-capacity-validation', form),
        };
        Object.values(validationMessages).forEach(el => { if (el) el.textContent = ''; }); // Clear previous messages

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
            if (validationMessages.capacity) validationMessages.capacity.textContent = (capacityValidationResult.errors || [capacityValidationResult.error]).join(' ');
            isValid = false;
        } else {
            capacity = capacityValidationResult.value; // Use potentially auto-corrected value
        }

        // Validate and Format Max Capacity (can be % or absolute)
        let maxCapModeForValidation = this.viewDataFormatterService._isVectorString(maxCapacity) ? CAPACITY_MODES.ABSOLUTE : CAPACITY_MODES.PERCENTAGE;
        if(maxCapacity.endsWith('w')) maxCapModeForValidation = CAPACITY_MODES.WEIGHT; // Though not typical for max-cap

        const maxCapacityValidationResult = ValidationService.parseAndValidateCapacityValue(maxCapacity, maxCapModeForValidation, true); // Allow empty vector for max for now
        if (maxCapacityValidationResult.errors || maxCapacityValidationResult.error) {
            if (validationMessages.maxCapacity) validationMessages.maxCapacity.textContent = (maxCapacityValidationResult.errors || [maxCapacityValidationResult.error]).join(' ');
            isValid = false;
        } else {
            maxCapacity = maxCapacityValidationResult.value;
        }


        if (!isValid) return null;

        // Prepare params with simple keys for the API structure and metadata defaults
        const params = {
            'capacity': capacity,
            'maximum-capacity': maxCapacity,
            'state': state,
            '_ui_capacityMode': capacityMode // UI hint for later processing
        };

        // Add default values for other metadata-defined properties for new queues
        QUEUE_CONFIG_METADATA.forEach(category => {
            Object.values(category.properties).forEach(meta => {
                const simpleKey = meta.key;
                if (!params.hasOwnProperty(simpleKey) && meta.defaultValue !== undefined) {
                    params[simpleKey] = String(meta.defaultValue);
                }
            });
        });

        return { parentPath, queueName, params };
    }


    _bindFormEvents() {
        const form = DomUtils.qs('#add-queue-form', this.formContainer);
        if (!form) return;

        const capacityModeSelect = DomUtils.qs('#new-capacity-mode', form);
        const capacityInput = DomUtils.qs('#new-queue-capacity', form);
        const capacityHelpText = DomUtils.qs('#new-capacity-help', form);
        const nameInput = DomUtils.qs('#new-queue-name', form);
        const nameValidationEl = DomUtils.qs('#new-queue-name-validation', form);

        if (nameInput && nameValidationEl) {
            nameInput.addEventListener('input', () => {
                const validation = ValidationService.isValidQueueNameChars(nameInput.value);
                nameValidationEl.textContent = validation.isValid ? '' : validation.message;
            });
        }

        if (capacityModeSelect && capacityInput && capacityHelpText) {
            capacityModeSelect.addEventListener('change', () => {
                const selectedMode = capacityModeSelect.value;
                capacityInput.value = this.viewDataFormatterService._getDefaultCapacityValue(selectedMode);
                switch(selectedMode) {
                    case CAPACITY_MODES.PERCENTAGE: capacityHelpText.textContent = "e.g., 10% or 10.0%"; break;
                    case CAPACITY_MODES.WEIGHT: capacityHelpText.textContent = "e.g., 1w or 1.0w"; break;
                    case CAPACITY_MODES.ABSOLUTE: capacityHelpText.textContent = "e.g., [memory=1024,vcores=1]"; break;
                    default: capacityHelpText.textContent = "";
                }
                // Clear previous capacity validation message
                const capValMsg = DomUtils.qs('#new-queue-capacity-validation', form);
                if(capValMsg) capValMsg.textContent = '';
            });
        }

        const submitBtn = DomUtils.qs('#submit-add-queue-btn', this.modalEl);
        if (submitBtn) {
            submitBtn.addEventListener('click', () => {
                const formData = this._validateAndGetFormData(form);
                if (formData) {
                    this._emit('submitAddQueue', formData); // Emits to MainController
                }
                // If formData is null, validation messages are already shown.
            });
        }

        const cancelBtn = DomUtils.qs('#cancel-add-queue-btn', this.modalEl);
        if(cancelBtn) {
            cancelBtn.addEventListener('click', () => this.hide({ Canceled: true }));
        }
    }
}