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
  const queuePath = queue.path;

  const pendingChange = pendingChanges.get(queuePath) || {}; // Use empty object if no pending changes
  const isNewQueue = pendingAdditions.has(queuePath);
  const isToBeDeleted = pendingDeletions.has(queuePath);

  if (isNewQueue && !isToBeDeleted) { 
    card.classList.add("new-queue");
  } else if (isToBeDeleted) { 
    card.classList.add("to-be-deleted");
  } else if (Object.keys(pendingChange).length > 0) { // Check if pendingChange object is not empty
    card.classList.add("pending-changes");
  }

  card.setAttribute("data-queue-path", queuePath);
  card.setAttribute("data-level", level);

  const titleBar = document.createElement("div");
  titleBar.className = "queue-header";

  const nameEl = document.createElement("span");
  nameEl.className = "queue-name";
  nameEl.innerHTML = highlightMatch(queue.name, currentSearchTerm);
  nameEl.title = `${queuePath} (Click to edit)`;
  nameEl.onclick = (e) => {
    e.stopPropagation();
    openEditModal(findQueueByPath(queuePath)); 
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
    openInfoModal(findQueueByPath(queuePath)); 
  };

  const actionsMenu = document.createElement("span");
  actionsMenu.className = "queue-actions-menu";

  const deletionStatus = canQueueBeDeleted(queuePath); 
  let deleteButtonHTML = "";
  if (queuePath !== "root") {
      if (isToBeDeleted) {
          deleteButtonHTML = `<div class="dropdown-item disabled" title="Marked for deletion.">Marked for Deletion</div>`;
      } else {
          deleteButtonHTML = `<div class="dropdown-item ${deletionStatus.canDelete ? "" : "disabled"}" 
            onclick="${deletionStatus.canDelete ? `markQueueForDeletion('${queuePath}')` : ""}"
            title="${deletionStatus.canDelete ? "Delete this queue" : deletionStatus.reason}">
            Delete Queue
          </div>`; 
      }
  }

  actionsMenu.innerHTML = `
    <button class="queue-menu-btn" aria-label="Queue actions" tabindex="0" onclick="toggleQueueDropdown(event, '${queuePath}')">
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <circle cx="5" cy="12" r="2"/>
        <circle cx="12" cy="12" r="2"/>
        <circle cx="19" cy="12" r="2"/>
      </svg>
    </button>
    <div class="queue-dropdown" id="dropdown-${queuePath}">
      <div class="dropdown-item" onclick="openEditModal(findQueueByPath('${queuePath}'))">Edit Queue</div>
      <div class="dropdown-item" onclick="openAddQueueModalWithParent('${queuePath}')">Add Child Queue</div>
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
  // Pass the 'pendingChange' object, not just a boolean.
  labelArea.innerHTML = createQueueLabels(queue, pendingChange); 

  const capacitySection = document.createElement("div");
  capacitySection.className = "queue-capacity-section";

  // --- Determine effective values for capacity display ---
  // 1. Mode
  let effectiveDisplayMode = pendingChange['_ui_capacityMode'] !== undefined
      ? pendingChange['_ui_capacityMode']
      : (queue.capacityMode || (typeof detectCapacityMode === 'function' ? detectCapacityMode(queue.path) : 'percentage'));

  // 2. Capacity value (raw string)
  const capacityYarnPropName = `yarn.scheduler.capacity.${queuePath}.capacity`;
  let effectiveCapacityStr = pendingChange[capacityYarnPropName] !== undefined
      ? pendingChange[capacityYarnPropName]
      : (liveRawSchedulerConf && liveRawSchedulerConf.get(capacityYarnPropName) !== undefined
          ? liveRawSchedulerConf.get(capacityYarnPropName)
          // Fallback to queue object's direct capacity, ensuring it's a string formatted for the mode
          : (queue.capacity !== undefined 
              ? (effectiveDisplayMode === 'weight' ? (parseFloat(queue.capacity) || 0).toFixed(1) + 'w' : 
                (effectiveDisplayMode === 'percentage' ? (parseFloat(queue.capacity) || 0).toFixed(1) + '%' : String(queue.capacity)))
              : QUEUE_CONFIG_CATEGORIES.flatMap(cat => Object.entries(cat.properties)).find(([key, val]) => key.endsWith('.capacity'))?.[1].defaultValue || "0%"));

  // 3. Max Capacity value (raw string)
  const maxCapacityYarnPropName = `yarn.scheduler.capacity.${queuePath}.maximum-capacity`;
  let effectiveMaxCapacityStr = pendingChange[maxCapacityYarnPropName] !== undefined
      ? pendingChange[maxCapacityYarnPropName]
      : (liveRawSchedulerConf && liveRawSchedulerConf.get(maxCapacityYarnPropName) !== undefined
          ? liveRawSchedulerConf.get(maxCapacityYarnPropName)
          : (queue.maxCapacity !== undefined 
              ? (String(queue.maxCapacity).startsWith('[') ? String(queue.maxCapacity) : (parseFloat(queue.maxCapacity) || 100).toFixed(1) + '%')
              : QUEUE_CONFIG_CATEGORIES.flatMap(cat => Object.entries(cat.properties)).find(([key, val]) => key.endsWith('.maximum-capacity'))?.[1].defaultValue || "100%"));

  // Prepare for formatCapacityDisplay
  let numericWeightForFormat = null;
  if (effectiveDisplayMode === 'weight') {
      numericWeightForFormat = parseFloat(effectiveCapacityStr); // Numeric part of weight
  }
  
  const formattedDisplayCapacity = formatCapacityDisplay(effectiveCapacityStr, effectiveDisplayMode, numericWeightForFormat);

  capacitySection.innerHTML = createCapacityDisplay(
    formattedDisplayCapacity,
    effectiveMaxCapacityStr, // Pass the string, createCapacityDisplay will format if needed (e.g. for non-absolute max)
    effectiveDisplayMode 
  ); 

  card.appendChild(titleBar);
  card.appendChild(divider);
  card.appendChild(labelArea);
  card.appendChild(capacitySection);

  return card;
}

function createQueueLabels(queue, pendingChange) {
    const labels = [];
    const queuePath = queue.path;

    // Determine effective mode for display
    let effectiveMode = pendingChange && pendingChange['_ui_capacityMode'] !== undefined 
        ? pendingChange['_ui_capacityMode'] 
        : (queue.capacityMode || (typeof detectCapacityMode === 'function' ? detectCapacityMode(queue) : 'percentage'));

    // Determine effective state for display
    const statePropName = `yarn.scheduler.capacity.${queuePath}.state`;
    let effectiveState = pendingChange && pendingChange[statePropName] !== undefined 
        ? pendingChange[statePropName] 
        : (liveRawSchedulerConf && liveRawSchedulerConf.get(statePropName) !== undefined
            ? liveRawSchedulerConf.get(statePropName)
            : queue.state || 'RUNNING');


    const autoCreationEnabled = queue.autoCreateChildQueueEnabled === true ||
                              queue.autoCreationEligibility === "on" ||    
                              queue.autoCreationEligibility === "enabled"; 

    const modeIcons = { percentage: "📊", weight: "⚖️", absolute: "🎯", vector: "📐", flexible: "🔄" };
    const modeIcon = modeIcons[effectiveMode] || "📊";
    labels.push(`<span class="queue-tag tag-mode" title="Capacity Mode: ${effectiveMode}">${modeIcon} ${effectiveMode.charAt(0).toUpperCase() + effectiveMode.slice(1)}</span>`);

    if (effectiveState === "STOPPED") {
        labels.push(`<span class="queue-tag tag-state tag-stopped" title="Queue State: Stopped">🛑 Stopped</span>`);
    } else {
        labels.push(`<span class="queue-tag tag-state tag-running" title="Queue State: Running">▶️ Running</span>`);
    }

    if (autoCreationEnabled) {
        labels.push(`<span class="queue-tag tag-auto-create" title="Auto Queue Creation Enabled">⚡ Auto-Create</span>`);
    }
    return labels.join("");
}


function formatCapacityDisplay(capacity, mode, weightValue) { // weightValue is the numeric part for weight mode
  switch (mode) {
    case "percentage":
      return `${(parseFloat(capacity) || 0).toFixed(1)}%`;
    case "weight":
      // capacity here might be the full string like "2.0w" or just the numeric part.
      // weightValue is explicitly the numeric part.
      const numWeight = parseFloat(weightValue || capacity);
      return `${(isNaN(numWeight) ? 0 : numWeight).toFixed(1)}w`;
    case "absolute":
    case "vector":
      return capacity || "[not set]"; // Raw string
    default:
      return String(capacity || "0");
  }
}

function createCapacityDisplay(formattedCapacityStr, formattedMaxCapacityStr, mode) {
  const parseResources = (resStr) => { /* ... (same as your uploaded version) ... */ 
    if (!resStr || typeof resStr !== 'string') return null;
    let cleanStr = resStr.trim();
    if (cleanStr.startsWith("[") && cleanStr.endsWith("]")) {
      cleanStr = cleanStr.slice(1, -1);
    }
    if (!cleanStr) return null;

    return cleanStr.split(",").map(pair => {
      const [key, value] = pair.split("=").map(s => s.trim());
      return { key, value: value || "" };
    }).filter(item => item.key);
  };

  let html = '';
  if (mode === 'absolute' || mode === 'vector') {
      html += '<div class="absolute-capacity-display">';
      // Capacity
      html += '<div class="capacity-section"><div class="capacity-section-title">Capacity:</div>';
      const currentResources = parseResources(formattedCapacityStr);
      if (currentResources && currentResources.length > 0) {
          html += '<div class="resource-list">';
          currentResources.forEach(r => { html += `<div class="resource-item"><span class="resource-key">${r.key}:</span><span class="resource-value">${r.value}</span></div>`; });
          html += '</div>';
      } else {
          html += `<div class="resource-raw">${formattedCapacityStr || "N/A"}</div>`;
      }
      html += '</div>';

      // Max Capacity
      html += '<div class="capacity-section"><div class="capacity-section-title">Max Capacity:</div>';
      const maxResources = parseResources(formattedMaxCapacityStr);
      if (maxResources && maxResources.length > 0) {
          html += '<div class="resource-list">';
          maxResources.forEach(r => { html += `<div class="resource-item"><span class="resource-key">${r.key}:</span><span class="resource-value">${r.value}</span></div>`; });
          html += '</div>';
      } else { 
          const maxCapDisplay = (formattedMaxCapacityStr && !String(formattedMaxCapacityStr).startsWith("[")) 
                                ? `${(parseFloat(formattedMaxCapacityStr) || 0).toFixed(1)}%` // Assume % if not vector
                                : (formattedMaxCapacityStr || "N/A");
          html += `<div class="resource-raw">${maxCapDisplay}</div>`;
      }
      html += '</div></div>';
  } else { 
      html += '<div class="capacity-display">';
      html += `<div class="capacity-row"><span class="capacity-label">Capacity:</span><span class="capacity-value">${formattedCapacityStr || "N/A"}</span></div>`;
      if (formattedMaxCapacityStr !== undefined && formattedMaxCapacityStr !== null) { 
          // For non-absolute, max capacity is typically a percentage string
          let maxCapPercentStr = formattedMaxCapacityStr;
          if (!String(maxCapPercentStr).endsWith('%')) {
            maxCapPercentStr = `${(parseFloat(maxCapPercentStr) || 100).toFixed(1)}%`;
          }
          html += `<div class="capacity-row"><span class="capacity-label">Max Capacity:</span><span class="capacity-value">${maxCapPercentStr}</span></div>`;
      }
      html += '</div>';
  }
  return html;
}

function renderQueueTree() {
  if (!window.queueData) { 
    console.warn("renderQueueTree called but queueData is not available.");
    return;
  }
  // Ensure liveRawSchedulerConf is loaded if not already, for card display fallbacks
  if (liveRawSchedulerConf === null) {
      api.getSchedulerConf().then(rawConfData => { // Assuming api.getSchedulerConf is defined
          if (rawConfData && rawConfData.property) {
              liveRawSchedulerConf = new Map(rawConfData.property.map(p => [p.name, p.value]));
          } else {
              liveRawSchedulerConf = new Map();
          }
          proceedWithRendering();
      }).catch(() => {
          liveRawSchedulerConf = new Map(); // Ensure it's a map on error
          showError("Could not fetch scheduler-conf for card display. Some values might be incorrect.");
          proceedWithRendering();
      });
  } else {
      proceedWithRendering();
  }

  function proceedWithRendering() {
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
}

// canQueueBeDeleted function ... (remains as per your uploaded version or the corrected one)
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
    child => !pendingDeletions.has(child.path)
  );

  const activeNewChildren = Array.from(pendingAdditions.values()).filter(
    newQueue => newQueue.parentPath === queuePath && !pendingDeletions.has(newQueue.path)
  );
  
  if (activeExistingChildren.length > 0 || activeNewChildren.length > 0) {
      const activeChildrenNames = [...activeExistingChildren, ...activeNewChildren].map(c => c.name).join(", ");
      return { canDelete: false, reason: `Cannot delete: has active child queues (${activeChildrenNames}).` };
  }

  return { canDelete: true, reason: "" };
}

window.renderQueueTree = renderQueueTree;
window.canQueueBeDeleted
