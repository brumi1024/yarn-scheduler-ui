// Notification system
function showLoading(message = "Loading...") {
  const loadingContainer = document.getElementById("loading-container");
  const loadingText = document.getElementById("loading-text");
  const content = document.getElementById("content");

  if (loadingText) {
    loadingText.textContent = message;
  }

  // Show loading, hide content
  if (loadingContainer) loadingContainer.style.display = "flex";
  if (content) content.style.display = "none";
}

function hideLoading() {
  const loadingContainer = document.getElementById("loading-container");
  if (loadingContainer) {
    loadingContainer.style.display = "none";
  }
}

function showContent(show = true) {
  const content = document.getElementById("content");
  const loadingContainer = document.getElementById("loading-container");

  if (show) {
    if (content) content.style.display = "block";
    if (loadingContainer) loadingContainer.style.display = "none";
  } else {
    if (content) content.style.display = "none";
  }
}

function showError(message, duration = 8000) {
  // Hide loading first
  hideLoading();

  if (0 < pendingChanges.size()) {
    showContent(true);
  }

  if (typeof showNotification === "function") {
    return showNotification(message, "error", duration);
  }
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

let loadingNotification = null;

function showNotification(message, type = "info", duration = 5000) {
  const container = createNotificationContainer();

  const notification = document.createElement("div");
  notification.className = `notification ${type}`;

  const icons = {
    success: "✅",
    error: "❌",
    warning: "⚠️",
    info: "ℹ️",
    loading: '<div class="loading-spinner"></div>',
  };

  notification.innerHTML = `
        <span class="notification-icon">${icons[type] || icons.info}</span>
        <div class="notification-content">${message}</div>
        ${
          type !== "loading"
            ? '<button class="notification-close" onclick="dismissNotification(this)">×</button>'
            : ""
        }
    `;

  container.appendChild(notification);

  // Auto-dismiss after duration (except for loading notifications)
  if (duration > 0 && type !== "loading") {
    setTimeout(() => {
      dismissNotification(notification.querySelector(".notification-close"));
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

function showSuccess(message, duration = 5000) {
  return showNotification(message, "success", duration);
}

function showWarning(message, duration = 6000) {
  return showNotification(message, "warning", duration);
}

function showInfo(message, duration = 5000) {
  return showNotification(message, "info", duration);
}

// Display Batch edit controls
function updateBatchControls() {
  const batchControls = document.getElementById("batch-controls");
  const batchInfo = document.getElementById("batch-info");
  const batchValidation = document.getElementById("batch-validation");
  const applyBtn = document.getElementById("apply-changes-btn");

  if (0 < pendingChanges.size()) {
    batchControls.classList.add("show");

    let infoText = [];
    if (0 < pendingChanges.count(UPDATE))
      infoText.push(`${pendingChanges.count(UPDATE)} modified`);
    if (0 < pendingChanges.count(ADD))
      infoText.push(`${pendingChanges.count(ADD)} added`);
    if (0 < pendingChanges.count(DELETE))
      infoText.push(`${pendingChanges.count(DELETE)} deleted`);

    batchInfo.textContent = infoText.join(", ");

    const errors = validatePendingChanges();
    if (errors.length === 0) {
      batchValidation.textContent = "All changes valid ✓ (Mixed modes allowed)";
      batchValidation.className = "batch-validation valid";
      applyBtn.disabled = false;
    } else {
      const errorText = errors.map((e) => e.message || e.error).join(", ");
      batchValidation.textContent = `Validation errors: ${errorText}`;
      batchValidation.className = "batch-validation";
      applyBtn.disabled = true;
    }
  } else {
    batchControls.classList.remove("show");
  }
}

// Partition management
function extractPartitions(schedulerInfo) {
  const partitions = new Set([""]); // Default partition

  function extractFromQueue(queueInfo) {
    if (queueInfo.nodeLabels) {
      queueInfo.nodeLabels.forEach((label) => {
        if (label && label !== "*") {
          partitions.add(label);
        }
      });
    }

    if (queueInfo.queues && queueInfo.queues.queue) {
      const childQueues = Array.isArray(queueInfo.queues.queue)
        ? queueInfo.queues.queue
        : [queueInfo.queues.queue];

      childQueues.forEach((childQueue) => {
        extractFromQueue(childQueue);
      });
    }
  }

  extractFromQueue(schedulerInfo);
  availablePartitions = Array.from(partitions);
}

function populatePartitionSelector() {
  const partitionSelect = document.getElementById("partition-select");
  partitionSelect.innerHTML = "";

  availablePartitions.forEach((partition) => {
    const option = document.createElement("option");
    option.value = partition;
    option.textContent = partition || "default";
    partitionSelect.appendChild(option);
  });
}

// Sort and Search functionality
function searchQueues(searchTerm) {
  currentSearchTerm = searchTerm.toLowerCase();
  renderQueueTree();
}

function executeSorting(sortValue) {
  currentSort = sortValue;
  renderQueueTree();
}

function initializeEventHandlers() {
  document
    .getElementById("search-input")
    .addEventListener("input", function (e) {
      searchQueues(e.target.value);
    });

  document
    .getElementById("sort-select")
    .addEventListener("change", function (e) {
      executeSorting(e.target.value);
    });
  // Close modals when clicking outside
  document.getElementById("edit-modal").addEventListener("click", function (e) {
    if (e.target === this) {
      closeModal();
    }
  });

  document
    .getElementById("add-queue-modal")
    .addEventListener("click", function (e) {
      if (e.target === this) {
        closeAddQueueModal();
      }
    });

  // Close dropdowns when clicking outside
  document.addEventListener("click", () => {
    document.querySelectorAll(".queue-dropdown").forEach((dropdown) => {
      dropdown.classList.remove("show");
    });
  });
}

function toggleQueueDropdown(event, queuePath) {
  event.stopPropagation();

  // Close all other dropdowns first
  document.querySelectorAll(".queue-dropdown").forEach((dropdown) => {
    if (dropdown.id !== `dropdown-${queuePath}`) {
      dropdown.classList.remove("show");
    }
  });

  // Toggle current dropdown
  const dropdown = document.getElementById(`dropdown-${queuePath}`);
  if (dropdown) {
    dropdown.classList.toggle("show");
  }
}

window.showNotification = showNotification;
window.showSuccess = showSuccess;
window.showError = showError;
window.showWarning = showWarning;
window.showInfo = showInfo;
window.dismissNotification = dismissNotification;
window.initializeEventHandlers = initializeEventHandlers;
window.toggleQueueDropdown = toggleQueueDropdown;
