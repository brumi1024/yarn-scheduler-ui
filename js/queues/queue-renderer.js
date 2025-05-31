function calculateMaxDepth(queue, currentDepth = 0) {
  if (!queue) return currentDepth; 
  let maxDepth = currentDepth;

  Object.values(queue.children).forEach((child) => {
    const childDepth = calculateMaxDepth(child, currentDepth + 1);
    maxDepth = Math.max(maxDepth, childDepth);
  });

  // Pending additions: These are structurally part of the tree.
  // If a newQueue was marked for deletion, it would have been removed from pendingAdditions.
  Array.from(pendingAdditions.values()).forEach((newQueue) => {
    if (newQueue.parentPath === queue.path) {
      const childDepth = calculateMaxDepth(newQueue, currentDepth + 1);
      maxDepth = Math.max(maxDepth, childDepth);
    }
  });

  return maxDepth;
}

function sortQueues(queues) {
  if (currentSort === "capacity") {
    return queues.slice().sort((a, b) => {
      const aCap =
        a.effectiveCapacity !== undefined ? a.effectiveCapacity : a.capacity;
      const bCap =
        b.effectiveCapacity !== undefined ? b.effectiveCapacity : b.capacity;
      return (bCap || 0) - (aCap || 0);
    });
  } else if (currentSort === "name") {
    return queues.slice().sort((a, b) => a.name.localeCompare(b.name));
  }
  return queues;
}

function queueMatchesSearch(queue, searchTerm) {
  if (!searchTerm) return true;
  return (
    queue.name.toLowerCase().includes(searchTerm) ||
    (queue.path && queue.path.toLowerCase().includes(searchTerm))
  );
}

function getAllChildren(queue) {
  const children = Object.values(queue.children);

  const newChildren = Array.from(pendingAdditions.values()).filter(
    (newQueue) =>
      newQueue.parentPath === queue.path && !pendingDeletions.has(newQueue.path)
  );
  return [...children, ...newChildren];
}

function collectVisibleQueues(queue, searchTerm, ancestors = []) {
  let matches = queueMatchesSearch(queue, searchTerm);
  let visibleDescendants = [];

  getAllChildren(queue).forEach((child) => {
    const result = collectVisibleQueues(
      child,
      searchTerm,
      ancestors.concat(queue)
    );
    if (result.visible) {
      visibleDescendants.push(result);
    }
  });

  // A queue is visible if it matches the search, or has visible descendants.
  // If it's marked for deletion, this visibility rule still applies.
  // If search is empty, 'matches' is true, so all queues (including deleted ones) become visible.
  let visible = matches || visibleDescendants.length > 0;

  return {
    queue,
    visible,
    matches,
    visibleDescendants,
    ancestors,
  };
}

function getQueuesAtLevel(
  level,
  queue = window.queueData,
  currentLevel = 0,
  searchTerm = currentSearchTerm
) {
  if (!queue) return [];
  let visibleTree = collectVisibleQueues(queue, searchTerm);
  let result = [];

  function collectAtLevel(node, lvl) {
    if (lvl === level && node.visible) {
      result.push(node.queue);
    }
    node.visibleDescendants.forEach((childNode) =>
      collectAtLevel(childNode, lvl + 1)
    );
  }

  collectAtLevel(visibleTree, 0);
  return result;
}

function renderLevelHeaders() {
  const levelHeadersContainer = document.getElementById("level-headers");
  levelHeadersContainer.innerHTML = "";

  if (!window.queueData) return;
  const maxDepth = calculateMaxDepth(window.queueData);

  for (let i = 0; i <= maxDepth; i++) {
    const header = document.createElement("div");
    header.className = "level-header";
    header.textContent = `Level ${i + 1}`;
    levelHeadersContainer.appendChild(header);
  }
}

function renderQueueTree() {
  if (!window.queueData) { 
    console.warn("renderQueueTree called but queueData is not available.");
    return;
  }
  // Ensure liveRawSchedulerConf is loaded if not already, for card display fallbacks
  if (liveRawSchedulerConf === null) {
      api.getSchedulerConf().then(rawConfData => { // Assuming api.getSchedulerConf is defined
          if (rawConfData && rawConfData.property) {
              liveRawSchedulerConf = new Map(rawConfData.property.map(p => [p.name, p.value]));
          } else {
              liveRawSchedulerConf = new Map();
          }
          proceedWithRendering();
      }).catch(() => {
          liveRawSchedulerConf = new Map(); // Ensure it's a map on error
          showError("Could not fetch scheduler-conf for card display. Some values might be incorrect.");
          proceedWithRendering();
      });
  } else {
      proceedWithRendering();
  }

  function proceedWithRendering() {
    const treeContainer = document.getElementById("queue-tree");
    treeContainer.innerHTML = "";
    queueElements.clear(); 

    const maxDepth = calculateMaxDepth(window.queueData); 

    for (let level = 0; level <= maxDepth; level++) {
      const column = document.createElement("div");
      column.className = "queue-column";
      const queuesAtLevel = sortQueues(getQueuesAtLevel(level)); 
      queuesAtLevel.forEach((queue) => {
        const card = window.createQueueCard(queue, level);
        column.appendChild(card);
        queueElements.set(queue.path, card);
      });
      treeContainer.appendChild(column);
    }

    setTimeout(() => {
      if (typeof drawArrows === "function") drawArrows(); 
    }, CONFIG.TIMEOUTS.ARROW_RENDER); 

    renderLevelHeaders();
    if (typeof updateBatchControls === "function") updateBatchControls();
  }
}

// canQueueBeDeleted function ... (remains as per your uploaded version or the corrected one)
function canQueueBeDeleted(queuePath) {
  if (queuePath === "root") {
    return { canDelete: false, reason: "Cannot delete root queue." };
  }

  const queue = findQueueByPath(queuePath); 
  if (!queue) {
    console.warn("canQueueBeDeleted: Queue not found for path", queuePath);
    return { canDelete: false, reason: "Queue not found." };
  }

  const activeExistingChildren = Object.values(queue.children).filter(
    child => !pendingDeletions.has(child.path)
  );

  const activeNewChildren = Array.from(pendingAdditions.values()).filter(
    newQueue => newQueue.parentPath === queuePath && !pendingDeletions.has(newQueue.path)
  );
  
  if (activeExistingChildren.length > 0 || activeNewChildren.length > 0) {
      const activeChildrenNames = [...activeExistingChildren, ...activeNewChildren].map(c => c.name).join(", ");
      return { canDelete: false, reason: `Cannot delete: has active child queues (${activeChildrenNames}).` };
  }

  return { canDelete: true, reason: "" };
}

window.renderQueueTree = renderQueueTree;
window.canQueueBeDeleted
