async function openEditModal(queue) {
  if (!queue) {
    if (typeof showError === "function")
      showError("Cannot edit: Queue data is missing.");
    else console.error("Cannot edit: Queue data is missing.");
    return;
  }
  if (pendingDeletions.has(queue.path)) {
    if (typeof showWarning === "function")
      showWarning("Cannot edit a queue marked for deletion.");
    else console.warn("Cannot edit a queue marked for deletion.");
    return;
  }

  currentEditQueue = queue;
  const editFormContainer = document.getElementById("edit-form-container");
  if (!editFormContainer) {
    console.error("Edit form container not found in modal.");
    return;
  }
  editFormContainer.innerHTML = "";

  const modalTitle = document.getElementById("modal-title");
  if (modalTitle) modalTitle.textContent = `Edit Queue: ${queue.name}`;

  if (liveRawSchedulerConf === null) {
    try {
      const rawConfData = await api.getSchedulerConf();
      if (rawConfData && rawConfData.property) {
        liveRawSchedulerConf = new Map(
          rawConfData.property.map((p) => [p.name, p.value])
        );
      } else {
        liveRawSchedulerConf = new Map();
      }
    } catch (e) {
      if (typeof showError === "function")
        showError(
          "Error fetching queue configurations from scheduler-conf. Displaying defaults or cached values."
        );
      else
        console.error(
          "Error fetching queue configurations from scheduler-conf.",
          e
        );
      liveRawSchedulerConf = new Map();
    }
  }

  const pendingChangeForThisQueue = pendingChanges.get(queue.path) || {};
  let formHTML = `<form id="edit-queue-form" data-queue-path="${queue.path}">`;

  formHTML += `<div class="form-group static-info-group">
                    <div class="property-details-column">
                        <div class="property-display-name"><span>Queue Name</span></div>
                        <div class="property-yarn-name">(Read-only)</div>
                    </div>
                    <div class="property-value-column">
                        <input type="text" class="form-input" value="${queue.name}" readonly>
                    </div>
                 </div>`;
  formHTML += `<div class="form-group static-info-group">
                    <div class="property-details-column">
                        <div class="property-display-name"><span>Queue Path</span></div>
                        <div class="property-yarn-name">(Read-only)</div>
                    </div>
                    <div class="property-value-column">
                        <input type="text" class="form-input" value="${queue.path}" readonly>
                    </div>
                 </div>`;

  let currentCapacityMode = pendingChangeForThisQueue._ui_capacityMode;
  if (!currentCapacityMode) {
    const rawCapacityString = queue.properties.get("capacity"); 
    if (rawCapacityString) {
      if (String(rawCapacityString).endsWith("w"))
        currentCapacityMode = "weight";
      else if (String(rawCapacityString).startsWith("["))
        currentCapacityMode = "absolute";
      else if (String(rawCapacityString).includes("%"))
        currentCapacityMode = "percentage";
      else currentCapacityMode = "percentage"; // Default if format is unclear but value exists
    } else {
      // Fallback if 'capacity' property doesn't exist on the queue
      currentCapacityMode = detectCapacityMode(queue); 
    }
  }

  if (!currentCapacityMode) currentCapacityMode = 'percentage';

  formHTML += `<div class="form-group property-edit-item">
                    <div class="property-details-column">
                        <div class="property-display-name">
                            <span>Capacity Mode</span>
                            <span class="info-icon" title="Determines how queue capacity is specified: Percentage (%), Weight (w), or Absolute resources (e.g., [memory=1Gi,vcores=2]). Changing this may reformat the Capacity field.">ⓘ</span>
                        </div>
                        <div class="property-yarn-name">- UI Helper -</div>
                    </div>
                    <div class="property-value-column">
                        <select class="form-input" id="edit-capacity-mode" data-original-mode="${currentCapacityMode}">
                            <option value="percentage" ${
                              currentCapacityMode === "percentage"
                                ? "selected"
                                : ""
                            }>Percentage (%)</option>
                            <option value="weight" ${
                              currentCapacityMode === "weight" ? "selected" : ""
                            }>Weight (w)</option>
                            <option value="absolute" ${
                              currentCapacityMode === "absolute"
                                ? "selected"
                                : ""
                            }>Absolute Resources</option>
                        </select>
                    </div>
                 </div>`;

  QUEUE_CONFIG_CATEGORIES.forEach((category) => {
    formHTML += `<h4 class="form-category-title">${category.groupName}</h4>`;
    for (const placeholderPropName in category.properties) {
      const propDef = category.properties[placeholderPropName];
      const actualPropName = placeholderPropName.replace(
        Q_PATH_PLACEHOLDER,
        queue.path
      );
      const simplePropName = placeholderPropName.split('.').pop();
      const inputId = `edit-queue-${actualPropName.replace(/\./g, "-")}`;
      let originalValueForInput;

      if (pendingChangeForThisQueue[actualPropName] !== undefined) {
        originalValueForInput = pendingChangeForThisQueue[actualPropName];
      } else if (queue.properties.has(simplePropName)) {
        originalValueForInput = queue.properties.get(simplePropName);
      } else {
        originalValueForInput = propDef.defaultValue;
      }

      if (
        actualPropName.endsWith(".capacity") &&
        pendingChangeForThisQueue[actualPropName] === undefined
      ) {
        let tempCapValue = originalValueForInput;
        if (
          currentCapacityMode === "percentage" &&
          !String(tempCapValue).includes("%") &&
          !String(tempCapValue).includes("w") &&
          !String(tempCapValue).startsWith("[")
        ) {
          tempCapValue = (parseFloat(tempCapValue) || 0).toFixed(1) + "%";
        } else if (
          currentCapacityMode === "weight" &&
          !String(tempCapValue).includes("w") &&
          !String(tempCapValue).includes("%") &&
          !String(tempCapValue).startsWith("[")
        ) {
          tempCapValue = (parseFloat(tempCapValue) || 0).toFixed(1) + "w";
        } else if (
          currentCapacityMode === "absolute" &&
          !String(tempCapValue).startsWith("[")
        ) {
          tempCapValue =
            propDef.defaultValue && String(propDef.defaultValue).startsWith("[")
              ? propDef.defaultValue
              : "[memory=1024,vcores=1]";
        }
        originalValueForInput = tempCapValue;
      }
      if (
        actualPropName.endsWith(".maximum-capacity") &&
        pendingChangeForThisQueue[actualPropName] === undefined
      ) {
        if (
          !String(originalValueForInput).startsWith("[") &&
          !String(originalValueForInput).endsWith("%")
        ) {
          originalValueForInput =
            (parseFloat(originalValueForInput) || 100).toFixed(1) + "%";
        }
      }

      formHTML += `<div class="form-group property-edit-item">
                            <div class="property-details-column">
                                <div class="property-display-name">
                                    <span>${propDef.displayName}</span>
                                    <span class="info-icon" title="${
                                      propDef.description ||
                                      "No description available."
                                    }">ⓘ</span>
                                </div>
                                <div class="property-yarn-name">${actualPropName}</div>
                            </div>
                            <div class="property-value-column">`;

      if (
        placeholderPropName.endsWith(".capacity") &&
        placeholderPropName.includes(Q_PATH_PLACEHOLDER)
      ) {
        formHTML += `<input type="text" class="form-input" id="${inputId}" value="${originalValueForInput}" data-original-value="${originalValueForInput}" data-yarn-prop="${actualPropName}">`;
      } else if (propDef.type === "enum") {
        formHTML += `<select class="form-input" id="${inputId}" data-original-value="${originalValueForInput}" data-yarn-prop="${actualPropName}">`;
        (propDef.options || []).forEach((opt) => {
          formHTML += `<option value="${opt}" ${
            originalValueForInput === opt ? "selected" : ""
          }>${opt}</option>`;
        });
        formHTML += `</select>`;
      } else if (propDef.type === "boolean") {
        formHTML += `<select class="form-input" id="${inputId}" data-original-value="${originalValueForInput}" data-yarn-prop="${actualPropName}">
                                <option value="true" ${
                                  originalValueForInput === "true"
                                    ? "selected"
                                    : ""
                                }>true</option>
                                <option value="false" ${
                                  originalValueForInput === "false"
                                    ? "selected"
                                    : ""
                                }>false</option>
                             </select>`;
      } else if (propDef.type === "number" || propDef.type === "percentage") {
        const numSpecificAttrs =
          propDef.type === "percentage"
            ? `min="0" max="1" step="${propDef.step || "0.01"}"`
            : propDef.step
            ? `step="${propDef.step}"`
            : "";
        formHTML += `<input type="number" class="form-input" id="${inputId}" value="${originalValueForInput}" data-original-value="${originalValueForInput}" data-yarn-prop="${actualPropName}" ${numSpecificAttrs}>`;
      } else {
        formHTML += `<input type="text" class="form-input" id="${inputId}" value="${originalValueForInput}" data-original-value="${originalValueForInput}" data-yarn-prop="${actualPropName}">`;
      }
      formHTML += `   </div>
                         </div>`;
    }
  });

  formHTML += `</form>
                 <div class="modal-actions">
                    <button class="btn btn-secondary" onclick="closeEditModal()">Cancel</button> <button class="btn btn-primary" onclick="stageQueueChanges()">Stage Changes</button>
                 </div>`;

  editFormContainer.innerHTML = formHTML;

  const capacityModeSelect = document.getElementById("edit-capacity-mode");
  if (capacityModeSelect) {
    capacityModeSelect.addEventListener("change", () => {
      const newMode = capacityModeSelect.value;
      let capacityInput = null;
      let capacityPropDef = null; // To get description
      for (const category of QUEUE_CONFIG_CATEGORIES) {
        for (const phPropName in category.properties) {
          if (
            phPropName.endsWith(".capacity") &&
            phPropName.includes(Q_PATH_PLACEHOLDER)
          ) {
            const actualCapPropName = phPropName.replace(
              Q_PATH_PLACEHOLDER,
              queue.path
            );
            capacityInput = editFormContainer.querySelector(
              `input[data-yarn-prop="${actualCapPropName}"]`
            );
            capacityPropDef = category.properties[phPropName];
            break;
          }
        }
        if (capacityInput) break;
      }

      if (capacityInput && capacityPropDef) {
        let currentValStr = capacityInput.value;
        let numericVal = parseFloat(currentValStr);
        if (currentValStr.endsWith("%") || currentValStr.endsWith("w")) {
          numericVal = parseFloat(currentValStr.slice(0, -1));
        } else if (currentValStr.startsWith("[")) {
          numericVal = newMode === "weight" ? 1.0 : 10.0;
        }
        if (isNaN(numericVal))
          numericVal =
            newMode === "weight" ? 1.0 : newMode === "percentage" ? 10.0 : 0;

        if (newMode === "weight") currentValStr = numericVal.toFixed(1) + "w";
        else if (newMode === "percentage")
          currentValStr = numericVal.toFixed(1) + "%";
        else if (newMode === "absolute") {
          currentValStr =
            capacityInput.value.startsWith("[") &&
            capacityInput.value.endsWith("]")
              ? capacityInput.value
              : "[memory=1024,vcores=1]";
        }
        capacityInput.value = currentValStr;

        const helpTextElement = capacityInput
          .closest(".form-group.property-edit-item")
          ?.querySelector(".form-help");
        if (helpTextElement) {
          // This was for the main description, but we can append mode info
          helpTextElement.textContent = `${capacityPropDef.description} Current mode: ${newMode}.`;
        }
      }
    });
    setTimeout(() => {
      if (
        document.getElementById("edit-capacity-mode") === capacityModeSelect
      ) {
        capacityModeSelect.dispatchEvent(new Event("change"));
      }
    }, 50);
  }
  document.getElementById("edit-modal").classList.add("show");
}

function stageQueueChanges() {
  if (!currentEditQueue) return;
  const form = document.getElementById("edit-queue-form");
  if (!form) return;

  const queuePath = currentEditQueue.path;
  let existingPendingChanges = pendingChanges.get(queuePath) || {};
  let newChangesForAPI = {};
  let uiHints = {};
  let hasDetectedChanges = false;

  const capacityModeSelect = document.getElementById("edit-capacity-mode");
  const newCapacityMode = capacityModeSelect.value;
  const originalCapacityMode =
    capacityModeSelect.getAttribute("data-original-mode");

  if (newCapacityMode !== originalCapacityMode) {
    uiHints["_ui_capacityMode"] = newCapacityMode;
    hasDetectedChanges = true;
  } else if (
    existingPendingChanges["_ui_capacityMode"] &&
    existingPendingChanges["_ui_capacityMode"] !== newCapacityMode
  ) {
    uiHints["_ui_capacityMode"] = newCapacityMode;
    hasDetectedChanges = true;
  } else if (existingPendingChanges["_ui_capacityMode"]) {
    // Preserve if not changed this session
    uiHints["_ui_capacityMode"] = existingPendingChanges["_ui_capacityMode"];
  }

  const effectiveCapacityMode =
    uiHints["_ui_capacityMode"] ||
    currentEditQueue.capacityMode ||
    (typeof detectCapacityMode === "function"
      ? detectCapacityMode(currentEditQueue)
      : null) ||
    "percentage";

  form
    .querySelectorAll("input.form-input, select.form-input")
    .forEach((inputElement) => {
      if (inputElement.id === "edit-capacity-mode") return;

      const actualPropName = inputElement.getAttribute("data-yarn-prop");
      if (!actualPropName) return;

      const newValue = inputElement.value;
      const originalValue = inputElement.getAttribute("data-original-value");

      if (newValue !== originalValue) {
        hasDetectedChanges = true;
        let propDefForType; // Find metadata to get type for formatting, e.g. percentage
        for (const category of QUEUE_CONFIG_CATEGORIES) {
          const ph = Object.keys(category.properties).find(
            (p) => p.replace(Q_PATH_PLACEHOLDER, queuePath) === actualPropName
          );
          if (ph) {
            propDefForType = category.properties[ph];
            break;
          }
        }

        if (actualPropName.endsWith(".capacity")) {
          if (effectiveCapacityMode === "percentage" && !newValue.endsWith("%"))
            newChangesForAPI[actualPropName] =
              (parseFloat(newValue) || 0).toFixed(1) + "%";
          else if (
            effectiveCapacityMode === "weight" &&
            !newValue.endsWith("w")
          )
            newChangesForAPI[actualPropName] =
              (parseFloat(newValue) || 0).toFixed(1) + "w";
          else if (
            effectiveCapacityMode === "absolute" &&
            !(newValue.startsWith("[") && newValue.endsWith("]"))
          )
            newChangesForAPI[actualPropName] = `[${newValue.replace(
              /[\[\]]/g,
              ""
            )}]`; // Basic wrap
          else newChangesForAPI[actualPropName] = newValue;
        } else if (
          propDefForType &&
          propDefForType.type === "percentage" &&
          newValue.trim() !== ""
        ) {
          newChangesForAPI[actualPropName] = String(parseFloat(newValue)); // Store as decimal string e.g. "0.1"
        } else {
          newChangesForAPI[actualPropName] = newValue;
        }
      } else if (
        existingPendingChanges[actualPropName] !== undefined &&
        existingPendingChanges[actualPropName] !== newValue
      ) {
        hasDetectedChanges = true; // Value reverted to original, but was different in pending map
        newChangesForAPI[actualPropName] = newValue;
      }
    });

  // Determine if there's anything to stage
  let finalChangesToStore = { ...existingPendingChanges };
  let storeNeeded = false;
  if (Object.keys(newChangesForAPI).length > 0) {
    for (const key in newChangesForAPI)
      finalChangesToStore[key] = newChangesForAPI[key];
    storeNeeded = true;
  }
  if (
    uiHints["_ui_capacityMode"] &&
    uiHints["_ui_capacityMode"] !== existingPendingChanges["_ui_capacityMode"]
  ) {
    finalChangesToStore["_ui_capacityMode"] = uiHints["_ui_capacityMode"];
    storeNeeded = true;
  } else if (uiHints["_ui_capacityMode"]) {
    // Preserve if it was already set and not changed this session
    finalChangesToStore["_ui_capacityMode"] = uiHints["_ui_capacityMode"];
  }

  if (storeNeeded || hasDetectedChanges) {
    // hasDetectedChanges covers initial mode change
    pendingChanges.set(queuePath, finalChangesToStore);
    console.log("Staged changes for", queuePath, ":", finalChangesToStore);
    if (typeof showSuccess === "function")
      showSuccess(`Changes staged for queue "${currentEditQueue.name}"`);
  } else {
    if (typeof showInfo === "function")
      showInfo("No new changes detected to stage.");
  }

  if (typeof renderQueueTree === "function") renderQueueTree();
  if (typeof closeEditModal === "function") closeEditModal();
}

window.openEditModal = openEditModal;
window.stageQueueChanges = stageQueueChanges;
