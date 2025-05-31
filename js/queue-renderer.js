function calculateMaxDepth(queue, currentDepth = 0) {
  let maxDepth = currentDepth;

  // Check existing children
  Object.values(queue.children).forEach((child) => {
    if (!pendingChanges.checkState(child.path, DELETE)) {
      const childDepth = calculateMaxDepth(child, currentDepth + 1);
      maxDepth = Math.max(maxDepth, childDepth);
    }
  });

  // Check pending additions at this level
  pendingChanges.iter(ADD).forEach((newQueue) => {
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
    (child) => !pendingChanges.checkState(child.path, DELETE)
  );
  // Newly staged children (from pendingAdditions)
  const newChildren = pendingChanges.iter(ADD).filter(
    (newQueue) =>
      newQueue.parentPath === queue.path && !pendingChanges.checkState(newQueue.path, DELETE)
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

  if (pendingChanges.checkState(queue.path, ADD)) {
    card.classList.add("new-queue");
  }

  if (pendingChanges.checkState(queue.path, DELETE)) {
    card.classList.add("to-be-deleted");
  }

  if (pendingChanges.checkState(queue.path, UPDATE)) {
    card.classList.add("pending-changes");
  }

  pendingChange = pendingChanges.get(queue.path)

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

// function renderMinimap() {
//   const minimap = document.getElementById("minimap");
//   minimap.innerHTML = "";
//
//   // Show a simplified view of all queues
//   function addToMinimap(queue, depth = 0) {
//     if (pendingDeletions.has(queue.path)) return;
//
//     const queueMini = document.createElement("div");
//     queueMini.className = "minimap-queue";
//
//     let displayCapacity;
//     if (queue.capacityMode === "weight") {
//       displayCapacity = queue.effectiveCapacity || queue.absoluteCapacity || 20;
//     } else {
//       displayCapacity =
//         pendingChanges.get(queue.path)?.capacity || queue.capacity;
//     }
//
//     queueMini.style.height = `${Math.max(displayCapacity * 0.8, 10)}%`;
//     queueMini.style.opacity = Math.max(1 - depth * 0.2, 0.3);
//
//     if (pendingAdditions.has(queue.path)) {
//       queueMini.style.background = "#28a745";
//     } else if (!pendingChanges.checkState(queue.path, undefined)) {
//       queueMini.style.background = "#ffc107";
//     }
//
//     minimap.appendChild(queueMini);
//
//     // Add children
//     Object.values(queue.children).forEach((child) => {
//       addToMinimap(child, depth + 1);
//     });
//
//     // Add new children
//     Array.from(pendingAdditions.values()).forEach((newQueue) => {
//       if (newQueue.parentPath === queue.path) {
//         addToMinimap(newQueue, depth + 1);
//       }
//     });
//   }
//
//   if (queueData) {
//     addToMinimap(queueData);
//   }
// }

function canQueueBeDeleted(queuePath) {
  if (queuePath === "root") {
    return { canDelete: false, reason: "Cannot delete root queue" };
  }

  const queue = findQueueByPath(queuePath);
  if (!queue) {
    return { canDelete: false, reason: "Queue not found" };
  }

  const hasChildren = Object.keys(queue.children).length > 0;
  const hasNewChildren = pendingChanges.iter(ADD).some(
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
    pendingChanges.checkState(child.path, DELETE)
  );

  if (allChildrenMarkedForDeletion) {
    return { canDelete: true, reason: "All children marked for deletion" };
  }

  const activeChildren = existingChildren.filter(
    (child) => !pendingChanges.checkState(child.path, DELETE)
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
