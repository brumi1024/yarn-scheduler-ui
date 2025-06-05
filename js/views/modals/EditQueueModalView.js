class EditQueueModalView extends BaseModalView {
    constructor(controller) {
        super('edit-modal', controller);
        this.currentQueuePath = null;
        this.currentQueueData = null; // To store the data passed to show() for re-rendering node labels
        this.viewDataFormatterService = controller.viewDataFormatterService; // For default capacity values
    }

    /**
     * Renders the content of a form container based on the provided data.
     * It updates the modal title and populates the form with HTML generated from the given data.
     * If the data is not provided or invalid, it displays a default message.
     *
     * @param {Object} data - The data used for rendering the content.
     * Contains properties such as `path` for identifying the current queue and additional details for rendering.
     * @return {void} This method does not return a value.
     */
    _renderContent(data) {
        if (!this.formContainer || !data || !data.path) {
            if (this.formContainer) DomUtils.empty(this.formContainer);
            if (this.formContainer) this.formContainer.innerHTML = '<p>Queue data not available for editing.</p>';
            return;
        }
        DomUtils.empty(this.formContainer);
        this.currentQueuePath = data.path;
        this.currentQueueData = data; // Store for potential partial re-renders (node labels)

        const modalTitleElement = DomUtils.qs('.modal-title', this.modalEl);
        if (modalTitleElement)
            modalTitleElement.textContent = `Edit Queue: ${DomUtils.escapeXml(data.displayName || data.path.split('.').pop())}`;

        this.formContainer.innerHTML = this._buildHtml(data);
        this._bindFormEvents(data);
    }

    _buildHtml(data) {
        const { path, displayName, properties, nodeLabelData, effectiveCapacityMode } = data;
        let formHTML = `<form id="edit-queue-form" data-queue-path="${path}" onsubmit="return false;">`;

        // Static Info
        formHTML += `<div class="form-group static-info-group">
                        <div class="property-details-column"><div class="property-display-name">Queue Name</div><div class="property-yarn-name">(Read-only)</div></div>
                        <div class="property-value-column"><input type="text" class="form-input" value="${DomUtils.escapeXml(displayName)}" readonly></div>
                     </div>`;
        formHTML += `<div class="form-group static-info-group">
                        <div class="property-details-column"><div class="property-display-name">Queue Path</div><div class="property-yarn-name">(Read-only)</div></div>
                        <div class="property-value-column"><input type="text" class="form-input" value="${DomUtils.escapeXml(path)}" readonly></div>
                     </div>`;

        // Capacity Mode
        formHTML += `<div class="form-group property-edit-item">
                        <div class="property-details-column">
                            <div class="property-display-name"><span>Capacity Mode</span><span class="info-icon" title="Determines how queue capacity is specified (Percentage, Weight, or Absolute Resources).">ⓘ</span></div>
                            <div class="property-yarn-name">- UI Helper -</div>
                        </div>
                        <div class="property-value-column">
                            <select class="form-input" id="edit-capacity-mode" data-original-mode="${DomUtils.escapeXml(effectiveCapacityMode)}">
                                <option value="${CAPACITY_MODES.PERCENTAGE}" ${effectiveCapacityMode === CAPACITY_MODES.PERCENTAGE ? 'selected' : ''}>Percentage (%)</option>
                                <option value="${CAPACITY_MODES.WEIGHT}" ${effectiveCapacityMode === CAPACITY_MODES.WEIGHT ? 'selected' : ''}>Weight (w)</option>
                                <option value="${CAPACITY_MODES.ABSOLUTE}" ${effectiveCapacityMode === CAPACITY_MODES.ABSOLUTE ? 'selected' : ''}>Absolute Resources</option>
                            </select>
                        </div>
                     </div>`;

        // Standard Configurable Properties
        for (const category of QUEUE_CONFIG_METADATA) {
            formHTML += `<h4 class="form-category-title">${DomUtils.escapeXml(category.groupName)}</h4>`;
            for (const [placeholderKey, meta] of Object.entries(category.properties)) {
                const simpleKey = meta.key;
                const fullYarnPropertyName = placeholderKey.replace(Q_PATH_PLACEHOLDER, path);
                const currentValue =
                    properties[simpleKey] === undefined ? String(meta.defaultValue) : String(properties[simpleKey]);
                formHTML += this._buildPropertyInputHtml(
                    simpleKey,
                    fullYarnPropertyName,
                    meta,
                    currentValue,
                    `std-${simpleKey}`
                );
            }
        }

        // Node Label Configurations Section
        formHTML += this._buildNodeLabelSectionHtml(path, nodeLabelData);

        formHTML += `</form>
                     <div class="modal-actions">
                        <button class="btn btn-secondary" id="cancel-edit-queue-btn">Cancel</button>
                        <button class="btn btn-primary" id="submit-edit-queue-btn">Stage Changes</button>
                     </div>`;
        return formHTML;
    }

    _buildNodeLabelSectionHtml(queuePath, nodeLabelData) {
        let sectionHtml = `<h4 class="form-category-title">Node Label Configurations</h4>`;
        const anlMeta =
            NODE_LABEL_CONFIG_METADATA[`yarn.scheduler.capacity.${Q_PATH_PLACEHOLDER}.accessible-node-labels`];
        const anlFullKey = `yarn.scheduler.capacity.${queuePath}.accessible-node-labels`;

        sectionHtml += this._buildPropertyInputHtml(
            anlMeta.key,
            anlFullKey,
            anlMeta,
            nodeLabelData.accessibleNodeLabelsString,
            'accessible-node-labels-list-input' // Specific ID for this input
        );

        // Area to display/edit per-label configurations
        sectionHtml += `<div id="per-label-configs-container" class="per-label-configs-container" style="margin-top: 10px; padding-left:15px; border-left: 2px solid #eee;">`;

        const currentLabelsResult = ValidationService.validateNodeLabelsString(
            nodeLabelData.accessibleNodeLabelsString
        );
        const currentLabels = currentLabelsResult.isValid ? currentLabelsResult.labels : [];

        if (currentLabels.length > 0 && currentLabels[0] !== '*' && currentLabels[0] !== '') {
            for (const label of currentLabels) {
                if (!label) continue;
                sectionHtml += `<h5 class="label-config-subtitle">Label: '${DomUtils.escapeXml(label)}'</h5>`;
                for (const [placeholderKey, meta] of Object.entries(NODE_LABEL_CONFIG_METADATA.perLabelProperties)) {
                    const simpleSubKey = `${label}.${meta.key}`; // e.g., "gpu.capacity"
                    const fullYarnPropertyName = placeholderKey
                        .replace(Q_PATH_PLACEHOLDER, queuePath)
                        .replace('<label_name>', label);
                    const currentValue =
                        nodeLabelData.labelSpecificParams[simpleSubKey] === undefined
                            ? String(meta.defaultValue)
                            : String(nodeLabelData.labelSpecificParams[simpleSubKey]);
                    const augmentedMeta = { ...meta, displayName: meta.displayName.replace('Label', '') }; // Remove generic "Label" prefix for brevity
                    sectionHtml += this._buildPropertyInputHtml(
                        simpleSubKey,
                        fullYarnPropertyName,
                        augmentedMeta,
                        currentValue,
                        `label-${label}-${meta.key}`
                    );
                }
            }
        } else if (currentLabels.length === 0 || currentLabels[0] === '') {
            sectionHtml += `<p class="form-help">No specific labels configured. Edit 'Accessible Node Labels' above to add specific labels.</p>`;
        } else if (currentLabels[0] === '*') {
            sectionHtml += `<p class="form-help">Queue has access to all ('*') labels. To set specific capacities per label, list them explicitly above instead of using '*'.</p>`;
        }
        sectionHtml += `</div>`;
        return sectionHtml;
    }

    _buildPropertyInputHtml(simpleOrPartialKey, fullYarnPropertyName, meta, currentValue, idPrefix = null) {
        let html = `<div class="form-group property-edit-item" data-simple-key="${DomUtils.escapeXml(simpleOrPartialKey)}">
                        <div class="property-details-column">
                            <div class="property-display-name"><span>${DomUtils.escapeXml(meta.displayName)}</span><span class="info-icon" title="${DomUtils.escapeXml(meta.description || '')}">ⓘ</span></div>
                            <div class="property-yarn-name">${DomUtils.escapeXml(fullYarnPropertyName)}</div>
                        </div>
                        <div class="property-value-column">`;

        const inputIdBase = (idPrefix || simpleOrPartialKey).replaceAll(/[^\w-]/g, '-'); // Sanitize ID
        const inputId = `edit-queue-${inputIdBase}`;
        const dataAttributes = `data-original-value="${DomUtils.escapeXml(currentValue)}" data-simple-key="${DomUtils.escapeXml(simpleOrPartialKey)}" data-full-key="${DomUtils.escapeXml(fullYarnPropertyName)}"`;

        if (meta.type === 'enum') {
            html += `<select class="form-input" id="${inputId}" ${dataAttributes}>`;
            for (const opt of (meta.options || [])) {
                html += `<option value="${DomUtils.escapeXml(opt)}" ${currentValue === opt ? 'selected' : ''}>${DomUtils.escapeXml(opt)}</option>`;
            }
            html += `</select>`;
        } else if (meta.type === 'boolean') {
            html += `<select class="form-input" id="${inputId}" ${dataAttributes}>
                        <option value="true" ${String(currentValue) === 'true' ? 'selected' : ''}>true</option>
                        <option value="false" ${String(currentValue) === 'false' ? 'selected' : ''}>false</option>
                     </select>`;
        } else {
            let inputType = meta.type === 'number' || meta.type === 'percentage' ? 'number' : 'text';
            if (
                simpleOrPartialKey === 'capacity' ||
                simpleOrPartialKey === 'maximum-capacity' ||
                simpleOrPartialKey.endsWith('.capacity') ||
                simpleOrPartialKey.endsWith('.maximum-capacity')
            ) {
                inputType = 'text'; // Capacities can be strings with %, w, or vector
            }

            let attributes = `type="${inputType}" value="${DomUtils.escapeXml(currentValue)}" ${dataAttributes}`;
            if (meta.step !== undefined) attributes += ` step="${meta.step}"`;
            if (meta.type === 'percentage') {
                // For number inputs acting as percentage
                attributes += meta.min === undefined ? ` min="0"` : ` min="${meta.min}"`;
                attributes += meta.max === undefined ? ` max="1"` : ` max="${meta.max}"`; // Default 0-1 for direct % val
                if (meta.step === undefined) attributes += ` step="0.01"`;
            }
            if (meta.placeholder) attributes += ` placeholder="${DomUtils.escapeXml(meta.placeholder)}"`;

            html += `<input class="form-input" id="${inputId}" ${attributes}>`;
        }
        html += `   </div></div>`;
        return html;
    }

    _bindFormEvents(queuePath, originalEffectiveCapacityMode) {
        const form = DomUtils.qs('#edit-queue-form', this.formContainer);
        if (!form) return;

        const capacityModeSelect = DomUtils.qs('#edit-capacity-mode', form);
        const capacityInput = DomUtils.qs('[data-simple-key="capacity"] .form-input', form);

        if (capacityModeSelect && capacityInput) {
            capacityModeSelect.addEventListener('change', () => {
                const newMode = capacityModeSelect.value;
                // Update capacity input to default for the new mode
                capacityInput.value = this.viewDataFormatterService._getDefaultCapacityValue(newMode);
                // Future: could add help text changes here too
            });
        }

        const accessibleLabelsInputElement = DomUtils.qs('#edit-queue-accessible-node-labels-list-input', form);
        if (accessibleLabelsInputElement) {
            accessibleLabelsInputElement.addEventListener('change', () => {
                const newLabelsString = accessibleLabelsInputElement.value;
                // Request controller to re-render node label section based on this new list
                this._emit('accessibleLabelsListChanged', {
                    queuePath: this.currentQueuePath,
                    newLabelsString: newLabelsString,
                    // Pass current form data so controller can merge and re-request formatting
                    currentFormParams: this._collectFormData(form, originalEffectiveCapacityMode).params,
                });
            });
        }

        const submitButton = DomUtils.qs('#submit-edit-queue-btn', this.modalEl);
        if (submitButton) {
            submitButton.addEventListener('click', () => {
                const collectedData = this._collectFormData(form, originalEffectiveCapacityMode);
                if (Object.keys(collectedData.params).length > 0) {
                    this._emit('submitEditQueue', { queuePath: this.currentQueuePath, formData: collectedData });
                } else {
                    this.controller.notificationView.showInfo('No changes detected to stage.');
                    this.hide({ Canceled: true, NoChanges: true }); // Close if no changes
                }
            });
        }
        const cancelButton = DomUtils.qs('#cancel-edit-queue-btn', this.modalEl);
        if (cancelButton) {
            cancelButton.addEventListener('click', () => this.hide({ Canceled: true }));
        }
    }

    _collectFormData(form, originalCapacityMode) {
        const stagedChanges = { params: {} }; // Uses simple keys for standard props, partial for labels
        let capacityModeChanged = false;

        const capacityModeSelect = DomUtils.qs('#edit-capacity-mode', form);
        const newCapacityMode = capacityModeSelect.value;

        if (newCapacityMode !== originalCapacityMode) {
            stagedChanges.params['_ui_capacityMode'] = newCapacityMode;
            capacityModeChanged = true;
        }

        for (const inputElement of form.querySelectorAll('.form-input')) {
            if (inputElement.id === 'edit-capacity-mode') continue;

            const simpleOrPartialKey = inputElement.dataset.simpleKey;
            const originalValue = inputElement.dataset.originalValue;
            let newValue = inputElement.value.trim(); // Trim all input values

            if (simpleOrPartialKey) {
                let hasChanged = newValue !== originalValue;

                // Special handling for capacity when mode changes
                if (simpleOrPartialKey === 'capacity' && capacityModeChanged) {
                    newValue = this.viewDataFormatterService._formatCapacityForDisplay(
                        newValue,
                        newCapacityMode,
                        this.viewDataFormatterService._getDefaultCapacityValue(newCapacityMode)
                    );
                    hasChanged = true; // Consider it changed if mode changed, even if formatted value is same
                } else if (
                    (simpleOrPartialKey === 'capacity' || simpleOrPartialKey.endsWith('.capacity')) &&
                    this.viewDataFormatterService._isVectorString(originalValue) &&
                    this._isEffectivelyEmptyVector(newValue)
                ) {
                    // If original was a vector like [memory=0] and new value is "[]", consider it a change to empty
                    newValue = '[]';
                    hasChanged = originalValue !== '[]';
                } else if (simpleOrPartialKey === 'capacity') {
                    // ensure capacity formatting for its current mode
                    newValue = this.viewDataFormatterService._formatCapacityForDisplay(
                        newValue,
                        newCapacityMode,
                        originalValue
                    );
                } else if (simpleOrPartialKey === 'maximum-capacity') {
                    // Detect the actual format of the maximum capacity value and preserve it
                    const parsed = CapacityValueParser.parse(newValue.trim());
                    const maxCapacityMode = parsed.isValid ? parsed.type : CAPACITY_MODES.PERCENTAGE;
                    
                    newValue = this.viewDataFormatterService._formatCapacityForDisplay(
                        newValue,
                        maxCapacityMode,
                        '100%'
                    );
                }

                if (hasChanged) {
                    stagedChanges.params[simpleOrPartialKey] = newValue;
                }
            }
        }
        return stagedChanges;
    }

    _isEffectivelyEmptyVector(value) {
        if (value === '[]') return true;
        const parsed = this.viewDataFormatterService._resourceVectorParser(value);
        return parsed.every((p) => Number.parseFloat(p.value) === 0);
    }
}
