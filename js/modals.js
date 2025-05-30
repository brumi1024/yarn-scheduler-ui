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

function createInfoForm(queue) {
  // Group properties by category for better organization
  const basicInfo = {
    Name: queue.name,
    Path: queue.path,
    State: queue.state,
    "Queue Type": queue.queueType || "Unknown",
  };

  const capacityInfo = {
    Capacity: queue.capacity,
    "Capacity Mode": queue.capacityMode || "percentage",
    "Max Capacity": queue.maxCapacity,
    "Used Capacity": queue.usedCapacity,
    "Absolute Capacity": queue.absoluteCapacity,
    "Absolute Max Capacity": queue.absoluteMaxCapacity,
    "Effective Capacity": queue.effectiveCapacity,
    "Effective Max Capacity": queue.effectiveMaxCapacity,
    Weight: queue.weight,
    "Normalized Weight": queue.normalizedWeight,
  };

  const applicationInfo = {
    "User Limit Factor": queue.userLimitFactor,
    "Max Applications": queue.maxApplications,
    "Current Applications": queue.numApplications,
  };

  const advancedInfo = {
    "Node Labels": Array.isArray(queue.nodeLabels)
      ? queue.nodeLabels.join(", ") || "None"
      : queue.nodeLabels || "None",
    "Default Node Label Expression": queue.defaultNodeLabelExpression || "None",
    "Auto Creation Eligibility": queue.autoCreationEligibility || "off",
    "Creation Method": queue.creationMethod || "static",
  };

  // Helper function to create a section
  function createSection(title, data, icon = "") {
    const rows = Object.entries(data)
      .filter(([_, value]) => value !== undefined && value !== null)
      .map(([key, value]) => {
        let displayValue = value;

        // Format specific values
        if (
          key.toLowerCase().includes("capacity") &&
          typeof value === "number"
        ) {
          displayValue = `${value}%`;
        }
        if (key === "State") {
          const stateClass =
            value === "RUNNING" ? "status-running" : "status-stopped";
          displayValue = `<span class="status-badge ${stateClass}">${value}</span>`;
        }
        if (key === "Queue Type") {
          const typeClass = value === "parent" ? "type-parent" : "type-leaf";
          displayValue = `<span class="type-badge ${typeClass}">${value}</span>`;
        }
        if (key === "Capacity Mode") {
          const modeIcons = {
            percentage: "📊",
            weight: "⚖️",
            absolute: "🎯",
            vector: "📐",
          };
          const modeIcon = modeIcons[value] || "📊";
          displayValue = `${modeIcon} ${value}`;
        }

        return `
                    <tr>
                        <td class="info-label">${key}</td>
                        <td class="info-value">${displayValue}</td>
                    </tr>
                `;
      })
      .join("");

    if (!rows) return "";

    return `
            <div class="info-section">
                <h3 class="info-section-title">
                    ${icon} ${title}
                </h3>
                <table class="info-table">
                    ${rows}
                </table>
            </div>
        `;
  }

  return `
        <div class="queue-info-container">
            ${createSection("Basic Information", basicInfo, "📋")}
            ${createSection("Capacity Configuration", capacityInfo, "📊")}
            ${createSection("Application Limits", applicationInfo, "🚀")}
            ${createSection("Advanced Settings", advancedInfo, "⚙️")}
        </div>
    `;
}

function createAddForm() {
  return `
        <form id="add-queue-form">
            <div class="form-group">
                <label class="form-label">Parent Queue</label>
                <select class="form-input" id="parent-queue-select">
                    <!-- Options will be populated dynamically -->
                </select>
            </div>
            
            <div class="form-group">
                <label class="form-label">Queue Name</label>
                <input type="text" class="form-input" id="new-queue-name" placeholder="Enter queue name">
                <small class="form-help">Only letters, numbers, underscores and hyphens allowed</small>
            </div>

            <div class="form-group">
                <label class="form-label">Capacity Mode</label>
                <select class="form-input" id="new-capacity-mode" onchange="onNewCapacityModeChange()">
                    <option value="percentage">Percentage (%)</option>
                    <option value="weight">Weight (w)</option>
                    <option value="absolute">Absolute Resources</option>
                </select>
            </div>

            <div class="form-group">
                <label class="form-label">Capacity</label>
                <input type="text" class="form-input" id="new-queue-capacity" value="10">
            </div>

            <div class="form-group">
                <label class="form-label">Maximum Capacity (%)</label>
                <input type="number" class="form-input" id="new-queue-max-capacity" min="0" max="100" step="0.1" value="100">
            </div>
            
            <div class="form-group">
                <label class="form-label">State</label>
                <select class="form-input" id="new-queue-state">
                    <option value="RUNNING">RUNNING</option>
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

function findQueueByPath(path) {
  if (pendingAdditions.has(path)) {
    return pendingAdditions.get(path);
  }

  function search(queue) {
    if (queue.path === path) return queue;
    for (const child of Object.values(queue.children)) {
      const found = search(child);
      if (found) return found;
    }
    return null;
  }

  return search(queueData);
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
  const container = document.getElementById("add-form-container");
  container.innerHTML = createAddForm();

  const parentSelect = document.getElementById("parent-queue-select");
  parentSelect.innerHTML = "";

  const parents = getAllParentQueues();
  parents.forEach((parent) => {
    const option = document.createElement("option");
    option.value = parent.path;
    option.textContent = parent.path;
    parentSelect.appendChild(option);
  });

  document.getElementById("add-queue-modal").classList.add("show");
}

function openAddQueueModalWithParent(parentPath) {
  openAddQueueModal();
  document.getElementById("parent-queue-select").value = parentPath;
}

function closeModal() {
  document.getElementById("edit-modal").classList.remove("show");
  currentEditQueue = null;
}

function closeInfoModal() {
  document.getElementById("info-modal").classList.remove("show");
  currentEditQueue = null;
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
  const mode = document.getElementById("new-capacity-mode").value;
  const capacityInput = document.getElementById("new-queue-capacity");

  switch (mode) {
    case "weight":
      capacityInput.value = "1.0w";
      break;
    case "absolute":
      capacityInput.value = "[memory=1024,vcores=1]";
      break;
    case "percentage":
    default:
      capacityInput.value = "10";
      break;
  }
}

function addNewQueue() {
  const parentPath = document.getElementById("parent-queue-select").value;
  const queueName = document.getElementById("new-queue-name").value.trim();
  const capacityMode = document.getElementById("new-capacity-mode").value;
  const capacityValue = document
    .getElementById("new-queue-capacity")
    .value.trim();
  const maxCapacity = parseFloat(
    document.getElementById("new-queue-max-capacity").value
  );
  const state = document.getElementById("new-queue-state").value;

  // Validate queue name
  const nameError = validateQueueName(queueName);
  if (nameError) {
    showWarning(nameError);
    return;
  }

  // Validate capacity
  const capacityErrors = validateCapacity(capacityValue, capacityMode);
  if (capacityErrors.length > 0) {
    showWarning(`Capacity validation: ${capacityErrors.join(", ")}`);
    return;
  }

  const newQueuePath = `${parentPath}.${queueName}`;

  // Check if queue already exists
  if (findQueueByPath(newQueuePath) || pendingAdditions.has(newQueuePath)) {
    showWarning("A queue with this name already exists");
    return;
  }

  // Parse capacity based on mode
  let parsedCapacity;
  if (capacityMode === "weight") {
    parsedCapacity = capacityValue.endsWith("w")
      ? capacityValue
      : `${capacityValue}w`;
  } else if (capacityMode === "absolute") {
    parsedCapacity = capacityValue;
  } else {
    parsedCapacity = parseFloat(capacityValue);
  }

  const newQueue = {
    name: queueName,
    path: newQueuePath,
    parentPath: parentPath,
    capacity: parsedCapacity,
    capacityMode: capacityMode,
    maxCapacity: maxCapacity,
    state: state,
    children: {},
  };

  pendingAdditions.set(newQueuePath, newQueue);

  console.log("Added new queue:", newQueue);

  renderQueueTree();
  closeAddQueueModal();
}

function stageQueueChanges() {
  if (!currentEditQueue) return;

  const capacityMode = document.getElementById("capacity-mode").value;
  const capacityValue = document.getElementById("queue-capacity").value.trim();
  const maxCapacity = parseFloat(
    document.getElementById("queue-max-capacity").value
  );
  const state = document.getElementById("queue-state").value;

  // Basic validation
  const capacityErrors = validateCapacity(capacityValue, capacityMode);
  if (capacityErrors.length > 0) {
    showWarning(`Capacity validation: ${capacityErrors.join(", ")}`);
    return;
  }

  const changes = {};
  let hasChanges = false;

  // Check capacity
  if (capacityMode === "weight") {
    const weightValue = capacityValue.endsWith("w")
      ? capacityValue
      : `${capacityValue}w`;
    if (
      weightValue !==
      (currentEditQueue.weight
        ? `${currentEditQueue.weight}w`
        : currentEditQueue.capacity)
    ) {
      changes.capacity = weightValue;
      changes.capacityMode = capacityMode;
      hasChanges = true;
    }
  } else if (capacityMode === "absolute") {
    if (capacityValue !== currentEditQueue.capacity) {
      changes.capacity = capacityValue;
      changes.capacityMode = capacityMode;
      hasChanges = true;
    }
  } else {
    // percentage
    const numValue = parseFloat(capacityValue);
    if (numValue !== currentEditQueue.capacity) {
      changes.capacity = numValue;
      changes.capacityMode = capacityMode;
      hasChanges = true;
    }
  }

  // Check max capacity
  if (maxCapacity !== currentEditQueue.maxCapacity) {
    changes.maxCapacity = maxCapacity;
    hasChanges = true;
  }

  // Check state
  if (state !== currentEditQueue.state) {
    changes.state = state;
    hasChanges = true;
  }

  if (hasChanges) {
    pendingChanges.set(currentEditQueue.path, changes);
    console.log("Staged changes for", currentEditQueue.path, ":", changes);
    showSuccess(`Changes staged for queue "${currentEditQueue.name}"`);
    renderQueueTree();
  } else {
    showInfo("No changes detected");
  }

  closeModal();
}

async function applyAllChanges() {
  const errors = validatePendingChanges();
  if (errors.length > 0) {
    showWarning(`Cannot apply changes: ${errors.join(", ")}`);
    return;
  }

  // Store a backup of pending changes in case we need to restore them
  const backupChanges = new Map(pendingChanges);
  const backupAdditions = new Map(pendingAdditions);
  const backupDeletions = new Set(pendingDeletions);

  // Prepare deletions, additions, updates...
  const deletions = Array.from(pendingDeletions);
  const additions = Array.from(pendingAdditions.values()).map((newQueue) => {
    const params = {};
    if (newQueue.capacity !== undefined) params["capacity"] = newQueue.capacity;
    if (newQueue.maxCapacity !== undefined)
      params["maximum-capacity"] = newQueue.maxCapacity;
    if (newQueue.state !== undefined) params["state"] = newQueue.state;
    return {
      queueName: newQueue.path,
      params,
    };
  });

  const updates = Array.from(pendingChanges.entries()).map(
    ([queuePath, changes]) => {
      const params = {};
      Object.entries(changes).forEach(([key, value]) => {
        let yarnKey = key;
        if (key === "maxCapacity") yarnKey = "maximum-capacity";
        if (key === "capacityMode") return;
        params[yarnKey] = value;
      });
      return {
        queueName: queuePath,
        params,
      };
    }
  );

  try {
    // Show applying changes loading
    showLoading("Applying configuration changes...");

    const response = await api.makeConfigurationUpdateApiCall({
      deletions,
      additions,
      updates,
    });

    // Check if the response indicates success
    if (
      response &&
      response.status == 200 &&
      typeof response.data === "string" &&
      response.data.includes("Configuration change successfully applied.")
    ) {
      // Success - clear pending changes and reload
      pendingChanges.clear();
      pendingAdditions.clear();
      pendingDeletions.clear();

      // Show reloading message
      showLoading("Reloading configuration...");

      // Reload configuration
      await api.loadSchedulerConfiguration();

      // Show success notification
      showSuccess("Configuration changes applied successfully!");
    } else {
      // Failed - restore the staged changes and show error notification
      pendingChanges.clear();
      pendingAdditions.clear();
      pendingDeletions.clear();

      // Restore from backup
      backupChanges.forEach((value, key) => pendingChanges.set(key, value));
      backupAdditions.forEach((value, key) => pendingAdditions.set(key, value));
      backupDeletions.forEach((value) => pendingDeletions.add(value));

      // Re-render the queue tree to show the restored staged changes
      renderQueueTree();
      showContent(true);

      // Extract error message from response
      let errorMessage = "Configuration validation failed";
      if (response && response.data) {
        if (typeof response.data === "string") {
          // Try to extract meaningful error from the response
          const errorMatch = response.data.match(/ERROR:?\s*(.+?)(?:\n|$)/i);
          if (errorMatch) {
            errorMessage = errorMatch[1].trim();
          } else if (
            response.data.includes("error") ||
            response.data.includes("failed")
          ) {
            errorMessage = response.data.substring(0, 200) + "...";
          }
        }
      }

      // Show error notification (the auto-disappearing one)
      showError(`YARN validation failed: ${errorMessage}`);
      console.warn("YARN validation failed. Response:", response);
    }
  } catch (error) {
    // Network or other error - restore the staged changes
    pendingChanges.clear();
    pendingAdditions.clear();
    pendingDeletions.clear();

    // Restore from backup
    backupChanges.forEach((value, key) => pendingChanges.set(key, value));
    backupAdditions.forEach((value, key) => pendingAdditions.set(key, value));
    backupDeletions.forEach((value) => pendingDeletions.add(value));

    // Re-render the queue tree to show the restored staged changes
    renderQueueTree();
    showContent(true);

    // Show error notification (the auto-disappearing one)
    showError(`Failed to apply changes: ${error.message}`);
    console.error("Apply changes failed:", error);
  }
}

function markQueueForDeletion(queuePath) {
  if (queuePath === "root") {
    showWarning("Cannot delete root queue");
    return;
  }

  const queue = findQueueByPath(queuePath);
  if (!queue) return;

  // Check if queue has children
  const hasChildren = Object.keys(queue.children).length > 0;
  const hasNewChildren = Array.from(pendingAdditions.values()).some(
    (newQueue) => newQueue.parentPath === queuePath
  );

  // If queue has children, check if ALL children are marked for deletion or are new queues
  if (hasChildren || hasNewChildren) {
    const existingChildren = Object.values(queue.children);
    const newChildren = Array.from(pendingAdditions.values()).filter(
      (newQueue) => newQueue.parentPath === queuePath
    );

    // Check if all existing children are marked for deletion
    const allExistingChildrenMarkedForDeletion = existingChildren.every(
      (child) => pendingDeletions.has(child.path)
    );

    // If there are new children that aren't being deleted, we can't delete the parent
    if (newChildren.length > 0) {
      showWarning(
        "Cannot delete queue with pending new child queues. Please remove the new child queues first."
      );
      return;
    }

    // If not all existing children are marked for deletion, show appropriate message
    if (!allExistingChildrenMarkedForDeletion) {
      const activeChildren = existingChildren.filter(
        (child) => !pendingDeletions.has(child.path)
      );
      if (activeChildren.length === 1) {
        showWarning(
          `Cannot delete queue with active child queue "${activeChildren[0].name}". Please delete the child queue first.`
        );
      } else {
        const childNames = activeChildren
          .map((child) => child.name)
          .join('", "');
        showWarning(
          `Cannot delete queue with active child queues: "${childNames}". Please delete all child queues first.`
        );
      }
      return;
    }

    // All children are marked for deletion - show confirmation with additional context
    const childCount = existingChildren.length;
    const childNames = existingChildren.map((child) => child.name).join('", "');
    const confirmMessage = `Are you sure you want to delete queue "${
      queue.name
    }" and its ${childCount} child queue${
      childCount > 1 ? "s" : ""
    }: "${childNames}"?\n\nAll child queues are already marked for deletion.`;

    if (!confirm(confirmMessage)) {
      return;
    }
  } else {
    // No children - standard confirmation
    if (!confirm(`Are you sure you want to delete queue "${queue.name}"?`)) {
      return;
    }
  }

  // Mark the queue for deletion
  if (pendingAdditions.has(queuePath)) {
    // If it's a new queue, just remove it from additions
    pendingAdditions.delete(queuePath);
  } else {
    // If it's an existing queue, mark it for deletion
    pendingDeletions.add(queuePath);
  }

  // Remove any pending changes for this queue
  pendingChanges.delete(queuePath);

  console.log("Marked queue for deletion:", queuePath);
  showSuccess(`Queue "${queue.name}" marked for deletion`);
  renderQueueTree();
}

function openEditModal(queue) {
  if (pendingDeletions.has(queue.path)) {
    showWarning("Cannot edit a queue marked for deletion");
    return;
  }

  // ... rest of function remains the same
  currentEditQueue = queue;
  const container = document.getElementById("edit-form-container");
  container.innerHTML = createEditForm();

  const pendingChange = pendingChanges.get(queue.path);

  document.getElementById(
    "modal-title"
  ).textContent = `Edit Queue: ${queue.name}`;
  document.getElementById("queue-name").value = queue.name;

  // Set capacity mode
  const capacityMode =
    pendingChange?.capacityMode || queue.capacityMode || "percentage";
  document.getElementById("capacity-mode").value = capacityMode;

  // Set capacity value based on mode
  let capacityValue;
  if (pendingChange?.capacity !== undefined) {
    capacityValue = pendingChange.capacity;
  } else if (capacityMode === "weight" && queue.weight) {
    capacityValue = `${queue.weight}w`;
  } else {
    capacityValue = queue.capacity;
  }
  document.getElementById("queue-capacity").value = capacityValue;

  document.getElementById("queue-max-capacity").value =
    pendingChange?.maxCapacity || queue.maxCapacity;
  document.getElementById("queue-state").value =
    pendingChange?.state || queue.state;

  // Trigger capacity mode change to show/hide relevant sections
  onCapacityModeChange();

  document.getElementById("edit-modal").classList.add("show");
}

function openInfoModal(queue) {
  const container = document.getElementById("info-form-container");
  container.innerHTML = createInfoForm(queue);
  document.getElementById("info-modal").classList.add("show");
}

window.openEditModal = openEditModal;
window.openAddQueueModal = openAddQueueModal;
window.openInfoModal = openInfoModal;
window.openAddQueueModalWithParent = openAddQueueModalWithParent;
window.closeModal = closeModal;
window.closeAddQueueModal = closeAddQueueModal;
window.closeInfoModal = closeInfoModal;
window.stageQueueChanges = stageQueueChanges;
window.addNewQueue = addNewQueue;
window.markQueueForDeletion = markQueueForDeletion;
window.onCapacityModeChange = onCapacityModeChange;
window.onNewCapacityModeChange = onNewCapacityModeChange;
window.applyAllChanges = applyAllChanges;
