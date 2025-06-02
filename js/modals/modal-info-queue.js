/**
 * Opens the information modal for a specific queue.
 * @param {string} queuePath - The path of the queue to display information for.
 */
function openInfoModal(queuePath) {
    // Globals: viewDataFormatter, showError
    if (!queuePath) {
        if (typeof showError === "function") showError("Cannot show info: Queue path missing.");
        return;
    }
    if (!viewDataFormatter) {
        if (typeof showError === "function") showError("Cannot show info: Data formatter not available.");
        return;
    }

    const formattedQueue = viewDataFormatter.getFormattedQueue(queuePath);
    if (!formattedQueue) {
        if (typeof showError === "function") showError(`Cannot show info: Queue data not found for ${queuePath}.`);
        return;
    }

    const infoFormContainer = document.getElementById("info-form-container");
    if (!infoFormContainer) {
        console.error("Info form container not found in modal.");
        return;
    }

    infoFormContainer.innerHTML = createInfoFormHTML(formattedQueue);

    const modalTitle = document.getElementById("info-modal")?.querySelector(".modal-title");
    if(modalTitle) modalTitle.textContent = `Queue Info: ${formattedQueue.displayName || formattedQueue.name}`;

    document.getElementById("info-modal").classList.add("show");
}

/**
 * Creates the HTML content for the queue information modal.
 * @param {Object} formattedQueue - The fully formatted queue object from QueueViewDataFormatter.
 * @returns {string} HTML string for the info display.
 */
function createInfoFormHTML(formattedQueue) {
    // Globals: QUEUE_CONFIG_CATEGORIES, Q_PATH_PLACEHOLDER
    let html = `<div class="queue-info-container">`;

    // --- Basic Information Section ---
    html += `<div class="info-section">
               <h3 class="info-section-title">📋 Basic Information</h3>
               <table class="info-table">`;
    html += `<tr><td class="info-label">Name</td><td class="info-value">${formattedQueue.displayName || formattedQueue.name}</td></tr>`; // Use displayName
    html += `<tr><td class="info-label">Path</td><td class="info-value">${formattedQueue.path}</td></tr>`;
    html += `<tr><td class="info-label">State</td><td class="info-value">${formattedQueue.state || 'N/A'}</td></tr>`; // state is now formatted
    html += `<tr><td class="info-label">Type</td><td class="info-value">${formattedQueue.queueType || 'N/A'}</td></tr>`; // queueType is now set by formatter
    html += `</table></div>`;

    // --- Capacity & Resource Details Section ---
    html += `<div class="info-section">
               <h3 class="info-section-title">📊 Capacity & Resource Details</h3>
               <table class="info-table">`;
    html += `<tr><td class="info-label">Capacity Mode</td><td class="info-value">${formattedQueue.effectiveCapacityMode || 'N/A'}</td></tr>`;
    html += `<tr><td class="info-label">Capacity</td><td class="info-value">${formattedQueue.capacityDisplay || 'N/A'}</td></tr>`;
    html += `<tr><td class="info-label">Maximum Capacity</td><td class="info-value">${formattedQueue.maxCapacityDisplay || 'N/A'}</td></tr>`;

    // Display absolute resource details if applicable
    if ((formattedQueue.effectiveCapacityMode === CAPACITY_MODES.ABSOLUTE || formattedQueue.effectiveCapacityMode === CAPACITY_MODES.VECTOR)) {
        if (formattedQueue.capacityDetails && formattedQueue.capacityDetails.length > 0) {
            html += `<tr><td class="info-label">Capacity Breakdown</td><td class="info-value">`;
            formattedQueue.capacityDetails.forEach(r => {
                html += `<div>${r.key}: ${r.value}${r.unit || ''}</div>`;
            });
            html += `</td></tr>`;
        }
        if (formattedQueue.maxCapacityDetails && formattedQueue.maxCapacityDetails.length > 0) {
            html += `<tr><td class="info-label">Max Capacity Breakdown</td><td class="info-value">`;
            formattedQueue.maxCapacityDetails.forEach(r => {
                html += `<div>${r.key}: ${r.value}${r.unit || ''}</div>`;
            });
            html += `</td></tr>`;
        }
    }
    html += `</table></div>`;

    // --- Live Usage / Runtime Section ---
    html += `<div class="info-section">
                <h3 class="info-section-title">📈 Live Usage</h3>
                <table class="info-table">`;
    html += `<tr><td class="info-label">Absolute Used Capacity</td><td class="info-value">${formattedQueue.absoluteUsedCapacityDisplay || 'N/A'}</td></tr>`;
    html += `<tr><td class="info-label">Number of Applications</td><td class="info-value">${formattedQueue.numApplications !== undefined ? formattedQueue.numApplications : 'N/A'}</td></tr>`;
    html += `</table></div>`;


    // --- Other Configured Properties Section (from metadata) ---
    html += `<div class="info-section">
               <h3 class="info-section-title">⚙️ Other Configured Properties</h3>
               <table class="info-table">`;
    let otherPropsDisplayed = 0;
    QUEUE_CONFIG_CATEGORIES.forEach(category => {
        for (const placeholderPropName in category.properties) {
            if (Object.hasOwnProperty.call(category.properties, placeholderPropName)) {
                const propDef = category.properties[placeholderPropName];
                const simpleKey = placeholderPropName.substring(placeholderPropName.lastIndexOf('.') + 1);

                // Skip properties already displayed in dedicated sections above
                if (simpleKey === 'capacity' || simpleKey === 'maximum-capacity' || simpleKey === 'state') {
                    continue;
                }

                // Get the formatted value from the formattedQueue object (either direct property or from propertiesForEditModal)
                let displayVal = formattedQueue[simpleKey];
                if (displayVal === undefined && formattedQueue.propertiesForEditModal && formattedQueue.propertiesForEditModal.has(simpleKey)) {
                    displayVal = formattedQueue.propertiesForEditModal.get(simpleKey);
                }

                if (displayVal !== undefined) { // Only display if the formatter provided a value
                    html += `<tr><td class="info-label">${propDef.displayName}</td><td class="info-value">${displayVal}</td></tr>`;
                    otherPropsDisplayed++;
                }
            }
        }
    });
    if (otherPropsDisplayed === 0) {
        html += `<tr><td class="info-label" colspan="2">No other specific properties configured or defined for display.</td></tr>`;
    }
    html += `</table></div>`;

    html += `</div>`; // Close queue-info-container
    return html;
}

window.openInfoModal = openInfoModal;
