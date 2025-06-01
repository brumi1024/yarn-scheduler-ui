// Depends on global functions: getAllParentQueues (from modal-helpers.js), 
// validateQueueName, validateCapacity (from validation.js), showWarning, showSuccess,
// findQueueByPath, pendingAdditions, renderQueueTree, closeAddQueueModal (from modal-helpers.js),
// QUEUE_CONFIG_CATEGORIES, Q_PATH_PLACEHOLDER (from main.js)

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

  if (parentSelect.options.length > 0 && parentSelect.value === '') {
      const rootOption = Array.from(parentSelect.options).find(opt => opt.value === 'root');
      if (rootOption) parentSelect.value = 'root';
      else parentSelect.selectedIndex = 0;
  }
  onNewCapacityModeChange(); 

  document.getElementById("add-queue-modal").classList.add("show");
}

function openAddQueueModalWithParent(parentPath) {
  openAddQueueModal();
  const parentSelect = document.getElementById("parent-queue-select");
  if (parentSelect) parentSelect.value = parentPath;
}

function createAddFormHTML() {
  // This form is still mostly hardcoded but could be made metadata-driven
  // using a subset of QUEUE_CONFIG_CATEGORIES if desired for more consistency.
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
                <label class="form-label">Maximum Capacity</label>
                <input type="text" class="form-input" id="new-queue-max-capacity" value="100%">
                 <small class="form-help">E.g., "100%" or "[memory=2048,vcores=2]".</small>
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
    const queueNameInput = document.getElementById("new-queue-name");
    const queueName = queueNameInput.value.trim();
    const capacityMode = document.getElementById("new-capacity-mode").value;
    const capacityInput = document.getElementById("new-queue-capacity");
    let capacityValue = capacityInput.value.trim();
    const maxCapacityInput = document.getElementById("new-queue-max-capacity");
    let maxCapacityValue = maxCapacityInput.value.trim();
    const state = document.getElementById("new-queue-state").value;

    const nameError = validateQueueName(queueName);
    if (nameError) {
        if (typeof showWarning === "function") showWarning(nameError);
        queueNameInput.focus();
        return;
    }

    // Ensure capacityValue format matches mode for validation and storage
    if (capacityMode === 'percentage' && !capacityValue.endsWith('%')) {
        capacityValue = (parseFloat(capacityValue) || 0).toFixed(1) + '%';
    } else if (capacityMode === 'weight' && !capacityValue.endsWith('w')) {
        capacityValue = (parseFloat(capacityValue) || 0).toFixed(1) + 'w';
    } else if (capacityMode === 'absolute' && !(capacityValue.startsWith('[') && capacityValue.endsWith(']'))) {
        if (capacityValue.trim() === '') capacityValue = '[memory=1024,vcores=1]';
        else capacityValue = `[${capacityValue.replace(/[\[\]]/g, '')}]`;
    }

    // Max capacity: if not absolute, assume percentage.
    if (!maxCapacityValue.startsWith('[') && !maxCapacityValue.endsWith('%')) {
        maxCapacityValue = `${(parseFloat(maxCapacityValue) || 100).toFixed(1)}%`;
    }

    const capacityErrors = validateCapacity(capacityValue, capacityMode);
    if (capacityErrors.length > 0) {
        if (typeof showWarning === "function") showWarning(`Capacity validation error: ${capacityErrors.join(", ")}`);
        capacityInput.focus();
        return;
    }
    // Basic validation for max capacity (can be expanded)
    if (maxCapacityValue.trim() === '') {
        if (typeof showWarning === "function") showWarning("Maximum Capacity cannot be empty.");
        maxCapacityInput.focus();
        return;
    }


    const newQueuePath = parentPath === "root" ? `root.${queueName}` : `${parentPath}.${queueName}`;

    if ((queueStateStore.getQueueHierarchy() && findQueueByPath(newQueuePath, queueStateStore.getQueueHierarchy())) || pendingAdditions.has(newQueuePath)) {
        if (typeof showWarning === "function") showWarning("A queue with this name already exists at this path.");
        return;
    }

    // ---- START NEW: Create a 'properties' Map for the new queue ----
    const simplePropertiesMap = new Map();
    simplePropertiesMap.set('capacity', capacityValue);
    simplePropertiesMap.set('maximum-capacity', maxCapacityValue);
    simplePropertiesMap.set('state', state);
    // Add other relevant default properties that createQueueCard might expect,
    // similar to how buildQueueHierarchyObject sets them up.
    // These would come from QUEUE_CONFIG_CATEGORIES.
    if (typeof QUEUE_CONFIG_CATEGORIES !== 'undefined') {
        QUEUE_CONFIG_CATEGORIES.forEach(category => {
            for (const placeholderPropName in category.properties) {
                const propDef = category.properties[placeholderPropName];
                // Extract the simple key (e.g., 'user-limit-factor' from '...<queue_path>.user-limit-factor')
                const simpleKey = placeholderPropName.substring(placeholderPropName.lastIndexOf('.') + 1);
                
                if (!simplePropertiesMap.has(simpleKey) && propDef.defaultValue !== undefined) {
                    // Handle special default for 'ordering-policy' for parent queues
                    if (simpleKey === 'ordering-policy' && parentPath !== null) { // Assuming root is not null for this check
                         // Parent queues typically default to 'utilization' or 'fair', leaves to 'fifo'
                         // For simplicity, let's use a common default or skip if complex.
                         // The metadata default 'fifo' might be for leaves.
                         // Let's stick to propDef.defaultValue for now unless more specific logic is added.
                        simplePropertiesMap.set(simpleKey, propDef.defaultValue);
                    } else if (simpleKey !== 'capacity' && simpleKey !== 'maximum-capacity' && simpleKey !== 'state') {
                         simplePropertiesMap.set(simpleKey, propDef.defaultValue);
                    }
                }
            }
        });
    }
     // Ensure some critical defaults if not covered by metadata iteration for some reason
    if (!simplePropertiesMap.has('user-limit-factor')) simplePropertiesMap.set('user-limit-factor', '1');
    if (!simplePropertiesMap.has('maximum-am-resource-percent')) simplePropertiesMap.set('maximum-am-resource-percent', '0.1');
    // ---- END NEW ----

    const newQueueDataForStore = {
        name: queueName,
        path: newQueuePath,
        parentPath: parentPath,
        // Keep direct fields for potential immediate use or easier debugging,
        // but queue-card.js should primarily rely on the 'properties' Map.
        capacity: capacityValue,
        maxCapacity: maxCapacityValue,
        state: state,
        children: {}, // New queues don't have children initially
        capacityMode: capacityMode, // This is important for card rendering logic

        properties: simplePropertiesMap, // Assign the Map here

        // params object will hold the full YARN property paths and values for the API call
        params: {}
    };

    // Populate newQueueDataForStore.params for the API call (full YARN paths)
    // This part uses the QUEUE_CONFIG_CATEGORIES to ensure all necessary YARN props are included
    if (typeof QUEUE_CONFIG_CATEGORIES !== 'undefined') {
        QUEUE_CONFIG_CATEGORIES.forEach(category => {
            for (const placeholderPropName in category.properties) {
                const propDef = category.properties[placeholderPropName];
                const actualPropNameFull = placeholderPropName.replace(Q_PATH_PLACEHOLDER, newQueuePath);

                if (placeholderPropName.endsWith('.capacity')) {
                    newQueueDataForStore.params[actualPropNameFull] = capacityValue;
                } else if (placeholderPropName.endsWith('.maximum-capacity')) {
                    newQueueDataForStore.params[actualPropNameFull] = maxCapacityValue;
                } else if (placeholderPropName.endsWith('.state')) {
                    newQueueDataForStore.params[actualPropNameFull] = state;
                } else if (propDef.defaultValue !== undefined && propDef.defaultValue !== '') {
                    // Only add other metadata defaults if not one of the core ones already set by form
                     if (newQueueDataForStore.params[actualPropNameFull] === undefined) { // Check if not already set
                         newQueueDataForStore.params[actualPropNameFull] = propDef.defaultValue;
                     }
                }
            }
        });
    }
    // Ensure core params are definitely set in 'params' if not covered by loop (e.g., if metadata is minimal)
    const yarnCapacityPath = `yarn.scheduler.capacity.${newQueuePath}.capacity`;
    const yarnMaxCapacityPath = `yarn.scheduler.capacity.${newQueuePath}.maximum-capacity`;
    const yarnStatePath = `yarn.scheduler.capacity.${newQueuePath}.state`;

    if (!newQueueDataForStore.params[yarnCapacityPath]) newQueueDataForStore.params[yarnCapacityPath] = capacityValue;
    if (!newQueueDataForStore.params[yarnMaxCapacityPath]) newQueueDataForStore.params[yarnMaxCapacityPath] = maxCapacityValue;
    if (!newQueueDataForStore.params[yarnStatePath]) newQueueDataForStore.params[yarnStatePath] = state;


    pendingAdditions.set(newQueuePath, newQueueDataForStore);
    // console.log("Staged new queue for addition:", newQueueDataForStore);
    if (typeof showSuccess === "function") showSuccess(`New queue "${queueName}" staged for addition.`);

    if (typeof renderQueueTree === "function") renderQueueTree(); // Line 171 from original error stack
    if (typeof updateBatchControls === "function") updateBatchControls();
    if (typeof closeAddQueueModal === "function") closeAddQueueModal();
}

window.openAddQueueModal = openAddQueueModal;
window.openAddQueueModalWithParent = openAddQueueModalWithParent;
// closeAddQueueModal is in modal-helpers.js
window.addNewQueue = addNewQueue;
window.onNewCapacityModeChange = onNewCapacityModeChange;