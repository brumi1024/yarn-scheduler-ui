/**
 * Calculates the maximum depth of a formatted queue tree.
 * @param {Object} formattedQueueNode - The current formatted queue node.
 * @returns {number} The maximum depth (0-indexed based on level property).
 */
function calculateMaxDepthOfFormattedTree(formattedQueueNode) {
  if (!formattedQueueNode) return -1; // Should ideally not happen if called with valid root
  let maxDepth = formattedQueueNode.level !== undefined ? formattedQueueNode.level : 0;

  if (formattedQueueNode.children) {
    Object.values(formattedQueueNode.children).forEach(child => {
      const childDepth = calculateMaxDepthOfFormattedTree(child);
      maxDepth = Math.max(maxDepth, childDepth);
    });
  }
  return maxDepth;
}

/**
 * Sorts an array of formatted queue objects.
 * @param {Array<Object>} queues - Array of formatted queue objects.
 * @returns {Array<Object>} Sorted array of formatted queue objects.
 */
function sortQueues(queues) {
  // currentSort is a global variable (e.g., 'capacity', 'name')
  const sortField = window.currentSort || 'capacity';

  return queues.slice().sort((a, b) => {
    if (sortField === "capacity") {
      const aCap = parseFloat(a.capacity) || 0; // Relies on formatter providing 'capacity' as comparable
      const bCap = parseFloat(b.capacity) || 0;
      return (bCap || 0) - (aCap || 0);
    } else if (sortField === "name") {
      return (a.displayName || '').localeCompare(b.displayName || '');
    }
    return 0;
  });
}

/**
 * Renders the level headers based on the maximum depth of the queue tree.
 * @param {number} maxDepthCalculated - The maximum depth (0-indexed).
 */
function renderLevelHeaders(maxDepthCalculated) {
  const levelHeadersContainer = document.getElementById("level-headers");
  if (!levelHeadersContainer) return;
  levelHeadersContainer.innerHTML = "";

  if (maxDepthCalculated < 0) return; // No tree or empty tree

  for (let i = 0; i <= maxDepthCalculated; i++) {
    const header = document.createElement("div");
    header.className = "level-header";
    header.textContent = `Level ${i + 1}`; // Levels are 1-indexed for display
    levelHeadersContainer.appendChild(header);
  }
}

/**
 * Renders the entire queue tree.
 * Uses QueueViewDataFormatter to get formatted data.
 */
function renderQueueTree() {
  if (!viewDataFormatter) { // Check if the formatter instance is available
    console.error("ViewDataFormatter not available for renderQueueTree.");
    if(typeof showError === 'function') showError("UI Error: Cannot render queue tree. Formatter missing.");
    document.getElementById("queue-tree").innerHTML = "<p>Error: UI Formatter not loaded.</p>";
    document.getElementById("level-headers").innerHTML = "";
    return;
  }

  const formattedHierarchyRoot = viewDataFormatter.getFormattedQueueHierarchy();

  const treeContainer = document.getElementById("queue-tree");
  const levelHeadersContainer = document.getElementById("level-headers");
  if (!treeContainer || !levelHeadersContainer) {
    console.error("Tree container or level headers container not found.");
    return;
  }
  treeContainer.innerHTML = "";
  levelHeadersContainer.innerHTML = "";
  queueElements.clear(); // Assuming queueElements is global or properly scoped (for arrow-renderer)

  if (!formattedHierarchyRoot) {
    console.warn("renderQueueTree: No formatted hierarchy to render.");
    if (typeof updateBatchControls === 'function') updateBatchControls(); // Still update batch controls
    // Optionally, display a message like "No queues to display"
    treeContainer.innerHTML = "<p style='text-align:center; padding:20px;'>No queues to display.</p>";
    return;
  }

  // --- Recursive rendering approach ---
  let maxActualDepth = 0;

  // Pre-create column containers to ensure order
  const estimatedMaxDepth = calculateMaxDepthOfFormattedTree(formattedHierarchyRoot);
  for (let i = 0; i <= estimatedMaxDepth; i++) {
    const colDiv = document.createElement("div");
    colDiv.className = "queue-column";
    colDiv.setAttribute("data-level", i); // Store level for potential styling/access
    treeContainer.appendChild(colDiv);
  }

  function renderNodeRecursive(formattedQueueNode) {
    if (!formattedQueueNode) return;

    const currentLevel = formattedQueueNode.level;
    maxActualDepth = Math.max(maxActualDepth, currentLevel);

    // Find the correct column container (already created)
    const columnContainer = treeContainer.querySelector(`.queue-column[data-level="${currentLevel}"]`);

    if (columnContainer) {
      const card = window.createQueueCard(formattedQueueNode); // createQueueCard now takes the formatted object
      columnContainer.appendChild(card);
      queueElements.set(formattedQueueNode.path, card);
    } else {
      console.warn(`Column container for level ${currentLevel} not found.`);
    }

    if (formattedQueueNode.children) {
      const childrenToRender = sortQueues(Object.values(formattedQueueNode.children));
      childrenToRender.forEach(child => {
        renderNodeRecursive(child);
      });
    }
  }

  renderNodeRecursive(formattedHierarchyRoot);
  renderLevelHeaders(maxActualDepth);

  // After all cards are in the DOM, draw arrows
  setTimeout(() => {
    if (typeof drawArrows === "function") drawArrows();
  }, window.CONFIG?.TIMEOUTS?.ARROW_RENDER || 100);

  if (typeof updateBatchControls === "function") updateBatchControls();
}


/**
 * Determines if a queue (not already marked for deletion) can be marked for deletion.
 * A queue cannot be deleted if it has active children (existing children not marked for deletion,
 * or newly added children).
 * @param {string} queuePath - The path of the queue to check.
 * @param {QueueStateStore} store - The instance of the QueueStateStore.
 * @returns {{canDelete: boolean, reason: string}}
 */
function checkDeletability(queuePath, store) {
  if (!store) {
    console.error("checkDeletability: QueueStateStore instance not provided.");
    return { canDelete: false, reason: "System error: Store not available." };
  }
  if (queuePath === "root") {
    return { canDelete: false, reason: "Cannot delete root queue." };
  }

  // Get the current state of the queue itself.
  // We are checking if we can *initiate* a delete. So, if it's already deleted,
  // this specific check isn't for "can it be deleted now" but should have been prevented.
  // However, the formatter handles the "Undo Delete" state. This function is for the "Delete" action.
  const queueData = store.getQueue(queuePath); // Gets effective queue data
  if (!queueData || store.isStateDelete(queuePath)) {
    // If already deleted or doesn't exist, "delete" action isn't applicable.
    // The formatter handles the "Undo Delete" label for already deleted items.
    // This function is for "can we INITIATE a delete".
    return { canDelete: false, reason: queueData ? "Queue already marked, or cannot be deleted." : "Queue not found." };
  }

  let activeChildCount = 0;
  const activeChildrenNames = [];

  // 1. Check existing children (children present in the base Trie structure for this queue)
  //    queueData.children should represent children from the Trie.
  if (queueData.children) { // queueData.children are from the Trie snapshot via getQueueHierarchy
    for (const childName in queueData.children) {
      if (Object.hasOwnProperty.call(queueData.children, childName)) {
        const childPath = queueData.children[childName].path;
        if (!store.isStateDelete(childPath)) { // Active if not marked for deletion
          activeChildCount++;
          activeChildrenNames.push(childName);
        }
      }
    }
  }

  // 2. Check for newly added children (staged in the store) that are parented to this queuePath
  //    We need a way to iterate _only_ ADD_OPs from the store for this parent.
  //    QueueStateStore._iter(ADD_OP) gives all additions. We filter by parentPath.
  store._iter(ADD_OP).forEach(entry => {
    const newQueue = entry.data.change.newQueueData;
    if (newQueue && newQueue.parentPath === queuePath) {
      // A newly added queue is active unless also immediately deleted (unlikely scenario)
      if (!store.isStateDelete(newQueue.path)) {
        activeChildCount++;
        activeChildrenNames.push(newQueue.name);
      }
    }
  });

  if (activeChildCount > 0) {
    const nameList = activeChildrenNames.length > 3 ? activeChildrenNames.slice(0, 3).join(", ") + "..." : activeChildrenNames.join(", ");
    return {
      canDelete: false,
      reason: `Cannot delete: has active child queues (${nameList}).`
    };
  }

  return { canDelete: true, reason: "" };
}

window.renderQueueTree = renderQueueTree;
