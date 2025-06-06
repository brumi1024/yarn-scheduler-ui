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
        
        // Upgrade info icon tooltips to unified system
        if (window.TooltipHelper) {
            TooltipHelper.upgradeModalTooltips(this.formContainer);
        }
    }

    _buildHtml(data) {
        const { path, displayName, properties, propertyDefaults, nodeLabelData, effectiveCapacityMode, isLegacyMode } = data;
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
        const capacityModeTooltip = isLegacyMode 
            ? "Determines how queue capacity is specified. In legacy mode, all queues in a hierarchy must use the same capacity mode."
            : "Determines how queue capacity is specified. Non-legacy mode allows mixing capacity modes and Resource Vectors.";
            
        formHTML += `<div class="form-group property-edit-item">
                        <div class="property-details-column">
                            <div class="property-display-name"><span>Capacity Mode</span><span class="info-icon" title="${DomUtils.escapeXml(capacityModeTooltip)}">ⓘ</span></div>
                            <div class="property-yarn-name">- UI Helper -</div>
                        </div>
                        <div class="property-value-column">
                            <select class="form-input" id="edit-capacity-mode" data-original-mode="${DomUtils.escapeXml(effectiveCapacityMode)}">
                                <option value="${CAPACITY_MODES.PERCENTAGE}" ${effectiveCapacityMode === CAPACITY_MODES.PERCENTAGE ? 'selected' : ''}>Percentage (%)</option>
                                <option value="${CAPACITY_MODES.WEIGHT}" ${effectiveCapacityMode === CAPACITY_MODES.WEIGHT ? 'selected' : ''}>Weight (w)</option>
                                <option value="${CAPACITY_MODES.ABSOLUTE}" ${effectiveCapacityMode === CAPACITY_MODES.ABSOLUTE ? 'selected' : ''}>Absolute Resources</option>
                                ${isLegacyMode ? '' : `<option value="${CAPACITY_MODES.VECTOR}" ${effectiveCapacityMode === CAPACITY_MODES.VECTOR ? 'selected' : ''}>Resource Vector (Mixed)</option>`}
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
                    `std-${simpleKey}`,
                    propertyDefaults[simpleKey]
                );
            }
        }

        // Auto Queue Creation Section
        formHTML += this._buildAutoCreationSectionHtml(data);

        // Node Label Configurations Section
        formHTML += this._buildNodeLabelSectionHtml(path, nodeLabelData);

        // Custom Properties Section
        formHTML += this._buildCustomPropertiesSectionHtml(path);

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
            'accessible-node-labels-list-input', // Specific ID for this input
            false // Node labels are never defaults in this context
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
                        `label-${label}-${meta.key}`,
                        nodeLabelData.labelSpecificParams[simpleSubKey] === undefined // Is default if not explicitly set
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

    _buildAutoCreationSectionHtml(data) {
        const { autoCreationData, isLegacyMode, path, effectiveCapacityMode } = data;
        
        // Determine which mode should be active and if templates should be shown
        const isWeightMode = effectiveCapacityMode === CAPACITY_MODES.WEIGHT;
        const shouldUseV2 = isWeightMode || !isLegacyMode;
        const shouldShowTemplates = shouldUseV2 ? autoCreationData.v2Enabled : autoCreationData.v1Enabled;

        const sectionHtml = `
            <div class="auto-creation-section">
                <h4 class="form-category-title">Auto Queue Creation</h4>
                ${this._buildAutoCreationToggleHtml(autoCreationData, isLegacyMode, path, effectiveCapacityMode)}
                ${shouldShowTemplates ? this._buildAutoCreationTemplateHtml(autoCreationData, isLegacyMode, path, effectiveCapacityMode) : ''}
            </div>
        `;
        return sectionHtml;
    }

    _buildAutoCreationToggleHtml(autoCreationData, isLegacyMode, queuePath, effectiveCapacityMode) {
        const { enabled, hasChildren, v1Enabled, v2Enabled } = autoCreationData;
        const cannotEnableLegacy = isLegacyMode && hasChildren;
        
        // Determine which auto-creation mode should be used
        const isWeightMode = effectiveCapacityMode === CAPACITY_MODES.WEIGHT;
        const shouldUseV2 = isWeightMode || !isLegacyMode;
        const autoCreationMode = shouldUseV2 ? 'v2 (Flexible)' : 'v1 (Legacy)';
        
        // Determine which property to show and its current value
        const propertyKey = shouldUseV2 ? 'auto-queue-creation-v2.enabled' : 'auto-create-child-queue.enabled';
        const fullPropertyName = `yarn.scheduler.capacity.${DomUtils.escapeXml(queuePath)}.${propertyKey}`;
        const currentValue = shouldUseV2 ? v2Enabled : v1Enabled;
        
        const warningText = cannotEnableLegacy && !shouldUseV2
            ? 'Legacy auto queue creation cannot be enabled on queues that have existing children.'
            : '';

        return `
            <div class="form-group property-edit-item">
                <div class="property-details-column">
                    <div class="property-display-name">
                        <span>Enable Auto Queue Creation</span>
                        <span class="info-icon" title="Automatically create child queues when applications are submitted to this queue. Mode: ${autoCreationMode}">ⓘ</span>
                    </div>
                    <div class="property-yarn-name">${fullPropertyName}</div>
                    <p class="form-help" style="color: ${shouldUseV2 ? '#28a745' : '#856404'}; margin-top: 5px;">Using ${autoCreationMode} auto queue creation</p>
                    ${warningText ? `<p class="form-help" style="color: #dc3545; margin-top: 5px;">${warningText}</p>` : ''}
                </div>
                <div class="property-value-column">
                    <select class="form-input" id="auto-creation-enabled" data-simple-key="${propertyKey}" data-original-value="${currentValue ? 'true' : 'false'}" ${cannotEnableLegacy && !shouldUseV2 ? 'disabled' : ''}>
                        <option value="false" ${!currentValue ? 'selected' : ''}>false</option>
                        <option value="true" ${currentValue ? 'selected' : ''}>true</option>
                    </select>
                </div>
            </div>
        `;
    }

    _buildAutoCreationTemplateHtml(autoCreationData, isLegacyMode, queuePath, effectiveCapacityMode) {
        const { nonTemplateProperties, v1TemplateProperties, v2TemplateProperties } = autoCreationData;
        
        // Determine auto-creation mode based on capacity mode and legacy settings
        const isWeightMode = effectiveCapacityMode === CAPACITY_MODES.WEIGHT;
        const isV2Mode = isWeightMode || !isLegacyMode;
        
        let templateHtml = `
            <div class="auto-creation-template" id="auto-creation-template">
                <h5 style="margin: 15px 0 10px; color: #666;">Auto Queue Creation Configuration</h5>
        `;

        if (isV2Mode) {
            // v2 mode: show v2 non-template properties and v2 template properties
            templateHtml += `
                <h6 style="margin: 0 0 10px; color: #28a745;">v2 (Flexible) Configuration</h6>
            `;
            
            // Show v2 non-template properties (excluding the main toggle)
            for (const [propKey, propData] of Object.entries(nonTemplateProperties)) {
                if (propData.meta.v2Property && propData.meta.key !== 'auto-queue-creation-v2.enabled') {
                    templateHtml += this._buildPropertyInputHtml(
                        propData.meta.key,
                        `yarn.scheduler.capacity.${DomUtils.escapeXml(queuePath)}.${propData.meta.key}`,
                        propData.meta,
                        propData.value,
                        `auto-${propData.meta.key.replace(/[^a-zA-Z0-9]/g, '-')}`,
                        propData.isDefault
                    );
                }
            }
            
            // Show v2 template properties with different scopes
            const scopeLabels = {
                template: 'General Template',
                parentTemplate: 'Parent Queue Template', 
                leafTemplate: 'Leaf Queue Template'
            };
            
            for (const [scopeKey, scopeProps] of Object.entries(v2TemplateProperties)) {
                if (Object.keys(scopeProps).length > 0) {
                    templateHtml += `
                        <h6 style="margin: 15px 0 5px; color: #666;">${scopeLabels[scopeKey]}</h6>
                        <p class="form-help" style="margin-bottom: 10px;">Properties applied to ${scopeKey === 'template' ? 'all auto-created queues' : scopeKey === 'parentTemplate' ? 'auto-created parent queues' : 'auto-created leaf queues'}:</p>
                    `;
                    
                    for (const [propKey, propData] of Object.entries(scopeProps)) {
                        const fullKey = `auto-queue-creation-v2.${scopeKey.replace(/([A-Z])/g, '-$1').toLowerCase()}.${propData.meta.key}`;
                        templateHtml += this._buildPropertyInputHtml(
                            fullKey,
                            `yarn.scheduler.capacity.${DomUtils.escapeXml(queuePath)}.${fullKey}`,
                            propData.meta,
                            propData.value,
                            `v2-${scopeKey}-${propData.meta.key.replace(/[^a-zA-Z0-9]/g, '-')}`,
                            propData.isDefault
                        );
                    }
                }
            }
        } else {
            // v1 mode: show v1 template properties only
            templateHtml += `
                <h6 style="margin: 0 0 10px; color: #856404;">v1 (Legacy) Template Properties</h6>
                <p class="form-help" style="margin-bottom: 15px;">These properties will be applied to automatically created child queues:</p>
            `;
            
            for (const [propKey, propData] of Object.entries(v1TemplateProperties)) {
                const fullKey = `leaf-queue-template.${propData.meta.key}`;
                templateHtml += this._buildPropertyInputHtml(
                    fullKey,
                    `yarn.scheduler.capacity.${DomUtils.escapeXml(queuePath)}.${fullKey}`,
                    propData.meta,
                    propData.value,
                    `v1-template-${propData.meta.key.replace(/[^a-zA-Z0-9]/g, '-')}`,
                    propData.isDefault
                );
            }
        }

        templateHtml += `</div>`;
        return templateHtml;
    }

    _buildCustomPropertiesSectionHtml(queuePath) {
        const sectionHtml = `
            <div class="custom-properties-section">
                <h4 class="form-category-title collapsible collapsed" id="custom-properties-header">
                    <span class="collapse-icon">▶</span>
                    <span>⚠️ Custom Properties (Advanced)</span>
                </h4>
                <div class="custom-properties-content" id="custom-properties-content" style="display: none;">
                    <p class="form-help" style="margin-bottom: 15px; color: #856404; background-color: #fff3cd; padding: 10px; border-radius: 4px;">
                        <strong>Warning:</strong> Custom properties are not validated by the UI. Ensure property names and values are correct to avoid YARN configuration errors.
                    </p>
                    <div id="custom-properties-list">
                        <!-- Custom properties will be added here dynamically -->
                    </div>
                    <button type="button" class="btn btn-secondary" id="add-custom-property-btn" style="margin-top: 10px;">
                        + Add Custom Property
                    </button>
                    <input type="hidden" id="queue-path-prefix" value="yarn.scheduler.capacity.${DomUtils.escapeXml(queuePath)}." />
                </div>
            </div>
        `;
        return sectionHtml;
    }

    _buildPropertyInputHtml(simpleOrPartialKey, fullYarnPropertyName, meta, currentValue, idPrefix = null, isDefault = false) {
        // Build the custom HTML structure for edit queue modal
        const inputIdBase = (idPrefix || simpleOrPartialKey).replaceAll(/[^\w-]/g, '-');
        const inputId = `edit-queue-${inputIdBase}`;
        const dataAttributes = `data-original-value="${DomUtils.escapeXml(currentValue)}" data-simple-key="${DomUtils.escapeXml(simpleOrPartialKey)}" data-full-key="${DomUtils.escapeXml(fullYarnPropertyName)}"`;

        let html = `<div class="form-group property-edit-item" data-simple-key="${DomUtils.escapeXml(simpleOrPartialKey)}">
                        <div class="property-details-column">
                            <div class="property-display-name">
                                <span>${DomUtils.escapeXml(meta.displayName)}</span>
                                <span class="info-icon" title="${DomUtils.escapeXml(meta.description || '')}">ⓘ</span>
                                ${isDefault ? '<span class="default-indicator" title="This field is using the default value">Default</span>' : ''}
                            </div>
                            <div class="property-yarn-name">${DomUtils.escapeXml(fullYarnPropertyName)}</div>
                        </div>
                        <div class="property-value-column">`;

        // Generate the appropriate input based on metadata
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
                attributes += meta.min === undefined ? ` min="0"` : ` min="${meta.min}"`;
                attributes += meta.max === undefined ? ` max="1"` : ` max="${meta.max}"`;
                if (meta.step === undefined) attributes += ` step="0.01"`;
            }
            if (meta.placeholder) attributes += ` placeholder="${DomUtils.escapeXml(meta.placeholder)}"`;

            html += `<input class="form-input" id="${inputId}" ${attributes}>`;
        }
        
        html += `        </div>
                    </div>`;
        return html;
    }

    _bindFormEvents(queuePath, originalEffectiveCapacityMode) {
        const form = DomUtils.qs('#edit-queue-form', this.formContainer);
        if (!form) return;

        const capacityModeSelect = DomUtils.qs('#edit-capacity-mode', form);
        const capacityInput = DomUtils.qs('[data-simple-key="capacity"] .form-input', form);

        if (capacityModeSelect && capacityInput) {
            // Set initial placeholder
            this._updateCapacityPlaceholder(capacityInput, capacityModeSelect.value);
            
            capacityModeSelect.addEventListener('change', () => {
                const newMode = capacityModeSelect.value;
                // Update capacity input to default for the new mode
                capacityInput.value = this.viewDataFormatterService._getDefaultCapacityValue(newMode);
                // Update placeholder based on new mode
                this._updateCapacityPlaceholder(capacityInput, newMode);
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

        // Bind custom properties events
        this._bindCustomPropertiesEvents(form);
        
        // Bind auto-creation events
        this._bindAutoCreationEvents(form);
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
                const userActuallyChangedValue = hasChanged; // Track if user actually modified this field
                

                // Handle capacity fields with user intent awareness
                if (simpleOrPartialKey === 'capacity' || simpleOrPartialKey.endsWith('.capacity')) {
                    if (!userActuallyChangedValue) {
                        // User didn't change this capacity field, don't stage it
                        hasChanged = false;
                    } else if (simpleOrPartialKey === 'capacity' && capacityModeChanged) {
                        // Special handling for capacity when mode changes and user modified it
                        newValue = this.viewDataFormatterService._formatCapacityForDisplay(
                            newValue,
                            newCapacityMode,
                            this.viewDataFormatterService._getDefaultCapacityValue(newCapacityMode)
                        );
                        hasChanged = true; // Consider it changed if mode changed and user modified it
                    } else if (
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
                        // Recheck for changes after formatting to avoid false positives
                        hasChanged = newValue !== originalValue;
                    }
                } else if (simpleOrPartialKey === 'maximum-capacity') {
                    // Only format and stage maximum-capacity if user actually changed it
                    if (userActuallyChangedValue) {
                        // Detect the actual format of the maximum capacity value and preserve it
                        const parsed = CapacityValueParser.parse(newValue.trim());
                        const maxCapacityMode = parsed.isValid ? parsed.type : CAPACITY_MODES.PERCENTAGE;
                        
                        newValue = this.viewDataFormatterService._formatCapacityForDisplay(
                            newValue,
                            maxCapacityMode,
                            '100%'
                        );
                        // Recheck for changes after formatting to avoid false positives
                        hasChanged = newValue !== originalValue;
                    } else {
                        // User didn't change maximum-capacity, don't stage it
                        hasChanged = false;
                    }
                }

                if (hasChanged) {
                    stagedChanges.params[simpleOrPartialKey] = newValue;
                }
            }
        }
        
        // Collect custom properties
        const customProperties = this._collectCustomProperties(form);
        if (customProperties) {
            // Custom properties use full YARN keys, not simple keys
            stagedChanges.customProperties = customProperties;
        }
        
        return stagedChanges;
    }

    _isEffectivelyEmptyVector(value) {
        if (value === '[]') return true;
        const parsed = this.viewDataFormatterService._resourceVectorParser(value);
        return parsed.every((p) => Number.parseFloat(p.value) === 0);
    }

    _updateCapacityPlaceholder(capacityInput, mode) {
        let placeholder = '';
        switch (mode) {
            case CAPACITY_MODES.PERCENTAGE: {
                placeholder = 'e.g., 50 or 50%';
                break;
            }
            case CAPACITY_MODES.WEIGHT: {
                placeholder = 'e.g., 2w';
                break;
            }
            case CAPACITY_MODES.ABSOLUTE: {
                placeholder = 'e.g., [memory=1024,vcores=2]';
                break;
            }
            case CAPACITY_MODES.VECTOR: {
                placeholder = 'e.g., [memory=50%,vcores=2,gpu=1w]';
                break;
            }
        }
        capacityInput.setAttribute('placeholder', placeholder);
    }

    _bindCustomPropertiesEvents(form) {
        const header = DomUtils.qs('#custom-properties-header', form);
        const content = DomUtils.qs('#custom-properties-content', form);
        const addButton = DomUtils.qs('#add-custom-property-btn', form);
        
        if (header && content) {
            header.addEventListener('click', () => {
                const isCollapsed = header.classList.contains('collapsed');
                if (isCollapsed) {
                    header.classList.remove('collapsed');
                    content.style.display = 'block';
                } else {
                    header.classList.add('collapsed');
                    content.style.display = 'none';
                }
            });
        }
        
        if (addButton) {
            addButton.addEventListener('click', () => {
                this._addCustomPropertyRow();
            });
        }
    }

    _addCustomPropertyRow() {
        const container = DomUtils.qs('#custom-properties-list', this.formContainer);
        if (!container) return;
        
        const rowId = `custom-prop-${Date.now()}`;
        const prefix = DomUtils.qs('#queue-path-prefix', this.formContainer)?.value || '';
        
        const rowHtml = `
            <div class="custom-property-row" id="${rowId}">
                <span style="flex: 0 0 auto; font-family: monospace; font-size: 12px;">${DomUtils.escapeXml(prefix)}</span>
                <input type="text" class="form-input property-suffix" placeholder="property.name" data-custom-property="suffix" />
                <span style="flex: 0 0 auto;">=</span>
                <input type="text" class="form-input property-value" placeholder="value" data-custom-property="value" />
                <button type="button" class="btn-remove" data-row-id="${rowId}">Remove</button>
            </div>
        `;
        
        container.insertAdjacentHTML('beforeend', rowHtml);
        
        // Bind remove button
        const removeBtn = container.querySelector(`#${rowId} .btn-remove`);
        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                const row = DomUtils.qs(`#${rowId}`, container);
                if (row) row.remove();
            });
        }
    }

    _collectCustomProperties(form) {
        const customPropertyRows = form.querySelectorAll('.custom-property-row');
        if (customPropertyRows.length === 0) return null;
        
        const prefix = DomUtils.qs('#queue-path-prefix', form)?.value || '';
        const customProperties = {};
        
        for (const row of customPropertyRows) {
            const suffixInput = row.querySelector('[data-custom-property="suffix"]');
            const valueInput = row.querySelector('[data-custom-property="value"]');
            
            if (suffixInput && valueInput) {
                const suffix = suffixInput.value.trim();
                const value = valueInput.value.trim();
                
                if (suffix && value) {
                    const fullKey = prefix + suffix;
                    customProperties[fullKey] = value;
                }
            }
        }
        
        return Object.keys(customProperties).length > 0 ? customProperties : null;
    }

    _bindAutoCreationEvents(form) {
        const autoCreationToggle = DomUtils.qs('#auto-creation-enabled', form);
        const templateSection = DomUtils.qs('#auto-creation-template', form);
        
        if (autoCreationToggle) {
            // Set initial template visibility
            this._updateTemplateVisibility(autoCreationToggle.value === 'true', templateSection);
            
            autoCreationToggle.addEventListener('change', () => {
                const enabled = autoCreationToggle.value === 'true';
                this._updateTemplateVisibility(enabled, templateSection);
            });
        }
    }

    _updateTemplateVisibility(enabled, templateSection) {
        if (templateSection) {
            templateSection.style.display = enabled ? 'block' : 'none';
        }
    }
}
