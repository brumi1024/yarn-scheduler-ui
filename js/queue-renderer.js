function calculateMaxDepth(queue, currentDepth = 0) {
  if (!queue) return currentDepth; 
  let maxDepth = currentDepth;

  Object.values(queue.children).forEach((child) => {
    const childDepth = calculateMaxDepth(child, currentDepth + 1);
    maxDepth = Math.max(maxDepth, childDepth);
  });

  // Pending additions: These are structurally part of the tree.
  // If a newQueue was marked for deletion, it would have been removed from pendingAdditions.
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
    return queues.slice().sort((a, b) => {
      const aCap =
        a.effectiveCapacity !== undefined ? a.effectiveCapacity : a.capacity;
      const bCap =
        b.effectiveCapacity !== undefined ? b.effectiveCapacity : b.capacity;
      return (bCap || 0) - (aCap || 0);
    });
  } else if (currentSort === "name") {
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
  const children = Object.values(queue.children);

  const newChildren = Array.from(pendingAdditions.values()).filter(
    (newQueue) =>
      newQueue.parentPath === queue.path && !pendingDeletions.has(newQueue.path)
  );
  return [...children, ...newChildren];
}

function collectVisibleQueues(queue, searchTerm, ancestors = []) {
  let matches = queueMatchesSearch(queue, searchTerm);
  let visibleDescendants = [];

  getAllChildren(queue).forEach((child) => {
    const result = collectVisibleQueues(
      child,
      searchTerm,
      ancestors.concat(queue)
    );
    if (result.visible) {
      visibleDescendants.push(result);
    }
  });

  // A queue is visible if it matches the search, or has visible descendants.
  // If it's marked for deletion, this visibility rule still applies.
  // If search is empty, 'matches' is true, so all queues (including deleted ones) become visible.
  let visible = matches || visibleDescendants.length > 0;

  return {
    queue,
    visible,
    matches,
    visibleDescendants,
    ancestors,
  };
}

function getQueuesAtLevel(
  level,
  queue = window.queueData,
  currentLevel = 0,
  searchTerm = currentSearchTerm
) {
  if (!queue) return [];
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

  if (!window.queueData) return;
  const maxDepth = calculateMaxDepth(window.queueData);

  for (let i = 0; i <= maxDepth; i++) {
    const header = document.createElement("div");
    header.className = "level-header";
    header.textContent = `Level ${i + 1}`;
    levelHeadersContainer.appendChild(header);
  }
}

function highlightMatch(text, searchTerm) {
  if (!searchTerm || !text) return text || "";
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

  if (isNewQueue && !isToBeDeleted) {
    card.classList.add("new-queue");
  } else if (isToBeDeleted) {
    card.classList.add("to-be-deleted");
  } else if (pendingChange) {
    card.classList.add("pending-changes");
  }

  card.setAttribute("data-queue-path", queue.path);
  card.setAttribute("data-level", level);

  const titleBar = document.createElement("div");
  titleBar.className = "queue-header";

  const nameEl = document.createElement("span");
  nameEl.className = "queue-name";
  nameEl.innerHTML = highlightMatch(queue.name, currentSearchTerm);
  nameEl.title = `${queue.path} (Click to edit)`;
  nameEl.onclick = (e) => {
    e.stopPropagation();
    openEditModal(findQueueByPath(queue.path));
  };

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

  const actionsMenu = document.createElement("span");
  actionsMenu.className = "queue-actions-menu";

  const deletionStatus = canQueueBeDeleted(queue.path);
  let deleteButtonHTML = "";
  if (queue.path !== "root") {
    if (isToBeDeleted) {
      deleteButtonHTML = `<div class="dropdown-item disabled" title="Marked for deletion.">Marked for Deletion</div>`;
    } else {
      deleteButtonHTML = `<div class="dropdown-item ${
        deletionStatus.canDelete ? "" : "disabled"
      }" 
            onclick="${
              deletionStatus.canDelete
                ? `markQueueForDeletion('${queue.path}')`
                : ""
            }"
            title="${
              deletionStatus.canDelete
                ? "Delete this queue"
                : deletionStatus.reason
            }">
            Delete Queue
          </div>`;
    }
  }

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
      ${deleteButtonHTML}
    </div>
  `;

  const buttonGroup = document.createElement("div");
  buttonGroup.className = "queue-button-group";
  buttonGroup.appendChild(infoBtn);
  buttonGroup.appendChild(actionsMenu);

  titleBar.appendChild(nameEl);
  titleBar.appendChild(buttonGroup);

  const divider = document.createElement("hr");
  divider.className = "queue-card-divider";

  const labelArea = document.createElement("div");
  labelArea.className = "queue-label-area";
  labelArea.innerHTML = createQueueLabels(queue, pendingChange);

  const capacitySection = document.createElement("div");
  capacitySection.className = "queue-capacity-section";

  const mode =
    pendingChange?.capacityMode || queue.capacityMode || "percentage";
  const displayCapacity =
    pendingChange?.capacity !== undefined
      ? pendingChange.capacity
      : queue.capacity;
  const maxCapacity =
    pendingChange?.maxCapacity !== undefined
      ? pendingChange.maxCapacity
      : queue.maxCapacity;
  let weightValue =
    mode === "weight"
      ? pendingChange?.capacity || queue.weight || queue.capacity
      : pendingChange?.weight || queue.weight;

  capacitySection.innerHTML = createCapacityDisplay(
    formatCapacityDisplay(displayCapacity, mode, weightValue),
    maxCapacity,
    mode
  );

  card.appendChild(titleBar);
  card.appendChild(divider);
  card.appendChild(labelArea);
  card.appendChild(capacitySection);

  return card;
}

function createQueueLabels(queue, pendingChange) {
  const labels = [];
  const mode =
    pendingChange?.capacityMode || queue.capacityMode || "percentage";
  const state = pendingChange?.state || queue.state || "RUNNING";
  const autoCreationEnabled =
    queue.autoCreateChildQueueEnabled === true ||
    queue.autoCreationEligibility === "on" ||
    queue.autoCreationEligibility === "enabled";

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

  if (state === "STOPPED") {
    labels.push(
      `<span class="queue-tag tag-state tag-stopped" title="Queue State: Stopped">🛑 Stopped</span>`
    );
  } else {
    labels.push(
      `<span class="queue-tag tag-state tag-running" title="Queue State: Running">▶️ Running</span>`
    );
  }

  if (autoCreationEnabled) {
    labels.push(
      `<span class="queue-tag tag-auto-create" title="Auto Queue Creation Enabled">⚡ Auto-Create</span>`
    );
  }
  return labels.join("");
}

function formatCapacityDisplay(capacity, mode, weight) {
  switch (mode) {
    case "percentage":
      return `${parseFloat(capacity || 0).toFixed(1)}%`;
    case "weight":
      const weightStr = String(weight || capacity || 0);
      return weightStr.endsWith("w")
        ? weightStr
        : `${parseFloat(weightStr).toFixed(1)}w`;
    case "absolute":
    case "vector":
      return capacity;
    default:
      return String(capacity || "0");
  }
}

function createCapacityDisplay(capacityStr, maxCapacityStr, mode) {
  const parseResources = (resStr) => {
    if (!resStr || typeof resStr !== "string") return null;
    let cleanStr = resStr.trim();
    if (cleanStr.startsWith("[") && cleanStr.endsWith("]")) {
      cleanStr = cleanStr.slice(1, -1);
    }
    if (!cleanStr) return null;

    return cleanStr
      .split(",")
      .map((pair) => {
        const [key, value] = pair.split("=").map((s) => s.trim());
        return { key, value: value || "" };
      })
      .filter((item) => item.key);
  };

  let html = "";
  if (mode === "absolute" || mode === "vector") {
    html += '<div class="absolute-capacity-display">';
    const currentResources = parseResources(capacityStr);
    html +=
      '<div class="capacity-section"><div class="capacity-section-title">Capacity:</div>';
    if (currentResources && currentResources.length > 0) {
      html += '<div class="resource-list">';
      currentResources.forEach((r) => {
        html += `<div class="resource-item"><span class="resource-key">${r.key}:</span><span class="resource-value">${r.value}</span></div>`;
      });
      html += "</div>";
    } else {
      html += `<div class="resource-raw">${capacityStr || "N/A"}</div>`;
    }
    html += "</div>";

    const maxResources = parseResources(maxCapacityStr);
    html +=
      '<div class="capacity-section"><div class="capacity-section-title">Max Capacity:</div>';
    if (maxResources && maxResources.length > 0) {
      html += '<div class="resource-list">';
      maxResources.forEach((r) => {
        html += `<div class="resource-item"><span class="resource-key">${r.key}:</span><span class="resource-value">${r.value}</span></div>`;
      });
      html += "</div>";
    } else {
      const maxCapDisplay =
        maxCapacityStr && !String(maxCapacityStr).startsWith("[")
          ? `${parseFloat(maxCapacityStr).toFixed(1)}%`
          : maxCapacityStr || "N/A";
      html += `<div class="resource-raw">${maxCapDisplay}</div>`;
    }
    html += "</div></div>";
  } else {
    html += '<div class="capacity-display">';
    html += `<div class="capacity-row"><span class="capacity-label">Capacity:</span><span class="capacity-value">${
      capacityStr || "N/A"
    }</span></div>`;
    if (maxCapacityStr !== undefined && maxCapacityStr !== null) {
      html += `<div class="capacity-row"><span class="capacity-label">Max Capacity:</span><span class="capacity-value">${parseFloat(
        maxCapacityStr
      ).toFixed(1)}%</span></div>`;
    }
    html += "</div>";
  }
  return html;
}

function renderQueueTree() {
  if (!window.queueData) {
    console.warn("renderQueueTree called but queueData is not available.");
    return;
  }

  const treeContainer = document.getElementById("queue-tree");
  treeContainer.innerHTML = "";
  queueElements.clear();

  const maxDepth = calculateMaxDepth(window.queueData);

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

  setTimeout(() => {
    if (typeof drawArrows === "function") drawArrows();
  }, CONFIG.TIMEOUTS.ARROW_RENDER);

  renderLevelHeaders();
  if (typeof updateBatchControls === "function") updateBatchControls();
}

function renderMinimap() {
  const minimap = document.getElementById("minimap");
  if (!minimap) return;
  minimap.innerHTML = "";

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

    queueMini.style.height = `${Math.max(
      parseFloat(displayCapacity) * 0.8,
      10
    )}%`;
    queueMini.style.opacity = String(Math.max(1 - depth * 0.2, 0.3));

    if (pendingAdditions.has(queue.path)) {
      queueMini.style.background = "#28a745";
    } else if (pendingChanges.has(queue.path)) {
      queueMini.style.background = "#ffc107";
    }

    minimap.appendChild(queueMini);

    getAllChildren(queue).forEach((child) => addToMinimap(child, depth + 1));
  }

  if (window.queueData) {
    addToMinimap(window.queueData);
  }
}

function canQueueBeDeleted(queuePath) {
  if (queuePath === "root") {
    return { canDelete: false, reason: "Cannot delete root queue." };
  }

  const queue = findQueueByPath(queuePath);
  if (!queue) {
    console.warn("canQueueBeDeleted: Queue not found for path", queuePath);
    return { canDelete: false, reason: "Queue not found." };
  }

  const activeExistingChildren = Object.values(queue.children).filter(
    (child) => !pendingDeletions.has(child.path)
  );

  const activeNewChildren = Array.from(pendingAdditions.values()).filter(
    (newQueue) =>
      newQueue.parentPath === queuePath && !pendingDeletions.has(newQueue.path)
  );

  if (activeExistingChildren.length > 0 || activeNewChildren.length > 0) {
    const activeChildrenNames = [
      ...activeExistingChildren,
      ...activeNewChildren,
    ]
      .map((c) => c.name)
      .join(", ");
    return {
      canDelete: false,
      reason: `Cannot delete: has active child queues (${activeChildrenNames}).`,
    };
  }

  return { canDelete: true, reason: "" };
}

window.renderQueueTree = renderQueueTree;
