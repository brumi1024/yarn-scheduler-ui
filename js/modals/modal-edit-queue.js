/**
 * Opens the edit modal for the specified queue, populating it with the queue's configuration data.
 * The method validates the queue's existence and ensures it is not marked for deletion before rendering the modal.
 *
 * @param {string} queuePath - The unique identifier or path of the queue to be edited.
 * @return {void} This function does not return a value.
 */
function openEditModal(queuePath) {
    const formattedQueue = viewDataFormatter.getFormattedQueue(queuePath);

    if (!formattedQueue) {
        showError(`Cannot edit: Queue data not found for ${queuePath}.`);
        return;
    }
    if (formattedQueue.isDeleted) {
        showWarning("Cannot edit a queue marked for deletion.");
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

    QUEUE_CONFIG_CATEGORIES.forEach((category) => {
        formHTML += `<h4 class="form-category-title">${category.groupName}</h4>`;
        for (const placeholderPropName in category.properties) {
            if (Object.hasOwnProperty.call(category.properties, placeholderPropName)) {
                const propDef = category.properties[placeholderPropName];
                const simpleKey = placeholderPropName.substring(placeholderPropName.lastIndexOf('.') + 1);
                const actualPropName = placeholderPropName.replace(Q_PATH_PLACEHOLDER, queuePath);
                const inputId = `edit-queue-${actualPropName.replace(/\./g, "-")}`; // Correct ID generation

                let currentValue = formattedQueue[simpleKey];
                if (currentValue === undefined && formattedQueue.propertiesForEditModal && formattedQueue.propertiesForEditModal.has(simpleKey)) {
                    currentValue = formattedQueue.propertiesForEditModal.get(simpleKey);
                }
                if (currentValue === undefined) {
                    currentValue = propDef.defaultValue;
                }
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
                } else {
                    let inputType = "text";
                    let stepAttr = "";
                    let minMaxAttr = "";
                    if (simpleKey === 'capacity' || simpleKey === 'maximum-capacity') {
                        inputType = "text";
                    } else if (propDef.type === "number") {
                        inputType = "number";
                        if (propDef.step) stepAttr = `step="${propDef.step}"`;
                    } else if (propDef.type === "percentage") {
                        inputType = "number";
                        stepAttr = `step="${propDef.step || '0.01'}"`;
                        minMaxAttr = `min="0" max="1"`;
                    }
                    formHTML += `<input type="${inputType}" class="form-input" id="${inputId}" value="${currentValue}" data-original-value="${currentValue}" data-yarn-prop="${actualPropName}" ${stepAttr} ${minMaxAttr}>`;
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
            handleCapacityInputChangeOnModeChange(queuePath, 'edit');
        });
    }

    document.getElementById("edit-modal").classList.add("show");
}

// Corrected handleCapacityInputChangeOnModeChange
function handleCapacityInputChangeOnModeChange(queuePath, modalTypePrefix = 'edit') {
    const modeSelect = document.getElementById(`${modalTypePrefix}-capacity-mode`);

    let capacityInputId;
    if (modalTypePrefix === 'edit') {
        const fullYarnCapacityPropName = `yarn.scheduler.capacity.${queuePath}.capacity`;
        capacityInputId = `edit-queue-${fullYarnCapacityPropName.replace(/\./g, "-")}`;
    } else {
        capacityInputId = 'new-queue-capacity';
    }

    const capacityInput = document.getElementById(capacityInputId);

    if (!modeSelect || !capacityInput) {
        console.warn("Capacity mode select or input not found for mode change handler. ModeSelect ID:", `${modalTypePrefix}-capacity-mode`, "CapacityInput ID tried:", capacityInputId);
        return;
    }

    const newMode = modeSelect.value;
    capacityInput.value = viewDataFormatter._getDefaultCapacityValue(newMode);
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

    const rawInputValues = new Map();
    form.querySelectorAll("input.form-input, select.form-input").forEach((inputElement) => {
        if (inputElement.id === "edit-capacity-mode") return;
        const fullYarnPropName = inputElement.getAttribute("data-yarn-prop");
        if (fullYarnPropName) {
            rawInputValues.set(fullYarnPropName, inputElement.value);
        }
    });

    for (const [fullYarnPropName, rawNewValueUntrimmed] of rawInputValues) {
        const inputElement = form.querySelector(`[data-yarn-prop="${fullYarnPropName}"]`);
        const originalValueDisplayedInModal = inputElement.getAttribute("data-original-value");
        const rawNewValue = typeof rawNewValueUntrimmed === 'string' ? rawNewValueUntrimmed.trim() : rawNewValueUntrimmed;

        let modeForProperty = originalCapacityModeDisplayed;
        if (fullYarnPropName.endsWith(".capacity") || fullYarnPropName.endsWith(".maximum-capacity")) {
            modeForProperty = uiHintsFromThisSession["_ui_capacityMode"] || originalCapacityModeDisplayed;
        }

        let valueToStage = rawNewValue;

        if (fullYarnPropName.endsWith(".capacity")) {
            const capacityErrors = validateCapacity(rawNewValue, modeForProperty);
            if (capacityErrors.length > 0) {
                showWarning(`Invalid Capacity value "${rawNewValue}": ${capacityErrors.join(', ')}`);
                if (inputElement) inputElement.focus();
                return;
            }

            valueToStage = viewDataFormatter._ensureCapacityFormat(rawNewValue, modeForProperty, originalValueDisplayedInModal);
        } else if (fullYarnPropName.endsWith(".maximum-capacity")) {
            valueToStage = viewDataFormatter._ensureMaxCapacityFormat(rawNewValue, originalValueDisplayedInModal);
        }
        // TODO: Add validation for other property types based on propDef.type from QUEUE_CONFIG_CATEGORIES

        if (valueToStage !== originalValueDisplayedInModal) {
            if (fullYarnPropName.endsWith(".capacity") || fullYarnPropName.endsWith(".maximum-capacity")) {
                if (valueToStage.endsWith("%")) {
                    valueToStage = parseFloat(valueToStage); // remove % from percentage values
                }
            }
            changesFromThisSession[fullYarnPropName] = valueToStage;
            hasMeaningfulChangesInThisSession = true;
        } else if (uiHintsFromThisSession["_ui_capacityMode"] && (fullYarnPropName.endsWith(".capacity") || fullYarnPropName.endsWith(".maximum-capacity"))) {
            changesFromThisSession[fullYarnPropName] = valueToStage; // Re-stage even if string is same, mode change matters
            hasMeaningfulChangesInThisSession = true;
        }
    }

    if (hasMeaningfulChangesInThisSession || Object.keys(uiHintsFromThisSession).length > 0) {
        const existingCumulativePendingMods = queueStateStore.getPendingModifications(queuePath);
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

    renderQueueTree();
    updateBatchControls();
    closeEditModal();
}

window.openEditModal = openEditModal;
window.stageQueueChanges = stageQueueChanges;
