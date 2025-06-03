// Frequently accessed DOM elements
const loadingContainerEl = document.getElementById("loading-container");
const loadingTextEl = document.getElementById("loading-text");
const contentEl = document.getElementById("content");
const batchControlsEl = document.getElementById("batch-controls");
const batchInfoEl = document.getElementById("batch-info");
const batchValidationEl = document.getElementById("batch-validation");
const applyChangesBtnEl = document.getElementById("apply-changes-btn");
const partitionSelectEl = document.getElementById("partition-select");
const searchInputEl = document.getElementById("search-input");
const sortSelectEl = document.getElementById("sort-select");
const editModalEl = document.getElementById("edit-modal");
const addQueueModalEl = document.getElementById("add-queue-modal");
const infoModalEl = document.getElementById("info-modal");

// Notification system
const NOTIFICATION_ICONS = {
  success: "✅",
  error: "❌",
  warning: "⚠️",
  info: "ℹ️",
  loading: '<div class="loading-spinner"></div>',
};

function showLoading(message = "Loading...") {
  if (loadingTextEl) loadingTextEl.textContent = message;
  if (loadingContainerEl) loadingContainerEl.style.display = "flex";
  if (contentEl) contentEl.style.display = "none";
}

function hideLoading() {
  if (loadingContainerEl) loadingContainerEl.style.display = "none";
}

function showContent(show = true) {
  if (show) {
    if (contentEl) contentEl.style.display = "block";
    if (loadingContainerEl) loadingContainerEl.style.display = "none";
  } else {
    if (contentEl) contentEl.style.display = "none";
  }
}

function showError(message, duration = 8000) {
  return showNotification(message, "error", duration);
}

function showSuccess(message, duration = 5000) {
  return showNotification(message, "success", duration);
}

function showWarning(message, duration = 6000) {
  return showNotification(message, "warning", duration);
}

function showInfo(message, duration = 5000) {
  return showNotification(message, "info", duration);
}

function createNotificationContainer() {
  let container = document.getElementById("notification-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "notification-container";
    container.className = "notification-container";
    document.body.appendChild(container);
  }
  return container;
}

/**
 * Displays a notification on the screen with a specified message, type, and duration.
 *
 * @param {string} message - The message to display in the notification.
 * @param {string} [type="info"] - The type of notification (e.g., "info", "success", "error", "warning", "loading"). Defaults to "info".
 * @param {number} [duration=5000] - The duration in milliseconds for which the notification will be visible. Use 0 for indefinite display. Defaults to 5000.
 * @return {HTMLElement} The notification element that was created and added to the DOM.
 */
function showNotification(message, type = "info", duration = 5000) {
  const container = createNotificationContainer();
  const notification = document.createElement("div");
  notification.className = `notification ${type}`;

  notification.innerHTML = `
        <span class="notification-icon">${NOTIFICATION_ICONS[type] || NOTIFICATION_ICONS.info}</span>
        <div class="notification-content">${message}</div>
        ${
      type !== "loading"
          ? '<button class="notification-close" onclick="dismissNotification(this)">×</button>'
          : ""
  }
    `;

  container.appendChild(notification);

  if (duration > 0 && type !== "loading") {
    setTimeout(() => {
      dismissNotificationElement(notification);
    }, duration);
  }
  return notification;
}

function dismissNotification(button) {
  const notification = button.closest(".notification");
  dismissNotificationElement(notification);
}

function dismissNotificationElement(notification) {
  if (notification) {
    notification.style.animation = "slideOut 0.3s ease-in";
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }
}

/**
 * Updates the visibility and content of batch controls based on the current state of the queue configuration.
 * It calculates the changes (added, modified, deleted), validates the pending changes,
 * updates the batch information messages, and enables or disables the "Apply Changes" button accordingly.
 * If there are no changes or the queue configuration tab is not active, the batch controls are hidden.
 *
 * @return {void} Does not return a value. Executes DOM manipulations and updates state directly.
 */
function updateBatchControls() {
  if (!queueStateStore || !batchControlsEl || !batchInfoEl || !batchValidationEl || !applyChangesBtnEl) {
    if (batchControlsEl) batchControlsEl.classList.remove("show");
    return;
  }

  const modifiedCount = queueStateStore.countUpdate();
  const addedCount = queueStateStore.countAdd();
  const deletedCount = queueStateStore.countDelete();
  const changeCount = modifiedCount + addedCount + deletedCount;

  const activeTab = document.querySelector('.nav-tab.active');
  const isQueueConfigTabActive = activeTab && activeTab.getAttribute('data-tab') === 'queue-config-content';

  if (changeCount > 0 && isQueueConfigTabActive) {
    batchControlsEl.classList.add("show");
    batchControlsEl.style.display = 'flex';

    let infoText = [];
    if (modifiedCount > 0) infoText.push(`${modifiedCount} modified`);
    if (addedCount > 0) infoText.push(`${addedCount} added`);
    if (deletedCount > 0) infoText.push(`${deletedCount} deleted`);
    batchInfoEl.textContent = infoText.length > 0 ? infoText.join(", ") : "No changes";

    const errors = validatePendingChanges();

    if (errors.length === 0) {
      batchValidationEl.textContent = "All changes valid ✓";
      batchValidationEl.className = "batch-validation valid";
      applyChangesBtnEl.disabled = false;
    } else {
      const errorText = errors.map(e => e.message || e.error || String(e)).join(", ");
      batchValidationEl.textContent = `Validation errors: ${errorText}`;
      batchValidationEl.className = "batch-validation";
      applyChangesBtnEl.disabled = true;
    }
  } else {
    batchControlsEl.classList.remove("show");
  }
}

/**
 * Extracts unique partitions from the given scheduler information and updates the available partitions.
 *
 * @param {Object} schedulerInfo - An object representing scheduler information,
 * which may contain queue and node label details.
 * @return {void} This function does not return a value but updates the available
 * partitions based on the provided scheduler information.
 */
function extractPartitions(schedulerInfo) {
  const partitions = new Set([""]);
  function extractFromQueue(queueInfo) {
    if (queueInfo.nodeLabels) {
      queueInfo.nodeLabels.forEach((label) => {
        if (label && label !== "*") partitions.add(label);
      });
    }
    if (queueInfo.queues && queueInfo.queues.queue) {
      const childQueues = Array.isArray(queueInfo.queues.queue)
          ? queueInfo.queues.queue
          : [queueInfo.queues.queue];
      childQueues.forEach(extractFromQueue);
    }
  }
  extractFromQueue(schedulerInfo);
  availablePartitions = Array.from(partitions);
}

/**
 * Populates the partition selector element with available partitions.
 * Clears any existing options and adds new options based on the `availablePartitions` array.
 * If a partition has no value, it defaults to "default" as the display text.
 *
 * @return {void} Does not return a value.
 */
function populatePartitionSelector() {
  if (!partitionSelectEl) return;
  partitionSelectEl.innerHTML = "";
  availablePartitions.forEach((partition) => {
    const option = document.createElement("option");
    option.value = partition;
    option.textContent = partition || "default";
    partitionSelectEl.appendChild(option);
  });
}

function searchQueues(searchTerm) {
  currentSearchTerm = searchTerm.toLowerCase();
  renderQueueTree();
}

function executeSorting(sortValue) {
  currentSort = sortValue; // currentSort is global
  renderQueueTree();
}

/**
 * Initializes event handlers for various elements and application-level events.
 * This function sets up event listeners for input changes, modal interactions, sorting,
 * and other user actions, ensuring the application responds appropriately.
 *
 * @return {void} This function does not return a value.
 */
function initializeEventHandlers() {
  if (searchInputEl) {
    searchInputEl.addEventListener("input", (e) => searchQueues(e.target.value));
  }
  if (sortSelectEl) {
    sortSelectEl.addEventListener("change", (e) => executeSorting(e.target.value));
  }
  if (editModalEl && typeof closeEditModal === 'function') {
    editModalEl.addEventListener("click", (e) => { if (e.target === editModalEl) closeEditModal(); });
  }
  if (addQueueModalEl && typeof closeAddQueueModal === 'function') {
    addQueueModalEl.addEventListener("click", (e) => { if (e.target === addQueueModalEl) closeAddQueueModal(); });
  }
  if (infoModalEl && typeof closeInfoModal === 'function') {
    infoModalEl.addEventListener("click", (e) => { if (e.target === infoModalEl) closeInfoModal(); });
  }

  document.addEventListener("click", (event) => {
    if (!event.target.closest('.queue-menu-btn') && !event.target.closest('.queue-dropdown')) {
      document.querySelectorAll(".queue-dropdown.show").forEach((dropdown) => {
        dropdown.classList.remove("show");
      });
    }
  });
}

/**
 * Toggles the visibility of a specific queue dropdown menu while hiding others.
 *
 * @param {Event} event - The event object triggered by the user interaction.
 * @param {string} queuePath - The identifier for the specific dropdown to toggle.
 * @return {void} This function does not return a value.
 */
function toggleQueueDropdown(event, queuePath) {
  event.stopPropagation();
  document.querySelectorAll(".queue-dropdown").forEach((dropdown) => {
    if (dropdown.id !== `dropdown-${queuePath}`) {
      dropdown.classList.remove("show");
    }
  });
  const dropdown = document.getElementById(`dropdown-${queuePath}`);
  if (dropdown) dropdown.classList.toggle("show");
}

/**
 * Refreshes queue data by reloading and re-rendering the scheduler configuration.
 * This method provides user feedback through loading, success, or error messages
 * depending on the execution outcome.
 *
 * @return {Promise<void>} A promise that resolves when the queue data refresh is complete.
 */
async function refreshQueues() {
  if (typeof showLoading === 'function') showLoading('Refreshing queue data...');
  try {
    await api.loadSchedulerConfiguration();
    showSuccess('Queue data refreshed.');
  } catch (e) {
    showError('Failed to refresh queue data: ' + e.message);
  } finally {
    hideLoading();
  }
}
window.refreshQueues = refreshQueues;

// Expose to global scope
window.showNotification = showNotification;
window.showSuccess = showSuccess;
window.showError = showError;
window.showWarning = showWarning;
window.showInfo = showInfo;
window.dismissNotification = dismissNotification;
window.updateBatchControls = updateBatchControls;
window.extractPartitions = extractPartitions;
window.populatePartitionSelector = populatePartitionSelector;
window.initializeEventHandlers = initializeEventHandlers;
window.toggleQueueDropdown = toggleQueueDropdown;