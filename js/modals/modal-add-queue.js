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
    const queueName = document.getElementById("new-queue-name").value.trim();
    const capacityMode = document.getElementById("new-capacity-mode").value;
    let capacityValue = document.getElementById("new-queue-capacity").value.trim();
    let maxCapacityValue = document.getElementById("new-queue-max-capacity").value.trim(); 
    const state = document.getElementById("new-queue-state").value;

    const nameError = validateQueueName(queueName); 
    if (nameError) { if (typeof showWarning === "function") showWarning(nameError); return; }

    // Ensure capacityValue format matches mode for validation and storage
    if (capacityMode === 'percentage' && !capacityValue.endsWith('%')) capacityValue = (parseFloat(capacityValue) || 0).toFixed(1) + '%';
    else if (capacityMode === 'weight' && !capacityValue.endsWith('w')) capacityValue = (parseFloat(capacityValue) || 0).toFixed(1) + 'w';
    else if (capacityMode === 'absolute' && !(capacityValue.startsWith('[') && capacityValue.endsWith(']'))) {
        if(capacityValue.trim() === '') capacityValue = '[memory=1024,vcores=1]'; // Default if empty
        else capacityValue = `[${capacityValue.replace(/[\[\]]/g, '')}]`; // Basic wrap
    }
    
    // Max capacity: if not absolute, assume percentage.
    if (!maxCapacityValue.startsWith('[') && !maxCapacityValue.endsWith('%')) {
        maxCapacityValue = `${(parseFloat(maxCapacityValue) || 100).toFixed(1)}%`;
    }
    
    const capacityErrors = validateCapacity(capacityValue, capacityMode); 
    if (capacityErrors.length > 0) { if (typeof showWarning === "function") showWarning(`Capacity validation error: ${capacityErrors.join(", ")}`); return; }

    const newQueuePath = parentPath === "root" ? `root.${queueName}` : `${parentPath}.${queueName}`;

    if (findQueueByPath(newQueuePath) || pendingAdditions.has(newQueuePath)) {
        if (typeof showWarning === "function") showWarning("A queue with this name already exists at this path."); return;
    }

    const newQueueDataForStore = {
        name: queueName,
        path: newQueuePath,
        parentPath: parentPath,
        // These are primarily for card rendering if needed before first save/reload
        capacity: capacityValue, 
        maxCapacity: maxCapacityValue, 
        state: state,
        children: {}, 
        capacityMode: capacityMode, 
        // Params for the API call
        params: {} 
    };
    
    // Populate params for API from QUEUE_CONFIG_CATEGORIES defaults + core values from form
    QUEUE_CONFIG_CATEGORIES.forEach(category => {
        for (const placeholderPropName in category.properties) {
            const propDef = category.properties[placeholderPropName];
            const actualPropNameFull = placeholderPropName.replace(Q_PATH_PLACEHOLDER, newQueuePath);
            
            if (placeholderPropName.endsWith('.capacity')) newQueueDataForStore.params[actualPropNameFull] = capacityValue;
            else if (placeholderPropName.endsWith('.maximum-capacity')) newQueueDataForStore.params[actualPropNameFull] = maxCapacityValue;
            else if (placeholderPropName.endsWith('.state')) newQueueDataForStore.params[actualPropNameFull] = state;
            else if (propDef.defaultValue !== undefined && propDef.defaultValue !== '') {
                 // Only add other metadata defaults if not one of the core ones already set
                if (!newQueueDataForStore.params[actualPropNameFull]) {
                     newQueueDataForStore.params[actualPropNameFull] = propDef.defaultValue;
                }
            }
        }
    });
    // Ensure core params are definitely set if not covered by loop (e.g. if metadata is minimal)
    if (!newQueueDataForStore.params[`yarn.scheduler.capacity.${newQueuePath}.capacity`]) newQueueDataForStore.params[`yarn.scheduler.capacity.${newQueuePath}.capacity`] = capacityValue;
    if (!newQueueDataForStore.params[`yarn.scheduler.capacity.${newQueuePath}.maximum-capacity`]) newQueueDataForStore.params[`yarn.scheduler.capacity.${newQueuePath}.maximum-capacity`] = maxCapacityValue;
    if (!newQueueDataForStore.params[`yarn.scheduler.capacity.${newQueuePath}.state`]) newQueueDataForStore.params[`yarn.scheduler.capacity.${newQueuePath}.state`] = state;

    pendingAdditions.set(newQueuePath, newQueueDataForStore);
    console.log("Staged new queue for addition:", newQueueDataForStore);
    if (typeof showSuccess === "function") showSuccess(`New queue "${queueName}" staged for addition.`);

    if (typeof renderQueueTree === "function") renderQueueTree();
    if (typeof closeAddQueueModal === "function") closeAddQueueModal();
}

window.openAddQueueModal = openAddQueueModal;
window.openAddQueueModalWithParent = openAddQueueModalWithParent;
// closeAddQueueModal is in modal-helpers.js
window.addNewQueue = addNewQueue;
window.onNewCapacityModeChange = onNewCapacityModeChange;