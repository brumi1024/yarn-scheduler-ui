/**
 * Finds a queue by its path in the main queueData or pendingAdditions.
 * Assumes window.queueData and pendingAdditions (from main.js) are globally accessible.
 */
function findQueueByPath(path, currentQueue = window.queueData) {
    if (!currentQueue) return null;
    if (currentQueue.path === path) return currentQueue;

    if (currentQueue.children) {
        for (const childName in currentQueue.children) {
            const found = findQueueByPath(path, currentQueue.children[childName]);
            if (found) return found;
        }
    }
    const pendingQueue = pendingAdditions.get(path);
    if (pendingQueue && pendingQueue.path === path) {
        return pendingQueue;
    }
    return null;
}

/**
 * Closes the Edit Queue modal.
 */
function closeEditModal() {
  const modal = document.getElementById("edit-modal");
  if (modal) modal.classList.remove("show");
  currentEditQueue = null; // currentEditQueue is a global variable for modal state
}

/**
 * Closes the Add Queue modal.
 */
function closeAddQueueModal() {
  const modal = document.getElementById("add-queue-modal");
  if (modal) modal.classList.remove("show");
}

/**
 * Closes the Info Queue modal.
 */
function closeInfoModal() {
  const modal = document.getElementById("info-modal");
  if (modal) modal.classList.remove("show");
}

/**
 * Gets all parent queues for populating dropdowns.
 * Iterates through window.queueData and pendingAdditions, avoiding duplicates and deleted queues.
 */
function getAllParentQueues(currentQueue = window.queueData, collectedPaths = new Set()) {
    if (!currentQueue || collectedPaths.has(currentQueue.path)) return [];
    
    let parents = [];
    if (!pendingDeletions.has(currentQueue.path)) {
         parents.push({ path: currentQueue.path, name: currentQueue.name });
         collectedPaths.add(currentQueue.path);
    }

    if (currentQueue.children) {
        for (const childName in currentQueue.children) {
            parents = parents.concat(getAllParentQueues(currentQueue.children[childName], collectedPaths));
        }
    }
    Array.from(pendingAdditions.values()).forEach(newQueue => {
        if (newQueue.parentPath === currentQueue.path && !collectedPaths.has(newQueue.path)) {
           parents = parents.concat(getAllParentQueues(newQueue, collectedPaths));
        }
    });
    
    // Return unique parents by path, ensuring original name is kept
    return Array.from(new Set(parents.map(p => p.path)))
                .map(pPath => {
                    const found = parents.find(p => p.path === pPath);
                    return { path: found.path, name: found.name };
                })
                .sort((a,b) => a.path.localeCompare(b.path)); // Sort for consistency
}


window.findQueueByPath = findQueueByPath;
window.closeEditModal = closeEditModal;
window.closeAddQueueModal = closeAddQueueModal;
window.closeInfoModal = closeInfoModal;
window.getAllParentQueues = getAllParentQueues;