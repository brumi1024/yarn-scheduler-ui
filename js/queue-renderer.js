function calculateMaxDepth(queue, currentDepth = 0) {
  let maxDepth = currentDepth;

  // Check existing children
  Object.values(queue.children).forEach((child) => {
    if (!pendingDeletions.has(child.path)) {
      const childDepth = calculateMaxDepth(child, currentDepth + 1);
      maxDepth = Math.max(maxDepth, childDepth);
    }
  });

  // Check pending additions at this level
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
    // Sort by effectiveCapacity (or fallback to capacity), descending
    return queues.slice().sort((a, b) => {
      const aCap =
        a.effectiveCapacity !== undefined ? a.effectiveCapacity : a.capacity;
      const bCap =
        b.effectiveCapacity !== undefined ? b.effectiveCapacity : b.capacity;
      return (bCap || 0) - (aCap || 0);
    });
  } else if (currentSort === "name") {
    // Sort by name, ascending
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
  // Existing children (from backend)
  const children = Object.values(queue.children).filter(
    (child) => !pendingDeletions.has(child.path)
  );
  // Newly staged children (from pendingAdditions)
  const newChildren = Array.from(pendingAdditions.values()).filter(
    (newQueue) =>
      newQueue.parentPath === queue.path && !pendingDeletions.has(newQueue.path)
  );
  return [...children, ...newChildren];
}

// Recursively collect all matching queues and their ancestors for display
function collectVisibleQueues(queue, searchTerm, ancestors = []) {
  let matches = queueMatchesSearch(queue, searchTerm);
  let visibleDescendants = [];

  // Check children recursively
  Object.values(getAllChildren(queue)).forEach((child) => {
    const result = collectVisibleQueues(
      child,
      searchTerm,
      ancestors.concat(queue)
    );
    if (result.visible) {
      visibleDescendants.push(result);
    }
  });

  // If this queue matches or has any matching descendants, it's visible
  let visible = matches || visibleDescendants.length > 0;

  return {
    queue,
    visible,
    matches,
    visibleDescendants,
    ancestors,
  };
}

// Update getQueuesAtLevel to use the search filter
function getQueuesAtLevel(
  level,
  queue = queueData,
  currentLevel = 0,
  searchTerm = currentSearchTerm
) {
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

  const maxDepth = calculateMaxDepth(queueData);

  for (let i = 0; i <= maxDepth; i++) {
    const header = document.createElement("div");
    header.className = "level-header";
    header.textContent = `Level ${i + 1}`;
    levelHeadersContainer.appendChild(header);
  }
}

function renderQueueTree() {
  console.log("renderQueueTree called, queueData:", queueData);
  if (!queueData) return;

  const treeContainer = document.getElementById("queue-tree");
  treeContainer.innerHTML = "";
  queueElements.clear();

  const maxDepth = calculateMaxDepth(queueData);

  // Create columns for each level with consistent width
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

  // Draw arrows after elements are positioned
  setTimeout(() => {
    drawArrows();
  }, CONFIG.TIMEOUTS.ARROW_RENDER);

  renderLevelHeaders();
  // renderMinimap();
  updateBatchControls();
}

window.renderQueueTree = renderQueueTree;
window.createQueueCard = createQueueCard;
window.calculateMaxDepth = calculateMaxDepth;
window.getQueuesAtLevel = getQueuesAtLevel;
