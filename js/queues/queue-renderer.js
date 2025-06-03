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
 * Determines if a queue (not already marked for deletion) can be marked for deletion.
 * @param {string} queuePath - The path of the queue to check.
 * @param {QueueStateStore} store - The instance of the QueueStateStore.
 * @returns {{canDelete: boolean, reason: string}}
 */
function checkDeletability(queuePath, store) {
    // Globals: ADD_OP
    if (!store) {
        console.error("checkDeletability: QueueStateStore instance not provided.");
        return {canDelete: false, reason: "System error: Store not available."};
    }
    if (queuePath === "root") {
        return {canDelete: false, reason: "Cannot delete root queue."};
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
    return {canDelete: true, reason: ""};
}

/**
 * Sorts an array of formatted queue objects.
 * @param {Array<Object>} queues - Array of formatted queue objects.
 * @returns {Array<Object>} Sorted array of formatted queue objects.
 */
function sortQueues(queues) {
    const sortField = currentSort || 'capacity'; // currentSort is global

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
 * Helper function to check if a node itself matches the search term.
 * @param {Object} node - The formatted queue node.
 * @param {string} searchTermLC - The lowercased search term.
 * @returns {boolean}
 */
function nodeItselfMatches(node, searchTermLC) {
    if (!searchTermLC) return true; // No search term, everything matches
    if (!node) return false;
    return (node.displayName || '').toLowerCase().includes(searchTermLC) ||
        (node.path || '').toLowerCase().includes(searchTermLC);
}

/**
 * Helper function to check if a node or any of its descendants match the search term.
 * Uses memoization to avoid redundant computations.
 * @param {Object} node - The formatted queue node.
 * @param {string} searchTermLC - The lowercased search term.
 * @param {Map} memo - Memoization map (path -> boolean).
 * @returns {boolean}
 */
function doesNodeOrDescendantMatch(node, searchTermLC, memo) {
    if (!node) return false;
    if (!searchTermLC) return true; // No search term, effectively visible

    if (memo.has(node.path)) {
        return memo.get(node.path);
    }

    if (nodeItselfMatches(node, searchTermLC)) {
        memo.set(node.path, true);
        return true;
    }

    if (node.children) {
        for (const childName in node.children) {
            if (doesNodeOrDescendantMatch(node.children[childName], searchTermLC, memo)) {
                memo.set(node.path, true); // If any child (or its descendant) matches, this node is visible
                return true;
            }
        }
    }

    memo.set(node.path, false);
    return false;
}

/**
 * Renders a hierarchical queue tree in the UI. It organizes the queue data into columns
 * and displays nodes based on the provided formatted queue hierarchy. Handles search
 * filtering and updates related UI components such as level headers and batch controls.
 *
 * The method ensures that only visible nodes, based on the current search term, are rendered.
 * It dynamically adjusts the depth of the columns based on the tree hierarchy and updates
 * references to rendered elements for further manipulation.
 *
 * @return {void} Does not return a value. Updates the DOM elements to display the queue tree and related UI components.
 */
function renderQueueTree() {
    const formattedHierarchyRoot = viewDataFormatter.getFormattedQueueHierarchy();
    const treeContainer = document.getElementById("queue-tree");
    const levelHeadersContainer = document.getElementById("level-headers");

    if (!treeContainer || !levelHeadersContainer) {
        return;
    }
    treeContainer.innerHTML = "";
    levelHeadersContainer.innerHTML = "";
    if (typeof queueElements !== 'undefined') queueElements.clear();

    if (!formattedHierarchyRoot) {
        if (typeof updateBatchControls === 'function') updateBatchControls();
        treeContainer.innerHTML = "<p style='text-align:center; padding:20px;'>No queues to display.</p>";
        return;
    }

    const searchTermLC = (currentSearchTerm || '').toLowerCase();
    const visibilityMemo = new Map(); // Memoization for search matches

    // Initial check: if search term exists and root (nor any descendant) matches, show no results
    if (searchTermLC && !doesNodeOrDescendantMatch(formattedHierarchyRoot, searchTermLC, visibilityMemo)) {
        treeContainer.innerHTML = "<p style='text-align:center; padding:20px;'>No queues match your search criteria.</p>";
        renderLevelHeaders(-1); // No headers needed
        if (typeof updateBatchControls === 'function') updateBatchControls();
        if (typeof drawArrows === "function") setTimeout(() => drawArrows(), 0); // Clear arrows
        return;
    }

    let maxActualDepth = -1;
    const columnContainers = [];
    // Calculate max depth based on the *original* unfiltered tree for column setup.
    // Or, adjust dynamically, but this is simpler if columns are fixed.
    const estimatedMaxDepth = calculateMaxDepthOfFormattedTree(formattedHierarchyRoot);
    for (let i = 0; i <= estimatedMaxDepth; i++) {
        const colDiv = document.createElement("div");
        colDiv.className = "queue-column";
        treeContainer.appendChild(colDiv);
        columnContainers[i] = colDiv;
    }

    function renderNodeRecursive(formattedQueueNode) {
        if (!formattedQueueNode) return;

        // This node should only be processed further (card rendered, children checked)
        // if it or one of its descendants matches the search term (or if no search term).
        if (!doesNodeOrDescendantMatch(formattedQueueNode, searchTermLC, visibilityMemo)) {
            return; // Prune this branch
        }

        // If we reach here, this node is part of a visible path. Render its card.
        const currentLevel = formattedQueueNode.level;
        maxActualDepth = Math.max(maxActualDepth, currentLevel);
        const columnContainer = columnContainers[currentLevel];

        if (columnContainer) {
            // createQueueCard is global, highlighting happens inside it using window.currentSearchTerm
            const card = window.createQueueCard(formattedQueueNode);
            columnContainer.appendChild(card);
            if (typeof queueElements !== 'undefined') queueElements.set(formattedQueueNode.path, card);
        } else {
            console.warn(`Column container for level ${currentLevel} not found (queue: ${formattedQueueNode.path}).`);
        }

        // Recurse for children. They will independently check their visibility.
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
    }, (CONFIG?.TIMEOUTS?.ARROW_RENDER) || 100);

    if (typeof updateBatchControls === "function") updateBatchControls();
}

window.renderQueueTree = renderQueueTree;
