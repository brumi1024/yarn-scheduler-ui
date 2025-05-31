function calculateMaxDepth(queue, currentDepth = 0) {
  let maxDepth = currentDepth;

  // Check existing children
  Object.values(queue.children).forEach((child) => {
    if (!pendingDeletions.has(child.path)) {
      const childDepth = calculateMaxDepth(child, currentDepth + 1);
      maxDepth = Math.max(maxDepth, childDepth);
    }
  });

  // Check pending additions at this level
  Array.from(pendingAdditions.values()).forEach((newQueue) => {
    if (newQueue.parentPath === queue.path) {
      const childDepth = calculateMaxDepth(newQueue, currentDepth + 1);
      maxDepth = Math.max(maxDepth, childDepth);
    }
  });

  return maxDepth;
}

function sortQueues(queues) {
  if (currentSort === "capacity") {
    // Sort by effectiveCapacity (or fallback to capacity), descending
    return queues.slice().sort((a, b) => {
      const aCap =
        a.effectiveCapacity !== undefined ? a.effectiveCapacity : a.capacity;
      const bCap =
        b.effectiveCapacity !== undefined ? b.effectiveCapacity : b.capacity;
      return (bCap || 0) - (aCap || 0);
    });
  } else if (currentSort === "name") {
    // Sort by name, ascending
    return queues.slice().sort((a, b) => a.name.localeCompare(b.name));
  }
  return queues;
}

function queueMatchesSearch(queue, searchTerm) {
  if (!searchTerm) return true;
  return (
    queue.name.toLowerCase().includes(searchTerm) ||
    (queue.path && queue.path.toLowerCase().includes(searchTerm))
  );
}

function getAllChildren(queue) {
  // Existing children (from backend)
  const children = Object.values(queue.children).filter(
    (child) => !pendingDeletions.has(child.path)
  );
  // Newly staged children (from pendingAdditions)
  const newChildren = Array.from(pendingAdditions.values()).filter(
    (newQueue) =>
      newQueue.parentPath === queue.path && !pendingDeletions.has(newQueue.path)
  );
  return [...children, ...newChildren];
}

// Recursively collect all matching queues and their ancestors for display
function collectVisibleQueues(queue, searchTerm, ancestors = []) {
  let matches = queueMatchesSearch(queue, searchTerm);
  let visibleDescendants = [];

  // Check children recursively
  Object.values(getAllChildren(queue)).forEach((child) => {
    const result = collectVisibleQueues(
      child,
      searchTerm,
      ancestors.concat(queue)
    );
    if (result.visible) {
      visibleDescendants.push(result);
    }
  });

  // If this queue matches or has any matching descendants, it's visible
  let visible = matches || visibleDescendants.length > 0;

  return {
    queue,
    visible,
    matches,
    visibleDescendants,
    ancestors,
  };
}

// Update getQueuesAtLevel to use the search filter
function getQueuesAtLevel(
  level,
  queue = queueData,
  currentLevel = 0,
  searchTerm = currentSearchTerm
) {
  let visibleTree = collectVisibleQueues(queue, searchTerm);
  let result = [];

  function collectAtLevel(node, lvl) {
    if (lvl === level && node.visible) {
      result.push(node.queue);
    }
    node.visibleDescendants.forEach((childNode) =>
      collectAtLevel(childNode, lvl + 1)
    );
  }

  collectAtLevel(visibleTree, 0);
  return result;
}

function renderLevelHeaders() {
  const levelHeadersContainer = document.getElementById("level-headers");
  levelHeadersContainer.innerHTML = "";

  const maxDepth = calculateMaxDepth(queueData);

  for (let i = 0; i <= maxDepth; i++) {
    const header = document.createElement("div");
    header.className = "level-header";
    header.textContent = `Level ${i + 1}`;
    levelHeadersContainer.appendChild(header);
  }
}

function highlightMatch(text, searchTerm) {
  if (!searchTerm) return text;
  // Escape special regex characters in searchTerm
  const safeTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(safeTerm, "ig");
  return text.replace(re, (match) => `<mark>${match}</mark>`);
}

function createQueueCard(queue, level) {
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
  capacitySection.innerHTML = displayCapacity(queue.path) + displayMaxCapacity(queue.path)

  // Assemble the card
  card.appendChild(titleBar);
  card.appendChild(divider);
  card.appendChild(labelArea);
  card.appendChild(capacitySection);

  return card;
}

function displayCapacity(queuePath) {
  const value = window.schedulerConfig.capacity(queuePath)
  const mode = window.schedulerConfig.detectMode(value)
  const displayValue = window.schedulerConfig.display(mode, value)
  if (mode === CAPACITY_MODES.PERCENTAGE || mode === CAPACITY_MODES.WEIGHT) {
    return oneRowDisplay("Capacity", displayValue)
  } else {
    return multyRowDisplay("Capacity", displayValue)
  }
}

function displayMaxCapacity(queuePath) {
  const value = window.schedulerConfig.maxCapacity(queuePath)
  const mode = window.schedulerConfig.detectMode(value)
  const displayValue = window.schedulerConfig.display(mode, value)
  if (mode === CAPACITY_MODES.PERCENTAGE || mode === CAPACITY_MODES.WEIGHT) {
    return oneRowDisplay("Max Capacity", displayValue)
  } else {
    return multyRowDisplay("Max Capacity", displayValue)
  }
}

function oneRowDisplay(label, displayValue) {
  return `<div class="capacity-section">
    <div class="capacity-section-title">${label}:</div>
    <div class="resource-raw">${displayValue}</div>
  </div>`
}

function multyRowDisplay(label, displayValue) {
  let html = '<div class="capacity-section">';
  html += '<div class="capacity-section-title">' + label + ':</div>';
  html += '<div class="resource-list">';
  displayValue.forEach(element => {
    html += `<div class="resource-item">
                <span class="resource-key">${element[0]}:</span>
                <span class="resource-value">${element[1]}</span>
            </div>`;
  })
  html += "</div></div>";
  return html
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

function renderQueueTree() {
  console.log("renderQueueTree called, queueData:", queueData);
  if (!queueData) return;

  const treeContainer = document.getElementById("queue-tree");
  treeContainer.innerHTML = "";
  queueElements.clear();

  const maxDepth = calculateMaxDepth(queueData);

  // Create columns for each level with consistent width
  for (let level = 0; level <= maxDepth; level++) {
    const column = document.createElement("div");
    column.className = "queue-column";

    const queuesAtLevel = sortQueues(getQueuesAtLevel(level));

    queuesAtLevel.forEach((queue) => {
      const card = createQueueCard(queue, level);
      column.appendChild(card);
      queueElements.set(queue.path, card);
    });

    treeContainer.appendChild(column);
  }

  // Draw arrows after elements are positioned
  setTimeout(() => {
    drawArrows();
  }, CONFIG.TIMEOUTS.ARROW_RENDER);

  renderLevelHeaders();
  // renderMinimap();
  updateBatchControls();
}

function renderMinimap() {
  const minimap = document.getElementById("minimap");
  minimap.innerHTML = "";

  // Show a simplified view of all queues
  function addToMinimap(queue, depth = 0) {
    if (pendingDeletions.has(queue.path)) return;

    const queueMini = document.createElement("div");
    queueMini.className = "minimap-queue";

    let displayCapacity;
    if (queue.capacityMode === "weight") {
      displayCapacity = queue.effectiveCapacity || queue.absoluteCapacity || 20;
    } else {
      displayCapacity =
        pendingChanges.get(queue.path)?.capacity || queue.capacity;
    }

    queueMini.style.height = `${Math.max(displayCapacity * 0.8, 10)}%`;
    queueMini.style.opacity = Math.max(1 - depth * 0.2, 0.3);

    if (pendingAdditions.has(queue.path)) {
      queueMini.style.background = "#28a745";
    } else if (pendingChanges.has(queue.path)) {
      queueMini.style.background = "#ffc107";
    }

    minimap.appendChild(queueMini);

    // Add children
    Object.values(queue.children).forEach((child) => {
      addToMinimap(child, depth + 1);
    });

    // Add new children
    Array.from(pendingAdditions.values()).forEach((newQueue) => {
      if (newQueue.parentPath === queue.path) {
        addToMinimap(newQueue, depth + 1);
      }
    });
  }

  if (queueData) {
    addToMinimap(queueData);
  }
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

window.renderQueueTree = renderQueueTree;
window.createQueueCard = createQueueCard;
window.calculateMaxDepth = calculateMaxDepth;
window.getQueuesAtLevel = getQueuesAtLevel;
