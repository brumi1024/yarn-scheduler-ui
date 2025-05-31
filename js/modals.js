function createEditForm() {
  return `
        <form id="edit-form">
            <div class="form-group">
                <label class="form-label">Queue Name</label>
                <input type="text" class="form-input" id="queue-name" readonly>
            </div>
            
            <div class="form-group">
                <label class="form-label">Capacity Mode</label>
                <select class="form-input" id="capacity-mode" onchange="onCapacityModeChange()">
                    <option value="percentage">Percentage (%)</option>
                    <option value="weight">Weight (w)</option>
                    <option value="absolute">Absolute Resources</option>
                </select>
            </div>

            <div class="form-group">
                <label class="form-label">Capacity</label>
                <input type="text" class="form-input" id="queue-capacity" placeholder="e.g., 50.0 or 2.0w or [memory=1024,vcores=2]">
                <small id="capacity-help" class="form-help">Enter percentage, weight with 'w', or absolute resources in brackets</small>
            </div>

            <div class="form-group">
                <label class="form-label">Maximum Capacity (%)</label>
                <input type="number" class="form-input" id="queue-max-capacity" min="0" max="100" step="0.1">
            </div>

            <div class="form-group">
                <label class="form-label">State</label>
                <select class="form-input" id="queue-state">
                    <option value="RUNNING">RUNNING</option>
                    <option value="STOPPED">STOPPED</option>
                </select>
            </div>
        </form>
        <div class="modal-actions">
            <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="stageQueueChanges()">Stage Changes</button>
        </div>
    `;
}

function createInfoFormHTML(queue) {
    // This function can be enhanced to be metadata-driven using QUEUE_CONFIG_CATEGORIES
    // For now, a simplified version:
    let html = `<div class="queue-info-container">`;
    const pendingChange = pendingChanges.get(queue.path) || {};
    const liveConf = liveRawSchedulerConf || new Map();

    function getDisplayValue(propPlaceholder, yarnPath, queueObjKey, defaultValue) {
        const actualYarnPath = propPlaceholder.replace(Q_PATH_PLACEHOLDER, queue.path);
        if (pendingChange[actualYarnPath] !== undefined) return pendingChange[actualYarnPath];
        if (liveConf.has(actualYarnPath)) return liveConf.get(actualYarnPath);
        if (queue[queueObjKey] !== undefined) return String(queue[queueObjKey]);
        return defaultValue;
    }
    
    html += `<div class="info-section"><h3 class="info-section-title">Basic Information</h3><table class="info-table">`;
    html += `<tr><td class="info-label">Name</td><td class="info-value">${queue.name}</td></tr>`;
    html += `<tr><td class="info-label">Path</td><td class="info-value">${queue.path}</td></tr>`;
    const state = getDisplayValue(`yarn.scheduler.capacity.${Q_PATH_PLACEHOLDER}.state`, queue.path, 'state', 'N/A');
    html += `<tr><td class="info-label">State</td><td class="info-value">${state}</td></tr>`;
    html += `</table></div>`;

    const capMode = pendingChange._ui_capacityMode || queue.capacityMode || (typeof detectCapacityMode === 'function' ? detectCapacityMode(queue) : 'percentage');
    const capValue = getDisplayValue(`yarn.scheduler.capacity.${Q_PATH_PLACEHOLDER}.capacity`, queue.path, 'capacity', 'N/A');
    const maxCapValue = getDisplayValue(`yarn.scheduler.capacity.${Q_PATH_PLACEHOLDER}.maximum-capacity`, queue.path, 'maxCapacity', 'N/A');

    html += `<div class="info-section"><h3 class="info-section-title">Capacity</h3><table class="info-table">`;
    html += `<tr><td class="info-label">Capacity Mode</td><td class="info-value">${capMode}</td></tr>`;
    html += `<tr><td class="info-label">Configured Capacity</td><td class="info-value">${capValue}</td></tr>`;
    html += `<tr><td class="info-label">Maximum Capacity</td><td class="info-value">${maxCapValue}</td></tr>`;
    html += `<tr><td class="info-label">Absolute Used Capacity</td><td class="info-value">${queue.absoluteUsedCapacity !== undefined ? queue.absoluteUsedCapacity.toFixed(1) + '%' : 'N/A'}</td></tr>`;
    html += `</table></div>`;

    // Add other details similarly, ideally iterating QUEUE_CONFIG_CATEGORIES
    QUEUE_CONFIG_CATEGORIES.forEach(category => {
        let sectionHasContent = false;
        let sectionHTML = `<div class="info-section"><h3 class="info-section-title">${category.groupName}</h3><table class="info-table">`;
        for (const phPropName in category.properties) {
            // Avoid re-listing already shown core properties
            if (phPropName.includes('.capacity') || phPropName.includes('.maximum-capacity') || phPropName.includes('.state')) continue;
            
            const propDef = category.properties[phPropName];
            const val = getDisplayValue(phPropName, queue.path, propDef.objKey || phPropName.split('.').pop(), propDef.defaultValue);
            sectionHTML += `<tr><td class="info-label">${propDef.displayName}</td><td class="info-value">${val}</td></tr>`;
            sectionHasContent = true;
        }
        sectionHTML += `</table></div>`;
        if(sectionHasContent) html += sectionHTML;
    });


    html += `</div>`;
    return html;
}

function createAddFormHTML() {
  return `
        <form id="add-queue-form">
            <div class="form-group">
                <label class="form-label">Parent Queue</label>
                <select class="form-input" id="parent-queue-select"></select>
            </div>
            <div class="form-group">
                <label class="form-label">New Queue Name</label>
                <input type="text" class="form-input" id="new-queue-name" placeholder="Enter queue name">
                <small class="form-help">Letters, numbers, underscores, hyphens allowed.</small>
            </div>
            <div class="form-group">
                <label class="form-label">Capacity Mode</label>
                <select class="form-input" id="new-capacity-mode" onchange="onNewCapacityModeChange()">
                    <option value="percentage" selected>Percentage (%)</option>
                    <option value="weight">Weight (w)</option>
                    <option value="absolute">Absolute Resources</option>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Capacity</label>
                <input type="text" class="form-input" id="new-queue-capacity" value="10%">
            </div>
            <div class="form-group">
                <label class="form-label">Maximum Capacity (%)</label>
                <input type="number" class="form-input" id="new-queue-max-capacity" min="0" max="100" step="0.1" value="100">
            </div>
            <div class="form-group">
                <label class="form-label">State</label>
                <select class="form-input" id="new-queue-state">
                    <option value="RUNNING" selected>RUNNING</option>
                    <option value="STOPPED">STOPPED</option>
                </select>
            </div>
        </form>
        <div class="modal-actions">
            <button class="btn btn-secondary" onclick="closeAddQueueModal()">Cancel</button>
            <button class="btn btn-success" onclick="addNewQueue()">Add Queue</button>
        </div>
    `;
}


function findQueueByPath(path, currentQueue = window.queueData) {
    if (!currentQueue) return null;
    if (currentQueue.path === path) return currentQueue;

    if (currentQueue.children) {
        for (const childName in currentQueue.children) {
            const found = findQueueByPath(path, currentQueue.children[childName]);
            if (found) return found;
        }
    }
    // Check pendingAdditions if searching for a newly added queue not yet in main data
    // (pendingAdditions stores the full new queue object, including its path)
    const pendingQueue = pendingAdditions.get(path);
    if (pendingQueue && pendingQueue.path === path) { 
        return pendingQueue;
    }
    
    return null;
}

function getAllParentQueues() {
  const parents = [];

  function collect(queue) {
    if (!pendingDeletions.has(queue.path)) {
      parents.push({ path: queue.path, name: queue.name });
    }
    // Recurse into children
    Object.values(queue.children).forEach((child) => {
      collect(child);
    });
    // Recurse into new children
    Array.from(pendingAdditions.values()).forEach((newQueue) => {
      if (newQueue.parentPath === queue.path) {
        collect(newQueue);
      }
    });
  }

  collect(queueData);
  return parents;
}

function openAddQueueModal() {
  const addFormContainer = document.getElementById("add-form-container");
  addFormContainer.innerHTML = createAddFormHTML(); 

  const parentSelect = document.getElementById("parent-queue-select");
  parentSelect.innerHTML = ""; 

  const parents = (typeof getAllParentQueues === "function") ? getAllParentQueues() : [{path: 'root', name: 'root'}]; 
  parents.forEach((parent) => {
    if (!pendingDeletions.has(parent.path)) { 
        const option = document.createElement("option");
        option.value = parent.path;
        option.textContent = parent.path;
        parentSelect.appendChild(option);
    }
  });

  if (parentSelect.options.length > 0 && parentSelect.value === '') { // Default to root if available and nothing selected
      const rootOption = Array.from(parentSelect.options).find(opt => opt.value === 'root');
      if (rootOption) parentSelect.value = 'root';
      else parentSelect.selectedIndex = 0; // Or first available
  }
  onNewCapacityModeChange(); 

  document.getElementById("add-queue-modal").classList.add("show");
}

function openAddQueueModalWithParent(parentPath) {
  openAddQueueModal();
  const parentSelect = document.getElementById("parent-queue-select");
  if (parentSelect) parentSelect.value = parentPath;
}

function closeModal() {
  document.getElementById("edit-modal").classList.remove("show");
  currentEditQueue = null;
}

function closeInfoModal() {
  document.getElementById("info-modal").classList.remove("show");
}

function closeAddQueueModal() {
  document.getElementById("add-queue-modal").classList.remove("show");
}

function onCapacityModeChange() {
  const mode = document.getElementById("capacity-mode").value;
  const capacityInput = document.getElementById("queue-capacity");
  const helpText = document.getElementById("capacity-help");

  switch (mode) {
    case "weight":
      capacityInput.placeholder = "e.g., 2.0w";
      capacityInput.value = "1.0w"; // Default value for weight mode
      helpText.textContent = 'Weight mode - enter number followed by "w"';
      break;
    case "absolute":
      capacityInput.placeholder = "e.g., [memory=1024,vcores=2]";
      capacityInput.value = "[memory=1024,vcores=1]"; // Default value for absolute mode
      helpText.textContent = "Absolute resources - enclose in brackets []";
      break;
    case "percentage":
    default:
      capacityInput.placeholder = "e.g., 50.0";
      capacityInput.value = "100"; // Default value for percentage mode
      helpText.textContent = "Percentage - enter number between 0 and 100";
      break;
  }
}

function onNewCapacityModeChange() {
  const modeSelect = document.getElementById("new-capacity-mode");
  const capacityInput = document.getElementById("new-queue-capacity");
  if (!modeSelect || !capacityInput) return;
  const mode = modeSelect.value;

  switch (mode) {
    case "weight": capacityInput.value = "1.0w"; break;
    case "absolute": capacityInput.value = "[memory=1024,vcores=1]"; break;
    case "percentage": default: capacityInput.value = "10%"; break;
  }
}

function addNewQueue() {
    const parentPath = document.getElementById("parent-queue-select").value;
    const queueName = document.getElementById("new-queue-name").value.trim();
    const capacityMode = document.getElementById("new-capacity-mode").value;
    let capacityValue = document.getElementById("new-queue-capacity").value.trim();
    let maxCapacityValue = document.getElementById("new-queue-max-capacity").value.trim(); 
    const state = document.getElementById("new-queue-state").value;

    const nameError = validateQueueName(queueName); 
    if (nameError) { showWarning(nameError); return; }

    if (capacityMode === 'percentage' && !capacityValue.endsWith('%')) capacityValue = (parseFloat(capacityValue) || 0).toFixed(1) + '%';
    else if (capacityMode === 'weight' && !capacityValue.endsWith('w')) capacityValue = (parseFloat(capacityValue) || 0).toFixed(1) + 'w';
    else if (capacityMode === 'absolute' && !(capacityValue.startsWith('[') && capacityValue.endsWith(']'))) capacityValue = `[${capacityValue}]`; // basic wrap

    if (!maxCapacityValue.endsWith('%') && !maxCapacityValue.startsWith('[')) maxCapacityValue = `${parseFloat(maxCapacityValue) || 100}%`;
    
    const capacityErrors = validateCapacity(capacityValue, capacityMode); 
    if (capacityErrors.length > 0) { showWarning(`Capacity validation error: ${capacityErrors.join(", ")}`); return; }

    const newQueuePath = parentPath === "root" ? `root.${queueName}` : `${parentPath}.${queueName}`;

    if (findQueueByPath(newQueuePath) || pendingAdditions.has(newQueuePath)) {
        showWarning("A queue with this name already exists at this path."); return;
    }

    const newQueueDataForStore = { // This is what's stored in pendingAdditions
        name: queueName,
        path: newQueuePath,
        parentPath: parentPath,
        capacity: capacityValue, 
        maxCapacity: maxCapacityValue, 
        state: state,
        children: {}, 
        capacityMode: capacityMode, // UI hint
        // Params for API are built from metadata + these core props
        params: {} 
    };
    
    // Populate params for API from QUEUE_CONFIG_CATEGORIES defaults + core values
    QUEUE_CONFIG_CATEGORIES.forEach(category => {
        for (const placeholderPropName in category.properties) {
            const propDef = category.properties[placeholderPropName];
            const actualPropNameFull = placeholderPropName.replace(Q_PATH_PLACEHOLDER, newQueuePath);
            
            if (placeholderPropName.endsWith('.capacity')) newQueueDataForStore.params[actualPropNameFull] = capacityValue;
            else if (placeholderPropName.endsWith('.maximum-capacity')) newQueueDataForStore.params[actualPropNameFull] = maxCapacityValue;
            else if (placeholderPropName.endsWith('.state')) newQueueDataForStore.params[actualPropNameFull] = state;
            else if (propDef.defaultValue !== undefined && propDef.defaultValue !== '') {
                 newQueueDataForStore.params[actualPropNameFull] = propDef.defaultValue;
            }
        }
    });
    // Ensure core params are definitely set if not covered by loop (e.g. if metadata is minimal)
    if (!newQueueDataForStore.params[`yarn.scheduler.capacity.${newQueuePath}.capacity`]) newQueueDataForStore.params[`yarn.scheduler.capacity.${newQueuePath}.capacity`] = capacityValue;
    if (!newQueueDataForStore.params[`yarn.scheduler.capacity.${newQueuePath}.maximum-capacity`]) newQueueDataForStore.params[`yarn.scheduler.capacity.${newQueuePath}.maximum-capacity`] = maxCapacityValue;
    if (!newQueueDataForStore.params[`yarn.scheduler.capacity.${newQueuePath}.state`]) newQueueDataForStore.params[`yarn.scheduler.capacity.${newQueuePath}.state`] = state;


    pendingAdditions.set(newQueuePath, newQueueDataForStore);
    console.log("Staged new queue for addition:", newQueueDataForStore);
    showSuccess(`New queue "${queueName}" staged for addition.`);

    if (typeof renderQueueTree === "function") renderQueueTree();
    closeAddQueueModal();
}

function stageQueueChanges() {
    if (!currentEditQueue) return;

    const form = document.getElementById('edit-queue-form');
    if (!form) return;

    const queuePath = currentEditQueue.path;
    let existingPendingChanges = pendingChanges.get(queuePath) || {};
    let newChangesForAPI = {}; 
    let uiHints = {}; 
    let hasDetectedChanges = false;

    const capacityModeSelect = document.getElementById('edit-capacity-mode');
    const newCapacityMode = capacityModeSelect.value;
    const originalCapacityMode = capacityModeSelect.getAttribute('data-original-mode');

    if (newCapacityMode !== originalCapacityMode) {
        uiHints['_ui_capacityMode'] = newCapacityMode;
        hasDetectedChanges = true;
    } else if (existingPendingChanges['_ui_capacityMode'] && existingPendingChanges['_ui_capacityMode'] !== newCapacityMode) {
        uiHints['_ui_capacityMode'] = newCapacityMode; 
        hasDetectedChanges = true; 
    } else if (existingPendingChanges['_ui_capacityMode']) {
        uiHints['_ui_capacityMode'] = existingPendingChanges['_ui_capacityMode'];
    }
    
    const effectiveCapacityMode = uiHints['_ui_capacityMode'] || currentEditQueue.capacityMode || (typeof detectCapacityMode === 'function' ? detectCapacityMode(currentEditQueue) : null) || 'percentage';

    form.querySelectorAll('input.form-input, select.form-input').forEach(inputElement => {
        if (inputElement.id === 'edit-capacity-mode') return; 

        const actualPropName = inputElement.getAttribute('data-yarn-prop');
        if (!actualPropName) return;

        const newValue = inputElement.value;
        const originalValue = inputElement.getAttribute('data-original-value');

        if (newValue !== originalValue) {
            hasDetectedChanges = true;
            // Find propDef for type information if needed for formatting output
            let propDefForType;
            for (const category of QUEUE_CONFIG_CATEGORIES) {
                for (const phPropName in category.properties) {
                    if (phPropName.replace(Q_PATH_PLACEHOLDER, queuePath) === actualPropName) {
                        propDefForType = category.properties[phPropName];
                        break;
                    }
                }
                if (propDefForType) break;
            }

            if (actualPropName.endsWith('.capacity')) {
                if (effectiveCapacityMode === 'percentage' && !newValue.endsWith('%')) {
                    newChangesForAPI[actualPropName] = (parseFloat(newValue) || 0).toFixed(1) + '%';
                } else if (effectiveCapacityMode === 'weight' && !newValue.endsWith('w')) {
                    newChangesForAPI[actualPropName] = (parseFloat(newValue) || 0).toFixed(1) + 'w';
                } else if (effectiveCapacityMode === 'absolute' && (!newValue.startsWith('[') || !newValue.endsWith(']'))) {
                    newChangesForAPI[actualPropName] = newValue.startsWith('[') && newValue.endsWith(']') ? newValue : `[${newValue}]`; // Basic wrap
                } else {
                    newChangesForAPI[actualPropName] = newValue;
                }
            } else if (propDefForType && propDefForType.type === 'percentage' && newValue.trim() !== '') {
                // Ensure this percentage (like max-am-resource-percent) is a float string "0.1" not "10%"
                newChangesForAPI[actualPropName] = String(parseFloat(newValue) / (newValue.includes('%') ? 100 : 1) );
            } else {
                newChangesForAPI[actualPropName] = newValue;
            }
        } else if (existingPendingChanges[actualPropName] !== undefined && existingPendingChanges[actualPropName] !== newValue) {
            hasDetectedChanges = true;
            newChangesForAPI[actualPropName] = newValue;
        }
    });
    
    if (hasDetectedChanges || (Object.keys(uiHints).length > 0 && uiHints['_ui_capacityMode'] !== (existingPendingChanges['_ui_capacityMode'] || currentCapacityMode /* fallback to initial mode if nothing was pending */))) {
        const finalChangesToStore = { ...existingPendingChanges }; // Start with old pending changes
        for(const key in newChangesForAPI){ // Overwrite with new ones from this session
            finalChangesToStore[key] = newChangesForAPI[key];
        }
        for(const key in uiHints){ // Add/overwrite UI hints
            finalChangesToStore[key] = uiHints[key];
        }

        // If no API-relevant changes but UI hints changed, we still save.
        // If API changes are empty and UI hints also didn't change meaningfully from previous pending, it's "no change".
        let actualApiChangesCount = Object.keys(finalChangesToStore).filter(k => k !== '_ui_capacityMode').length;
        let uiModeChangedFromStored = uiHints['_ui_capacityMode'] && uiHints['_ui_capacityMode'] !== existingPendingChanges['_ui_capacityMode'];

        if (actualApiChangesCount > 0 || uiModeChangedFromStored || (Object.keys(uiHints).length > 0 && !existingPendingChanges['_ui_capacityMode']) ) {
            pendingChanges.set(queuePath, finalChangesToStore);
            console.log("Staged changes for", queuePath, ":", finalChangesToStore);
            showSuccess(`Changes staged for queue "${currentEditQueue.name}"`);
        } else {
             showInfo("No new changes detected to stage.");
        }
    } else {
        showInfo("No new changes detected to stage.");
    }

    if (typeof renderQueueTree === "function") renderQueueTree();
    closeModal();
}

async function applyAllChanges() {
    const validationErrors = (typeof validatePendingChanges === 'function') ? validatePendingChanges() : []; 
    if (validationErrors.length > 0) {
        showWarning(`Cannot apply changes: ${validationErrors.join(", ")}`);
        return;
    }

    const backupChanges = new Map(pendingChanges);
    const backupAdditions = new Map(pendingAdditions);
    const backupDeletions = new Set(pendingDeletions);

    const deletions = Array.from(pendingDeletions);
    const additions = Array.from(pendingAdditions.values()).map((newQueue) => {
        return {
            queueName: newQueue.path, 
            params: newQueue.params || {} 
        };
    });

    const updates = [];
    pendingChanges.forEach((changes, queuePath) => {
        const paramsForAPI = {};
        let hasApiRelevantChanges = false;
        for (const keyInChanges in changes) {
            if (keyInChanges !== '_ui_capacityMode') { 
                paramsForAPI[keyInChanges] = changes[keyInChanges];
                hasApiRelevantChanges = true;
            }
        }
        if (hasApiRelevantChanges) {
            updates.push({
                queueName: queuePath,
                params: paramsForAPI
            });
        }
    });

    if (deletions.length === 0 && additions.length === 0 && updates.length === 0) {
        showInfo("No staged queue changes to apply.");
        return;
    }
    
    showLoading("Applying queue configuration changes...");
    try {
        const response = await api.makeConfigurationUpdateApiCall({ deletions, additions, updates });

        if (response && response.status == 200 && typeof response.data === "string" && response.data.toLowerCase().includes("successfully applied")) {
            pendingChanges.clear();
            pendingAdditions.clear();
            pendingDeletions.clear();
            liveRawSchedulerConf = null; 
            
            showLoading("Reloading queue configuration...");
            await api.loadSchedulerConfiguration(); 
            showSuccess("Queue configuration changes applied successfully!");
        } else {
            pendingChanges.clear(); backupChanges.forEach((v, k) => pendingChanges.set(k, v));
            pendingAdditions.clear(); backupAdditions.forEach((v, k) => pendingAdditions.set(k, v));
            pendingDeletions.clear(); backupDeletions.forEach(v => pendingDeletions.add(v));
            
            if (typeof renderQueueTree === "function") renderQueueTree();

            let errorMessage = "Configuration update failed or validation error from YARN.";
            if (response && response.data) {
                if (typeof response.data === 'string') {
                    const errorMatch = response.data.match(/ERROR:?\s*(.+?)(?:\n|$)/i);
                    errorMessage = errorMatch ? errorMatch[1].trim() : response.data.substring(0, 300) + (response.data.length > 300 ? "..." : "");
                } else {
                    errorMessage = JSON.stringify(response.data);
                }
            }
            showError(`YARN update failed: ${errorMessage}`);
            console.warn("YARN update/validation failed. Response:", response);
        }
    } catch (error) {
        pendingChanges.clear(); backupChanges.forEach((v, k) => pendingChanges.set(k, v));
        pendingAdditions.clear(); backupAdditions.forEach((v, k) => pendingAdditions.set(k, v));
        pendingDeletions.clear(); backupDeletions.forEach(v => pendingDeletions.add(v));
        if (typeof renderQueueTree === "function") renderQueueTree();
        
        showError(`Failed to apply changes: ${error.message}`);
        console.error("Apply changes failed:", error);
    } finally {
        hideLoading();
        if (typeof updateBatchControls === "function") updateBatchControls();
    }
}

function markQueueForDeletion(queuePath) {
  if (queuePath === "root") {
    showWarning("Cannot delete root queue."); 
    return;
  }
  const queue = findQueueByPath(queuePath);
  if (!queue) {
    showError("Queue not found, cannot mark for deletion."); 
    return;
  }

  const deletionStatus = (typeof canQueueBeDeleted === 'function') ? canQueueBeDeleted(queuePath) : { canDelete: true }; 
  if (!deletionStatus.canDelete) {
    showWarning(deletionStatus.reason || "This queue cannot be deleted."); 
    return;
  }
  
  if (!confirm(`Are you sure you want to mark queue "${queue.name}" (${queuePath}) for deletion?`)) {
    return;
  }

  if (pendingAdditions.has(queuePath)) {
    pendingAdditions.delete(queuePath); 
    showSuccess(`New queue "${queue.name}" removed from staging.`); 
  } else {
    pendingDeletions.add(queuePath);
    showSuccess(`Queue "${queue.name}" marked for deletion.`); 
  }
  pendingChanges.delete(queuePath); 

  if (typeof renderQueueTree === "function") renderQueueTree();
  if (typeof updateBatchControls === "function") updateBatchControls();
}

async function openEditModal(queue) {
    if (!queue) {
        // showError is from ui-components.js
        if (typeof showError === "function") showError("Cannot edit: Queue data is missing.");
        else console.error("Cannot edit: Queue data is missing.");
        return;
    }
    if (pendingDeletions.has(queue.path)) {
        // showWarning is from ui-components.js
        if (typeof showWarning === "function") showWarning("Cannot edit a queue marked for deletion.");
        else console.warn("Cannot edit a queue marked for deletion.");
        return;
    }

    currentEditQueue = queue; // currentEditQueue is a global or module-scoped variable
    const editFormContainer = document.getElementById("edit-form-container");
    if (!editFormContainer) {
        console.error("Edit form container not found in modal.");
        return;
    }
    editFormContainer.innerHTML = ''; 

    const modalTitle = document.getElementById("modal-title");
    if (modalTitle) modalTitle.textContent = `Edit Queue: ${queue.name}`;

    // Ensure liveRawSchedulerConf (Map of propertyName -> value from scheduler-conf) is populated
    // liveRawSchedulerConf is a global variable expected to be defined in main.js
    // api.getSchedulerConf() is from api.js
    if (liveRawSchedulerConf === null) { // Check specifically for null to allow an empty Map if conf was empty
        try {
            const rawConfData = await api.getSchedulerConf();
            if (rawConfData && rawConfData.property) {
                liveRawSchedulerConf = new Map(rawConfData.property.map(p => [p.name, p.value]));
            } else {
                liveRawSchedulerConf = new Map(); // No properties in scheduler-conf
            }
        } catch (e) {
            if (typeof showError === "function") showError("Error fetching queue configurations from scheduler-conf. Displaying defaults or cached values."); //
            else console.error("Error fetching queue configurations from scheduler-conf.", e);
            liveRawSchedulerConf = new Map(); 
        }
    }
    
    // pendingChanges is a global Map from main.js
    const pendingChangeForThisQueue = pendingChanges.get(queue.path) || {};

    let formHTML = `<form id="edit-queue-form" data-queue-path="${queue.path}">`;

    // --- Static Info: Queue Name & Path ---
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

    // --- Capacity Mode Selector (Special Handling) ---
    let currentCapacityMode = pendingChangeForThisQueue._ui_capacityMode; // UI hint from pending changes
    if (!currentCapacityMode) { // If not in pending, try to determine it
        const rawCapacityString = liveRawSchedulerConf.get(`yarn.scheduler.capacity.${queue.path}.capacity`);
        if (rawCapacityString) {
            if (rawCapacityString.endsWith('w')) currentCapacityMode = 'weight';
            else if (rawCapacityString.startsWith('[')) currentCapacityMode = 'absolute';
            else if (String(rawCapacityString).includes('%')) currentCapacityMode = 'percentage';
        }
    }
    // Fallback to detectCapacityMode from queue-parser.js if available
    if (!currentCapacityMode && typeof detectCapacityMode === 'function') { 
        currentCapacityMode = detectCapacityMode(queue); 
    }
    if (!currentCapacityMode) { // Final fallback
        currentCapacityMode = 'percentage';
    }
    
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
                            <option value="percentage" ${currentCapacityMode === 'percentage' ? 'selected' : ''}>Percentage (%)</option>
                            <option value="weight" ${currentCapacityMode === 'weight' ? 'selected' : ''}>Weight (w)</option>
                            <option value="absolute" ${currentCapacityMode === 'absolute' ? 'selected' : ''}>Absolute Resources</option>
                        </select>
                    </div>
                 </div>`;

    // --- Iterate through QUEUE_CONFIG_CATEGORIES (from main.js) ---
    QUEUE_CONFIG_CATEGORIES.forEach(category => {
        formHTML += `<h4 class="form-category-title">${category.groupName}</h4>`;
        for (const placeholderPropName in category.properties) {
            const propDef = category.properties[placeholderPropName];
            const actualPropName = placeholderPropName.replace(Q_PATH_PLACEHOLDER, queue.path); // Q_PATH_PLACEHOLDER from main.js
            const inputId = `edit-queue-${actualPropName.replace(/\./g, '-')}`;
            
            let originalValueForInput;

            // Value resolution: 1. Pending, 2. Live scheduler-conf, 3. Metadata Default
            if (pendingChangeForThisQueue[actualPropName] !== undefined) {
                originalValueForInput = pendingChangeForThisQueue[actualPropName];
            } else if (liveRawSchedulerConf.has(actualPropName)) {
                originalValueForInput = liveRawSchedulerConf.get(actualPropName);
            } else {
                originalValueForInput = propDef.defaultValue;
            }
            
            // Initial formatting for capacity field based on determined mode, if not from pending changes
            if (actualPropName.endsWith('.capacity') && pendingChangeForThisQueue[actualPropName] === undefined) {
                let tempCapValue = originalValueForInput;
                if(currentCapacityMode === 'percentage' && !String(tempCapValue).includes('%') && !String(tempCapValue).includes('w') && !String(tempCapValue).startsWith('[')) {
                    tempCapValue = (parseFloat(tempCapValue) || 0).toFixed(1) + '%';
                } else if(currentCapacityMode === 'weight' && !String(tempCapValue).includes('w') && !String(tempCapValue).includes('%') && !String(tempCapValue).startsWith('[')) {
                    tempCapValue = (parseFloat(tempCapValue) || 0).toFixed(1) + 'w';
                } else if(currentCapacityMode === 'absolute' && !String(tempCapValue).startsWith('[')) {
                    tempCapValue = propDef.defaultValue && String(propDef.defaultValue).startsWith('[') ? propDef.defaultValue : '[memory=1024,vcores=1]';
                }
                originalValueForInput = tempCapValue;
            }
            // Initial formatting for maximum-capacity (often a percentage string unless absolute mode)
            if (actualPropName.endsWith('.maximum-capacity') && pendingChangeForThisQueue[actualPropName] === undefined) {
                if (!String(originalValueForInput).startsWith('[') && !String(originalValueForInput).endsWith('%')) {
                    originalValueForInput = (parseFloat(originalValueForInput) || 100).toFixed(1) + '%';
                }
            }

            formHTML += `<div class="form-group property-edit-item">
                            <div class="property-details-column">
                                <div class="property-display-name">
                                    <span>${propDef.displayName}</span>
                                    <span class="info-icon" title="${propDef.description || 'No description available.'}">ⓘ</span>
                                </div>
                                <div class="property-yarn-name">${actualPropName}</div>
                            </div>
                            <div class="property-value-column">`;
            
            // Special handling for capacity field to link its value to the mode selector visually
            if (placeholderPropName.endsWith('.capacity') && placeholderPropName.includes(Q_PATH_PLACEHOLDER)) {
                 formHTML += `<input type="text" class="form-input" id="${inputId}" value="${originalValueForInput}" data-original-value="${originalValueForInput}" data-yarn-prop="${actualPropName}">`;
            } else if (propDef.type === 'enum') {
                formHTML += `<select class="form-input" id="${inputId}" data-original-value="${originalValueForInput}" data-yarn-prop="${actualPropName}">`;
                (propDef.options || []).forEach(opt => {
                    formHTML += `<option value="${opt}" ${originalValueForInput == opt ? 'selected' : ''}>${opt}</option>`;
                });
                formHTML += `</select>`;
            } else if (propDef.type === 'boolean') {
                 formHTML += `<select class="form-input" id="${inputId}" data-original-value="${originalValueForInput}" data-yarn-prop="${actualPropName}">
                                <option value="true" ${originalValueForInput == 'true' ? 'selected' : ''}>true</option>
                                <option value="false" ${originalValueForInput == 'false' ? 'selected' : ''}>false</option>
                             </select>`;
            } else if (propDef.type === 'number' || propDef.type === 'percentage') {
                const numSpecificAttrs = propDef.type === 'percentage' ? `min="0" max="1" step="${propDef.step || '0.01'}"` : (propDef.step ? `step="${propDef.step}"` : '');
                formHTML += `<input type="number" class="form-input" id="${inputId}" value="${originalValueForInput}" data-original-value="${originalValueForInput}" data-yarn-prop="${actualPropName}" ${numSpecificAttrs}>`;
            } else { // Default to text input (covers type: 'string')
                formHTML += `<input type="text" class="form-input" id="${inputId}" value="${originalValueForInput}" data-original-value="${originalValueForInput}" data-yarn-prop="${actualPropName}">`;
            }
            formHTML += `   </div> </div> `;
        }
    });

    formHTML += `</form>
                 <div class="modal-actions">
                    <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                    <button class="btn btn-primary" onclick="stageQueueChanges()">Stage Changes</button>
                 </div>`;
    
    editFormContainer.innerHTML = formHTML;

    // Add event listener for capacity mode change AFTER form is in DOM
    const capacityModeSelect = document.getElementById('edit-capacity-mode');
    if (capacityModeSelect) {
        capacityModeSelect.addEventListener('change', () => {
            const newMode = capacityModeSelect.value;
            let capacityInput = null;
            // Find the capacity input using its data-yarn-prop attribute
            // This relies on QUEUE_CONFIG_CATEGORIES and Q_PATH_PLACEHOLDER being accessible here
            for (const category of QUEUE_CONFIG_CATEGORIES) { // QUEUE_CONFIG_CATEGORIES from main.js
                for (const phPropName in category.properties) {
                    if (phPropName.endsWith('.capacity') && phPropName.includes(Q_PATH_PLACEHOLDER)) { // Q_PATH_PLACEHOLDER from main.js
                        const actualCapPropName = phPropName.replace(Q_PATH_PLACEHOLDER, queue.path);
                        capacityInput = editFormContainer.querySelector(`input[data-yarn-prop="${actualCapPropName}"]`);
                        break;
                    }
                }
                if (capacityInput) break;
            }

            if (capacityInput) {
                let currentValStr = capacityInput.value;
                let numericVal = parseFloat(currentValStr); 
                if (currentValStr.endsWith('%') || currentValStr.endsWith('w')) {
                    numericVal = parseFloat(currentValStr.slice(0, -1));
                } else if (currentValStr.startsWith('[')) { // If current is absolute, changing mode needs a new default number
                    numericVal = (newMode === 'weight') ? 1.0 : 10.0;
                }
                if(isNaN(numericVal)) numericVal = (newMode === 'weight') ? 1.0 : ( (newMode === 'percentage') ? 10.0 : 0);


                if (newMode === 'weight') currentValStr = numericVal.toFixed(1) + 'w';
                else if (newMode === 'percentage') currentValStr = numericVal.toFixed(1) + '%';
                else if (newMode === 'absolute') {
                    // If it was already a vector, keep it. Otherwise, provide a default.
                    currentValStr = capacityInput.value.startsWith('[') && capacityInput.value.endsWith(']') ? capacityInput.value : '[memory=1024,vcores=1]';
                }
                capacityInput.value = currentValStr;
                
                // Update help text or any visual cue for the mode in capacity's description if desired
                const helpTextElement = capacityInput.closest('.form-group.property-edit-item');
                if (helpTextElement) { // This is to update a more general help text if we had one for capacity.
                    // Current structure doesn't have a specific place for this to be easily updated,
                    // but you could add a span or similar if needed.
                }
            }
        });
        // Trigger change after a brief timeout to ensure DOM is fully ready and apply initial formatting
        setTimeout(() => {
            // Check if modal is still open and element exists before dispatching
            if (document.getElementById('edit-capacity-mode') === capacityModeSelect) { 
                 capacityModeSelect.dispatchEvent(new Event('change'));
            }
        }, 50);
    }

    document.getElementById("edit-modal").classList.add("show");
}

function openInfoModal(queue) {
    if (!queue) {
        showError("Cannot show info: Queue data missing.");
        return;
    }
    const infoFormContainer = document.getElementById("info-form-container");
    infoFormContainer.innerHTML = createInfoFormHTML(queue); 
    document.getElementById("info-modal").classList.add("show");
}

window.openEditModal = openEditModal;
window.closeModal = closeModal;
window.stageQueueChanges = stageQueueChanges;
window.openInfoModal = openInfoModal;
window.closeInfoModal = closeInfoModal;
window.openAddQueueModal = openAddQueueModal;
window.openAddQueueModalWithParent = openAddQueueModalWithParent;
window.closeAddQueueModal = closeAddQueueModal;
window.addNewQueue = addNewQueue;
window.markQueueForDeletion = markQueueForDeletion;
window.applyAllChanges = applyAllChanges;
window.onNewCapacityModeChange = onNewCapacityModeChange;
