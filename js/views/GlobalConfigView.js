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
                if (Object.keys(formData.params).length > 0) {
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
     */
    render(globalConfigData) {
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
                    // For empty inputs, use empty string to show placeholder; for display, use default
                    const inputValue = liveValue === undefined ? '' : liveValue;
                    const isDefault = liveValue === undefined;
                    const inputId = `global-config-${propertyName.replaceAll('.', '-')}`;

                    html += `<div class="config-item" data-property-name="${DomUtils.escapeXml(propertyName)}">
                                <div class="config-item-col-left">
                                    <div class="config-display-name">
                                        <span>${DomUtils.escapeXml(metadata.displayName)}</span>
                                        ${isDefault ? '<span class="default-indicator" title="This field is using the default value">Default</span>' : ''}
                                    </div>
                                    <div class="config-yarn-property">${DomUtils.escapeXml(propertyName)}</div>
                                </div>
                                <div class="config-item-col-middle config-description">
                                    ${DomUtils.escapeXml(metadata.description || '')}
                                </div>
                                <div class="config-item-col-right config-item-value-control">`;

                    html += this._buildInputControl(inputId, metadata, inputValue, propertyName);
                    html += `       </div></div>`;
                }
                html += `</div>`;
            }
        }

        this.containerEl.innerHTML = html || '<p>No global scheduler settings are configured for display.</p>';
        
        // Bind toggle switch events
        this._bindToggleSwitchEvents();
        
        // Set initial save button state
        this._updateSaveButtonState();
    }

    _buildInputControl(inputId, metadata, currentValue, propertyName) {
        // Escape for HTML attributes  
        const escapedCurrentValue = DomUtils.escapeXml(String(currentValue));
        const escapedPropertyName = DomUtils.escapeXml(propertyName);
        const escapedDefaultValue = DomUtils.escapeXml(String(metadata.defaultValue || ''));

        const dataAttributes = `data-original-value="${escapedDefaultValue}" data-prop-name="${escapedPropertyName}"`;

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
                
                // Handle different input types
                let newValue;
                if (inputElement.type === 'checkbox') {
                    // For toggle switches (boolean properties)
                    newValue = inputElement.checked ? 'true' : 'false';
                } else {
                    newValue = inputElement.value;
                }

                // Only include changed values
                if (newValue !== originalValue) {
                    formData.params[propertyName] = newValue;
                }
            }
        }
        return formData;
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
        
        // Update button text to provide better feedback
        this.saveBtn.textContent = hasChanges ? 'Save Changes' : 'No Changes';
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
}
