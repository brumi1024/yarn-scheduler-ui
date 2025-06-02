/**
 * Creates a DOM element representing a queue card.
 * @param {Object} formattedQueue - The fully formatted queue object from QueueViewDataFormatter.
 * @returns {HTMLElement} The queue card element.
 */
window.createQueueCard = (formattedQueue) => {
  if (!formattedQueue) {
    console.warn("createQueueCard: formattedQueue data is missing.");
    const errorDiv = document.createElement("div");
    errorDiv.textContent = "Error: Queue data unavailable.";
    errorDiv.className = "queue-card-error"; // Add a class for styling error messages
    return errorDiv;
  }

  const card = document.createElement("div");
  card.className = "queue-card";
  if (formattedQueue.statusClass) {
    card.classList.add(formattedQueue.statusClass);
  }

  card.setAttribute("data-queue-path", formattedQueue.path);
  card.setAttribute("data-level", formattedQueue.level);

  // Title Bar (Name, Info Button, Actions Menu)
  const titleBar = document.createElement("div");
  titleBar.className = "queue-header";

  const nameEl = document.createElement("span");
  nameEl.className = "queue-name";
  nameEl.innerHTML = highlightMatch(formattedQueue.displayName, window.currentSearchTerm || '');
  nameEl.title = formattedQueue.displayNameTitle; // e.g., "root.default (Click to edit)"
  nameEl.onclick = (e) => {
    e.stopPropagation();
    // openEditModal will now fetch its own formatted data using the path,
    // or could be passed the formattedQueue if an edit doesn't require re-fetching.
    if (typeof openEditModal === 'function') openEditModal(formattedQueue.path);
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
    if (typeof openInfoModal === 'function') openInfoModal(formattedQueue.path);
  };

  const actionsMenu = document.createElement("span");
  actionsMenu.className = "queue-actions-menu";
  let deleteButtonHTML = "";

  if (!formattedQueue.isRoot) {
    const actionFunc = formattedQueue.isDeleted ? `undoMarkQueueForDeletion('${formattedQueue.path}')` :
        (formattedQueue.canBeDeletedForDropdown ? `markQueueForDeletion('${formattedQueue.path}')` : "");
    const disabledClass = !formattedQueue.isDeleted && !formattedQueue.canBeDeletedForDropdown ? "disabled" : "";

    if (formattedQueue.isDeleted) {
      deleteButtonHTML = `<div class="dropdown-item" 
                onclick="undoMarkQueueForDeletion('${formattedQueue.path}')">
                Undo Delete
              </div>`;
    } else {
      deleteButtonHTML = `<div class="dropdown-item ${formattedQueue.canBeDeletedForDropdown ? "" : "disabled"}" 
                onclick="${formattedQueue.canBeDeletedForDropdown ? `markQueueForDeletion('${formattedQueue.path}')` : ""}"
                title="${formattedQueue.canBeDeletedForDropdown ? "Delete this queue" : formattedQueue.deletionReason}">
                Delete Queue
              </div>`;
    }
  }

  actionsMenu.innerHTML = `
        <button class="queue-menu-btn" aria-label="Queue actions" tabindex="0" onclick="toggleQueueDropdown(event, '${formattedQueue.path}')">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>
          </svg>
        </button>
        <div class="queue-dropdown" id="dropdown-${formattedQueue.path}">
          <div class="dropdown-item" onclick="if(typeof openEditModal === 'function') openEditModal('${formattedQueue.path}')">Edit Queue</div>
          <div class="dropdown-item" onclick="if(typeof openAddQueueModalWithParent === 'function') openAddQueueModalWithParent('${formattedQueue.path}')">Add Child Queue</div>
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
  if (formattedQueue.uiLabels && formattedQueue.uiLabels.length > 0) {
    labelArea.innerHTML = formattedQueue.uiLabels.map(label =>
        `<span class="${label.cssClass}" title="${label.title || ''}">${label.text}</span>`
    ).join("");
  } else {
    labelArea.innerHTML = ""; // No labels
    // Ensure consistent spacing even with no labels (from original CSS)
    labelArea.style.minHeight = "24px";
  }

  const capacitySection = document.createElement("div");
  capacitySection.className = "queue-capacity-section";
  capacitySection.innerHTML = createCapacityDisplayHTML(formattedQueue);

  card.appendChild(titleBar);
  card.appendChild(divider);
  card.appendChild(labelArea);
  card.appendChild(capacitySection);

  return card;
};

/**
 * Creates the HTML for displaying queue capacity information.
 * @param {Object} formattedQueue - The formatted queue object.
 * @returns {string} HTML string for the capacity display.
 */
function createCapacityDisplayHTML(formattedQueue) {
  let html = "";
  const mode = formattedQueue.effectiveCapacityMode;

  if (mode === "absolute" || mode === "vector") {
    html += '<div class="absolute-capacity-display">';
    // Current Capacity
    html += '<div class="capacity-section"><div class="capacity-section-title">Capacity:</div>';
    if (formattedQueue.capacityDetails && formattedQueue.capacityDetails.length > 0) {
      html += '<div class="resource-list">';
      formattedQueue.capacityDetails.forEach(r => {
        html += `<div class="resource-item"><span class="resource-key">${r.key}:</span><span class="resource-value">${r.value}${r.unit || ''}</span></div>`;
      });
      html += "</div>";
    } else {
      html += `<div class="resource-raw">${formattedQueue.capacityDisplay || "N/A"}</div>`;
    }
    html += "</div>";

    // Max Capacity
    html += '<div class="capacity-section"><div class="capacity-section-title">Max Capacity:</div>';
    if (formattedQueue.maxCapacityDetails && formattedQueue.maxCapacityDetails.length > 0) {
      html += '<div class="resource-list">';
      formattedQueue.maxCapacityDetails.forEach(r => {
        html += `<div class="resource-item"><span class="resource-key">${r.key}:</span><span class="resource-value">${r.value}${r.unit || ''}</span></div>`;
      });
      html += "</div>";
    } else {
      // Fallback for max capacity if details are not available but display string is
      html += `<div class="resource-raw">${formattedQueue.maxCapacityDisplay || "N/A"}</div>`;
    }
    html += "</div></div>";
  } else { // Percentage or Weight mode
    html += '<div class="capacity-display">';
    html += `<div class="capacity-row"><span class="capacity-label">Capacity:</span><span class="capacity-value">${formattedQueue.capacityDisplay || "N/A"}</span></div>`;
    if (formattedQueue.maxCapacityDisplay !== undefined && formattedQueue.maxCapacityDisplay !== null) {
      html += `<div class="capacity-row"><span class="capacity-label">Max Capacity:</span><span class="capacity-value">${formattedQueue.maxCapacityDisplay}</span></div>`;
    }
    html += "</div>";
  }
  return html;
}

/**
 * Highlights search term occurrences in a given text.
 * @param {string} text - The text to highlight within.
 * @param {string} searchTerm - The term to highlight.
 * @returns {string} Text with matches wrapped in <mark> tags.
 */
function highlightMatch(text, searchTerm) {
  if (!searchTerm || !text) return text || "";
  // Escape special characters in searchTerm for regex
  const safeTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(safeTerm, "ig"); // 'i' for case-insensitive, 'g' for global
  return text.replace(re, (match) => `<mark>${match}</mark>`);
}

// Make functions globally available if they are called from HTML (onclick attributes)
// or from other scripts not using ES6 modules.
window.highlightMatch = highlightMatch;
// toggleQueueDropdown is usually in ui-components.js
// markQueueForDeletion, openEditModal, openInfoModal, openAddQueueModalWithParent are in modal files or queue-actions.js