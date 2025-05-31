window.renderQueueTree = () => {
  const treeContainer = document.getElementById("queue-tree");
  treeContainer.innerHTML = "";

  const queues = queueStateStore.allQueue();
  const maxDepth = calculateMaxDepth(queues.values());
  const queueElements = new Map();

  for (let level = 0; level <= maxDepth; level++) {
    const column = document.createElement("div");
    column.className = "queue-column";
    const queuesAtLevel = sortQueues(collectVisibleQueues(queues.values(), level));
    queuesAtLevel.forEach((queue) => {
      const card = window.createQueueCard(queue, level);
      column.appendChild(card);
      queueElements.set(queue.queuePath, card);
    });
    treeContainer.appendChild(column);
  }

  setTimeout(
      () => window.drawArrows(queueElements, queues),
      CONFIG.TIMEOUTS.ARROW_RENDER
  );

  renderLevelHeaders(maxDepth);
  if (typeof updateBatchControls === "function") updateBatchControls();
}

function calculateMaxDepth(queues) {
  return Math.max(...queues.map(q => q.level))
}

function collectVisibleQueues(queues, level) {
  return queues
      .filter(q => q.level === level)
      .filter(q => !currentSearchTerm || q.queuePath.includes(currentSearchTerm))
}

function renderLevelHeaders(maxDepth) {
  const levelHeadersContainer = document.getElementById("level-headers");
  levelHeadersContainer.innerHTML = "";
  for (let i = 0; i <= maxDepth; i++) {
    const header = document.createElement("div");
    header.className = "level-header";
    header.textContent = `Level ${i + 1}`;
    levelHeadersContainer.appendChild(header);
  }
}

//TODO under here

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

function sortQueues(queues) {
  // TODO
  // if (currentSort === "capacity") {
  //   return queues.slice().sort((a, b) => {
  //     const aCap =
  //         a.effectiveCapacity !== undefined ? a.effectiveCapacity : a.capacity;
  //     const bCap =
  //         b.effectiveCapacity !== undefined ? b.effectiveCapacity : b.capacity;
  //     return (bCap || 0) - (aCap || 0);
  //   });
  // } else if (currentSort === "name") {
  //   return queues.slice().sort((a, b) => a.name.localeCompare(b.name));
  // }
  return queues;
}