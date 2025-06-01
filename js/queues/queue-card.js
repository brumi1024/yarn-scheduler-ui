window.createQueueCard = (queue, level) => {
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
  } else if (Object.keys(pendingChange).length > 0) {
    // Check if pendingChange object is not empty
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
      deleteButtonHTML = `<div class="dropdown-item ${
        deletionStatus.canDelete ? "" : "disabled"
      }" 
            onclick="${
              deletionStatus.canDelete
                ? `markQueueForDeletion('${queuePath}')`
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
  let effectiveDisplayMode =
    pendingChange["_ui_capacityMode"] !== undefined
      ? pendingChange["_ui_capacityMode"]
      : queue.capacityMode ||
        (typeof detectCapacityMode === "function"
          ? detectCapacityMode(queue)
          : "percentage");

  // 2. Capacity value (raw string)
  const capacityYarnPropName = `yarn.scheduler.capacity.${queuePath}.capacity`; // Used for pendingChanges lookup
  let baseCapacityStr = queue.properties.get("capacity"); // Primary source from Trie

  if (baseCapacityStr === undefined) {
    // Fallback to default from metadata if property was missing entirely in SCHEDULER_CONF
    const capacityMetadata = QUEUE_CONFIG_CATEGORIES.flatMap((cat) =>
      Object.entries(cat.properties)
    ).find(([key, val]) =>
      key.endsWith(
        `.${Q_PATH_PLACEHOLDER}.capacity`
          .replace(Q_PATH_PLACEHOLDER, "###PLACEHOLDER###")
          .split(".")
          .pop()
      )
    ); // Find by simple prop name 'capacity'
    baseCapacityStr = capacityMetadata
      ? capacityMetadata[1].defaultValue
      : "0%";
  }

  // Ensure baseCapacityStr format matches the effectiveDisplayMode for consistent processing later
  // (e.g., if mode is '%', ensure string ends with '%', if 'w', ends with 'w')
  // This step is crucial if queue.properties.get('capacity') stores the raw value without mode-specific suffixes
  // and your formatCapacityDisplay expects them OR if you want to re-format if mode changed.
  if (
    effectiveDisplayMode === "percentage" &&
    !String(baseCapacityStr).endsWith("%") &&
    !String(baseCapacityStr).endsWith("w") &&
    !String(baseCapacityStr).startsWith("[")
  ) {
    baseCapacityStr = (parseFloat(baseCapacityStr) || 0).toFixed(1) + "%";
  } else if (
    effectiveDisplayMode === "weight" &&
    !String(baseCapacityStr).endsWith("w") &&
    !String(baseCapacityStr).endsWith("%") &&
    !String(baseCapacityStr).startsWith("[")
  ) {
    baseCapacityStr = (parseFloat(baseCapacityStr) || 0).toFixed(1) + "w";
  } else if (
    effectiveDisplayMode === "absolute" &&
    !String(baseCapacityStr).startsWith("[")
  ) {
    // If mode is absolute but value isn't bracketed, use a default or try to adapt
    // This might indicate an inconsistent state if mode was changed by user.
    baseCapacityStr = "[memory=1024,vcores=1]"; // Default absolute value
  }

  let effectiveCapacityStr =
    pendingChange[capacityYarnPropName] !== undefined
      ? pendingChange[capacityYarnPropName] // Use pending change if it exists
      : baseCapacityStr; // Otherwise, use base from queue.properties

  // 3. Max Capacity value (raw string from SCHEDULER_CONF via Trie)
  const maxCapacityYarnPropName = `yarn.scheduler.capacity.${queuePath}.maximum-capacity`;
  let baseMaxCapacityStr = queue.properties.get("maximum-capacity"); // Primary source

  if (baseMaxCapacityStr === undefined) {
    const maxCapacityMetadata = QUEUE_CONFIG_CATEGORIES.flatMap((cat) =>
      Object.entries(cat.properties)
    ).find(([key, val]) =>
      key.endsWith(
        `.${Q_PATH_PLACEHOLDER}.maximum-capacity`
          .replace(Q_PATH_PLACEHOLDER, "###PLACEHOLDER###")
          .split(".")
          .pop()
      )
    );
    baseMaxCapacityStr = maxCapacityMetadata
      ? maxCapacityMetadata[1].defaultValue
      : "100%";
  }
  // Ensure baseMaxCapacityStr format (typically percentage or absolute for max capacity)
  if (
    !String(baseMaxCapacityStr).startsWith("[") &&
    !String(baseMaxCapacityStr).endsWith("%")
  ) {
    baseMaxCapacityStr =
      (parseFloat(baseMaxCapacityStr) || 100).toFixed(1) + "%";
  }

  let effectiveMaxCapacityStr =
    pendingChange[maxCapacityYarnPropName] !== undefined
      ? pendingChange[maxCapacityYarnPropName]
      : baseMaxCapacityStr;

  // Prepare for formatCapacityDisplay
  let numericWeightForFormat = null;
  if (effectiveDisplayMode === "weight") {
    numericWeightForFormat = parseFloat(effectiveCapacityStr); // Numeric part of weight
  }

  const formattedDisplayCapacity = formatCapacityDisplay(
    effectiveCapacityStr,
    effectiveDisplayMode,
    numericWeightForFormat
  );

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
};

function highlightMatch(text, searchTerm) {
  if (!searchTerm || !text) return text || "";
  const safeTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(safeTerm, "ig");
  return text.replace(re, (match) => `<mark>${match}</mark>`);
}

function createQueueLabels(queue, pendingChange) {
  const labels = [];
  const queuePath = queue.path;

  // Determine effective mode for display
  let effectiveMode =
    pendingChange && pendingChange["_ui_capacityMode"] !== undefined
      ? pendingChange["_ui_capacityMode"]
      : queue.capacityMode ||
        (typeof detectCapacityMode === "function"
          ? detectCapacityMode(queue)
          : "percentage");

  // Determine effective state for display
  const statePropName = `yarn.scheduler.capacity.${queuePath}.state`;
  let effectiveState =
    pendingChange && pendingChange[statePropName] !== undefined
      ? pendingChange[statePropName]
      : liveRawSchedulerConf &&
        liveRawSchedulerConf.get(statePropName) !== undefined
      ? liveRawSchedulerConf.get(statePropName)
      : queue.state || "RUNNING";

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
  const modeIcon = modeIcons[effectiveMode] || "📊";
  labels.push(
    `<span class="queue-tag tag-mode" title="Capacity Mode: ${effectiveMode}">${modeIcon} ${
      effectiveMode.charAt(0).toUpperCase() + effectiveMode.slice(1)
    }</span>`
  );

  if (effectiveState === "STOPPED") {
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

function formatCapacityDisplay(capacity, mode, weightValue) {
  // weightValue is the numeric part for weight mode
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

function createCapacityDisplay(
  formattedCapacityStr,
  formattedMaxCapacityStr,
  mode
) {
  const parseResources = (resStr) => {
    /* ... (same as your uploaded version) ... */
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
    // Capacity
    html +=
      '<div class="capacity-section"><div class="capacity-section-title">Capacity:</div>';
    const currentResources = parseResources(formattedCapacityStr);
    if (currentResources && currentResources.length > 0) {
      html += '<div class="resource-list">';
      currentResources.forEach((r) => {
        html += `<div class="resource-item"><span class="resource-key">${r.key}:</span><span class="resource-value">${r.value}</span></div>`;
      });
      html += "</div>";
    } else {
      html += `<div class="resource-raw">${
        formattedCapacityStr || "N/A"
      }</div>`;
    }
    html += "</div>";

    // Max Capacity
    html +=
      '<div class="capacity-section"><div class="capacity-section-title">Max Capacity:</div>';
    const maxResources = parseResources(formattedMaxCapacityStr);
    if (maxResources && maxResources.length > 0) {
      html += '<div class="resource-list">';
      maxResources.forEach((r) => {
        html += `<div class="resource-item"><span class="resource-key">${r.key}:</span><span class="resource-value">${r.value}</span></div>`;
      });
      html += "</div>";
    } else {
      const maxCapDisplay =
        formattedMaxCapacityStr &&
        !String(formattedMaxCapacityStr).startsWith("[")
          ? `${(parseFloat(formattedMaxCapacityStr) || 0).toFixed(1)}%` // Assume % if not vector
          : formattedMaxCapacityStr || "N/A";
      html += `<div class="resource-raw">${maxCapDisplay}</div>`;
    }
    html += "</div></div>";
  } else {
    html += '<div class="capacity-display">';
    html += `<div class="capacity-row"><span class="capacity-label">Capacity:</span><span class="capacity-value">${
      formattedCapacityStr || "N/A"
    }</span></div>`;
    if (
      formattedMaxCapacityStr !== undefined &&
      formattedMaxCapacityStr !== null
    ) {
      // For non-absolute, max capacity is typically a percentage string
      let maxCapPercentStr = formattedMaxCapacityStr;
      if (!String(maxCapPercentStr).endsWith("%")) {
        maxCapPercentStr = `${(parseFloat(maxCapPercentStr) || 100).toFixed(
          1
        )}%`;
      }
      html += `<div class="capacity-row"><span class="capacity-label">Max Capacity:</span><span class="capacity-value">${maxCapPercentStr}</span></div>`;
    }
    html += "</div>";
  }
  return html;
}
