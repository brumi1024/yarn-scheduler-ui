/**
 * Opens the "Add Queue" modal and sets up its initial state by populating the parent queue dropdown,
 * updating the form content, and applying default selection logic.
 *
 * The method retrieves a list of parent queues and populates the corresponding dropdown menu
 * with options. If no parent queue is explicitly selected, a default selection is applied.
 * Additionally, it invokes a callback to adjust the UI or logic based on the new capacity mode.
 *
 * @return {void} This method does not return a value.
 */
function openAddQueueModal() {
  const addFormContainer = document.getElementById("add-form-container");
  addFormContainer.innerHTML = createAddFormHTML();

  const parentSelect = document.getElementById("parent-queue-select");
  parentSelect.innerHTML = "";

  const parents = getAllParentQueues()
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

/**
 * Opens the "Add Queue" modal and sets the provided parent path to the "parent-queue-select" element, if available.
 *
 * @param {string} parentPath - The path value to be set as the selected parent in the modal's dropdown.
 * @return {void} This function does not return any value.
 */
function openAddQueueModalWithParent(parentPath) {
  openAddQueueModal();
  const parentSelect = document.getElementById("parent-queue-select");
  if (parentSelect) parentSelect.value = parentPath;
}

/**
 * Generates the HTML string for an "Add Queue" form, providing a user interface
 * to configure and create a new queue with various attributes such as parent queue,
 * name, capacity mode, capacity, maximum capacity, and state.
 *
 * @return {string} The HTML string representing the "Add Queue" form, including form fields, labels, and action buttons.
 */
// TODO: Consider using the same structure as the edit form so that queues can be created with custom properties
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
                    <option value="${CAPACITY_MODES.PERCENTAGE}" selected>Percentage (%)</option>
                    <option value="${CAPACITY_MODES.WEIGHT}">Weight (w)</option>
                    <option value="${CAPACITY_MODES.ABSOLUTE}">Absolute Resources</option>
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

/**
 * Handles the change event for the new capacity mode select element.
 * This function adjusts the capacity input field value based on the selected capacity mode.
 *
 * @return {void} This method does not return a value.
 */
function onNewCapacityModeChange() {
    const modeSelect = document.getElementById("new-capacity-mode");
    const capacityInput = document.getElementById("new-queue-capacity");
    if (!modeSelect || !capacityInput) return;
    const mode = modeSelect.value;

    capacityInput.value = viewDataFormatter._getDefaultCapacityValue(mode);
}

/**
 * Adds a new queue to the queue state with the configuration provided by the user.
 * The method performs input validations for queue name, capacity, and maximum capacity,
 * ensuring all required fields are correctly formatted and valid. It also stages the
 * new queue for addition by updating the queue state store and ensuring duplication is avoided.
 *
 * If the inputs are invalid, appropriate warnings are displayed, and the process is halted.
 * On successful staging, updates the UI to reflect the added queue and closes the modal form.
 *
 * @return {void} This method does not return a value, but modifies the queue state store and UI components.
 */
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
        showWarning(nameError);
        queueNameInput.focus();
        return;
    }

    // Ensure capacityValue and maxCapacityValue strings are correctly formatted for the selected mode
    // using viewDataFormatter helpers (which are robust).
    if (typeof viewDataFormatter !== 'undefined') {
        capacityValue = viewDataFormatter._ensureCapacityFormat(capacityValue, capacityMode, viewDataFormatter._getDefaultCapacityValue(capacityMode));
        // For max capacity, the "parent mode" isn't directly relevant for a new queue's initial max capacity format;
        // usually, it's either percentage or absolute. The mode used for its own capacity is more relevant.
        maxCapacityValue = viewDataFormatter._ensureMaxCapacityFormat(maxCapacityValue, capacityMode, viewDataFormatter._getDefaultMaxCapacityValue(capacityMode));
    } else { // Fallback basic formatting if formatter not available
        if (capacityMode === CAPACITY_MODES.PERCENTAGE && !capacityValue.endsWith('%')) capacityValue = (parseFloat(capacityValue) || 0).toFixed(1) + '%';
        else if (capacityMode === CAPACITY_MODES.WEIGHT && !capacityValue.endsWith('w')) capacityValue = (parseFloat(capacityValue) || 0).toFixed(1) + 'w';
        else if (capacityMode === CAPACITY_MODES.ABSOLUTE && !(capacityValue.startsWith('[') && capacityValue.endsWith(']'))) {
            capacityValue = (capacityValue.trim() === '') ? '[memory=1024,vcores=1]' : `[${capacityValue.replace(/[\[\]]/g, '')}]`;
        }
        if (!maxCapacityValue.startsWith('[') && !maxCapacityValue.endsWith('%')) maxCapacityValue = `${(parseFloat(maxCapacityValue) || 100).toFixed(1)}%`;
    }

    const capacityErrors = validateCapacity(capacityValue, capacityMode);
    if (capacityErrors.length > 0) {
       showWarning(`Capacity validation error: ${capacityErrors.join(", ")}`);
        capacityInput.focus();
        return;
    }
    if (maxCapacityValue.trim() === '') {
        showWarning("Maximum Capacity cannot be empty.");
        maxCapacityInput.focus();
        return;
    }

    const newQueuePath = parentPath === "root" ? `root.${queueName}` : `${parentPath}.${queueName}`;

    if (queueStateStore.getQueue(newQueuePath)) {
        showWarning("A queue with this name already exists at this path or is staged for addition.");
        return;
    }

    // Prepare the 'properties' Map for the new queue data blueprint.
    // This map will store full YARN property names to their raw values.
    const newQueueRawProperties = new Map();
    // This object is for the API call, ensuring it has the correct full YARN names.
    // It should only contain properties that are explicitly set or have YARN defaults
    // that we want to send.
    const apiParams = {};

    // Set the core properties based on form input
    const prefix = `yarn.scheduler.capacity.${newQueuePath}.`;
    newQueueRawProperties.set(`${prefix}capacity`, capacityValue);
    newQueueRawProperties.set(`${prefix}maximum-capacity`, maxCapacityValue);
    newQueueRawProperties.set(`${prefix}state`, state);

    apiParams[`${prefix}capacity`] = capacityValue;
    apiParams[`${prefix}maximum-capacity`] = maxCapacityValue;
    apiParams[`${prefix}state`] = state;

    // Iterate QUEUE_CONFIG_CATEGORIES to set other defined properties to their metadata defaults
    // if they are not the core ones already set above.
    // QUEUE_CONFIG_CATEGORIES & Q_PATH_PLACEHOLDER are global
    QUEUE_CONFIG_CATEGORIES.forEach(category => {
        for (const placeholderPropName in category.properties) {
            if (Object.hasOwnProperty.call(category.properties, placeholderPropName)) {
                const propDef = category.properties[placeholderPropName];
                const simpleKey = placeholderPropName.substring(placeholderPropName.lastIndexOf('.') + 1);
                const fullYarnName = placeholderPropName.replace(Q_PATH_PLACEHOLDER, newQueuePath);

                // Only set if not one of the core properties handled above
                if (simpleKey !== 'capacity' && simpleKey !== 'maximum-capacity' && simpleKey !== 'state') {
                    if (propDef.defaultValue !== undefined) {
                        newQueueRawProperties.set(fullYarnName, String(propDef.defaultValue)); // Ensure string
                        apiParams[fullYarnName] = String(propDef.defaultValue);
                    }
                }
            }
        }
    });

    const newQueueDataForStore = {
        name: queueName, // Original case
        path: newQueuePath, // Original case
        parentPath: parentPath, // Original case
        properties: newQueueRawProperties, // Map of full YARN names -> raw values
        // The 'children' property will be an empty object for new queues.
        // The '_ui_capacityMode' hint is useful for QueueViewDataFormatter.
        _ui_capacityMode: capacityMode,
        // 'params' for the API call. Could be same as properties, or curated.
        // For add, typically all defined properties are sent.
        params: apiParams
    };

    queueStateStore.doAdd(newQueuePath, { newQueueData: newQueueDataForStore });
    showSuccess(`New queue "${queueName}" staged for addition.`);
    renderQueueTree();
    updateBatchControls();
    closeAddQueueModal();
}

window.openAddQueueModal = openAddQueueModal;
window.openAddQueueModalWithParent = openAddQueueModalWithParent;
window.addNewQueue = addNewQueue;
window.onNewCapacityModeChange = onNewCapacityModeChange;