window.createQueueCard = (queue, level) => {
    const card = document.createElement("div");
    card.className = "queue-card";

    const pendingChange = pendingChanges.get(queue.path);
    const isNewQueue = pendingAdditions.has(queue.path);
    const isToBeDeleted = pendingDeletions.has(queue.path);

    // Add styling for different states
    if (isNewQueue) card.classList.add("new-queue");
    else if (isToBeDeleted) card.classList.add("to-be-deleted");
    else if (pendingChange) card.classList.add("pending-changes");

    // Set data attributes for reference
    card.setAttribute("data-queue-path", queue.path);
    card.setAttribute("data-level", level);

    // --- Title Bar ---
    const titleBar = document.createElement("div");
    titleBar.className = "queue-header";

    // Queue name (clickable for edit)
    const nameEl = document.createElement("span");
    nameEl.className = "queue-name";
    nameEl.innerHTML = highlightMatch(queue.name, currentSearchTerm);
    nameEl.title = `${queue.path} (Click to edit)`;
    nameEl.onclick = (e) => {
        e.stopPropagation();
        openEditModal(findQueueByPath(queue.path));
    };

    // Info button - moved to right side with submenu styling
    const infoBtn = document.createElement("button");
    infoBtn.className = "queue-info-btn";
    infoBtn.innerHTML = `
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <circle cx="12" cy="12" r="11" stroke="currentColor" stroke-width="2" fill="none"/>
      <line x1="12" y1="16" x2="12" y2="12" stroke="currentColor" stroke-width="2"/>
      <circle cx="12" cy="8" r="1" fill="currentColor"/>
    </svg>
  `;
    infoBtn.title = "Queue Information";
    infoBtn.setAttribute("aria-label", "Queue information");
    infoBtn.onclick = (e) => {
        e.stopPropagation();
        openInfoModal(findQueueByPath(queue.path));
    };

    // Actions menu
    const actionsMenu = document.createElement("span");
    actionsMenu.className = "queue-actions-menu";

    const deletionStatus = canQueueBeDeleted(queue.path);
    actionsMenu.innerHTML = `
    <button class="queue-menu-btn" aria-label="Queue actions" tabindex="0" onclick="toggleQueueDropdown(event, '${queue.path}')">
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <circle cx="5" cy="12" r="2"/>
        <circle cx="12" cy="12" r="2"/>
        <circle cx="19" cy="12" r="2"/>
      </svg>
    </button>
    <div class="queue-dropdown" id="dropdown-${queue.path}">
      <div class="dropdown-item" onclick="openEditModal(findQueueByPath('${queue.path}'))">Edit Queue</div>
      <div class="dropdown-item" onclick="openAddQueueModalWithParent('${queue.path}')">Add Child Queue</div>
      ${queue.path !== "root" ? `<div class="dropdown-item ${deletionStatus.canDelete ? "" : "disabled"}" 
        onclick="${deletionStatus.canDelete ? `markQueueForDeletion('${queue.path}')` : ""}"
        title="${deletionStatus.canDelete ? "Delete this queue" : deletionStatus.reason}">
        Delete Queue ${deletionStatus.canDelete ? "" : "(disabled)"}
      </div>` : ""}
    </div>
  `;

    // Create a wrapper for the buttons on the right
    const buttonGroup = document.createElement("div");
    buttonGroup.className = "queue-button-group";
    buttonGroup.appendChild(infoBtn);
    buttonGroup.appendChild(actionsMenu);

    titleBar.appendChild(nameEl);
    titleBar.appendChild(buttonGroup);

    // --- Divider ---
    const divider = document.createElement("hr");
    divider.className = "queue-card-divider";

    // --- Label Area ---
    const labelArea = document.createElement("div");
    labelArea.className = "queue-label-area";
    labelArea.innerHTML = createQueueLabels(queue, pendingChange);

    // --- Capacity Section ---
    const capacitySection = document.createElement("div");
    capacitySection.className = "queue-capacity-section";

    const mode =
        pendingChange?.capacityMode || queue.capacityMode || "percentage";
    const displayCapacity = pendingChange?.capacity || queue.capacity;
    const maxCapacity = pendingChange?.maxCapacity || queue.maxCapacity;

    // TODO cleanup where the capacity comes from
    // Get the correct weight value - prioritize pending changes
    let weightValue;
    if (mode === "weight") {
        // For weight mode, the weight value could be in different places depending on the change state
        weightValue =
            pendingChange?.capacity ||
            queue.weight ||
            queue.capacity;
    } else {
        weightValue = pendingChange?.weight || queue.weight;
    }

    capacitySection.innerHTML = createCapacityDisplay(
        formatCapacityDisplay(displayCapacity, mode, weightValue),
        maxCapacity
    );

    // Assemble the card
    card.appendChild(titleBar);
    card.appendChild(divider);
    card.appendChild(labelArea);
    card.appendChild(capacitySection);

    return card;
}

function canQueueBeDeleted(queuePath) {
    if (queuePath === "root") {
        return { canDelete: false, reason: "Cannot delete root queue" };
    }

    const queue = findQueueByPath(queuePath);
    if (!queue) {
        return { canDelete: false, reason: "Queue not found" };
    }

    const hasChildren = Object.keys(queue.children).length > 0;
    const hasNewChildren = Array.from(pendingAdditions.values()).some(
        (newQueue) => newQueue.parentPath === queuePath
    );

    if (!hasChildren && !hasNewChildren) {
        return { canDelete: true, reason: "No children" };
    }

    // Check if there are new children
    if (hasNewChildren) {
        return { canDelete: false, reason: "Has pending new child queues" };
    }

    // Check if all existing children are marked for deletion
    const existingChildren = Object.values(queue.children);
    const allChildrenMarkedForDeletion = existingChildren.every((child) =>
        pendingDeletions.has(child.path)
    );

    if (allChildrenMarkedForDeletion) {
        return { canDelete: true, reason: "All children marked for deletion" };
    }

    const activeChildren = existingChildren.filter(
        (child) => !pendingDeletions.has(child.path)
    );
    return {
        canDelete: false,
        reason: `Has active child queues: ${activeChildren
            .map((c) => c.name)
            .join(", ")}`,
    };
}


function createQueueLabels(queue, pendingChange) {
    const labels = [];

    // Get current values (pending changes override original values)
    const mode =
        pendingChange?.capacityMode || queue.capacityMode || "percentage";
    const state = pendingChange?.state || queue.state || "RUNNING";
    const autoCreation =
        queue.autoCreationEligibility === "on" ||
        queue.autoCreationEligibility === "enabled";

    // Capacity Mode Tag
    const modeIcons = {
        percentage: "📊",
        weight: "⚖️",
        absolute: "🎯",
        vector: "📐",
        flexible: "🔄",
    };

    const modeIcon = modeIcons[mode] || "📊";
    labels.push(
        `<span class="queue-tag tag-mode" title="Capacity Mode: ${mode}">${modeIcon} ${
            mode.charAt(0).toUpperCase() + mode.slice(1)
        }</span>`
    );

    // State Tag
    if (state === "STOPPED") {
        labels.push(
            `<span class="queue-tag tag-state tag-stopped" title="Queue State: Stopped">🛑 Stopped</span>`
        );
    } else {
        labels.push(
            `<span class="queue-tag tag-state tag-running" title="Queue State: Running">▶️ Running</span>`
        );
    }

    // Auto-Creation Tag
    if (autoCreation) {
        labels.push(
            `<span class="queue-tag tag-auto-create" title="Auto Queue Creation Enabled">⚡ Auto-Create</span>`
        );
    }

    return labels.join("");
}

// Add this helper function before createQueueCard
function formatCapacityDisplay(capacity, mode, weight) {
    switch (mode) {
        case "percentage":
            return `${parseFloat(capacity || 0).toFixed(1)}%`;
        case "weight":
            return `${parseFloat(weight || capacity || 0)}w`;
        case "absolute":
        case "vector":
            return capacity; // Keep original format for processing
        default:
            return capacity || "0";
    }
}

// New function to handle absolute/vector capacity display
function createCapacityDisplay(capacity, maxCapacity) {
    const parseAbsoluteCapacity = (capStr) => {
        if (!capStr) return [];

        // Remove brackets if present
        let cleanStr = capStr.toString().trim();

        if (cleanStr.startsWith("[") && cleanStr.endsWith("]")) {
            cleanStr = cleanStr.slice(1, -1);
        }

        // Split by comma and parse key=value pairs
        return cleanStr
            .split(",")
            .map((pair) => {
                const [key, value] = pair.split("=").map((s) => s.trim());
                return { key, value };
            })
            .filter((item) => item.key && item.value);
    };

    const currentResources = parseAbsoluteCapacity(capacity);
    const maxResources = parseAbsoluteCapacity(maxCapacity);

    let html = '<div class="absolute-capacity-display">';

    // Current capacity section
    if (currentResources.length > 0) {
        html += '<div class="capacity-section">';
        html += '<div class="capacity-section-title">Capacity:</div>';
        html += '<div class="resource-list">';
        currentResources.forEach((resource) => {
            html += `<div class="resource-item">
                <span class="resource-key">${resource.key}:</span>
                <span class="resource-value">${resource.value}</span>
            </div>`;
        });
        html += "</div></div>";
    } else {
        html += '<div class="capacity-section">';
        html += '<div class="capacity-section-title">Capacity:</div>';
        html += '<div class="resource-raw">' + (capacity || "N/A") + "</div>";
        html += "</div>";
    }

    // Max capacity section
    if (maxResources.length > 0) {
        html += '<div class="capacity-section">';
        html += '<div class="capacity-section-title">Max Capacity:</div>';
        html += '<div class="resource-list">';
        maxResources.forEach((resource) => {
            html += `<div class="resource-item">
                <span class="resource-key">${resource.key}:</span>
                <span class="resource-value">${resource.value}</span>
            </div>`;
        });
        html += "</div></div>";
    } else {
        html += '<div class="capacity-section">';
        html += '<div class="capacity-section-title">Max Capacity:</div>';
        html += '<div class="resource-raw">' + (maxCapacity || "N/A") + "</div>";
        html += "</div>";
    }

    html += "</div>";
    return html;
}

function highlightMatch(text, searchTerm) {
    if (!searchTerm) return text;
    // Escape special regex characters in searchTerm
    const safeTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(safeTerm, "ig");
    return text.replace(re, (match) => `<mark>${match}</mark>`);
}