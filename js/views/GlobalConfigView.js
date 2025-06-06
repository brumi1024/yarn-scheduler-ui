class GlobalConfigView extends EventEmitter {
    constructor() {
        super();
        this.containerEl = DomUtils.getById('global-scheduler-settings-container');
        this.saveBtn = DomUtils.getById('save-global-config-btn');

        if (!this.containerEl) {
            console.error('GlobalConfigView: Required DOM element not found.');
            return;
        }

        this._bindEvents();
    }

    _bindEvents() {
        // Bind save button click
        if (this.saveBtn) {
            this.saveBtn.addEventListener('click', () => {
                const formData = this._collectFormData();
                const hasStandardChanges = Object.keys(formData.params).length > 0;
                const hasCustomChanges = formData.customProperties && Object.keys(formData.customProperties).length > 0;
                const hasAnyChanges = hasStandardChanges || hasCustomChanges;
                
                if (hasAnyChanges) {
                    this._emit('saveGlobalConfigClicked', formData);
                } else {
                    this._emit('showNotification', { message: 'No changes detected to save.', type: 'info' });
                }
            });
        }

        // Bind change events to update save button state
        this.containerEl.addEventListener('input', () => {
            this._updateSaveButtonState();
        });

        this.containerEl.addEventListener('change', () => {
            this._updateSaveButtonState();
        });
    }

    /**
     * Renders the global scheduler settings page.
     * @param {Map<string, string>} globalConfigData - Map of full YARN property name to value from SchedulerConfigModel.
     * @param {Map<string, string>} pendingChanges - Map of staged changes (optional)
     */
    render(globalConfigData, pendingChanges = new Map()) {
        if (!this.containerEl) return;
        DomUtils.empty(this.containerEl);

        if (!GLOBAL_CONFIG_METADATA || GLOBAL_CONFIG_METADATA.length === 0) {
            this.containerEl.innerHTML =
                '<p>No global scheduler settings categories are defined in the UI metadata.</p>';
            return;
        }

        let html = '';
        for (const group of GLOBAL_CONFIG_METADATA) {
            if (group.properties && Object.keys(group.properties).length > 0) {
                html += `<div class="config-group">`;
                html += `<h3 class="config-group-title">${DomUtils.escapeXml(group.groupName)}</h3>`;

                for (const [propertyName, metadata] of Object.entries(group.properties)) {
                    const liveValue = globalConfigData ? globalConfigData.get(propertyName) : undefined;
                    const pendingValue = pendingChanges.get(propertyName);
                    const hasPendingChange = pendingValue !== undefined;
                    
                    // For empty inputs, use empty string to show placeholder; for display, use default
                    const inputValue = liveValue === undefined ? '' : liveValue;
                    const isDefault = liveValue === undefined;
                    const inputId = `global-config-${propertyName.replaceAll('.', '-')}`;

                    html += `<div class="config-item ${hasPendingChange ? 'has-staged-changes' : ''}" data-property-name="${DomUtils.escapeXml(propertyName)}">
                                <div class="config-item-col-left">
                                    <div class="config-display-name">
                                        <span>${DomUtils.escapeXml(metadata.displayName)}</span>
                                        ${isDefault ? '<span class="default-indicator" title="This field is using the default value">Default</span>' : ''}
                                        ${hasPendingChange ? '<span class="staged-indicator" title="This field has staged changes">Staged</span>' : ''}
                                    </div>
                                    <div class="config-yarn-property">${DomUtils.escapeXml(propertyName)}</div>
                                </div>
                                <div class="config-item-col-middle config-description">
                                    ${DomUtils.escapeXml(metadata.description || '')}
                                </div>
                                <div class="config-item-col-right config-item-value-control">`;

                    html += this._buildInputControl(inputId, metadata, inputValue, propertyName, liveValue);
                    html += `       </div></div>`;
                }
                html += `</div>`;
            }
        }

        // Add custom properties section
        html += this._buildCustomPropertiesSectionHtml();
        
        this.containerEl.innerHTML = html || '<p>No global scheduler settings are configured for display.</p>';
        
        // Bind toggle switch events
        this._bindToggleSwitchEvents();
        
        // Bind custom properties events
        this._bindCustomPropertiesEvents();
        
        // Set initial save button state
        this._updateSaveButtonState();
    }

    _buildInputControl(inputId, metadata, currentValue, propertyName, originalValue = undefined) {
        // Escape for HTML attributes  
        const escapedCurrentValue = DomUtils.escapeXml(String(currentValue));
        const escapedPropertyName = DomUtils.escapeXml(propertyName);
        const escapedDefaultValue = DomUtils.escapeXml(String(metadata.defaultValue || ''));
        
        // Use the original value from the server, or undefined if not set
        const escapedOriginalValue = originalValue !== undefined ? DomUtils.escapeXml(String(originalValue)) : '';
        const wasConfigured = originalValue !== undefined;

        const dataAttributes = `data-original-value="${escapedOriginalValue}" data-prop-name="${escapedPropertyName}" data-was-configured="${wasConfigured}" data-default-value="${escapedDefaultValue}"`;

        if (metadata.type === 'boolean') {
            // For boolean inputs, handle both empty and actual values
            const isChecked = currentValue === '' ? (metadata.defaultValue === 'true' || metadata.defaultValue === true) : String(currentValue) === 'true';
            const effectiveValue = currentValue === '' ? (isChecked ? 'true' : 'false') : String(currentValue);
            
            return `<div class="toggle-container">
                        <label class="toggle-switch">
                            <input type="checkbox" id="${inputId}" class="config-value-input" ${dataAttributes} ${isChecked ? 'checked' : ''}>
                            <span class="toggle-slider"></span>
                        </label>
                        <span class="toggle-label ${isChecked ? 'active' : ''}">${effectiveValue}</span>
                     </div>`;
        } else if (metadata.type === 'number' || metadata.type === 'percentage') {
            let attributes = `type="number" value="${escapedCurrentValue}" ${dataAttributes}`;
            if (metadata.step !== undefined) attributes += ` step="${metadata.step}"`;
            if (metadata.min !== undefined) attributes += ` min="${metadata.min}"`;
            if (metadata.max !== undefined) attributes += ` max="${metadata.max}"`;
            if (metadata.type === 'percentage' && metadata.step === undefined) attributes += ` step="0.01"`;
            if (metadata.type === 'percentage' && metadata.min === undefined) attributes += ` min="0"`;
            if (metadata.type === 'percentage' && metadata.max === undefined) attributes += ` max="1"`;
            
            // Add placeholder for empty fields
            if (metadata.placeholder) {
                attributes += ` placeholder="${DomUtils.escapeXml(metadata.placeholder)}"`;
            } else if (metadata.defaultValue !== undefined) {
                attributes += ` placeholder="Default: ${escapedDefaultValue}"`;
            }

            return `<input id="${inputId}" class="config-value-input" ${attributes}>`;
        } else {
            // Default to text with placeholder
            let attributes = `type="text" value="${escapedCurrentValue}" ${dataAttributes}`;
            
            if (metadata.placeholder) {
                attributes += ` placeholder="${DomUtils.escapeXml(metadata.placeholder)}"`;
            } else if (metadata.defaultValue !== undefined) {
                attributes += ` placeholder="Default: ${escapedDefaultValue}"`;
            }

            return `<input id="${inputId}" class="config-value-input" ${attributes}>`;
        }
    }

    _collectFormData() {
        const formData = { params: {} }; // params will hold { 'full.yarn.key': 'newValue' }
        const configItems = DomUtils.qsa('.config-item', this.containerEl);

        for (const item of configItems) {
            const inputElement = item.querySelector('.config-value-input');
            if (inputElement) {
                const propertyName = inputElement.dataset.propName;
                const originalValue = inputElement.dataset.originalValue;
                const wasConfigured = inputElement.dataset.wasConfigured === 'true';
                const defaultValue = inputElement.dataset.defaultValue;
                
                // Handle different input types
                let newValue;
                if (inputElement.type === 'checkbox') {
                    // For toggle switches (boolean properties)
                    newValue = inputElement.checked ? 'true' : 'false';
                } else {
                    newValue = inputElement.value.trim();
                }

                // Enhanced change detection logic
                const shouldInclude = this._shouldIncludePropertyChange(
                    newValue, 
                    originalValue, 
                    wasConfigured, 
                    defaultValue
                );

                if (shouldInclude) {
                    formData.params[propertyName] = newValue;
                }
            }
        }
        
        // Collect custom properties
        const customProperties = this._collectCustomProperties();
        if (customProperties) {
            // Custom properties use full YARN keys, not simple keys
            formData.customProperties = customProperties;
        }
        
        return formData;
    }

    /**
     * Determines whether a property change should be included in the form data.
     * @param {string} newValue - The new value from the input
     * @param {string} originalValue - The original value from server (empty string if not configured)
     * @param {boolean} wasConfigured - Whether the property was previously configured
     * @param {string} defaultValue - The default value for this property
     * @returns {boolean} Whether to include this change
     * @private
     */
    _shouldIncludePropertyChange(newValue, originalValue, wasConfigured, defaultValue) {
        // Case 1: Value hasn't changed from original - don't send
        if (newValue === originalValue) {
            return false;
        }
        
        // Case 2: Property was never configured before (wasConfigured = false)
        if (!wasConfigured) {
            // If the new value is empty, don't send (user didn't set anything)
            if (newValue === '') {
                return false;
            }
            // If the new value equals the default, don't send (effectively no change)
            if (newValue === defaultValue) {
                return false;
            }
            // Otherwise, this is a real addition - send it
            return true;
        }
        
        // Case 3: Property was configured before (wasConfigured = true)
        // Any change from the original value should be sent, including empty string
        // (empty string means "clear this property and use default")
        return true;
    }

    /**
     * Updates the save button state based on whether there are changes.
     * @private
     */
    _updateSaveButtonState() {
        if (!this.saveBtn) return;
        
        const formData = this._collectFormData();
        const hasChanges = Object.keys(formData.params).length > 0;
        
        this.saveBtn.disabled = !hasChanges;
        
        // Check for custom properties changes as well
        const customProperties = this._collectCustomProperties();
        const hasCustomChanges = customProperties && Object.keys(customProperties).length > 0;
        const hasAnyChanges = hasChanges || hasCustomChanges;
        
        this.saveBtn.disabled = !hasAnyChanges;
        
        // Update button text to provide better feedback
        this.saveBtn.textContent = hasAnyChanges ? 'Stage Changes' : 'No Changes';
    }

    /**
     * Binds toggle switch events to update labels when switches are toggled.
     * @private
     */
    _bindToggleSwitchEvents() {
        const toggleSwitches = this.containerEl.querySelectorAll('.toggle-switch input[type="checkbox"]');
        
        for (const toggleInput of toggleSwitches) {
            toggleInput.addEventListener('change', (event) => {
                const isChecked = event.target.checked;
                const toggleContainer = event.target.closest('.toggle-container');
                const label = toggleContainer.querySelector('.toggle-label');
                
                if (label) {
                    label.textContent = isChecked ? 'true' : 'false';
                    label.classList.toggle('active', isChecked);
                }
            });
        }
    }
    
    /**
     * Builds the custom properties section HTML for global scheduler settings.
     * @returns {string} Custom properties section HTML
     * @private
     */
    _buildCustomPropertiesSectionHtml() {
        const sectionHtml = `
            <div class="config-group custom-properties-group">
                <h3 class="config-group-title collapsible collapsed" id="global-custom-properties-header">
                    <span class="collapse-icon">▶</span>
                    <span>⚠️ Custom Global Properties (Advanced)</span>
                </h3>
                <div class="custom-properties-content" id="global-custom-properties-content" style="display: none;">
                    <p class="form-help" style="margin-bottom: 15px; color: #856404; background-color: #fff3cd; padding: 10px; border-radius: 4px;">
                        <strong>Warning:</strong> Custom global properties are not validated by the UI. Ensure property names and values are correct to avoid YARN configuration errors.
                    </p>
                    <div id="global-custom-properties-list">
                        <!-- Custom properties will be added here dynamically -->
                    </div>
                    <button type="button" class="btn btn-secondary" id="add-global-custom-property-btn" style="margin-top: 10px;">
                        + Add Custom Global Property
                    </button>
                    <input type="hidden" id="global-property-prefix" value="yarn.scheduler.capacity." />
                </div>
            </div>
        `;
        return sectionHtml;
    }
    
    /**
     * Binds events for custom properties functionality.
     * @private
     */
    _bindCustomPropertiesEvents() {
        const header = DomUtils.qs('#global-custom-properties-header', this.containerEl);
        const content = DomUtils.qs('#global-custom-properties-content', this.containerEl);
        const addButton = DomUtils.qs('#add-global-custom-property-btn', this.containerEl);
        
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
    
    /**
     * Adds a new custom property row to the form.
     * @private
     */
    _addCustomPropertyRow() {
        const container = DomUtils.qs('#global-custom-properties-list', this.containerEl);
        if (!container) return;
        
        const rowId = `global-custom-prop-${Date.now()}`;
        const prefix = DomUtils.qs('#global-property-prefix', this.containerEl)?.value || '';
        
        const rowHtml = `
            <div class="custom-property-row" id="${rowId}">
                <span style="flex: 0 0 auto; font-family: monospace; font-size: 12px;">${DomUtils.escapeXml(prefix)}</span>
                <input type="text" class="config-value-input property-suffix" placeholder="property.name" data-custom-property="suffix" />
                <span style="flex: 0 0 auto;">=</span>
                <input type="text" class="config-value-input property-value" placeholder="value" data-custom-property="value" />
                <button type="button" class="btn-remove" data-row-id="${rowId}">Remove</button>
            </div>
        `;
        
        container.insertAdjacentHTML('beforeend', rowHtml);
        
        // Bind remove button
        const removeBtn = container.querySelector(`#${rowId} .btn-remove`);
        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                const row = DomUtils.qs(`#${rowId}`, container);
                if (row) {
                    row.remove();
                    // Update save button state after removing a row
                    this._updateSaveButtonState();
                }
            });
        }
        
        // Bind input events to update save button state and validate
        const inputs = container.querySelectorAll(`#${rowId} input`);
        for (const input of inputs) {
            input.addEventListener('input', () => {
                this._validateCustomPropertyRow(input.closest('.custom-property-row'));
                this._updateSaveButtonState();
            });
            input.addEventListener('blur', () => {
                this._validateCustomPropertyRow(input.closest('.custom-property-row'));
            });
        }
    }
    
    /**
     * Collects custom properties from the form.
     * @returns {Object|null} Custom properties object or null if none
     * @private
     */
    _collectCustomProperties() {
        const customPropertyRows = this.containerEl.querySelectorAll('#global-custom-properties-list .custom-property-row');
        if (customPropertyRows.length === 0) return null;
        
        const prefix = DomUtils.qs('#global-property-prefix', this.containerEl)?.value || '';
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
    
    /**
     * Validates a custom property row for empty property names.
     * @param {HTMLElement} row - The custom property row element
     * @private
     */
    _validateCustomPropertyRow(row) {
        if (!row) return;
        
        const suffixInput = row.querySelector('[data-custom-property="suffix"]');
        const valueInput = row.querySelector('[data-custom-property="value"]');
        
        if (suffixInput && valueInput) {
            const suffix = suffixInput.value.trim();
            const value = valueInput.value.trim();
            
            // Show error for empty property name if value is provided
            if (!suffix && value) {
                suffixInput.classList.add('invalid');
                suffixInput.style.borderColor = '#dc3545';
                suffixInput.title = 'Property name cannot be empty';
            } else {
                suffixInput.classList.remove('invalid');
                suffixInput.style.borderColor = '';
                suffixInput.title = '';
            }
            
            // Show error for empty value if property name is provided
            if (suffix && !value) {
                valueInput.classList.add('invalid');
                valueInput.style.borderColor = '#dc3545';
                valueInput.title = 'Property value cannot be empty';
            } else {
                valueInput.classList.remove('invalid');
                valueInput.style.borderColor = '';
                valueInput.title = '';
            }
        }
    }
}
