    function calculateMaxDepth(queue, currentDepth = 0) {
        let maxDepth = currentDepth;

        // Check existing children
        Object.values(queue.children).forEach(child => {
            if (!pendingDeletions.has(child.path)) {
                const childDepth = calculateMaxDepth(child, currentDepth + 1);
                maxDepth = Math.max(maxDepth, childDepth);
            }
        });

        // Check pending additions at this level
        Array.from(pendingAdditions.values()).forEach(newQueue => {
            if (newQueue.parentPath === queue.path) {
                const childDepth = calculateMaxDepth(newQueue, currentDepth + 1);
                maxDepth = Math.max(maxDepth, childDepth);
            }
        });

        return maxDepth;
    }

    function sortQueues(queues) {
        if (currentSort === 'capacity') {
            // Sort by effectiveCapacity (or fallback to capacity), descending
            return queues.slice().sort((a, b) => {
                const aCap = a.effectiveCapacity !== undefined ? a.effectiveCapacity : a.capacity;
                const bCap = b.effectiveCapacity !== undefined ? b.effectiveCapacity : b.capacity;
                return (bCap || 0) - (aCap || 0);
            });
        } else if (currentSort === 'name') {
            // Sort by name, ascending
            return queues.slice().sort((a, b) => a.name.localeCompare(b.name));
        }
        return queues;
    }

    function queueMatchesSearch(queue, searchTerm) {
        if (!searchTerm) return true;
        return queue.name.toLowerCase().includes(searchTerm) ||
            (queue.path && queue.path.toLowerCase().includes(searchTerm));
    }

    function getAllChildren(queue) {
        // Existing children (from backend)
        const children = Object.values(queue.children).filter(child => !pendingDeletions.has(child.path));
        // Newly staged children (from pendingAdditions)
        const newChildren = Array.from(pendingAdditions.values())
            .filter(newQueue => newQueue.parentPath === queue.path && !pendingDeletions.has(newQueue.path));
        return [...children, ...newChildren];
    }

    // Recursively collect all matching queues and their ancestors for display
    function collectVisibleQueues(queue, searchTerm, ancestors = []) {
        let matches = queueMatchesSearch(queue, searchTerm);
        let visibleDescendants = [];

        // Check children recursively
        Object.values(getAllChildren(queue)).forEach(child => {
            const result = collectVisibleQueues(child, searchTerm, ancestors.concat(queue));
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
            ancestors
        };
    }

    // Update getQueuesAtLevel to use the search filter
    function getQueuesAtLevel(level, queue = queueData, currentLevel = 0, searchTerm = currentSearchTerm) {
        let visibleTree = collectVisibleQueues(queue, searchTerm);
        let result = [];

        function collectAtLevel(node, lvl) {
            if (lvl === level && node.visible) {
                result.push(node.queue);
            }
            node.visibleDescendants.forEach(childNode => collectAtLevel(childNode, lvl + 1));
        }

        collectAtLevel(visibleTree, 0);
        return result;
    }

    function renderLevelHeaders() {
        const levelHeadersContainer = document.getElementById('level-headers');
        levelHeadersContainer.innerHTML = '';

        const maxDepth = calculateMaxDepth(queueData);

        for (let i = 0; i <= maxDepth; i++) {
            const header = document.createElement('div');
            header.className = 'level-header';
            header.textContent = `Level ${i + 1}`;
            levelHeadersContainer.appendChild(header);
        }
    }

    function highlightMatch(text, searchTerm) {
        if (!searchTerm) return text;
        // Escape special regex characters in searchTerm
        const safeTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const re = new RegExp(safeTerm, 'ig');
        return text.replace(re, match => `<mark>${match}</mark>`);
    }


    function createQueueCard(queue, level) {
        const card = document.createElement('div');
        card.className = 'queue-card';

        const pendingChange = pendingChanges.get(queue.path);
        const isNewQueue = pendingAdditions.has(queue.path);
        const isToBeDeleted = pendingDeletions.has(queue.path);

        // Determine display capacity and visual percentage
        let displayCapacity, visualPercentage, capacityText, maxCapacityText, maxCapacityClass = '';
        let mode = queue.capacityMode;
        let maxCapacity = queue.maxCapacity;
        let maxCapacityIsAbsolute = false;

        if (pendingChange && pendingChange.capacity !== undefined) {
            displayCapacity = pendingChange.capacity;
            mode = pendingChange.capacityMode || queue.capacityMode;
            capacityText = formatCapacityDisplay(displayCapacity, mode, null, pendingChange.capacityVector);
            if (mode === 'weight' || mode === 'vector') visualPercentage = 20;
            else if (mode === 'absolute') visualPercentage = 30;
            else visualPercentage = parseFloat(displayCapacity) || 0;
            maxCapacity = pendingChange.maxCapacity !== undefined ? pendingChange.maxCapacity : queue.maxCapacity;
        } else {
            displayCapacity = queue.capacity;
            if (queue.effectiveCapacity !== undefined && queue.effectiveCapacity !== null) {
                visualPercentage = parseFloat(queue.effectiveCapacity);
            } else if (queue.absoluteCapacity !== undefined && queue.absoluteCapacity !== null) {
                visualPercentage = parseFloat(queue.absoluteCapacity);
            } else {
                visualPercentage = parseFloat(queue.capacity) || 0;
            }
            capacityText = formatCapacityDisplay(queue.capacity, mode, queue.weight, queue.capacityVector);
        }

        // Format max capacity
        if (mode === 'absolute' || (typeof maxCapacity === 'string' && maxCapacity.startsWith('['))) {
            maxCapacityText = `<span class="queue-max-capacity-absolute" title="${maxCapacity}">${maxCapacity}</span>`;
            maxCapacityIsAbsolute = true;
        } else {
            maxCapacityText = `<span class="queue-capacity-max">${maxCapacity !== undefined ? maxCapacity : ''}${mode === 'weight' ? 'w' : '%'}</span>`;
        }

        const displayState = pendingChange ? pendingChange.state : queue.state;
        const hasChanges = pendingChange !== undefined;

        // Add styling for different states
        if (isNewQueue) card.classList.add('new-queue');
        else if (isToBeDeleted) card.classList.add('to-be-deleted');
        else if (hasChanges) card.classList.add('pending-changes');

        // Mode badge
        let modeBadge = '';
        if (queue.capacityMode === 'weight') modeBadge = `<span class="queue-mode-badge">Weight 𐄷</span>`;
        else if (queue.capacityMode === 'vector') modeBadge = `<span class="queue-mode-badge">Vector 📐</span>`;
        else if (queue.capacityMode === 'absolute') modeBadge = `<span class="queue-mode-badge">Absolute 🎯</span>`;
        if (queue.autoCreationEligibility === 'flexible') modeBadge += `<span class="queue-mode-badge">Auto-Creation ⚡</span>`;
        if (displayState === 'STOPPED') modeBadge += `<span class="queue-mode-badge">Stopped 🛑</span>`;

        // Menu button (modern, accessible)
        const menuButton = `
        <button class="queue-menu-btn" aria-label="Queue actions" tabindex="0" onclick="toggleQueueDropdown(event, '${queue.path}')">
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <circle cx="5" cy="12" r="2"/>
            <circle cx="12" cy="12" r="2"/>
            <circle cx="19" cy="12" r="2"/>
            </svg>
        </button>
        <div class="queue-dropdown" id="dropdown-${queue.path}">
            <div class="dropdown-item" onclick="openEditModal(findQueueByPath('${queue.path}'))">Edit Queue</div>
            <div class="dropdown-item" onclick="openAddQueueModalWithParent('${queue.path}')">Add Child Queue</div>
            ${queue.path !== 'root' ? `<div class="dropdown-item" onclick="markQueueForDeletion('${queue.path}')">Delete Queue</div>` : ''}
        </div>
        `;

        // Check deletion eligibility
        const deletionStatus = canQueueBeDeleted(queue.path);
        
        // Add deletion eligibility to dropdown
        const dropdownHtml = `
            <div class="queue-dropdown" id="dropdown-${queue.path}">
                <div class="dropdown-item" onclick="openEditModal(findQueueByPath('${queue.path}'))">
                    Edit Queue
                </div>
                <div class="dropdown-item" onclick="openAddQueueModalWithParent('${queue.path}')">
                    Add Child Queue
                </div>
                <div class="dropdown-item ${deletionStatus.canDelete ? '' : 'disabled'}" 
                    onclick="${deletionStatus.canDelete ? `markQueueForDeletion('${queue.path}')` : ''}"
                    title="${deletionStatus.canDelete ? 'Delete this queue' : deletionStatus.reason}">
                    Delete Queue ${deletionStatus.canDelete ? '' : '(disabled)'}
                </div>
            </div>
        `;

        // Compose card HTML
        card.innerHTML = `
        <div class="queue-header">
            <span class="queue-info-button" title="More info about this queue" onclick="openInfoModal(findQueueByPath('${queue.path}'))">ℹ️</span>
            <span class="queue-name" title="${queue.name}">${highlightMatch(queue.name, currentSearchTerm)}</span>
            <span class="queue-actions-menu">${menuButton}</span>
        </div>
        <hr>
        <div>
            ${modeBadge}
        </div>
        ${queueCapacity(capacityText, maxCapacityText, queue.capacityMode)}
        `

        /*
        ${queue.effectiveCapacity !== undefined && queue.effectiveCapacity !== queue.capacity
            ? `<div class="effective-capacity">Effective: ${queue.effectiveCapacity.toFixed(1)}%</div>`
            : ''}
         */

        // Click handler for editing (optional: you may want to remove click-to-edit for clarity)
        // card.addEventListener('click', (e) => {
        //     if (!e.target.closest('.queue-actions-menu')) {
        //         openEditModal(queue);
        //     }
        // });

        return card;
    }

    function queueCapacity(capacity, maxCapacity, capacityMode) {
        if (capacityMode === "percentage" || capacityMode === "weight") {
            return `
            <div class="queue-capacities">
                <span class="capacity-compact" title="Capacity">Cap: ${capacity}</span>
                <span class="separator"> | </span>
                <span class="capacity-compact" title="Max Capacity">Max: ${maxCapacity}</span>
            </div>
            `
        } else if (capacityMode === "absolute") {
            const keyValuePairs = capacity.slice(1, -1).split(',');
            let lines = ""
            keyValuePairs.forEach(pair => {
                const [key, value] = pair.split('=');
                lines += `<tr><td>${key}</td><td>${value}</td></tr>`
            });
            return `
            <h6>Capacity:</h6>
            <table>${lines}</table>
            <h6>Max Capacity:</h6>
            <span>${maxCapacity}</span>
            `
        } else {
            return `
            <h6>Capacity:</h6>
            <span>${capacity}</span>
            <h6>Max Capacity:</h6>
            <span>${maxCapacity}</span>
            `
        }
    }

    function renderQueueTree() {
        console.log('renderQueueTree called, queueData:', queueData);
        if (!queueData) return;

        const treeContainer = document.getElementById('queue-tree');
        treeContainer.innerHTML = '';
        queueElements.clear();

        const maxDepth = calculateMaxDepth(queueData);

        // Create columns for each level with consistent width
        for (let level = 0; level <= maxDepth; level++) {
            const column = document.createElement('div');
            column.className = 'queue-column';

            const queuesAtLevel = sortQueues(getQueuesAtLevel(level));

            queuesAtLevel.forEach(queue => {
                const card = createQueueCard(queue, level);
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

    function renderMinimap() {
        const minimap = document.getElementById('minimap');
        minimap.innerHTML = '';

        // Show a simplified view of all queues
        function addToMinimap(queue, depth = 0) {
            if (pendingDeletions.has(queue.path)) return;

            const queueMini = document.createElement('div');
            queueMini.className = 'minimap-queue';

            let displayCapacity;
            if (queue.capacityMode === 'weight') {
                displayCapacity = queue.effectiveCapacity || queue.absoluteCapacity || 20;
            } else {
                displayCapacity = pendingChanges.get(queue.path)?.capacity || queue.capacity;
            }

            queueMini.style.height = `${Math.max(displayCapacity * 0.8, 10)}%`;
            queueMini.style.opacity = Math.max(1 - depth * 0.2, 0.3);

            if (pendingAdditions.has(queue.path)) {
                queueMini.style.background = '#28a745';
            } else if (pendingChanges.has(queue.path)) {
                queueMini.style.background = '#ffc107';
            }

            minimap.appendChild(queueMini);

            // Add children
            Object.values(queue.children).forEach(child => {
                addToMinimap(child, depth + 1);
            });

            // Add new children
            Array.from(pendingAdditions.values()).forEach(newQueue => {
                if (newQueue.parentPath === queue.path) {
                    addToMinimap(newQueue, depth + 1);
                }
            });
        }

        if (queueData) {
            addToMinimap(queueData);
        }
    }

    function canQueueBeDeleted(queuePath) {
        if (queuePath === 'root') {
            return { canDelete: false, reason: 'Cannot delete root queue' };
        }

        const queue = findQueueByPath(queuePath);
        if (!queue) {
            return { canDelete: false, reason: 'Queue not found' };
        }

        const hasChildren = Object.keys(queue.children).length > 0;
        const hasNewChildren = Array.from(pendingAdditions.values()).some(newQueue =>
            newQueue.parentPath === queuePath
        );

        if (!hasChildren && !hasNewChildren) {
            return { canDelete: true, reason: 'No children' };
        }

        // Check if there are new children
        if (hasNewChildren) {
            return { canDelete: false, reason: 'Has pending new child queues' };
        }

        // Check if all existing children are marked for deletion
        const existingChildren = Object.values(queue.children);
        const allChildrenMarkedForDeletion = existingChildren.every(child =>
            pendingDeletions.has(child.path)
        );

        if (allChildrenMarkedForDeletion) {
            return { canDelete: true, reason: 'All children marked for deletion' };
        }

        const activeChildren = existingChildren.filter(child => !pendingDeletions.has(child.path));
        return { 
            canDelete: false, 
            reason: `Has active child queues: ${activeChildren.map(c => c.name).join(', ')}` 
        };
    }

    window.renderQueueTree = renderQueueTree;
    window.createQueueCard = createQueueCard;
    window.calculateMaxDepth = calculateMaxDepth;
    window.getQueuesAtLevel = getQueuesAtLevel;

