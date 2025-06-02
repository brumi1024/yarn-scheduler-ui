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
 * Closes the edit modal by removing the "show" class from the modal element
 * and resets the currentEditQueue to null.
 */
function closeEditModal() {
    const modal = document.getElementById("edit-modal");
    if (modal) modal.classList.remove("show");
    currentEditQueue = null; // currentEditQueue is a global variable for modal state
}

/**
 * Closes the "Add Queue" modal by removing the "show" class from its element.
 *
 */
function closeAddQueueModal() {
    const modal = document.getElementById("add-queue-modal");
    if (modal) modal.classList.remove("show");
}

/**
 * Closes the information modal by removing the "show" class
 * from the modal element with the ID "info-modal".
 */
function closeInfoModal() {
    const modal = document.getElementById("info-modal");
    if (modal) modal.classList.remove("show");
}

/**
 * Retrieves a list of all parent queues available in the queue state store.
 * Ensures that the returned queues are valid, not marked for deletion, and include a fallback entry for a 'root'
 * queue when necessary.
 *
 * @return {Array<{path: string, name: string}>} An array of objects representing parent queues,
 * where each object contains the `path` and `name` of a queue. If the queue state store is unavailable or no valid
 * queues exist, a fallback containing only the 'root' queue is returned.
 */
function getAllParentQueues() {
    if (!queueStateStore) {
        console.error("getAllParentQueues: QueueStateStore not available.");
        showError("Error: Queue data system is not available.");
        return [{path: 'root', name: 'root'}]; // Minimal fallback
    }

    const allEffectiveQueues = queueStateStore.getAllQueues();

    const parentQueues = allEffectiveQueues
        .filter(q => q && !queueStateStore.isStateDelete(q.path)) // Explicitly ensure not marked for deletion
        .map(q => ({path: q.path, name: q.name || q.path.split('.').pop()})) // Ensure name is present
        .sort((a, b) => a.path.localeCompare(b.path));

    // Ensure 'root' is always an option if not present and no other queues exist
    if (parentQueues.length === 0 && !parentQueues.some(p => p.path === 'root')) {
        return [{path: 'root', name: 'root'}];
    }

    return parentQueues;
}

window.findQueueByPath = findQueueByPath;
window.closeEditModal = closeEditModal;
window.closeAddQueueModal = closeAddQueueModal;
window.closeInfoModal = closeInfoModal;
window.getAllParentQueues = getAllParentQueues;