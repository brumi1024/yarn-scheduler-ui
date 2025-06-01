function markQueueForDeletion(queuePath) {
  if (queuePath === "root") {
    if (typeof showWarning === "function") showWarning("Cannot delete root queue.");
    return;
  }
  const queue = findQueueByPath(queuePath); // Assumes findQueueByPath is globally available
  if (!queue) {
    if (typeof showError === "function") showError("Queue not found, cannot mark for deletion.");
    return;
  }

  // canQueueBeDeleted is from queue-renderer.js
  const deletionStatus = (typeof canQueueBeDeleted === 'function') ? canQueueBeDeleted(queuePath) : { canDelete: true }; 
  if (!deletionStatus.canDelete) {
    if (typeof showWarning === "function") showWarning(deletionStatus.reason || "This queue cannot be deleted.");
    return;
  }
  
  if (!confirm(`Are you sure you want to mark queue "${queue.name}" (${queuePath}) for deletion? This will also remove any staged additions or changes for this queue.`)) {
    return;
  }

  if (queueStateStore.isStateAdd(queuePath)) {
      queueStateStore.deleteChange(queuePath);
      showSuccess(`New queue "${queue.name}" removed from staging.`);
  } else {
      queueStateStore.doDelete(queuePath);
      showSuccess(`Queue "${queue.name}" marked for deletion.`);
  }

  renderQueueTree();
  updateBatchControls();
}

async function applyAllChanges() {
    const validationErrors = (typeof validatePendingChanges === 'function') ? validatePendingChanges() : [];
    if (validationErrors.length > 0) {
        if (typeof showWarning === "function") showWarning(`Cannot apply changes: ${validationErrors.map(e => e.message || e).join(", ")}`);
        return;
    }

    if (!queueStateStore) {
        showError("Error: QueueStateStore not available to apply changes.");
        return;
    }

    // Get staged changes from QueueStateStore
    const deletions = queueStateStore.getStagedDeletions();
    const additions = queueStateStore.getStagedAdditionsForApi();
    const updates = queueStateStore.getStagedUpdatesForApi();

    if (deletions.length === 0 && additions.length === 0 && updates.length === 0) {
        if (typeof showInfo === "function") showInfo("No staged queue changes to apply.");
        return;
    }

    // Backup strategy in case of API failure (optional, but good for UX)
    // This is complex if the store's internal state needs backup/restore.
    // For now, we'll rely on re-fetching configuration on failure.

    if (typeof showLoading === "function") showLoading("Applying queue configuration changes...");
    try {
        // api.makeConfigurationUpdateApiCall should be available globally or through an api module instance
        const response = await api.makeConfigurationUpdateApiCall({ deletions, additions, updates });

        if (response && response.status == 200 && typeof response.data === "string" && response.data.toLowerCase().includes("successfully applied")) {
            queueStateStore.clear(); // Clear staged changes from the store
            liveRawSchedulerConf = null; // Invalidate cache for scheduler-conf

            if (typeof showLoading === "function") showLoading("Reloading queue configuration...");
            // api.loadSchedulerConfiguration() reloads Trie, re-renders tree, updates UI
            await api.loadSchedulerConfiguration();
            showSuccess("Queue configuration changes applied successfully!");
        } else {
            // API call failed or didn't confirm success
            let errorMessage = "Configuration update failed or validation error from YARN.";
            if (response && response.data) {
                // Attempt to parse YARN's XML error if applicable, or just show the string
                // This part can be complex depending on YARN's error response format
                errorMessage = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
                // Basic check for common YARN error structures might go here.
                if (errorMessage.includes("ViolatedCapacityConstraintException") || errorMessage.includes("InvalidCapacityPercentageException")) {
                    errorMessage = "YARN Validation Error: Capacity constraints violated. Please check queue capacities.";
                }
            }
            if (typeof showError === "function") showError(`YARN update failed: ${errorMessage}`);
            console.warn("YARN update/validation failed. Response:", response);
            // Do NOT clear store on failure, user might want to retry or adjust.
            // Re-render tree to show current pending state.
           renderQueueTree();
        }
    } catch (error) {
        if (typeof showError === "function") showError(`Failed to apply changes: ${error.message}`);
        console.error("Apply changes failed:", error);
        // Re-render tree to show current pending state.
        if (typeof renderQueueTree === "function") renderQueueTree();
    } finally {
        if (typeof hideLoading === "function") hideLoading();
        if (typeof updateBatchControls === "function") updateBatchControls(); // Update based on store state
    }
}

function discardChanges() {
    if (queueStateStore && (queueStateStore.countAdd() > 0 || queueStateStore.countDelete() > 0 || queueStateStore.countUpdate() > 0 )) {
        if (confirm("Are you sure you want to discard all pending changes?")) {
            queueStateStore.clear();
            if (typeof showInfo === "function") showInfo("All pending changes have been discarded.");
            if (typeof renderQueueTree === "function") renderQueueTree();
            if (typeof updateBatchControls === "function") updateBatchControls();
        }
    } else {
        if (typeof showInfo === "function") showInfo("No pending changes to discard.");
    }
}

function undoMarkQueueForDeletion(queuePath) {
    if (queueStateStore && queueStateStore.isStateDelete(queuePath)) {
        queueStateStore.deleteChange(queuePath); // Removes the DELETE_OP entry
        if (typeof showSuccess === "function") showSuccess(`Deletion undone for queue "${queuePath.split('.').pop()}".`);
        if (typeof renderQueueTree === "function") renderQueueTree();
        if (typeof updateBatchControls === "function") updateBatchControls();
    } else {
        if (typeof showWarning === "function") showWarning("Queue was not marked for deletion.");
    }
}

window.markQueueForDeletion = markQueueForDeletion;
window.applyAllChanges = applyAllChanges;
window.discardChanges = discardChanges;
window.undoMarkQueueForDeletion = undoMarkQueueForDeletion;