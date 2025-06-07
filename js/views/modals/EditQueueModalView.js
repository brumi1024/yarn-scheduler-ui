class EditQueueModalView extends BaseModalView {
    constructor(controller) {
        super('edit-modal', controller);
        this.currentQueuePath = null;
        this.currentQueueData = null; // To store the data passed to show() for re-rendering node labels
        this.viewDataFormatterService = controller.viewDataFormatterService; // For default capacity values
        this.eventCleanupCallbacks = []; // Track event listeners for cleanup
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

        this._cleanupEventListeners();
        DomUtils.empty(this.formContainer);
        this.currentQueuePath = data.path;
        this.currentQueueData = data;

        const modalTitleElement = DomUtils.qs('.modal-title', this.modalEl);
        if (modalTitleElement)
            modalTitleElement.textContent = `Edit Queue: ${DomUtils.escapeXml(data.displayName || data.path.split('.').pop())}`;

        this.formContainer.innerHTML = this._buildHtml(data);

        const modalContent = this.formContainer.parentElement.parentElement;

        const existingActions = modalContent.querySelector('.modal-actions');
        if (existingActions) {
            existingActions.remove();
        }
        const modalActions = document.createElement('div');
        modalActions.className = 'modal-actions';
        modalActions.innerHTML = `
            <button class="btn btn-secondary" id="cancel-edit-queue-btn">Cancel</button>
            <button class="btn btn-primary" id="submit-edit-queue-btn">Stage Changes</button>
        `;
        modalContent.appendChild(modalActions);

        if (window.TooltipHelper) {
            TooltipHelper.upgradeModalTooltips(this.formContainer);
        }

        this._bindFormEvents(data.path, data.effectiveCapacityMode);
    }

    _buildHtml(data) {
        const { path, displayName, properties, propertyDefaults, nodeLabelData, effectiveCapacityMode, isLegacyMode } =
            data;
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

        // Partition context indicator
        if (data.selectedPartition && data.selectedPartition !== DEFAULT_PARTITION) {
            formHTML += `<div class="partition-context-indicator">
                            <div class="partition-context-icon">⚠️</div>
                            <div class="partition-context-text">
                                <strong>Editing ${DomUtils.escapeXml(data.selectedPartition)} Partition</strong><br>
                                Capacity values apply to ${DomUtils.escapeXml(data.selectedPartition)} labeled nodes only
                            </div>
                         </div>`;
        }

        // Capacity Mode
        const capacityModeTooltip = isLegacyMode
            ? 'Determines how queue capacity is specified. In legacy mode, all queues in a hierarchy must use the same capacity mode.'
            : 'Determines how queue capacity is specified. Non-legacy mode allows mixing capacity modes and Resource Vectors.';

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

        formHTML += `</form>`;
        return formHTML;
    }

    /**
     * Cleans up event listeners to prevent memory leaks and conflicts
     * @private
     */
    _cleanupEventListeners() {
        // Execute all cleanup callbacks
        for (const cleanup of this.eventCleanupCallbacks) {
            try {
                cleanup();
            } catch (error) {
                console.warn('Error during event listener cleanup:', error);
            }
        }
        this.eventCleanupCallbacks = [];
    }

    /**
     * Override hide to ensure event cleanup
     */
    hide(result) {
        this._cleanupEventListeners();
        super.hide(result);
    }

    _buildNodeLabelSectionHtml(queuePath, nodeLabelData) {
        let sectionHtml = `<h4 class="form-category-title">Node Label Configurations</h4>`;

        // Build visual label selector
        sectionHtml += this._buildAccessibleLabelsChips(queuePath, nodeLabelData.accessibleNodeLabelsString);

        // Parse current labels to build tabs
        const currentLabelsResult = ValidationService.validateNodeLabelsString(
            nodeLabelData.accessibleNodeLabelsString
        );
        const currentLabels = currentLabelsResult.isValid ? currentLabelsResult.labels : [];
        const filteredLabels = currentLabels.filter((label) => label && label !== '*' && label !== '');

        if (filteredLabels.length > 0) {
            // Build tabbed interface for per-label configurations
            sectionHtml += this._buildNodeLabelTabsHtml(queuePath, nodeLabelData, filteredLabels);
        } else if (currentLabels.length === 0 || currentLabels[0] === '') {
            sectionHtml += `<div style="margin-top: 15px; padding: 12px; background-color: #f8f9fa; border: 1px solid #dee2e6; border-radius: 4px; border-left: 4px solid #6c757d;">
                <p class="form-help" style="margin: 0; color: #6c757d;">No specific labels configured. Edit 'Accessible Node Labels' above to add specific labels.</p>
            </div>`;
        } else if (currentLabels[0] === '*') {
            sectionHtml += `<div style="margin-top: 15px; padding: 12px; background-color: #f8f9fa; border: 1px solid #dee2e6; border-radius: 4px; border-left: 4px solid #6c757d;">
                <p class="form-help" style="margin: 0; color: #6c757d;">Queue has access to all ('*') labels. To set specific capacities per label, list them explicitly above instead of using '*'.</p>
            </div>`;
        }

        return sectionHtml;
    }

    /**
     * Builds the tabbed interface for node label capacity configurations.
     * @param {string} queuePath - The queue path
     * @param {Object} nodeLabelData - Node label data containing parameters
     * @param {string[]} labels - Array of accessible labels
     * @returns {string} Tabbed node label HTML
     * @private
     */
    _buildNodeLabelTabsHtml(queuePath, nodeLabelData, labels) {
        const tabsHtml = `
            <div class="node-label-tabs" style="margin-top: 15px; border-left: 4px solid #007bff; padding: 15px 15px 0 15px; background-color: #f8f9fa; border-radius: 4px;">
                <h6 style="margin: 0 0 10px 0; color: #666;">Label-Specific Capacity Configuration</h6>
                
                <!-- Tab Headers -->
                <div class="node-label-tab-headers" style="display: flex; border-bottom: 1px solid #dee2e6; margin-bottom: 15px;">
                    ${labels
                        .map(
                            (label, index) => `
                        <button type="button" class="node-label-tab-header ${index === 0 ? 'active' : ''}" data-label-tab="${label}" style="padding: 8px 16px; border: 1px solid #dee2e6; border-bottom: none; background: ${index === 0 ? 'white' : '#f8f9fa'}; cursor: pointer; border-radius: 4px 4px 0 0; margin-right: 2px;">
                            ${DomUtils.escapeXml(label)}
                        </button>
                    `
                        )
                        .join('')}
                </div>
                
                <!-- Tab Content -->
                <div class="node-label-tab-content" style="margin-bottom: 15px; padding: 0 10px;">
                    ${labels
                        .map((label, index) =>
                            this._buildNodeLabelTabContent(label, queuePath, nodeLabelData, index === 0)
                        )
                        .join('')}
                </div>
            </div>
        `;
        return tabsHtml;
    }

    /**
     * Builds content for a single node label tab.
     * @param {string} label - The node label name
     * @param {string} queuePath - The queue path
     * @param {Object} nodeLabelData - Node label data containing parameters
     * @param {boolean} isActive - Whether this tab is initially active
     * @returns {string} Tab content HTML
     * @private
     */
    _buildNodeLabelTabContent(label, queuePath, nodeLabelData, isActive) {
        let contentHtml = `
            <div class="node-label-tab-pane" data-label-tab-content="${label}" style="display: ${isActive ? 'block' : 'none'};">
                <p class="form-help" style="margin-bottom: 15px; color: #666; font-style: italic;">Capacity configuration for nodes with label '${DomUtils.escapeXml(label)}':</p>
        `;

        // Build property inputs for this label
        const hasProperties = Object.keys(NODE_LABEL_CONFIG_METADATA.perLabelProperties).length > 0;

        if (hasProperties) {
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
                contentHtml += this._buildPropertyInputHtml(
                    simpleSubKey,
                    fullYarnPropertyName,
                    augmentedMeta,
                    currentValue,
                    `label-${label}-${meta.key}`,
                    nodeLabelData.labelSpecificParams[simpleSubKey] === undefined // Is default if not explicitly set
                );
            }
        } else {
            contentHtml += `
                <p class="form-help" style="color: #6c757d; font-style: italic;">No label-specific properties configured for this label.</p>
            `;
        }

        contentHtml += `</div>`;
        return contentHtml;
    }

    /**
     * Builds visual chip selector for accessible node labels
     * @private
     */
    _buildAccessibleLabelsChips(queuePath, accessibleLabelsString) {
        const isRootQueue = NodeLabelService.isRootQueue(queuePath);
        const availableLabels = NodeLabelService.getAvailableNodeLabels(
            this.controller.schedulerInfoModel,
            this.controller.nodesInfoModel
        );
        const currentLabels = NodeLabelService.formatLabelsForChips(accessibleLabelsString);

        let html = `<div class="form-group">
                        <label class="form-label">Accessible Node Labels</label>`;

        if (isRootQueue) {
            html += `<p class="form-help">Root queue has access to all node labels.</p>`;
        } else {
            html += `<div class="node-label-chips" id="node-label-chips">`;

            // Add chips for all available labels
            for (const label of availableLabels) {
                const isEnabled = currentLabels.some((chip) => chip.name === label);
                const chipClass = isEnabled ? 'node-label-chip enabled' : 'node-label-chip';
                html += `<button type="button" class="${chipClass}" data-label="${label}">
                            ${DomUtils.escapeXml(label)}
                         </button>`;
            }

            if (availableLabels.length === 0) {
                html += `<p class="form-help">No node labels available in cluster.</p>`;
            }

            html += `</div>`;
        }

        // Hidden input to store the actual value
        const anlMeta =
            NODE_LABEL_CONFIG_METADATA[`yarn.scheduler.capacity.${Q_PATH_PLACEHOLDER}.accessible-node-labels`];
        const anlFullKey = `yarn.scheduler.capacity.${queuePath}.accessible-node-labels`;

        html += `<input type="hidden" 
                        class="form-input" 
                        id="edit-queue-accessible-node-labels-list-input"
                        data-simple-key="${anlMeta.key}"
                        data-original-value="${DomUtils.escapeXml(accessibleLabelsString)}"
                        value="${DomUtils.escapeXml(accessibleLabelsString)}" />`;

        html += `</div>`;
        return html;
    }

    _buildAutoCreationSectionHtml(data) {
        const { autoCreationData, isLegacyMode, path, effectiveCapacityMode } = data;

        // Determine which mode should be active and if templates should be shown initially
        const isWeightMode = effectiveCapacityMode === CAPACITY_MODES.WEIGHT;
        const shouldUseV2 = isWeightMode || !isLegacyMode;

        // Use the same logic as the toggle to determine current state
        const currentValue = shouldUseV2 ? autoCreationData.v2Enabled : autoCreationData.v1Enabled;

        const sectionHtml = `
            <div class="auto-creation-section">
                <h4 class="form-category-title">Auto Queue Creation</h4>
                ${this._buildAutoCreationToggleHtml(autoCreationData, isLegacyMode, path, effectiveCapacityMode)}
                ${this._buildAutoCreationTemplateHtml(autoCreationData, isLegacyMode, path, effectiveCapacityMode, currentValue)}
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

        const warningText =
            cannotEnableLegacy && !shouldUseV2
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
                    <div class="toggle-container">
                        <label class="toggle-switch">
                            <input type="checkbox" class="form-input" id="auto-creation-enabled" data-simple-key="${propertyKey}" data-original-value="${currentValue ? 'true' : 'false'}" ${currentValue ? 'checked' : ''} ${cannotEnableLegacy && !shouldUseV2 ? 'disabled' : ''}>
                            <span class="toggle-slider"></span>
                        </label>
                        <span class="toggle-label ${currentValue ? 'active' : ''}">${currentValue ? 'true' : 'false'}</span>
                    </div>
                </div>
            </div>
        `;
    }

    _buildAutoCreationTemplateHtml(
        autoCreationData,
        isLegacyMode,
        queuePath,
        effectiveCapacityMode,
        isInitiallyVisible = false
    ) {
        const { nonTemplateProperties, v1TemplateProperties, v2TemplateProperties } = autoCreationData;

        // Determine auto-creation mode based on capacity mode and legacy settings
        const isWeightMode = effectiveCapacityMode === CAPACITY_MODES.WEIGHT;
        const isV2Mode = isWeightMode || !isLegacyMode;

        let templateHtml = `
            <div class="auto-creation-template" id="auto-creation-template" style="display: ${isInitiallyVisible ? 'block' : 'none'}; opacity: ${isInitiallyVisible ? '1' : '0'}; overflow: hidden;">
                <h5 style="margin: 15px 0 10px; color: #666;">Auto Queue Creation Configuration</h5>
        `;

        if (isV2Mode) {
            // v2 mode: show v2 non-template properties and v2 template properties with tabs
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

            // Add tabbed interface for v2 template properties
            templateHtml += this._buildV2TemplateTabsHtml(v2TemplateProperties, queuePath);
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

    /**
     * Builds the tabbed interface for v2 auto-creation template properties.
     * @param {Object} v2TemplateProperties - v2 template properties grouped by scope
     * @param {string} queuePath - The queue path
     * @returns {string} Tabbed template HTML
     * @private
     */
    _buildV2TemplateTabsHtml(v2TemplateProperties, queuePath) {
        const tabsHtml = `
            <div class="v2-template-tabs" style="margin-top: 15px;">
                <h6 style="margin: 0 0 10px; color: #666;">Template Configuration</h6>
                
                <!-- Tab Headers -->
                <div class="template-tab-headers" style="display: flex; border-bottom: 1px solid #dee2e6; margin-bottom: 15px;">
                    <button type="button" class="template-tab-header active" data-tab="template" style="padding: 8px 16px; border: 1px solid #dee2e6; border-bottom: none; background: white; cursor: pointer; border-radius: 4px 4px 0 0; margin-right: 2px;">
                        General Template
                    </button>
                    <button type="button" class="template-tab-header" data-tab="parentTemplate" style="padding: 8px 16px; border: 1px solid #dee2e6; border-bottom: none; background: #f8f9fa; cursor: pointer; border-radius: 4px 4px 0 0; margin-right: 2px;">
                        Parent Template
                    </button>
                    <button type="button" class="template-tab-header" data-tab="leafTemplate" style="padding: 8px 16px; border: 1px solid #dee2e6; border-bottom: none; background: #f8f9fa; cursor: pointer; border-radius: 4px 4px 0 0;">
                        Leaf Template
                    </button>
                </div>
                
                <!-- Tab Content -->
                <div class="template-tab-content">
                    ${this._buildTemplateTabContent('template', v2TemplateProperties.template, queuePath, 'Properties applied to all auto-created queues:', true)}
                    ${this._buildTemplateTabContent('parentTemplate', v2TemplateProperties.parentTemplate, queuePath, 'Properties applied to auto-created parent queues:', false)}
                    ${this._buildTemplateTabContent('leafTemplate', v2TemplateProperties.leafTemplate, queuePath, 'Properties applied to auto-created leaf queues:', false)}
                </div>
            </div>
        `;
        return tabsHtml;
    }

    /**
     * Builds content for a single template tab.
     * @param {string} scopeKey - The scope key (template, parentTemplate, leafTemplate)
     * @param {Object} scopeProps - Properties for this scope
     * @param {string} queuePath - The queue path
     * @param {string} description - Description for this template type
     * @param {boolean} isActive - Whether this tab is initially active
     * @returns {string} Tab content HTML
     * @private
     */
    _buildTemplateTabContent(scopeKey, scopeProps, queuePath, description, isActive) {
        let contentHtml = `
            <div class="template-tab-pane" data-tab-content="${scopeKey}" style="display: ${isActive ? 'block' : 'none'};">
                <p class="form-help" style="margin-bottom: 15px; color: #666; font-style: italic;">${description}</p>
        `;

        if (scopeProps && Object.keys(scopeProps).length > 0) {
            for (const [propKey, propData] of Object.entries(scopeProps)) {
                const fullKey = `auto-queue-creation-v2.${scopeKey.replace(/([A-Z])/g, '-$1').toLowerCase()}.${propData.meta.key}`;
                contentHtml += this._buildPropertyInputHtml(
                    fullKey,
                    `yarn.scheduler.capacity.${DomUtils.escapeXml(queuePath)}.${fullKey}`,
                    propData.meta,
                    propData.value,
                    `v2-${scopeKey}-${propData.meta.key.replace(/[^a-zA-Z0-9]/g, '-')}`,
                    propData.isDefault
                );
            }
        } else {
            contentHtml += `
                <p class="form-help" style="color: #6c757d; font-style: italic;">No template properties configured for this scope.</p>
            `;
        }

        contentHtml += `</div>`;
        return contentHtml;
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

    _buildPropertyInputHtml(
        simpleOrPartialKey,
        fullYarnPropertyName,
        meta,
        currentValue,
        idPrefix = null,
        isDefault = false
    ) {
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
            for (const opt of meta.options || []) {
                html += `<option value="${DomUtils.escapeXml(opt)}" ${currentValue === opt ? 'selected' : ''}>${DomUtils.escapeXml(opt)}</option>`;
            }
            html += `</select>`;
        } else if (meta.type === 'boolean') {
            const isChecked = String(currentValue) === 'true';
            html += `<div class="toggle-container">
                        <label class="toggle-switch">
                            <input type="checkbox" id="${inputId}" ${dataAttributes} ${isChecked ? 'checked' : ''}>
                            <span class="toggle-slider"></span>
                        </label>
                        <span class="toggle-label ${isChecked ? 'active' : ''}">${isChecked ? 'true' : 'false'}</span>
                     </div>`;
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

        this._bindCapacityModeEvents(form);
        this._bindToggleSwitchEvents(form);
        this._bindAccessibleLabelsEvents(form, originalEffectiveCapacityMode);
        this._bindFormActionButtons(form, originalEffectiveCapacityMode);
        this._bindCustomPropertiesEvents(form);
        this._bindAutoCreationEvents(form);
        this._bindNodeLabelTabEvents(form);
    }

    /**
     * Binds capacity mode selection events
     * @private
     */
    _bindCapacityModeEvents(form) {
        const capacityModeSelect = DomUtils.qs('#edit-capacity-mode', form);
        const capacityInput = DomUtils.qs('[data-simple-key="capacity"] .form-input', form);

        if (!capacityModeSelect || !capacityInput) return;

        // Set initial placeholder
        this._updateCapacityPlaceholder(capacityInput, capacityModeSelect.value);

        const changeHandler = () => {
            const newMode = capacityModeSelect.value;
            const originalMode = capacityModeSelect.dataset.originalMode;

            // Check for auto-creation mode transition warning
            this._checkAutoCreationModeTransition(form, originalMode, newMode);

            // Update capacity input to default for the new mode
            capacityInput.value = this.viewDataFormatterService._getDefaultCapacityValue(newMode);
            // Update placeholder based on new mode
            this._updateCapacityPlaceholder(capacityInput, newMode);
        };

        capacityModeSelect.addEventListener('change', changeHandler);
        this.eventCleanupCallbacks.push(() => capacityModeSelect.removeEventListener('change', changeHandler));
    }

    /**
     * Binds accessible node labels input events
     * @private
     */
    _bindAccessibleLabelsEvents(form, originalEffectiveCapacityMode) {
        const accessibleLabelsInputElement = DomUtils.qs('#edit-queue-accessible-node-labels-list-input', form);
        if (!accessibleLabelsInputElement) return;

        // Bind chip click events
        const chipsContainer = DomUtils.qs('#node-label-chips', form);
        if (chipsContainer) {
            chipsContainer.addEventListener('click', (event) => {
                if (event.target.classList.contains('node-label-chip')) {
                    const chip = event.target;
                    const label = chip.dataset.label;
                    const isCurrentlyEnabled = chip.classList.contains('enabled');

                    // Toggle chip state
                    if (isCurrentlyEnabled) {
                        chip.classList.remove('enabled');
                    } else {
                        chip.classList.add('enabled');
                    }

                    // Update hidden input value
                    const currentLabels = NodeLabelService.formatLabelsForChips(accessibleLabelsInputElement.value);
                    const newLabelsString = NodeLabelService.updateAccessibleLabels(
                        currentLabels,
                        label,
                        !isCurrentlyEnabled
                    );

                    accessibleLabelsInputElement.value = newLabelsString;

                    // Emit change event for re-rendering
                    this._emit('accessibleLabelsListChanged', {
                        queuePath: this.currentQueuePath,
                        newLabelsString: newLabelsString,
                        currentFormParams: this._collectFormData(form, originalEffectiveCapacityMode).params,
                    });
                }
            });
        }

        // Also handle direct input changes (for backwards compatibility)
        accessibleLabelsInputElement.addEventListener('change', () => {
            const newLabelsString = accessibleLabelsInputElement.value;
            this._emit('accessibleLabelsListChanged', {
                queuePath: this.currentQueuePath,
                newLabelsString: newLabelsString,
                currentFormParams: this._collectFormData(form, originalEffectiveCapacityMode).params,
            });
        });
    }

    /**
     * Binds submit and cancel button events
     * @private
     */
    _bindFormActionButtons(form, originalEffectiveCapacityMode) {
        const submitButton = DomUtils.qs('#submit-edit-queue-btn', this.modalEl);
        if (submitButton) {
            const submitHandler = () => {
                const validatedData = this._validateAndCollectChanges(form, originalEffectiveCapacityMode);
                if (validatedData && Object.keys(validatedData.params).length > 0) {
                    this._emit('submitEditQueue', { queuePath: this.currentQueuePath, formData: validatedData });
                } else if (validatedData && Object.keys(validatedData.params).length === 0) {
                    this.controller.notificationView.showInfo('No changes detected to stage.');
                }
                // If validatedData is null, validation errors are already shown
            };
            submitButton.addEventListener('click', submitHandler);
            this.eventCleanupCallbacks.push(() => {
                submitButton.removeEventListener('click', submitHandler);
            });
        }

        const cancelButton = DomUtils.qs('#cancel-edit-queue-btn', this.modalEl);
        if (cancelButton) {
            const cancelHandler = () => this.hide({ Canceled: true });
            cancelButton.addEventListener('click', cancelHandler);
            this.eventCleanupCallbacks.push(() => cancelButton.removeEventListener('click', cancelHandler));
        }
    }

    /**
     * Validates form data and collects changes if valid
     * @param {HTMLFormElement} form - The form element
     * @param {string} originalCapacityMode - The original capacity mode
     * @returns {Object|null} Collected form data if valid, null if validation fails
     * @private
     */
    _validateAndCollectChanges(form, originalCapacityMode) {
        // Clear any existing validation messages
        const validationElements = form.querySelectorAll('.validation-message');
        validationElements.forEach((el) => (el.textContent = ''));

        let isValid = true;
        const validationErrors = [];

        // Validate capacity-related fields that have changed
        const capacityInput = form.querySelector('[data-simple-key="capacity"] .form-input');
        const maxCapacityInput = form.querySelector('[data-simple-key="maximum-capacity"] .form-input');
        const capacityModeSelect = DomUtils.qs('#edit-capacity-mode', form);

        if (capacityInput && capacityInput.value !== capacityInput.dataset.originalValue) {
            const capacityMode = capacityModeSelect ? capacityModeSelect.value : originalCapacityMode;
            const capacityValidation = ValidationService.parseAndValidateCapacityValue(
                capacityInput.value.trim(),
                capacityMode
            );

            if (capacityValidation.errors || capacityValidation.error) {
                const errorMsg = (capacityValidation.errors || [capacityValidation.error]).join(' ');
                this._showValidationError(capacityInput, errorMsg);
                validationErrors.push(`Capacity: ${errorMsg}`);
                isValid = false;
            }
        }

        if (maxCapacityInput && maxCapacityInput.value !== maxCapacityInput.dataset.originalValue) {
            // Determine max capacity mode based on value format
            let maxCapMode = CAPACITY_MODES.PERCENTAGE;
            const maxCapValue = maxCapacityInput.value.trim();
            if (this.viewDataFormatterService._isVectorString(maxCapValue)) {
                maxCapMode = CAPACITY_MODES.ABSOLUTE;
            } else if (maxCapValue.endsWith('w')) {
                maxCapMode = CAPACITY_MODES.WEIGHT;
            }

            const maxCapacityValidation = ValidationService.parseAndValidateCapacityValue(
                maxCapValue,
                maxCapMode,
                true // Allow empty
            );

            if (maxCapacityValidation.errors || maxCapacityValidation.error) {
                const errorMsg = (maxCapacityValidation.errors || [maxCapacityValidation.error]).join(' ');
                this._showValidationError(maxCapacityInput, errorMsg);
                validationErrors.push(`Maximum Capacity: ${errorMsg}`);
                isValid = false;
            }
        }

        // Validate any other changed fields that need validation
        const changedInputs = Array.from(form.querySelectorAll('.form-input')).filter(
            (input) => input.value !== input.dataset.originalValue && input.dataset.simpleKey
        );

        for (const input of changedInputs) {
            if (input === capacityInput || input === maxCapacityInput) continue; // Already validated

            const simpleKey = input.dataset.simpleKey;
            const value = input.value.trim();

            // Validate based on field type and metadata
            if (simpleKey && value) {
                // Add specific validation rules for other fields if needed
                // For now, just check for basic format issues
                if (simpleKey.includes('capacity') && value) {
                    // Additional capacity field validation could go here
                }
            }
        }

        // Note: Legacy mode capacity conflicts are now only validated at the system level
        // This allows users to stage changes one-by-one and see validation errors in batch controls

        if (!isValid) {
            // Show notification with summary of errors
            this.controller.notificationView.showError(`Validation failed: ${validationErrors.join(', ')}`);
            return null;
        }

        // If validation passes, collect the form data
        return this._collectFormData(form, originalCapacityMode);
    }

    /**
     * Shows validation error for a specific input
     * @param {HTMLInputElement} input - The input element
     * @param {string} message - Error message
     * @private
     */
    _showValidationError(input, message) {
        // Find or create validation message element
        const inputContainer = input.closest('.property-edit-item') || input.closest('.form-group');
        if (inputContainer) {
            let validationEl = inputContainer.querySelector('.validation-message');
            if (!validationEl) {
                validationEl = document.createElement('div');
                validationEl.className = 'validation-message text-danger';
                validationEl.style.fontSize = '0.875em';
                validationEl.style.marginTop = '4px';
                inputContainer.appendChild(validationEl);
            }
            validationEl.textContent = message;
        }
    }

    _collectFormData(form, originalCapacityMode) {
        const stagedChanges = { params: {} };
        const capacityModeData = this._handleCapacityModeChange(form, originalCapacityMode, stagedChanges);

        // Process all form inputs
        for (const inputElement of form.querySelectorAll('.form-input')) {
            if (inputElement.id === 'edit-capacity-mode') continue;
            this._processFormInput(inputElement, stagedChanges, capacityModeData);
        }

        // Collect custom properties
        const customProperties = this._collectCustomProperties(form);
        if (customProperties) {
            stagedChanges.customProperties = customProperties;
        }

        return stagedChanges;
    }

    /**
     * Handles capacity mode changes and returns mode data
     * @private
     */
    _handleCapacityModeChange(form, originalCapacityMode, stagedChanges) {
        const capacityModeSelect = DomUtils.qs('#edit-capacity-mode', form);
        const newCapacityMode = capacityModeSelect.value;
        const capacityModeChanged = newCapacityMode !== originalCapacityMode;

        if (capacityModeChanged) {
            stagedChanges.params['_ui_capacityMode'] = newCapacityMode;
        }

        return { newCapacityMode, capacityModeChanged };
    }

    /**
     * Processes a single form input element
     * @private
     */
    _processFormInput(inputElement, stagedChanges, { newCapacityMode, capacityModeChanged }) {
        const simpleOrPartialKey = inputElement.dataset.simpleKey;
        const originalValue = inputElement.dataset.originalValue;

        if (!simpleOrPartialKey) return;

        const newValue = this._extractInputValue(inputElement);
        const userActuallyChangedValue = newValue !== originalValue;

        const processedValue = this._processValueByType(
            simpleOrPartialKey,
            newValue,
            originalValue,
            userActuallyChangedValue,
            newCapacityMode,
            capacityModeChanged
        );

        if (processedValue.hasChanged) {
            stagedChanges.params[simpleOrPartialKey] = processedValue.value;
        }
    }

    /**
     * Extracts value from input element based on type
     * @private
     */
    _extractInputValue(inputElement) {
        if (inputElement.type === 'checkbox') {
            return inputElement.checked ? 'true' : 'false';
        }
        return inputElement.value.trim();
    }

    /**
     * Processes value based on property type (capacity, maximum-capacity, or regular)
     * @private
     */
    _processValueByType(key, newValue, originalValue, userChanged, newCapacityMode, capacityModeChanged) {
        if (key === 'capacity' || key.endsWith('.capacity')) {
            return this._processCapacityValue(
                key,
                newValue,
                originalValue,
                userChanged,
                newCapacityMode,
                capacityModeChanged
            );
        } else if (key === 'maximum-capacity') {
            return this._processMaximumCapacityValue(newValue, originalValue, userChanged);
        } else {
            return { value: newValue, hasChanged: newValue !== originalValue };
        }
    }

    /**
     * Processes capacity field values with special formatting logic
     * @private
     */
    _processCapacityValue(key, newValue, originalValue, userChanged, newCapacityMode, capacityModeChanged) {
        if (!userChanged) {
            return { value: newValue, hasChanged: false };
        }

        if (key === 'capacity' && capacityModeChanged) {
            const formattedValue = this.viewDataFormatterService._formatCapacityForDisplay(
                newValue,
                newCapacityMode,
                this.viewDataFormatterService._getDefaultCapacityValue(newCapacityMode)
            );
            return { value: formattedValue, hasChanged: true };
        }

        if (this.viewDataFormatterService._isVectorString(originalValue) && this._isEffectivelyEmptyVector(newValue)) {
            return { value: '[]', hasChanged: originalValue !== '[]' };
        }

        if (key === 'capacity') {
            const formattedValue = this.viewDataFormatterService._formatCapacityForDisplay(
                newValue,
                newCapacityMode,
                originalValue
            );
            return { value: formattedValue, hasChanged: formattedValue !== originalValue };
        }

        return { value: newValue, hasChanged: newValue !== originalValue };
    }

    /**
     * Processes maximum capacity field values
     * @private
     */
    _processMaximumCapacityValue(newValue, originalValue, userChanged) {
        if (!userChanged) {
            return { value: newValue, hasChanged: false };
        }

        const parsed = CapacityValueParser.parse(newValue.trim());
        const maxCapacityMode = parsed.isValid ? parsed.type : CAPACITY_MODES.PERCENTAGE;

        const formattedValue = this.viewDataFormatterService._formatCapacityForDisplay(
            newValue,
            maxCapacityMode,
            '100%'
        );

        return { value: formattedValue, hasChanged: formattedValue !== originalValue };
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

    /**
     * Binds toggle switch events to update labels when switches are toggled.
     * @param {HTMLElement} form - The form element containing toggle switches
     * @private
     */
    _bindToggleSwitchEvents(form) {
        const toggleSwitches = form.querySelectorAll('.toggle-switch input[type="checkbox"]');

        for (const toggleInput of toggleSwitches) {
            const changeHandler = (event) => {
                const isChecked = event.target.checked;
                const toggleContainer = event.target.closest('.toggle-container');
                const label = toggleContainer.querySelector('.toggle-label');

                if (label) {
                    label.textContent = isChecked ? 'true' : 'false';
                    label.classList.toggle('active', isChecked);
                }
            };

            toggleInput.addEventListener('change', changeHandler);
            this.eventCleanupCallbacks.push(() => toggleInput.removeEventListener('change', changeHandler));
        }
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

        // Bind input events for validation
        const inputs = container.querySelectorAll(`#${rowId} input`);
        for (const input of inputs) {
            input.addEventListener('input', () => {
                this._validateCustomPropertyRow(input.closest('.custom-property-row'));
            });
            input.addEventListener('blur', () => {
                this._validateCustomPropertyRow(input.closest('.custom-property-row'));
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
            this._updateTemplateVisibility(autoCreationToggle.checked, templateSection);

            autoCreationToggle.addEventListener('change', () => {
                const enabled = autoCreationToggle.checked;
                this._updateTemplateVisibility(enabled, templateSection);

                // Clear transition warning if auto-creation is disabled
                if (!enabled) {
                    const existingWarning = DomUtils.qs('.auto-creation-transition-warning', this.formContainer);
                    if (existingWarning) {
                        existingWarning.remove();
                    }
                }
            });
        }

        // Bind template tab events for v2 mode
        this._bindTemplateTabEvents(form);
    }

    /**
     * Binds events for the node label tabs functionality.
     * @param {HTMLElement} form - The form element
     * @private
     */
    _bindNodeLabelTabEvents(form) {
        const tabHeaders = form.querySelectorAll('.node-label-tab-header');

        for (const tabHeader of tabHeaders) {
            const clickHandler = (event) => {
                event.preventDefault();
                const targetLabel = tabHeader.dataset.labelTab;
                this._switchNodeLabelTab(form, targetLabel);
            };
            tabHeader.addEventListener('click', clickHandler);
            this.eventCleanupCallbacks.push(() => tabHeader.removeEventListener('click', clickHandler));
        }
    }

    /**
     * Switches to the specified node label tab.
     * @param {HTMLElement} form - The form element
     * @param {string} targetLabel - The target label name
     * @private
     */
    _switchNodeLabelTab(form, targetLabel) {
        // Update tab headers with different border color
        const tabHeaders = form.querySelectorAll('.node-label-tab-header');
        for (const header of tabHeaders) {
            if (header.dataset.labelTab === targetLabel) {
                header.classList.add('active');
                header.style.background = 'white';
                header.style.borderBottom = '1px solid white';
                header.style.zIndex = '10';
                header.style.position = 'relative';
            } else {
                header.classList.remove('active');
                header.style.background = '#f8f9fa';
                header.style.borderBottom = '1px solid #dee2e6';
                header.style.zIndex = '1';
                header.style.position = 'relative';
            }
        }

        // Update tab content
        const tabPanes = form.querySelectorAll('.node-label-tab-pane');
        for (const pane of tabPanes) {
            if (pane.dataset.labelTabContent === targetLabel) {
                pane.style.display = 'block';
            } else {
                pane.style.display = 'none';
            }
        }
    }

    /**
     * Binds events for the v2 template tabs functionality.
     * @param {HTMLElement} form - The form element
     * @private
     */
    _bindTemplateTabEvents(form) {
        const tabHeaders = form.querySelectorAll('.template-tab-header');

        for (const tabHeader of tabHeaders) {
            tabHeader.addEventListener('click', (event) => {
                event.preventDefault();
                const targetTab = tabHeader.dataset.tab;
                this._switchTemplateTab(form, targetTab);
            });
        }
    }

    /**
     * Switches to the specified template tab.
     * @param {HTMLElement} form - The form element
     * @param {string} targetTab - The target tab name
     * @private
     */
    _switchTemplateTab(form, targetTab) {
        // Update tab headers
        const tabHeaders = form.querySelectorAll('.template-tab-header');
        for (const header of tabHeaders) {
            if (header.dataset.tab === targetTab) {
                header.classList.add('active');
                header.style.background = 'white';
                header.style.borderBottom = '1px solid white';
                header.style.zIndex = '10';
                header.style.position = 'relative';
            } else {
                header.classList.remove('active');
                header.style.background = '#f8f9fa';
                header.style.borderBottom = '1px solid #dee2e6';
                header.style.zIndex = '1';
                header.style.position = 'relative';
            }
        }

        // Update tab content
        const tabPanes = form.querySelectorAll('.template-tab-pane');
        for (const pane of tabPanes) {
            if (pane.dataset.tabContent === targetTab) {
                pane.style.display = 'block';
            } else {
                pane.style.display = 'none';
            }
        }
    }

    _updateTemplateVisibility(enabled, templateSection) {
        if (!templateSection) return;

        if (enabled) {
            // Show the template section with a smooth slide-down animation
            templateSection.style.display = 'block';
            templateSection.style.opacity = '0';
            templateSection.style.maxHeight = '0';
            templateSection.style.overflow = 'hidden';
            templateSection.style.transition = 'all 0.3s ease-in-out';

            // Trigger animation on next frame
            requestAnimationFrame(() => {
                templateSection.style.opacity = '1';
                templateSection.style.maxHeight = '1000px'; // Large enough to fit content
            });
        } else {
            // Hide the template section with a smooth slide-up animation
            templateSection.style.transition = 'all 0.3s ease-in-out';
            templateSection.style.opacity = '0';
            templateSection.style.maxHeight = '0';

            // Hide completely after animation
            setTimeout(() => {
                if (templateSection.style.opacity === '0') {
                    templateSection.style.display = 'none';
                }
            }, 300);
        }
    }

    /**
     * Checks if capacity mode change would trigger auto-creation mode transition and shows warning.
     * @param {HTMLElement} form - The form element
     * @param {string} originalMode - The original capacity mode
     * @param {string} newMode - The new capacity mode
     * @private
     */
    _checkAutoCreationModeTransition(form, originalMode, newMode) {
        // Get current auto-creation state
        const autoCreationToggle = DomUtils.qs('#auto-creation-enabled', form);
        if (!autoCreationToggle) return; // No auto-creation toggle found

        const isAutoCreationEnabled = autoCreationToggle.checked;
        if (!isAutoCreationEnabled) return; // Auto-creation not enabled, no warning needed

        // Get effective Legacy Queue Mode setting (considering any pending global changes)
        const effectiveLegacyMode = this._getEffectiveLegacyMode();

        // Determine auto-creation modes based on effective legacy mode and capacity modes
        const originalAutoCreationMode = this._determineAutoCreationMode(originalMode, effectiveLegacyMode);
        const newAutoCreationMode = this._determineAutoCreationMode(newMode, effectiveLegacyMode);

        if (originalAutoCreationMode === newAutoCreationMode) return; // No transition, no warning needed

        // Prepare transition information
        const transitionType = `${originalAutoCreationMode} → ${newAutoCreationMode}`;
        let warningMessage = '';

        if (originalAutoCreationMode === 'v1 Legacy' && newAutoCreationMode === 'v2 Flexible') {
            warningMessage =
                `Changing to Weight capacity mode ${effectiveLegacyMode ? '(or disabling Legacy Queue Mode)' : ''} will switch auto queue creation to v2 (Flexible) mode. ` +
                `This may affect how child queues are automatically created and their template properties.`;
        } else if (originalAutoCreationMode === 'v2 Flexible' && newAutoCreationMode === 'v1 Legacy') {
            warningMessage =
                `Changing away from Weight capacity mode ${effectiveLegacyMode ? '(or enabling Legacy Queue Mode)' : ''} will switch auto queue creation to v1 (Legacy) mode. ` +
                `This may affect how child queues are automatically created and their template properties.`;
        }

        if (warningMessage) {
            // Show warning and potentially stage auto-creation mode changes
            this._showAutoCreationTransitionWarning(transitionType, warningMessage);
            this._stageAutoCreationModeChanges(form, originalAutoCreationMode, newAutoCreationMode);
        }
    }

    /**
     * Gets the effective Legacy Queue Mode setting considering pending global changes.
     * @returns {boolean} The effective legacy mode setting
     * @private
     */
    _getEffectiveLegacyMode() {
        // Check if there are pending global changes to legacy mode
        if (this.controller && this.controller.schedulerConfigModel) {
            const effectiveGlobalProps = this.controller.schedulerConfigModel.getGlobalConfig();
            const legacyModeValue = effectiveGlobalProps.get('yarn.scheduler.capacity.legacy-queue-mode.enabled');
            if (legacyModeValue !== undefined) {
                return String(legacyModeValue).toLowerCase() === 'true';
            }
        }

        // Fall back to current queue data legacy mode setting
        return this.currentQueueData?.isLegacyMode ?? true;
    }

    /**
     * Determines the auto-creation mode based on capacity mode and legacy setting.
     * @param {string} capacityMode - The capacity mode
     * @param {boolean} isLegacyMode - Whether legacy mode is enabled
     * @returns {string} The auto-creation mode ('v1 Legacy' or 'v2 Flexible')
     * @private
     */
    _determineAutoCreationMode(capacityMode, isLegacyMode) {
        if (!isLegacyMode) {
            // Non-legacy mode: always v2 Flexible
            return 'v2 Flexible';
        }

        // Legacy mode: v2 for weight, v1 for others
        return capacityMode === CAPACITY_MODES.WEIGHT ? 'v2 Flexible' : 'v1 Legacy';
    }

    /**
     * Stages auto-creation mode changes when transitioning between v1 and v2.
     * @param {HTMLElement} form - The form element
     * @param {string} originalMode - The original auto-creation mode
     * @param {string} newMode - The new auto-creation mode
     * @private
     */
    _stageAutoCreationModeChanges(form, originalMode, newMode) {
        if (originalMode === newMode) return;

        // Get current auto-creation toggle values
        const autoCreationToggle = DomUtils.qs('#auto-creation-enabled', form);
        const isCurrentlyEnabled = autoCreationToggle?.checked || false;

        if (!isCurrentlyEnabled) return; // No need to stage changes if auto-creation is disabled

        // Stage the transition by updating the toggle's data attributes
        if (originalMode === 'v1 Legacy' && newMode === 'v2 Flexible') {
            // Transitioning v1 → v2: disable v1, enable v2
            this._updateAutoCreationToggleForTransition(form, 'auto-create-child-queue.enabled', false);
            this._updateAutoCreationToggleForTransition(form, 'auto-queue-creation-v2.enabled', true);
        } else if (originalMode === 'v2 Flexible' && newMode === 'v1 Legacy') {
            // Transitioning v2 → v1: disable v2, enable v1
            this._updateAutoCreationToggleForTransition(form, 'auto-queue-creation-v2.enabled', false);
            this._updateAutoCreationToggleForTransition(form, 'auto-create-child-queue.enabled', true);
        }
    }

    /**
     * Updates auto-creation toggle for mode transitions.
     * @param {HTMLElement} form - The form element
     * @param {string} propertyKey - The property key to update
     * @param {boolean} enabled - Whether to enable or disable
     * @private
     */
    _updateAutoCreationToggleForTransition(form, propertyKey, enabled) {
        const autoCreationToggle = DomUtils.qs('#auto-creation-enabled', form);
        if (autoCreationToggle) {
            // Update the data attributes to reflect the new mode
            autoCreationToggle.dataset.simpleKey = propertyKey;
            autoCreationToggle.checked = enabled;

            // Update the label
            const label = autoCreationToggle.closest('.toggle-container')?.querySelector('.toggle-label');
            if (label) {
                label.textContent = enabled ? 'true' : 'false';
                label.classList.toggle('active', enabled);
            }
        }
    }

    /**
     * Shows a warning about auto-creation mode transition.
     * @param {string} transitionType - Description of the transition
     * @param {string} message - Warning message to display
     * @private
     */
    _showAutoCreationTransitionWarning(transitionType, message) {
        // Remove any existing warnings
        const existingWarning = DomUtils.qs('.auto-creation-transition-warning', this.formContainer);
        if (existingWarning) {
            existingWarning.remove();
        }

        // Create warning element
        const warningHtml = `
            <div class="auto-creation-transition-warning" style="margin: 15px 0; padding: 12px; background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; border-left: 4px solid #f39c12;">
                <div style="display: flex; align-items: flex-start; gap: 8px;">
                    <span style="color: #f39c12; font-weight: bold; flex-shrink: 0;">⚠️</span>
                    <div>
                        <strong style="color: #856404;">Auto Queue Creation Mode Transition: ${DomUtils.escapeXml(transitionType)}</strong>
                        <p style="margin: 5px 0 0 0; color: #856404; line-height: 1.4;">${DomUtils.escapeXml(message)}</p>
                    </div>
                </div>
            </div>
        `;

        // Insert warning after the capacity mode form group
        const capacityModeGroup = DomUtils.qs('[data-original-mode]', this.formContainer)?.closest('.form-group');
        if (capacityModeGroup) {
            capacityModeGroup.insertAdjacentHTML('afterend', warningHtml);
        }
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

    /**
     * Shows the modal with only template configuration sections.
     * @param {Object} data - The queue data containing auto-creation template properties
     */
    showTemplateConfigOnly(data) {
        if (!data || !data.autoCreationData) {
            console.warn('EditQueueModalView: No auto-creation data available for template-only modal');
            return;
        }

        // Set current queue data
        this.currentQueuePath = data.path;
        this.currentQueueData = data;

        // Update modal title
        const modalTitleElement = DomUtils.qs('.modal-title', this.modalEl);
        if (modalTitleElement) {
            modalTitleElement.textContent = `Template Configuration: ${DomUtils.escapeXml(data.displayName || data.path.split('.').pop())}`;
        }

        // Clear and build template-only content
        DomUtils.empty(this.formContainer);
        this.formContainer.innerHTML = this._buildTemplateOnlyHtml(data);

        // Add modal actions
        const modalContent = this.formContainer.parentElement.parentElement;
        const existingActions = modalContent.querySelector('.modal-actions');
        if (existingActions) {
            existingActions.remove();
        }

        const modalActions = document.createElement('div');
        modalActions.className = 'modal-actions';
        modalActions.innerHTML = `
            <button class="btn btn-secondary" id="cancel-template-config-btn">Cancel</button>
            <button class="btn btn-primary" id="submit-template-config-btn">Stage Changes</button>
        `;
        modalContent.appendChild(modalActions);

        // Bind events for template-only mode
        this._bindTemplateOnlyEvents();

        // Temporarily override _renderContent to prevent it from overwriting our template content
        const originalRenderContent = this._renderContent;
        this._renderContent = () => {}; // No-op during template-only show

        // Show the modal properly with positioning and events
        super.show(data);

        // Restore original _renderContent method
        this._renderContent = originalRenderContent;

        // Upgrade tooltips
        if (window.TooltipHelper) {
            TooltipHelper.upgradeModalTooltips(this.formContainer);
        }
    }

    /**
     * Builds HTML for template-only modal.
     * @param {Object} data - The queue data
     * @returns {string} Template-only HTML
     * @private
     */
    _buildTemplateOnlyHtml(data) {
        const { path, displayName, autoCreationData, isLegacyMode, effectiveCapacityMode } = data;

        let formHTML = `<form id="template-config-form" data-queue-path="${path}" onsubmit="return false;">`;

        // Queue info section
        formHTML += `
            <div class="form-group static-info-group">
                <div class="property-details-column">
                    <div class="property-display-name">Queue Name</div>
                    <div class="property-yarn-name">(Template Configuration)</div>
                </div>
                <div class="property-value-column">
                    <input type="text" class="form-input" value="${DomUtils.escapeXml(displayName)}" readonly>
                </div>
            </div>
        `;

        // Auto-creation template section
        formHTML += this._buildAutoCreationTemplateHtml(
            autoCreationData,
            isLegacyMode,
            path,
            effectiveCapacityMode,
            true
        );

        formHTML += `</form>`;
        return formHTML;
    }

    /**
     * Binds events for template-only modal.
     * @private
     */
    _bindTemplateOnlyEvents() {
        const form = DomUtils.qs('#template-config-form', this.formContainer);
        if (!form) return;

        // Bind toggle switches
        this._bindToggleSwitchEvents(form);

        // Bind template tab events
        this._bindTemplateTabEvents(form);

        // Bind submit button
        const submitButton = DomUtils.qs('#submit-template-config-btn', this.modalEl);
        if (submitButton) {
            submitButton.addEventListener('click', () => {
                const collectedData = this._collectTemplateOnlyFormData(form);
                if (Object.keys(collectedData.params).length > 0) {
                    this._emit('submitEditQueue', { queuePath: this.currentQueuePath, formData: collectedData });
                } else {
                    this.controller.notificationView.showInfo('No changes detected to stage.');
                }
            });
        }

        // Bind cancel button
        const cancelButton = DomUtils.qs('#cancel-template-config-btn', this.modalEl);
        if (cancelButton) {
            cancelButton.addEventListener('click', () => this.hide({ Canceled: true }));
        }
    }

    /**
     * Collects form data from template-only modal.
     * @param {HTMLElement} form - The form element
     * @returns {Object} Collected form data
     * @private
     */
    _collectTemplateOnlyFormData(form) {
        const stagedChanges = { params: {} };

        for (const inputElement of form.querySelectorAll('.form-input')) {
            const simpleOrPartialKey = inputElement.dataset.simpleKey;
            const originalValue = inputElement.dataset.originalValue;

            if (!simpleOrPartialKey) continue;

            let newValue;
            if (inputElement.type === 'checkbox') {
                newValue = inputElement.checked ? 'true' : 'false';
            } else {
                newValue = inputElement.value.trim();
            }

            if (newValue !== originalValue) {
                stagedChanges.params[simpleOrPartialKey] = newValue;
            }
        }

        return stagedChanges;
    }
}
