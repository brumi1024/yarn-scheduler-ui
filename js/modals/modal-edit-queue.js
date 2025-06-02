/**
 * Opens the edit modal for a queue and dynamically generates the content based on the queue's properties.
 * This method ensures proper validation before allowing modifications, dynamically creates form elements,
 * and displays relevant information in an interactive modal window.
 *
 * @param {string} queuePath - The unique path identifier of the queue to be edited.
 * @return {Promise<void>} A promise that resolves when the modal is successfully opened and content is set.
 */
async function openEditModal(queuePath) {
    const formattedQueue = viewDataFormatter.getFormattedQueue(queuePath); // viewDataFormatter is global

    if (!formattedQueue) {
        if (typeof showError === 'function') showError(`Cannot edit: Queue data not found for ${queuePath}.`);
        return;
    }
    if (formattedQueue.isDeleted) {
        if (typeof showWarning === 'function') showWarning("Cannot edit a queue marked for deletion.");
        return;
    }

    currentEditQueuePath = queuePath;
    const editFormContainer = document.getElementById("edit-form-container");
    if (!editFormContainer) {
        console.error("Edit form container not found in modal.");
        return;
    }
    editFormContainer.innerHTML = "";

    const modalTitle = document.getElementById("modal-title");
    if (modalTitle) modalTitle.textContent = `Edit Queue: ${formattedQueue.displayName}`;

    let formHTML = `<form id="edit-queue-form" data-queue-path="${queuePath}">`;

    // Static info: Name and Path (using formattedQueue.displayName and formattedQueue.path)
    formHTML += `<div class="form-group static-info-group">
                    <div class="property-details-column">
                        <div class="property-display-name"><span>Queue Name</span></div>
                        <div class="property-yarn-name">(Read-only)</div>
                    </div>
                    <div class="property-value-column">
                        <input type="text" class="form-input" value="${formattedQueue.displayName}" readonly>
                    </div>
                 </div>`;
    formHTML += `<div class="form-group static-info-group">
                    <div class="property-details-column">
                        <div class="property-display-name"><span>Queue Path</span></div>
                        <div class="property-yarn-name">(Read-only)</div>
                    </div>
                    <div class="property-value-column">
                        <input type="text" class="form-input" value="${formattedQueue.path}" readonly>
                    </div>
                 </div>`;

    // Capacity Mode Dropdown (using formattedQueue.effectiveCapacityMode)
    const effectiveMode = formattedQueue.effectiveCapacityMode;
    formHTML += `<div class="form-group property-edit-item">
                    <div class="property-details-column">
                        <div class="property-display-name">
                            <span>Capacity Mode</span>
                            <span class="info-icon" title="Determines how queue capacity is specified (Percentage, Weight, or Absolute Resources).">ⓘ</span>
                        </div>
                        <div class="property-yarn-name">- UI Helper -</div>
                    </div>
                    <div class="property-value-column">
                        <select class="form-input" id="edit-capacity-mode" data-original-mode="${effectiveMode}">
                            <option value="${CAPACITY_MODES.PERCENTAGE}" ${effectiveMode === CAPACITY_MODES.PERCENTAGE ? "selected" : ""}>Percentage (%)</option>
                            <option value="${CAPACITY_MODES.WEIGHT}" ${effectiveMode === CAPACITY_MODES.WEIGHT ? "selected" : ""}>Weight (w)</option>
                            <option value="${CAPACITY_MODES.ABSOLUTE}" ${effectiveMode === CAPACITY_MODES.ABSOLUTE ? "selected" : ""}>Absolute Resources</option>
                        </select>
                    </div>
                 </div>`;

    // Dynamic properties from QUEUE_CONFIG_CATEGORIES
    QUEUE_CONFIG_CATEGORIES.forEach((category) => {
        formHTML += `<h4 class="form-category-title">${category.groupName}</h4>`;
        for (const placeholderPropName in category.properties) {
            if (Object.hasOwnProperty.call(category.properties, placeholderPropName)) {
                const propDef = category.properties[placeholderPropName];
                const simpleKey = placeholderPropName.substring(placeholderPropName.lastIndexOf('.') + 1);
                const actualPropName = placeholderPropName.replace(Q_PATH_PLACEHOLDER, queuePath);
                const inputId = `edit-queue-${actualPropName.replace(/\./g, "-")}`;

                // Get the pre-formatted value from formattedQueue (either directly or from propertiesForEditModal)
                let currentValue = formattedQueue[simpleKey];
                if (currentValue === undefined && formattedQueue.propertiesForEditModal && formattedQueue.propertiesForEditModal.has(simpleKey)) {
                    currentValue = formattedQueue.propertiesForEditModal.get(simpleKey);
                }
                // If still undefined, use metadata default (formatter should ideally handle this)
                if (currentValue === undefined) {
                    currentValue = propDef.defaultValue;
                }
                // Ensure string for value attribute, especially for numbers/booleans
                currentValue = (currentValue === null || currentValue === undefined) ? "" : String(currentValue);


                formHTML += `<div class="form-group property-edit-item">
                                <div class="property-details-column">
                                    <div class="property-display-name">
                                        <span>${propDef.displayName}</span>
                                        <span class="info-icon" title="${propDef.description || 'No description.'}">ⓘ</span>
                                    </div>
                                    <div class="property-yarn-name">${actualPropName}</div>
                                </div>
                                <div class="property-value-column">`;

                if (propDef.type === "enum") {
                    formHTML += `<select class="form-input" id="${inputId}" data-original-value="${currentValue}" data-yarn-prop="${actualPropName}">`;
                    (propDef.options || []).forEach(opt => {
                        formHTML += `<option value="${opt}" ${currentValue === opt ? "selected" : ""}>${opt}</option>`;
                    });
                    formHTML += `</select>`;
                } else if (propDef.type === "boolean") {
                    formHTML += `<select class="form-input" id="${inputId}" data-original-value="${currentValue}" data-yarn-prop="${actualPropName}">
                                    <option value="true" ${currentValue === "true" ? "selected" : ""}>true</option>
                                    <option value="false" ${currentValue === "false" ? "selected" : ""}>false</option>
                                 </select>`;
                } else if (propDef.type === "number" || (propDef.type === "percentage" && simpleKey !== 'maximum-am-resource-percent' /* This is 0-1 */)) {
                    // Capacity and max-capacity are text due to formats like "10%", "5w", "[...]".
                    // Other numbers or specific percentages (like max-am-resource-percent which is 0-1) use type="number".
                    let inputType = "text"; // Default to text
                    let stepAttr = "";
                    let minMaxAttr = "";

                    if (simpleKey === 'capacity' || simpleKey === 'maximum-capacity') {
                        inputType = "text"; // Handled as text due to complex formats
                    } else if (propDef.type === "number") {
                        inputType = "number";
                        if (propDef.step) stepAttr = `step="${propDef.step}"`;
                    } else if (propDef.type === "percentage") { // e.g. max-am-resource-percent
                        inputType = "number";
                        stepAttr = `step="${propDef.step || '0.01'}"`;
                        minMaxAttr = `min="0" max="1"`; // Percentages like max-am-resource are 0-1
                    }
                    formHTML += `<input type="${inputType}" class="form-input" id="${inputId}" value="${currentValue}" data-original-value="${currentValue}" data-yarn-prop="${actualPropName}" ${stepAttr} ${minMaxAttr}>`;
                } else { // Default to text input (covers capacity, maxCapacity which are complex strings, general strings)
                    formHTML += `<input type="text" class="form-input" id="${inputId}" value="${currentValue}" data-original-value="${currentValue}" data-yarn-prop="${actualPropName}">`;
                }
                formHTML += `   </div></div>`;
            }
        }
    });

    formHTML += `</form>
                 <div class="modal-actions">
                    <button class="btn btn-secondary" onclick="closeEditModal()">Cancel</button>
                    <button class="btn btn-primary" onclick="stageQueueChanges()">Stage Changes</button>
                 </div>`;

    editFormContainer.innerHTML = formHTML;

    const capacityModeSelect = document.getElementById("edit-capacity-mode");
    if (capacityModeSelect) {
        capacityModeSelect.addEventListener("change", () => {
            // Pass the queuePath to correctly identify the capacity input field's data-yarn-prop
            handleCapacityInputChangeOnModeChange(queuePath, 'edit');
        });
    }

    document.getElementById("edit-modal").classList.add("show");
}


function stageQueueChanges() {
    if (!currentEditQueuePath) {
        console.error("No queue path being edited.");
        return;
    }

    const form = document.getElementById("edit-queue-form");
    if (!form) {
        console.error("Edit form not found.");
        return;
    }

    const queuePath = currentEditQueuePath;
    let changesFromThisSession = {};
    let uiHintsFromThisSession = {};
    let hasMeaningfulChangesInThisSession = false;

    const capacityModeSelect = document.getElementById("edit-capacity-mode");
    const newCapacityMode = capacityModeSelect.value;
    const originalCapacityModeDisplayed = capacityModeSelect.getAttribute("data-original-mode");

    if (newCapacityMode !== originalCapacityModeDisplayed) {
        uiHintsFromThisSession["_ui_capacityMode"] = newCapacityMode;
        hasMeaningfulChangesInThisSession = true;
    }

    form.querySelectorAll("input.form-input, select.form-input").forEach((inputElement) => {
        if (inputElement.id === "edit-capacity-mode") return; // Skip mode selector itself

        const fullYarnPropName = inputElement.getAttribute("data-yarn-prop");
        if (!fullYarnPropName) return;

        let newValue = inputElement.value;
        const originalValueDisplayedInModal = inputElement.getAttribute("data-original-value");
        const modeForSaving = uiHintsFromThisSession["_ui_capacityMode"] || originalCapacityModeDisplayed;

        // Re-format capacity/max-capacity based on the *final selected mode* before saving to store.
        // This ensures the stored raw value matches the intended mode.
        // We need an instance of QueueViewDataFormatter or access to its helper methods.
        // Assuming viewDataFormatter is global for now.
        if (viewDataFormatter && typeof viewDataFormatter._ensureCapacityFormat === 'function') {
            if (fullYarnPropName.endsWith(".capacity")) {
                newValue = viewDataFormatter._ensureCapacityFormat(newValue, modeForSaving, originalValueDisplayedInModal);
            } else if (fullYarnPropName.endsWith(".maximum-capacity")) {
                newValue = viewDataFormatter._ensureMaxCapacityFormat(newValue, modeForSaving, originalValueDisplayedInModal);
            }
        }


        if (newValue !== originalValueDisplayedInModal) {
            hasMeaningfulChangesInThisSession = true;
            changesFromThisSession[fullYarnPropName] = newValue;
        }
    });

    if (hasMeaningfulChangesInThisSession || Object.keys(uiHintsFromThisSession).length > 0) {
        const existingCumulativePendingMods = queueStateStore.getPendingModifications(queuePath); // queueStateStore is global
        const newCumulativePendingMods = {
            ...existingCumulativePendingMods,
            ...changesFromThisSession,
            ...uiHintsFromThisSession
        };
        queueStateStore.doUpdate(queuePath, newCumulativePendingMods);
        showSuccess(`Changes staged for queue "${queuePath.split('.').pop()}"`);
    } else {
        showInfo("No new changes detected to stage.");
    }

    if (typeof renderQueueTree === 'function') renderQueueTree(); // renderQueueTree is global
    if (typeof updateBatchControls === 'function') updateBatchControls(); // updateBatchControls is global
    if (typeof closeEditModal === 'function') closeEditModal(); // closeEditModal is global
}


function handleCapacityInputChangeOnModeChange(queuePath, modalTypePrefix = 'edit') {
    const modeSelect = document.getElementById(`${modalTypePrefix}-capacity-mode`);
    // The capacity input ID is dynamic based on queuePath for edit modal
    const capacityInputId = modalTypePrefix === 'edit' ?
        `edit-queue-yarn.scheduler.capacity.${queuePath}.capacity` :
        'new-queue-capacity'; // For add modal
    const capacityInput = document.getElementById(capacityInputId);

    if (!modeSelect || !capacityInput) {
        console.warn("Capacity mode select or input not found for mode change handler.");
        return;
    }

    const newMode = modeSelect.value;
    let currentValStr = capacityInput.value.trim();
    let numericVal = parseFloat(currentValStr); // Base numeric part

    // Attempt to extract numeric value if current value has suffix or is absolute
    if (isNaN(numericVal)) {
        if (currentValStr.endsWith('w') || currentValStr.endsWith('%')) {
            numericVal = parseFloat(currentValStr.slice(0, -1));
        } else if (currentValStr.startsWith('[')) {
            const memMatch = currentValStr.match(/memory=([0-9.]+)/);
            numericVal = memMatch ? parseFloat(memMatch[1]) : (newMode === CAPACITY_MODES.WEIGHT ? 1.0 : 10.0); // Fallback numeric part
        } else {
            numericVal = (newMode === CAPACITY_MODES.WEIGHT ? 1.0 : (newMode === CAPACITY_MODES.PERCENTAGE ? 10.0 : 0));
        }
    }
    if (isNaN(numericVal)) numericVal = (newMode === CAPACITY_MODES.WEIGHT ? 1.0 : (newMode === CAPACITY_MODES.PERCENTAGE ? 10.0 : 0));

    let formattedVal = "";
    // Use formatter's methods if available (assuming viewDataFormatter is global)
    if (viewDataFormatter && typeof viewDataFormatter._ensureCapacityFormat === 'function') {
        // Create a temporary default based on new mode if currentValStr was e.g. absolute and new mode is percentage
        let tempDefaultForMode = viewDataFormatter._getDefaultCapacityValue(newMode);
        let valueToFormat = numericVal;
        if ((modeSelect.getAttribute('data-current-mode') === CAPACITY_MODES.ABSOLUTE && newMode !== CAPACITY_MODES.ABSOLUTE) ||
            (newMode === CAPACITY_MODES.PERCENTAGE && numericVal > 100) ||
            (newMode === CAPACITY_MODES.ABSOLUTE && currentValStr.indexOf('=') === -1) /* not a vector format */
        ) {
            valueToFormat = parseFloat(tempDefaultForMode) || (newMode === CAPACITY_MODES.PERCENTAGE ? 10.0 : 1.0);
            if (newMode === CAPACITY_MODES.ABSOLUTE) { // if forcing default for absolute
                capacityInput.value = tempDefaultForMode;
                modeSelect.setAttribute('data-current-mode', newMode);
                return;
            }
        }
        formattedVal = viewDataFormatter._ensureCapacityFormat(valueToFormat, newMode, tempDefaultForMode);
    } else { // Fallback to simpler formatting if formatter methods not available
        if (newMode === CAPACITY_MODES.PERCENTAGE) formattedVal = numericVal.toFixed(1) + "%";
        else if (newMode === CAPACITY_MODES.WEIGHT) formattedVal = numericVal.toFixed(1) + "w";
        else if (newMode === CAPACITY_MODES.ABSOLUTE) {
            formattedVal = (currentValStr.startsWith("[") && currentValStr.endsWith("]")) ? currentValStr : `[memory=${Math.round(numericVal)},vcores=1]`; // Simple absolute
        }
    }
    capacityInput.value = formattedVal;
    modeSelect.setAttribute('data-current-mode', newMode); // Store current mode for next change
}


window.openEditModal = openEditModal;
window.stageQueueChanges = stageQueueChanges;