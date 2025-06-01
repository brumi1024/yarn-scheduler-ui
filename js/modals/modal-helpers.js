/**
 * Finds a queue by its path using the QueueStateStore.
 * The store is responsible for checking the Trie and pending additions.
 * @param {string} path - The full path of the queue.
 * @returns {Object|null} The queue object if found, otherwise null.
 */
function findQueueByPath(path) { // Removed currentQueue param, always uses store
    return queueStateStore.getQueue(path);
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
 * Gets all queues that can serve as parents, considering the current state
 * including pending additions and deletions managed by QueueStateStore.
 * @returns {Array<Object>} Array of { path: string, name: string } for parent queues, sorted by path.
 */
function getAllParentQueues() {
    if (!queueStateStore) {
        console.error("getAllParentQueues: QueueStateStore not available.");
       showError("Error: Queue data system is not available.");
        return [{ path: 'root', name: 'root' }]; // Minimal fallback
    }

    const allEffectiveQueues = queueStateStore.getAllQueues(); // This method should give all current + pending_add queues
    // and should ideally filter out pending_delete ones.

    const parentQueues = allEffectiveQueues
        .filter(q => q && !queueStateStore.isStateDelete(q.path)) // Explicitly ensure not marked for deletion
        .map(q => ({ path: q.path, name: q.name || q.path.split('.').pop() })) // Ensure name is present
        .sort((a, b) => a.path.localeCompare(b.path));

    // Ensure 'root' is always an option if not present and no other queues exist
    if (parentQueues.length === 0 && !parentQueues.some(p => p.path === 'root')) {
        return [{ path: 'root', name: 'root' }];
    }
    // If root is somehow filtered out but other queues exist, it should still be a valid parent.
    if (!parentQueues.some(p => p.path === 'root') && queueStateStore.getQueue('root')) {
        parentQueues.unshift({ path: 'root', name: 'root' }); // Add root if missing but exists
        // Re-sort if you added root at the beginning and it wasn't sorted there.
        // However, since root is usually first, unshift is often fine.
    }


    return parentQueues.length > 0 ? parentQueues : [{ path: 'root', name: 'root' }]; // Fallback for empty state
}

window.findQueueByPath = findQueueByPath;
window.closeEditModal = closeEditModal;
window.closeAddQueueModal = closeAddQueueModal;
window.closeInfoModal = closeInfoModal;
window.getAllParentQueues = getAllParentQueues;