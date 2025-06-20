const QueueCardView = {
    /**
     * Creates the HTML for displaying queue capacity information based on mode.
     * @param {Object} formattedQueue - The fully formatted queue object.
     * @returns {string} HTML string for the capacity display section.
     * @private
     */
    _createCapacityDisplayHTML(formattedQueue) {
        let capacityBlockHTML = '';
        let maxCapacityBlockHTML = '';

        const effectiveMode = formattedQueue.effectiveCapacityMode;
        const displayCapacity = formattedQueue.capacityDisplayForLabel || formattedQueue.capacityDisplay;
        const displayMaxCapacity = formattedQueue.maxCapacityDisplayForLabel || formattedQueue.maxCapacityDisplay;
        const capacityDetails = formattedQueue.capacityDetailsForLabel || formattedQueue.capacityDetails;
        const maxCapacityDetails = formattedQueue.maxCapacityDetailsForLabel || formattedQueue.maxCapacityDetails;

        // --- Capacity Block ---
        if (
            effectiveMode === CAPACITY_MODES.ABSOLUTE ||
            effectiveMode === CAPACITY_MODES.VECTOR ||
            (this._isVectorString(displayCapacity) &&
                (effectiveMode === CAPACITY_MODES.PERCENTAGE || effectiveMode === CAPACITY_MODES.WEIGHT))
        ) {
            // Handle vector even if mode is %/w (e.g. for root.max_capacity)

            capacityBlockHTML = '<div class="absolute-capacity-display">';
            capacityBlockHTML += '  <div class="capacity-section-title">Capacity:</div>';
            if (capacityDetails && capacityDetails.length > 0) {
                capacityBlockHTML += '    <div class="resource-list">';
                for (const r of capacityDetails) {
                    capacityBlockHTML += `      <div class="resource-item"><span class="resource-key">${DomUtils.escapeXml(r.key)}:</span><span class="resource-value">${DomUtils.escapeXml(r.value)}${DomUtils.escapeXml(r.unit || '')}</span></div>`;
                }
                capacityBlockHTML += '    </div>';
            } else {
                capacityBlockHTML += `    <div class="resource-raw">${DomUtils.escapeXml(displayCapacity || 'N/A')}</div>`;
            }
            capacityBlockHTML += '</div>';
        } else {
            // Percentage or Weight
            capacityBlockHTML = '<div class="capacity-display">';
            capacityBlockHTML += `  <div class="capacity-row"><span class="capacity-label">Capacity:</span><span class="capacity-value">${DomUtils.escapeXml(displayCapacity || 'N/A')}</span></div>`;
            capacityBlockHTML += '</div>';
        }

        // --- Maximum Capacity Block ---
        if (
            displayMaxCapacity !== undefined &&
            displayMaxCapacity !== null &&
            String(displayMaxCapacity).trim() !== ''
        ) {
            if (this._isVectorString(displayMaxCapacity)) {
                maxCapacityBlockHTML = '<div class="absolute-capacity-display" style="margin-top: 6px;">';
                maxCapacityBlockHTML += '  <div class="capacity-section-title">Max Capacity:</div>';
                if (maxCapacityDetails && maxCapacityDetails.length > 0) {
                    maxCapacityBlockHTML += '    <div class="resource-list">';
                    for (const r of maxCapacityDetails) {
                        maxCapacityBlockHTML += `      <div class="resource-item"><span class="resource-key">${DomUtils.escapeXml(r.key)}:</span><span class="resource-value">${DomUtils.escapeXml(r.value)}${DomUtils.escapeXml(r.unit || '')}</span></div>`;
                    }
                    maxCapacityBlockHTML += '    </div>';
                } else {
                    maxCapacityBlockHTML += `    <div class="resource-raw">${DomUtils.escapeXml(displayMaxCapacity)}</div>`;
                }
                maxCapacityBlockHTML += '</div>';
            } else {
                // Percentage
                maxCapacityBlockHTML = '<div class="capacity-display" style="margin-top: 6px;">';
                maxCapacityBlockHTML += `  <div class="capacity-row"><span class="capacity-label">Max Capacity:</span><span class="capacity-value">${DomUtils.escapeXml(displayMaxCapacity)}</span></div>`;
                maxCapacityBlockHTML += '</div>';
            }
        }
        return capacityBlockHTML + maxCapacityBlockHTML;
    },

    _isVectorString(valueString) {
        return typeof valueString === 'string' && valueString.startsWith('[') && valueString.endsWith(']');
    },

    /**
     * Highlights search term occurrences in a given text.
     * @param {string} text - The text to highlight.
     * @param {string} searchTerm - The term to highlight.
     * @returns {string} Text with matches wrapped in <mark> tags.
     * @private
     */
    _highlightMatch(text, searchTerm) {
        if (!searchTerm || !text) return DomUtils.escapeXml(text || '');
        const safeTerm = searchTerm.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
        const re = new RegExp(`(${safeTerm})`, 'ig'); // Wrap term in capturing group
        return DomUtils.escapeXml(text).replace(re, `<mark>$1</mark>`);
    },

    /**
     * Creates a DOM element representing a queue card.
     * @param {Object} formattedQueue - The fully formatted queue object from ViewDataFormatterService.
     * @param {string} currentSearchTerm - The current search term for highlighting.
     * @param {Function} eventEmitterCallback - Callback to emit events like (eventName, queuePath).
     * @returns {HTMLElement} The queue card element.
     */
    createCardElement(formattedQueue, currentSearchTerm, eventEmitterCallback) {
        if (!formattedQueue) {
            console.warn('QueueCardView: formattedQueue data is missing.');
            return DomUtils.createElement('div', 'queue-card-error', null, 'Error: Queue data unavailable.');
        }

        const card = DomUtils.createElement('div', 'queue-card', {
            'data-queue-path': formattedQueue.path,
            'data-level': formattedQueue.level,
        });
        if (formattedQueue.statusClass) {
            // Handle multiple classes separated by spaces
            const classes = formattedQueue.statusClass.split(' ').filter((cls) => cls.trim());
            for (const cls of classes) {
                card.classList.add(cls.trim());
            }
        }

        const titleBar = DomUtils.createElement('div', 'queue-header');
        const nameElement = DomUtils.createElement('span', 'queue-name');
        nameElement.innerHTML = this._highlightMatch(formattedQueue.displayName, currentSearchTerm);
        nameElement.title = formattedQueue.displayNameTitle || formattedQueue.path;
        nameElement.addEventListener('click', (e) => {
            e.stopPropagation();
            eventEmitterCallback('editQueueClicked', formattedQueue.path);
        });

        const buttonGroup = DomUtils.createElement('div', 'queue-button-group');
        const infoButton = DomUtils.createElement('button', 'queue-info-btn', {
            title: 'Queue Information',
            'aria-label': 'Queue information',
        });
        infoButton.innerHTML = `
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <circle cx="12" cy="12" r="11" stroke="currentColor" stroke-width="2" fill="none"/>
              <line x1="12" y1="16" x2="12" y2="12" stroke="currentColor" stroke-width="2"/>
              <circle cx="12" cy="8" r="1" fill="currentColor"/>
            </svg>`;
        infoButton.addEventListener('click', (e) => {
            e.stopPropagation();
            eventEmitterCallback('infoQueueClicked', formattedQueue.path);
        });

        const actionsMenuContainer = DomUtils.createElement('span', 'queue-actions-menu');
        const menuButton = DomUtils.createElement('button', 'queue-menu-btn', {
            'aria-label': 'Queue actions',
            tabindex: '0',
        });
        menuButton.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>`;

        const dropdown = DomUtils.createElement('div', 'queue-dropdown', { id: `dropdown-${formattedQueue.path}` });
        const editItem = DomUtils.createElement('div', 'dropdown-item', null, 'Edit Queue');
        editItem.addEventListener('click', () => eventEmitterCallback('editQueueClicked', formattedQueue.path));

        const addChildItem = DomUtils.createElement('div', 'dropdown-item', null, 'Add Child Queue');
        addChildItem.addEventListener('click', () => eventEmitterCallback('addChildQueueClicked', formattedQueue.path));
        dropdown.append(editItem);
        dropdown.append(addChildItem);

        if (!formattedQueue.isRoot) {
            const deleteItemText = formattedQueue.isDeleted ? 'Undo Delete' : 'Delete Queue';
            const deleteItem = DomUtils.createElement('div', 'dropdown-item', null, deleteItemText);
            if (!formattedQueue.isDeleted && !formattedQueue.canBeDeletedForDropdown) {
                deleteItem.classList.add('disabled');
                deleteItem.title = formattedQueue.deletionReason || 'Cannot be deleted';
            } else {
                deleteItem.addEventListener('click', () => {
                    if (formattedQueue.isDeleted) eventEmitterCallback('undoDeleteQueueClicked', formattedQueue.path);
                    else eventEmitterCallback('deleteQueueClicked', formattedQueue.path);
                });
            }
            dropdown.append(deleteItem);
        }

        actionsMenuContainer.append(menuButton);
        actionsMenuContainer.append(dropdown);
        menuButton.addEventListener('click', (e) => {
            // Toggle for this specific dropdown
            e.stopPropagation();
            // Hide all other open dropdowns
            for (const d of DomUtils.qsa('.queue-dropdown.show')) {
                if (d.id !== dropdown.id) d.classList.remove('show');
            }
            dropdown.classList.toggle('show');
        });

        // Add template configuration button if auto-creation is enabled
        const templateButton = this._createTemplateConfigButton(formattedQueue, eventEmitterCallback);
        if (templateButton) {
            buttonGroup.append(templateButton);
        }

        buttonGroup.append(infoButton);
        buttonGroup.append(actionsMenuContainer);
        titleBar.append(nameElement);
        titleBar.append(buttonGroup);

        const divider = DomUtils.createElement('hr', 'queue-card-divider');
        const labelArea = DomUtils.createElement('div', 'queue-label-area');
        if (formattedQueue.uiLabels && formattedQueue.uiLabels.length > 0) {
            // Create label elements without old tooltip structure
            for (const label of formattedQueue.uiLabels) {
                const labelElement = DomUtils.createElement('span', label.cssClass, null, label.text);

                // Apply unified tooltip if content exists
                if (label.tooltip && globalThis.TooltipHelper) {
                    TooltipHelper.attachTooltip(labelElement, label.tooltip, {
                        position: 'top',
                        delay: 500,
                    });
                }

                labelArea.append(labelElement);
            }
        } else {
            labelArea.style.minHeight = '24px'; // Keep space consistent
        }

        const capacitySection = DomUtils.createElement('div', 'queue-capacity-section');
        capacitySection.innerHTML = this._createCapacityDisplayHTML(formattedQueue);

        card.append(titleBar);
        card.append(divider);
        card.append(labelArea);
        card.append(capacitySection);

        return card;
    },

    /**
     * Creates a template configuration button if auto-creation is enabled for the queue.
     * @param {Object} formattedQueue - The formatted queue object
     * @param {Function} eventEmitterCallback - Callback for emitting events
     * @returns {HTMLElement|null} Template button element or null if not applicable
     * @private
     */
    _createTemplateConfigButton(formattedQueue, eventEmitterCallback) {
        // Check if auto-creation is enabled for this queue
        const hasAutoCreation = this._hasAutoCreationEnabled(formattedQueue);

        if (!hasAutoCreation) {
            return null;
        }

        const templateButton = DomUtils.createElement('button', 'queue-template-btn', {
            title: 'Configure Auto-Creation Templates',
            'aria-label': 'Configure auto-creation templates',
        });

        templateButton.innerHTML = `
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <rect x="3" y="4" width="18" height="2" stroke="currentColor" stroke-width="2" fill="currentColor"/>
              <rect x="3" y="11" width="18" height="2" stroke="currentColor" stroke-width="2" fill="currentColor"/>
              <rect x="3" y="18" width="18" height="2" stroke="currentColor" stroke-width="2" fill="currentColor"/>
              <circle cx="6" cy="5" r="1" fill="white"/>
              <circle cx="6" cy="12" r="1" fill="white"/>
              <circle cx="6" cy="19" r="1" fill="white"/>
            </svg>`;

        templateButton.addEventListener('click', (e) => {
            e.stopPropagation();
            eventEmitterCallback('templateConfigClicked', formattedQueue.path);
        });

        return templateButton;
    },

    /**
     * Checks if auto-creation is enabled for the given queue.
     * @param {Object} formattedQueue - The formatted queue object
     * @returns {boolean} True if auto-creation is enabled
     * @private
     */
    _hasAutoCreationEnabled(formattedQueue) {
        // Check for auto-creation indicators in the queue data
        // Use effectiveProperties which is a Map containing all queue properties
        const effectiveProperties = formattedQueue.effectiveProperties;
        if (!effectiveProperties) {
            return false;
        }

        // Check for v1 auto-creation
        const v1AutoCreateKey = `yarn.scheduler.capacity.${formattedQueue.path}.auto-create-child-queue.enabled`;
        const v1AutoCreateValue = effectiveProperties.get(v1AutoCreateKey);
        const v1AutoCreateEnabled = String(v1AutoCreateValue || '').toLowerCase() === 'true';

        // Check for v2 auto-creation
        const v2AutoCreateKey = `yarn.scheduler.capacity.${formattedQueue.path}.auto-queue-creation-v2.enabled`;
        const v2AutoCreateValue = effectiveProperties.get(v2AutoCreateKey);
        const v2AutoCreateEnabled = String(v2AutoCreateValue || '').toLowerCase() === 'true';

        return v1AutoCreateEnabled || v2AutoCreateEnabled;
    },
};
