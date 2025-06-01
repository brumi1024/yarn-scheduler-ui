function openAddQueueModal() {
  const addFormContainer = document.getElementById("add-form-container");
  addFormContainer.innerHTML = createAddFormHTML(); 

  const parentSelect = document.getElementById("parent-queue-select");
  parentSelect.innerHTML = ""; 

  const parents = (typeof getAllParentQueues === "function") ? getAllParentQueues() : [{path: 'root', name: 'root'}];
  parents.forEach((parent) => {
        const option = document.createElement("option");
        option.value = parent.path;
        option.textContent = parent.path;
        parentSelect.appendChild(option);
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
    // ... (get other values from the simple add form: capacityMode, capacityValue, maxCapacityValue, state) ...
    const capacityMode = document.getElementById("new-capacity-mode").value;
    const capacityInput = document.getElementById("new-queue-capacity");
    let capacityValue = capacityInput.value.trim();
    const maxCapacityInput = document.getElementById("new-queue-max-capacity");
    let maxCapacityValue = maxCapacityInput.value.trim();
    const state = document.getElementById("new-queue-state").value;


    // --- Validations (existing logic is good) ---
    const nameError = validateQueueName(queueName); // Assumes validateQueueName is global
    if (nameError) {
        if (typeof showWarning === "function") showWarning(nameError);
        queueNameInput.focus();
        return;
    }
    // ... (format capacityValue, maxCapacityValue based on mode; validate them - existing logic is good) ...
    // Ensure capacityValue format matches mode for validation and storage
    if (capacityMode === 'percentage' && !capacityValue.endsWith('%')) {
        capacityValue = (parseFloat(capacityValue) || 0).toFixed(1) + '%';
    } else if (capacityMode === 'weight' && !capacityValue.endsWith('w')) {
        capacityValue = (parseFloat(capacityValue) || 0).toFixed(1) + 'w';
    } else if (capacityMode === 'absolute' && !(capacityValue.startsWith('[') && capacityValue.endsWith(']'))) {
        if (capacityValue.trim() === '') capacityValue = '[memory=1024,vcores=1]'; // Default if empty
        else capacityValue = `[${capacityValue.replace(/[\[\]]/g, '')}]`;
    }

    // Max capacity: if not absolute, assume percentage.
    if (!maxCapacityValue.startsWith('[') && !maxCapacityValue.endsWith('%')) {
        maxCapacityValue = `${(parseFloat(maxCapacityValue) || 100).toFixed(1)}%`;
    }

    const capacityErrors = validateCapacity(capacityValue, capacityMode); // Assumes validateCapacity is global
    if (capacityErrors.length > 0) {
        if (typeof showWarning === "function") showWarning(`Capacity validation error: ${capacityErrors.join(", ")}`);
        capacityInput.focus();
        return;
    }
    if (maxCapacityValue.trim() === '') {
        if (typeof showWarning === "function") showWarning("Maximum Capacity cannot be empty.");
        maxCapacityInput.focus();
        return;
    }

    const newQueuePath = parentPath === "root" ? `root.${queueName}` : `${parentPath}.${queueName}`;

    // Check for existing queue (using queueStateStore which knows about Trie and pendingAdditions)
    if (queueStateStore && queueStateStore.getQueue(newQueuePath)) {
        if (typeof showWarning === "function") showWarning("A queue with this name already exists at this path or is staged for addition.");
        return;
    }


    // --- Enhanced Property Initialization ---
    const newQueueProperties = new Map();
    const apiParams = {}; // For the YARN API call

    // Set values from the form first
    newQueueProperties.set('capacity', capacityValue);
    newQueueProperties.set('maximum-capacity', maxCapacityValue); // Use consistent simple key
    newQueueProperties.set('state', state);
    // ... (add any other properties directly settable from a simplified add form)

    // Iterate QUEUE_CONFIG_CATEGORIES to set all other properties to their defaults
    // and to populate apiParams correctly.
    if (typeof QUEUE_CONFIG_CATEGORIES !== 'undefined') {
        (QUEUE_CONFIG_CATEGORIES || []).forEach(category => {
            for (const placeholderPropName in category.properties) {
                if (Object.hasOwnProperty.call(category.properties, placeholderPropName)) {
                    const propDef = category.properties[placeholderPropName];
                    const simpleKey = placeholderPropName.substring(placeholderPropName.lastIndexOf('.') + 1);
                    const fullYarnName = placeholderPropName.replace(Q_PATH_PLACEHOLDER || '<queue_path>', newQueuePath);

                    // For apiParams, always use the fullYarnName
                    // For newQueueProperties, always use the simpleKey

                    if (simpleKey === 'capacity') {
                        apiParams[fullYarnName] = capacityValue;
                        // newQueueProperties already set
                    } else if (simpleKey === 'maximum-capacity') { // Match the key used above
                        apiParams[fullYarnName] = maxCapacityValue;
                        // newQueueProperties already set
                    } else if (simpleKey === 'state') {
                        apiParams[fullYarnName] = state;
                        // newQueueProperties already set
                    } else {
                        // If not set by the simple form, use default for both properties map and API params
                        if (!newQueueProperties.has(simpleKey)) {
                            newQueueProperties.set(simpleKey, propDef.defaultValue);
                        }
                        // Ensure API params also get the default if not one of the main form fields
                        // (or if it was, it would have been overwritten by specific value already)
                        apiParams[fullYarnName] = newQueueProperties.get(simpleKey); // Use the resolved value
                    }
                }
            }
        });
    } else { // Fallback if QUEUE_CONFIG_CATEGORIES is not available (should not happen in production)
        apiParams[`yarn.scheduler.capacity.${newQueuePath}.capacity`] = capacityValue;
        apiParams[`yarn.scheduler.capacity.${newQueuePath}.maximum-capacity`] = maxCapacityValue;
        apiParams[`yarn.scheduler.capacity.${newQueuePath}.state`] = state;
    }


    const newQueueDataForStore = {
        name: queueName,
        path: newQueuePath,
        parentPath: parentPath,
        children: {}, // New queues don't have children initially
        capacityMode: capacityMode, // Crucial for formatter and UI

        // Core properties directly for convenience (will also be in the map below)
        // These should reflect what's in newQueueProperties
        capacity: newQueueProperties.get('capacity'),
        maxCapacity: newQueueProperties.get('maximum-capacity'),
        state: newQueueProperties.get('state'),

        properties: newQueueProperties, // This map now contains all defined props with form values or defaults
        params: apiParams               // Params for the API call, also comprehensive
    };

    queueStateStore.doAdd(newQueuePath, { newQueueData: newQueueDataForStore });
    showSuccess(`New queue "${queueName}" staged for addition.`);
    renderQueueTree();
    updateBatchControls();
    closeAddQueueModal(); // from modal-helpers.js
}

window.openAddQueueModal = openAddQueueModal;
window.openAddQueueModalWithParent = openAddQueueModalWithParent;
// closeAddQueueModal is in modal-helpers.js
window.addNewQueue = addNewQueue;
window.onNewCapacityModeChange = onNewCapacityModeChange;