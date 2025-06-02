
/**
 * Calculates the maximum depth of a formatted queue tree.
 * @param {Object} formattedQueueNode - The current formatted queue node.
 * @returns {number} The maximum depth (0-indexed based on level property).
 */
function calculateMaxDepthOfFormattedTree(formattedQueueNode) {
  if (!formattedQueueNode) return -1;
  let maxDepth = formattedQueueNode.level !== undefined ? formattedQueueNode.level : 0;

  if (formattedQueueNode.children) {
    Object.values(formattedQueueNode.children).forEach(child => {
      if (child) {
        const childDepth = calculateMaxDepthOfFormattedTree(child);
        maxDepth = Math.max(maxDepth, childDepth);
      }
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
  const sortField = window.currentSort || 'capacity'; // currentSort is global

  return queues.slice().sort((a, b) => {
    if (!a || !b) return 0; // Basic safety for array elements
    if (sortField === "capacity") {
      const aCap = parseFloat(a.capacity) || 0;
      const bCap = parseFloat(b.capacity) || 0;
      return bCap - aCap;
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

  if (maxDepthCalculated < 0) return;

  for (let i = 0; i <= maxDepthCalculated; i++) {
    const header = document.createElement("div");
    header.className = "level-header";
    header.textContent = `Level ${i + 1}`;
    levelHeadersContainer.appendChild(header);
  }
}

/**
 * Renders the entire queue tree.
 */
function renderQueueTree() {
  if (!viewDataFormatter) {
    console.error("ViewDataFormatter not available for renderQueueTree.");
    if(typeof showError === 'function') showError("UI Error: Cannot render queue tree. Formatter missing.");
    const treeEl = document.getElementById("queue-tree");
    if (treeEl) treeEl.innerHTML = "<p>Error: UI Formatter not loaded.</p>";
    const headersEl = document.getElementById("level-headers");
    if (headersEl) headersEl.innerHTML = "";
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
  if (queueElements) queueElements.clear();

  if (!formattedHierarchyRoot) {
    console.warn("renderQueueTree: No formatted hierarchy to render.");
    if (typeof updateBatchControls === 'function') updateBatchControls();
    treeContainer.innerHTML = "<p style='text-align:center; padding:20px;'>No queues to display.</p>";
    return;
  }

  let maxActualDepth = 0;
  const columnContainers = []; // Store column DOM elements by level index

  const estimatedMaxDepth = calculateMaxDepthOfFormattedTree(formattedHierarchyRoot);
  for (let i = 0; i <= estimatedMaxDepth; i++) {
    const colDiv = document.createElement("div");
    colDiv.className = "queue-column";
    treeContainer.appendChild(colDiv);
    columnContainers[i] = colDiv;
  }

  function renderNodeRecursive(formattedQueueNode) {
    if (!formattedQueueNode) return;

    const currentLevel = formattedQueueNode.level;
    maxActualDepth = Math.max(maxActualDepth, currentLevel);

    const columnContainer = columnContainers[currentLevel];

    if (columnContainer) {
      const card = window.createQueueCard(formattedQueueNode);
      columnContainer.appendChild(card);
      if (queueElements) queueElements.set(formattedQueueNode.path, card);
    } else {
      console.warn(`Column container for level ${currentLevel} not found for queue ${formattedQueueNode.path}. Max estimated depth was ${estimatedMaxDepth}.`);
    }

    if (formattedQueueNode.children) {
      const childrenToRender = sortQueues(Object.values(formattedQueueNode.children));
      childrenToRender.forEach(childNode => {
        if (childNode) {
          renderNodeRecursive(childNode);
        }
      });
    }
  }

  renderNodeRecursive(formattedHierarchyRoot);
  renderLevelHeaders(maxActualDepth);

  setTimeout(() => {
    if (typeof drawArrows === "function") drawArrows();
  }, (window.CONFIG?.TIMEOUTS?.ARROW_RENDER) || 100);

  if (typeof updateBatchControls === "function") updateBatchControls();
}

/**
 * Determines if a queue (not already marked for deletion) can be marked for deletion.
 * @param {string} queuePath - The path of the queue to check.
 * @param {QueueStateStore} store - The instance of the QueueStateStore.
 * @returns {{canDelete: boolean, reason: string}}
 */
function checkDeletability(queuePath, store) {
  // Globals: ADD_OP
  if (!store) {
    console.error("checkDeletability: QueueStateStore instance not provided.");
    return { canDelete: false, reason: "System error: Store not available." };
  }
  if (queuePath === "root") {
    return { canDelete: false, reason: "Cannot delete root queue." };
  }

  const queueData = store.getQueue(queuePath);

  if (!queueData || store.isStateDelete(queuePath)) {
    return {
      canDelete: false,
      reason: queueData ? "Queue already marked for deletion." : "Queue not found."
    };
  }

  let activeChildCount = 0;
  const activeChildrenNames = [];

  // Check existing children (from base config)
  if (queueData.children) {
    for (const childName in queueData.children) {
      if (Object.hasOwnProperty.call(queueData.children, childName)) {
        const childPath = queueData.children[childName].path;
        if (!store.isStateDelete(childPath)) {
          activeChildCount++;
          activeChildrenNames.push(childName);
        }
      }
    }
  }

  // Check newly added children (staged in store)
  store._iter(ADD_OP).forEach(entry => {
    const newQueueBlueprint = entry.data.change.newQueueData;
    if (newQueueBlueprint && newQueueBlueprint.parentPath === queuePath) {
      if (!store.isStateDelete(newQueueBlueprint.path)) {
        activeChildCount++;
        activeChildrenNames.push(newQueueBlueprint.name);
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
