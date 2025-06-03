class GlobalConfigView extends EventEmitter {
    constructor(appStateModel) {
        super();
        this.appStateModel = appStateModel; // To get current edit mode state

        this.containerEl = DomUtils.getById('global-scheduler-settings-container');
        this.actionsContainerEl = DomUtils.getById('global-config-actions'); // The div holding the buttons

        if (!this.containerEl || !this.actionsContainerEl) {
            console.error("GlobalConfigView: Required DOM elements not found.");
            return;
        }

        // Buttons are within the actionsContainerEl, specific to this view/tab
        this.editBtn = DomUtils.getById('edit-global-config-btn');
        this.saveBtn = DomUtils.getById('save-global-config-btn');
        this.cancelBtn = DomUtils.getById('cancel-global-config-btn');

        this._bindLocalEvents();

        // Subscribe to AppStateModel for edit mode changes relevant to this view
        this.appStateModel.subscribe('globalConfigEditModeChanged', (isEditing) => {
            // The controller will call this.render() with the necessary data
            // when both mode and data are ready. This subscription just ensures
            // buttons update if mode is toggled programmatically for any other reason.
            this._updateButtonVisibility(isEditing);
        });
    }

    _bindLocalEvents() {
        if (this.editBtn) {
            this.editBtn.addEventListener('click', () => this._emit('editGlobalConfigClicked'));
        }
        if (this.saveBtn) {
            this.saveBtn.addEventListener('click', () => {
                const formData = this._collectFormData();
                if (Object.keys(formData.params).length > 0) {
                    this._emit('saveGlobalConfigClicked', formData);
                } else {
                    // No actual changes were made, treat as cancel or just switch mode
                    this._emit('cancelGlobalConfigClicked'); // Or a specific "noChangesToSave" event
                    this._emit('showNotification', { message: "No changes detected to save.", type: "info" });
                }
            });
        }
        if (this.cancelBtn) {
            this.cancelBtn.addEventListener('click', () => this._emit('cancelGlobalConfigClicked'));
        }
    }

    _updateButtonVisibility(isEditing) {
        if (!this.editBtn || !this.saveBtn || !this.cancelBtn) return;
        DomUtils.show(this.editBtn, !isEditing ? 'inline-block' : 'none');
        DomUtils.show(this.saveBtn, isEditing ? 'inline-block' : 'none');
        DomUtils.show(this.cancelBtn, isEditing ? 'inline-block' : 'none');
    }

    /**
     * Renders the global scheduler settings page.
     * @param {Map<string, string>} globalConfigData - Map of full YARN property name to value from SchedulerConfigModel.
     * @param {boolean} isInEditMode - Current edit mode state from AppStateModel.
     */
    render(globalConfigData, isInEditMode) {
        if (!this.containerEl) return;
        DomUtils.empty(this.containerEl);
        this._updateButtonVisibility(isInEditMode);

        if (!GLOBAL_CONFIG_METADATA || GLOBAL_CONFIG_METADATA.length === 0) {
            this.containerEl.innerHTML = '<p>No global scheduler settings categories are defined in the UI metadata.</p>';
            if (this.editBtn) this.editBtn.disabled = true;
            return;
        }
        if (this.editBtn) this.editBtn.disabled = false;

        let html = '';
        GLOBAL_CONFIG_METADATA.forEach(group => {
            if (group.properties && Object.keys(group.properties).length > 0) {
                html += `<div class="config-group">`;
                html += `<h3 class="config-group-title">${DomUtils.escapeXml(group.groupName)}</h3>`;

                Object.entries(group.properties).forEach(([propName, metadata]) => {
                    const liveValue = globalConfigData ? globalConfigData.get(propName) : undefined;
                    const currentValue = liveValue !== undefined ? liveValue : metadata.defaultValue;
                    const isDefaultUsed = liveValue === undefined;
                    const inputId = `global-config-${propName.replace(/\./g, "-")}`;
                    const displayNameSuffix = isDefaultUsed && !isInEditMode ? ' <em class="default-value-indicator">(default)</em>' : '';

                    html += `<div class="config-item" data-property-name="${DomUtils.escapeXml(propName)}">
                                <div class="config-item-col-left">
                                    <div class="config-display-name">${DomUtils.escapeXml(metadata.displayName)}${displayNameSuffix}</div>
                                    <div class="config-yarn-property">${DomUtils.escapeXml(propName)}</div>
                                </div>
                                <div class="config-item-col-middle config-description">
                                    ${DomUtils.escapeXml(metadata.description || '')}
                                </div>
                                <div class="config-item-col-right config-item-value-control">`;

                    if (isInEditMode) {
                        html += this._buildInputControl(inputId, metadata, currentValue, propName);
                    } else {
                        html += `<span class="config-value-display">${DomUtils.escapeXml(String(currentValue))}</span>`;
                    }
                    html += `       </div></div>`;
                });
                html += `</div>`;
            }
        });

        this.containerEl.innerHTML = html || '<p>No global scheduler settings are configured for display.</p>';
    }

    _buildInputControl(inputId, metadata, currentValue, propName) {
        let inputHtml = '';
        // Escape for HTML attributes
        const escapedCurrentValue = DomUtils.escapeXml(String(currentValue));
        const escapedPropName = DomUtils.escapeXml(propName);

        const dataAttributes = `data-original-value="${escapedCurrentValue}" data-prop-name="${escapedPropName}"`;

        if (metadata.type === "boolean") {
            inputHtml = `<select id="${inputId}" class="config-value-input" ${dataAttributes}>
                            <option value="true" ${String(currentValue) === "true" ? "selected" : ""}>true</option>
                            <option value="false" ${String(currentValue) === "false" ? "selected" : ""}>false</option>
                         </select>`;
        } else if (metadata.type === "number" || metadata.type === "percentage") {
            let attrs = `type="number" value="${escapedCurrentValue}" ${dataAttributes}`;
            if (metadata.step !== undefined) attrs += ` step="${metadata.step}"`;
            if (metadata.min !== undefined) attrs += ` min="${metadata.min}"`;
            if (metadata.max !== undefined) attrs += ` max="${metadata.max}"`;
            if (metadata.type === "percentage" && metadata.step === undefined) attrs += ` step="0.01"`; // Default step for %
            if (metadata.type === "percentage" && metadata.min === undefined) attrs += ` min="0"`;
            if (metadata.type === "percentage" && metadata.max === undefined) attrs += ` max="1"`; // Default max for %

            inputHtml = `<input id="${inputId}" class="config-value-input" ${attrs}>`;
        } else { // Default to text
            inputHtml = `<input type="text" id="${inputId}" class="config-value-input" value="${escapedCurrentValue}" ${dataAttributes}>`;
        }
        return inputHtml;
    }

    _collectFormData() {
        const formData = { params: {} }; // params will hold { 'full.yarn.key': 'newValue' }
        const configItems = DomUtils.qsa('.config-item', this.containerEl);

        configItems.forEach(item => {
            const inputElement = item.querySelector('.config-value-input');
            if (inputElement) {
                const propName = inputElement.getAttribute('data-prop-name');
                const originalValue = inputElement.getAttribute('data-original-value');
                const newValue = inputElement.value;

                // Only include changed values
                if (newValue !== originalValue) {
                    formData.params[propName] = newValue;
                }
            }
        });
        return formData;
    }
}