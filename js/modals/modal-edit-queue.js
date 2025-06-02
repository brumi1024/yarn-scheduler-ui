let currentEditQueuePath = null; // Store path instead of the whole object

/**
 * Opens the edit modal for a queue and dynamically generates the content based on the queue's properties.
 * This method ensures proper validation before allowing modifications, dynamically creates form elements,
 * and displays relevant information in an interactive modal window.
 *
 * @param {string} queuePath - The unique path identifier of the queue to be edited.
 * @return {Promise<void>} A promise that resolves when the modal is successfully opened and content is set.
 */
async function openEditModal(queuePath) {
    const formattedQueue = viewDataFormatter.getFormattedQueue(queuePath);

    if (!formattedQueue) {
        showError(`Cannot edit: Queue data not found for ${queuePath}.`);
        return;
    }
    if (formattedQueue.isDeleted) {
        showWarning("Cannot edit a queue marked for deletion.");
        return;
    }

    currentEditQueuePath = queuePath; // Store the path
    const editFormContainer = document.getElementById("edit-form-container");
    if (!editFormContainer) {
        console.error("Edit form container not found in modal.");
        return;
    }
    editFormContainer.innerHTML = ""; // Clear previous form

    const modalTitle = document.getElementById("modal-title");
    if (modalTitle) modalTitle.textContent = `Edit Queue: ${formattedQueue.displayName}`;

    let formHTML = `<form id="edit-queue-form" data-queue-path="${queuePath}">`;

    // Static info: Name and Path
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

    // Capacity Mode Dropdown
    const effectiveMode = formattedQueue.effectiveCapacityMode;
    formHTML += `<div class="form-group property-edit-item">
                    <div class="property-details-column">
                        <div class="property-display-name">
                            <span>Capacity Mode</span>
                            <span class="info-icon" title="Determines how queue capacity is specified...">ⓘ</span>
                        </div>
                        <div class="property-yarn-name">- UI Helper -</div>
                    </div>
                    <div class="property-value-column">
                        <select class="form-input" id="edit-capacity-mode" data-original-mode="${effectiveMode}">
                            <option value="percentage" ${effectiveMode === "percentage" ? "selected" : ""}>Percentage (%)</option>
                            <option value="weight" ${effectiveMode === "weight" ? "selected" : ""}>Weight (w)</option>
                            <option value="absolute" ${effectiveMode === "absolute" ? "selected" : ""}>Absolute Resources</option>
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
                const actualPropName = placeholderPropName.replace(Q_PATH_PLACEHOLDER || '<queue_path>', queuePath);
                const inputId = `edit-queue-${actualPropName.replace(/\./g, "-")}`;

                // Get the value from the formattedQueue object.
                // formattedQueue.properties contains the effective values (base + pending + defaults).
                let currentValue = formattedQueue.properties.get(actualPropName);
                if (currentValue === undefined) { // Should ideally be handled by formatter setting default
                    currentValue = propDef.defaultValue;
                }

                // The formatter should have already ensured `currentValue` for capacity/maxCapacity
                // is in the correct string format for display according to `effectiveCapacityMode`.
                // So, `formattedQueue.capacity` and `formattedQueue.maxCapacity` (top-level) can be used here.
                if (simpleKey === 'capacity') {
                    currentValue = formattedQueue.capacity; // Use the pre-formatted one
                } else if (simpleKey === 'maximumCapacity') { // Match simpleKey used in formatter
                    currentValue = formattedQueue.maxCapacity; // Use the pre-formatted one
                }


                formHTML += `<div class="form-group property-edit-item">
                                <div class="property-details-column">
                                    <div class="property-display-name">
                                        <span>${propDef.displayName}</span>
                                        <span class="info-icon" title="${propDef.description || 'No description.'}">ⓘ</span>
                                    </div>
                                    <div class="property-yarn-name">${actualPropName}</div>
                                </div>
                                <div class="property-value-column">`;

                // Input field generation (similar to original, but 'currentValue' is now from formattedQueue)
                if (propDef.type === "enum") {
                    formHTML += `<select class="form-input" id="${inputId}" data-original-value="${currentValue}" data-yarn-prop="${actualPropName}">`;
                    (propDef.options || []).forEach(opt => {
                        formHTML += `<option value="${opt}" ${currentValue === opt ? "selected" : ""}>${opt}</option>`;
                    });
                    formHTML += `</select>`;
                } else if (propDef.type === "boolean") {
                    formHTML += `<select class="form-input" id="${inputId}" data-original-value="${String(currentValue)}" data-yarn-prop="${actualPropName}">
                                    <option value="true" ${String(currentValue) === "true" ? "selected" : ""}>true</option>
                                    <option value="false" ${String(currentValue) === "false" ? "selected" : ""}>false</option>
                                 </select>`;
                } else if (propDef.type === "number" || propDef.type === "percentage" && !(simpleKey === 'capacity' || simpleKey === 'maximumCapacity')) {
                    // Capacity/MaxCapacity are handled as text due to their complex formats (%)w][)
                    // Other percentages (like max-am-resource-percent) are 0-1 decimals.
                    const numSpecificAttrs = (propDef.type === "percentage")
                        ? `min="0" max="1" step="${propDef.step || '0.01'}"`
                        : (propDef.step ? `step="${propDef.step}"` : '');
                    formHTML += `<input type="number" class="form-input" id="${inputId}" value="${currentValue}" data-original-value="${currentValue}" data-yarn-prop="${actualPropName}" ${numSpecificAttrs}>`;
                } else { // Default to text input (covers capacity, maxCapacity, general strings)
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

    // Add event listener for capacity mode change to reformat capacity input
    const capacityModeSelect = document.getElementById("edit-capacity-mode");
    if (capacityModeSelect) {
        capacityModeSelect.addEventListener("change", () => {
            handleCapacityInputChangeOnModeChange(queuePath, 'edit');
        });
    }

    document.getElementById("edit-modal").classList.add("show");
}

/**
 * Stages changes made to the queue form and updates the pending modification store with any meaningful edits.
 *
 * This method captures and compares the form's current input values against their original states to determine
 * if there are any meaningful changes. If changes are detected, it merges them with previously pending modifications
 * and updates the queue state store. Additionally, it handles UI-specific hints, like capacity mode changes, and
 * handles any required transformations for specific input fields.
 *
 * @return {void} This function does not return anything. It either updates the internal state with staged changes
 * or logs corresponding messages if no changes were detected or if the necessary elements are missing.
 */
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
    let changesFromThisSession = {}; // Holds YARN props: {yarn.prop.name: value}
    let uiHintsFromThisSession = {};   // Holds UI hints like {_ui_capacityMode: mode}
    let hasMeaningfulChangesInThisSession = false; // Tracks if actual data values changed

    const capacityModeSelect = document.getElementById("edit-capacity-mode");
    const newCapacityMode = capacityModeSelect.value;
    const originalCapacityModeDisplayed = capacityModeSelect.getAttribute("data-original-mode");

    // Check if capacity mode itself changed
    if (newCapacityMode !== originalCapacityModeDisplayed) {
        uiHintsFromThisSession["_ui_capacityMode"] = newCapacityMode;
        // A mode change is a meaningful change even if other values revert to original *under the new mode*
        hasMeaningfulChangesInThisSession = true;
    }

    // Iterate form inputs to find changes from this specific edit session
    form.querySelectorAll("input.form-input, select.form-input").forEach((inputElement) => {
        if (inputElement.id === "edit-capacity-mode") return;

        const fullYarnPropName = inputElement.getAttribute("data-yarn-prop");
        if (!fullYarnPropName) return;

        let newValue = inputElement.value;
        const originalValueDisplayedInModal = inputElement.getAttribute("data-original-value");

        // Re-format the capacity field based on the *potentially new* capacity mode before comparison
        const modeForComparison = uiHintsFromThisSession["_ui_capacityMode"] || originalCapacityModeDisplayed;
        if (fullYarnPropName.endsWith(".capacity")) {
            // Use the formatter's method (assuming it's accessible or replicated here)
            newValue = QueueViewDataFormatter.prototype._ensureCapacityFormat(newValue, modeForComparison, originalValueDisplayedInModal);
        } else if (fullYarnPropName.endsWith(".maximum-capacity")) {
            newValue = QueueViewDataFormatter.prototype._ensureMaxCapacityFormat(newValue, modeForComparison, originalValueDisplayedInModal);
        }
        // Add similar for other type-specific formatting if required (e.g., boolean "true"/"false")

        if (newValue !== originalValueDisplayedInModal) {
            hasMeaningfulChangesInThisSession = true;
            changesFromThisSession[fullYarnPropName] = newValue;
        }
    });

    if (hasMeaningfulChangesInThisSession || Object.keys(uiHintsFromThisSession).length > 0) {
        // Fetch the *cumulative* pending modifications already in the store for this queue
        const existingCumulativePendingMods = queueStateStore.getPendingModifications(queuePath);

        // Merge changes from this session onto the existing cumulative pending mods
        // Changes from this session take precedence for the keys they modify.
        const newCumulativePendingMods = {
            ...existingCumulativePendingMods,
            ...changesFromThisSession,
            ...uiHintsFromThisSession // UI hints also override previous ones
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

/**
 * Handles changes in the capacity input field when the mode (weight, percentage, or absolute)
 * is changed in a modal dialog. It adjusts the input value formatting based on the selected mode.
 *
 * @param {string} queuePath - The path of the queue for which capacity is being configured.
 * @param {string} [modalTypePrefix='edit'] - The modal type prefix to determine the input and mode
 *                                             element IDs. Defaults to 'edit'.
 * @return {void} This function does not return a value.
 */
function handleCapacityInputChangeOnModeChange(queuePath, modalTypePrefix = 'edit') {
    const modeSelect = document.getElementById(`${modalTypePrefix}-capacity-mode`);
    const capacityInput = document.getElementById(`${modalTypePrefix === 'edit' ? 
        `edit-queue-yarn.scheduler.capacity.${queuePath}.capacity` : 'new-queue-capacity'}`);

    if (!modeSelect || !capacityInput) return;

    const newMode = modeSelect.value;
    let currentValStr = capacityInput.value;
    let numericVal = parseFloat(currentValStr); // Try to get a number

    if (isNaN(numericVal)) { // If input is not a number (e.g. "[memory=...]" or "10w")
        if (currentValStr.endsWith('w') || currentValStr.endsWith('%')) {
            numericVal = parseFloat(currentValStr.slice(0, -1));
        } else if (currentValStr.startsWith('[')) { // If absolute, try to extract a primary value or use default
            const memMatch = currentValStr.match(/memory=([0-9.]+)/);
            numericVal = memMatch ? parseFloat(memMatch[1]) : (newMode === 'weight' ? 1.0 : 10.0);
        } else { // Cannot parse, use a sensible default
            numericVal = (newMode === 'weight' ? 1.0 : (newMode === 'percentage' ? 10.0 : 0));
        }
    }
    if (isNaN(numericVal)) numericVal = (newMode === 'weight' ? 1.0 : (newMode === 'percentage' ? 10.0 : 0));


    let formattedVal = "";
    if (newMode === "weight") formattedVal = numericVal.toFixed(1) + "w";
    else if (newMode === "percentage") formattedVal = numericVal.toFixed(1) + "%";
    else if (newMode === "absolute") {
        // If the original was absolute, try to keep it, else default
        formattedVal = (currentValStr.startsWith("[") && currentValStr.endsWith("]")) ?
            currentValStr : "[memory=1024,vcores=1]";
    }
    capacityInput.value = formattedVal;
}

window.openEditModal = openEditModal;
window.stageQueueChanges = stageQueueChanges;
