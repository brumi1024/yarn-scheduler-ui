// Depends on global: confirm, pendingAdditions, pendingDeletions, pendingChanges, 
// showError, showSuccess, showInfo, showWarning, renderQueueTree, updateBatchControls,
// validatePendingChanges (from validation.js), api (from api.js), liveRawSchedulerConf,
// findQueueByPath (from modal-helpers.js), canQueueBeDeleted (from queue-renderer.js)

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

  if (pendingAdditions.has(queuePath)) {
    pendingAdditions.delete(queuePath); 
    if (typeof showSuccess === "function") showSuccess(`New queue "${queue.name}" removed from staging.`);
  } else {
    pendingDeletions.add(queuePath);
    if (typeof showSuccess === "function") showSuccess(`Queue "${queue.name}" marked for deletion.`);
  }
  
  pendingChanges.delete(queuePath); // Remove any pending modifications for this queue

  if (typeof renderQueueTree === "function") renderQueueTree();
  if (typeof updateBatchControls === "function") updateBatchControls();
}

async function applyAllChanges() {
    const validationErrors = (typeof validatePendingChanges === 'function') ? validatePendingChanges() : []; 
    if (validationErrors.length > 0) {
        if (typeof showWarning === "function") showWarning(`Cannot apply changes: ${validationErrors.join(", ")}`);
        return;
    }

    const backupChanges = new Map(pendingChanges);
    const backupAdditions = new Map(pendingAdditions);
    const backupDeletions = new Set(pendingDeletions);

    const deletions = Array.from(pendingDeletions);
    const additions = Array.from(pendingAdditions.values()).map((newQueue) => {
        return {
            queueName: newQueue.path, 
            params: newQueue.params || {} 
        };
    });

    const updates = [];
    pendingChanges.forEach((changes, queuePath) => {
        const paramsForAPI = {};
        let hasApiRelevantChanges = false;
        for (const keyInChanges in changes) {
            if (keyInChanges !== '_ui_capacityMode') { 
                paramsForAPI[keyInChanges] = changes[keyInChanges];
                hasApiRelevantChanges = true;
            }
        }
        if (hasApiRelevantChanges) {
            updates.push({
                queueName: queuePath,
                params: paramsForAPI
            });
        }
    });

    if (deletions.length === 0 && additions.length === 0 && updates.length === 0) {
        if (typeof showInfo === "function") showInfo("No staged queue changes to apply.");
        return;
    }
    
    if (typeof showLoading === "function") showLoading("Applying queue configuration changes...");
    try {
        const response = await api.makeConfigurationUpdateApiCall({ deletions, additions, updates });

        if (response && response.status == 200 && typeof response.data === "string" && response.data.toLowerCase().includes("successfully applied")) {
            pendingChanges.clear();
            pendingAdditions.clear();
            pendingDeletions.clear();
            liveRawSchedulerConf = null; 
            
            if (typeof showLoading === "function") showLoading("Reloading queue configuration...");
            await api.loadSchedulerConfiguration(); 
            if (typeof showSuccess === "function") showSuccess("Queue configuration changes applied successfully!");
        } else {
            pendingChanges.clear(); backupChanges.forEach((v, k) => pendingChanges.set(k, v));
            pendingAdditions.clear(); backupAdditions.forEach((v, k) => pendingAdditions.set(k, v));
            pendingDeletions.clear(); backupDeletions.forEach(v => pendingDeletions.add(v));
            
            if (typeof renderQueueTree === "function") renderQueueTree();

            let errorMessage = "Configuration update failed or validation error from YARN.";
            // ... (error message parsing as before) ...
            if (typeof showError === "function") showError(`YARN update failed: ${errorMessage}`);
            console.warn("YARN update/validation failed. Response:", response);
        }
    } catch (error) {
        pendingChanges.clear(); backupChanges.forEach((v, k) => pendingChanges.set(k, v));
        pendingAdditions.clear(); backupAdditions.forEach((v, k) => pendingAdditions.set(k, v));
        pendingDeletions.clear(); backupDeletions.forEach(v => pendingDeletions.add(v));
        if (typeof renderQueueTree === "function") renderQueueTree();
        
        if (typeof showError === "function") showError(`Failed to apply changes: ${error.message}`);
        console.error("Apply changes failed:", error);
    } finally {
        if (typeof hideLoading === "function") hideLoading();
        if (typeof updateBatchControls === "function") updateBatchControls();
    }
}

window.markQueueForDeletion = markQueueForDeletion;
window.applyAllChanges = applyAllChanges;