const MIN_SANKEY_LINK_WIDTH = 20; // Minimum width in pixels for a link
const MAX_SANKEY_LINK_WIDTH = 200; // Maximum width in pixels for a link
const DEFAULT_SANKEY_LINK_WIDTH = 40; // Default width if capacity info is unavailable
const MIN_VISIBLE_SANKEY_WIDTH = 2; // Smallest pixel value to ensure link is drawn

class QueueTreeView extends EventEmitter {
    constructor(appStateModel) {
        super();
        this.appStateModel = appStateModel;

        this.treeContainerEl = DomUtils.getById('queue-tree');
        this.levelHeadersContainerEl = DomUtils.getById('level-headers');
        this.arrowSvgEl = DomUtils.getById('arrow-svg'); // Renamed in HTML to 'connector-svg' for clarity

        this.queueElements = new Map(); // Stores DOM elements of queue cards, keyed by queuePath
        this._connectorDrawTimeoutId = null; // For debouncing connector drawing
        this._currentFormattedHierarchy = null; // To store the last used data for drawing

        // Virtual scrolling for performance optimization
        this.virtualTree = null;
        this.useVirtualScrolling = false;
        this.virtualScrollingThreshold = 20; // Enable virtual scrolling for 20+ queues

        if (!this.treeContainerEl || !this.levelHeadersContainerEl || !this.arrowSvgEl) {
            console.error('QueueTreeView: Required DOM elements (queue-tree, level-headers, or arrow-svg) not found.');
        }

        // Global click listener to hide open dropdowns for queue cards
        document.addEventListener('click', (event) => {
            if (!event.target.closest('.queue-menu-btn') && !event.target.closest('.queue-dropdown')) {
                for (const dropdown of DomUtils.qsa('.queue-dropdown.show')) {
                    dropdown.classList.remove('show');
                }
            }
        });
    }

    setCurrentFormattedHierarchy(hierarchy) {
        this._currentFormattedHierarchy = hierarchy;
    }

    getCurrentFormattedHierarchy() {
        return this._currentFormattedHierarchy;
    }

    /**
     * Determines if virtual scrolling should be enabled based on queue count.
     * @param {Object} formattedHierarchyRoot - The root of the formatted queue hierarchy
     * @returns {boolean} True if virtual scrolling should be used
     */
    _shouldUseVirtualScrolling(formattedHierarchyRoot) {
        if (!formattedHierarchyRoot) return false;
        
        const countQueues = (node) => {
            let count = 1;
            if (node.children) {
                for (const child of Object.values(node.children)) {
                    if (child && !child.isDeleted) {
                        count += countQueues(child);
                    }
                }
            }
            return count;
        };
        
        return countQueues(formattedHierarchyRoot) >= this.virtualScrollingThreshold;
    }

    /**
     * Initializes virtual scrolling if needed.
     * @param {Object} formattedHierarchyRoot - The root of the formatted queue hierarchy
     */
    _initializeVirtualScrolling(formattedHierarchyRoot) {
        if (this._shouldUseVirtualScrolling(formattedHierarchyRoot)) {
            this.useVirtualScrolling = true;
            
            if (!this.virtualTree) {
                this.virtualTree = new VirtualQueueTree(this.treeContainerEl, {
                    itemHeight: 120,
                    itemWidth: 300,
                    columnGap: 50,
                    levelIndent: 350,
                    buffer: 5
                });
            }
            
            this.virtualTree.setData(formattedHierarchyRoot);
        } else {
            this.useVirtualScrolling = false;
            if (this.virtualTree) {
                this.virtualTree.destroy();
                this.virtualTree = null;
            }
        }
    }

    /**
     * Renders the entire queue tree.
     * @param {Object | null} formattedHierarchyRoot - The root of the formatted queue hierarchy.
     * @param {boolean} [drawConnectors=true] - Whether to schedule connector drawing after rendering cards.
     */
    render(formattedHierarchyRoot, drawConnectors = true) {
        this.setCurrentFormattedHierarchy(formattedHierarchyRoot);

        if (!this.treeContainerEl || !this.levelHeadersContainerEl) {
            console.warn('QueueTreeView.render: Core containers not found.');
            return;
        }

        // Clean up existing virtual tree if switching modes
        if (this.virtualTree && !this._shouldUseVirtualScrolling(formattedHierarchyRoot)) {
            this.virtualTree.destroy();
            this.virtualTree = null;
        }

        DomUtils.empty(this.treeContainerEl);
        DomUtils.empty(this.levelHeadersContainerEl);
        this.queueElements.clear();
        this.clearConnectors(); // Clear previous connectors

        if (!formattedHierarchyRoot) {
            this.treeContainerEl.innerHTML = "<p style='text-align:center; padding:20px;'>No queue data loaded.</p>";
            this._renderLevelHeaders(-1);
            this._emit('treeRendered', { hasContent: false });
            return;
        }

        // Initialize virtual scrolling if needed
        this._initializeVirtualScrolling(formattedHierarchyRoot);

        // Use virtual scrolling for large datasets
        if (this.useVirtualScrolling) {
            this._renderVirtualized(formattedHierarchyRoot, drawConnectors);
            return;
        }

        // Render using traditional method for smaller datasets
        this._renderTraditional(formattedHierarchyRoot, drawConnectors);
    }

    /**
     * Renders queue tree using virtual scrolling for large datasets.
     * @param {Object} formattedHierarchyRoot - The root of the formatted queue hierarchy
     * @param {boolean} drawConnectors - Whether to draw connectors
     */
    _renderVirtualized(formattedHierarchyRoot, drawConnectors) {
        if (!this.virtualTree) return;

        console.log(`QueueTreeView: Using virtual scrolling for large hierarchy`);

        // Set up virtual scrolling container styling
        this.treeContainerEl.style.position = 'relative';
        this.treeContainerEl.style.height = '600px'; // Fixed height for virtual scrolling
        this.treeContainerEl.style.overflow = 'hidden';

        // Let virtual tree handle the rendering
        this.virtualTree.forceUpdate();

        // Render actual queue cards for visible nodes
        this._renderVisibleVirtualNodes();

        // Level headers for virtual mode
        const maxDepth = this._calculateMaxDepthOfFormattedTree(formattedHierarchyRoot);
        this._renderLevelHeaders(maxDepth);

        // Schedule connector drawing for visible nodes only
        if (drawConnectors) {
            this._scheduleVirtualConnectorDraw();
        }

        this._emit('treeRendered', { hasContent: true, virtualized: true });
    }

    /**
     * Renders visible virtual nodes as actual DOM elements.
     */
    _renderVisibleVirtualNodes() {
        if (!this.virtualTree) return;

        const visibleNodes = this.virtualTree.getVisibleNodes();
        const searchTermLC = (this.appStateModel.getCurrentSearchTerm() || '').toLowerCase();

        for (const { node, position } of visibleNodes) {
            // Create the actual queue card
            const cardElement = QueueCardView.createCardElement(node, searchTermLC, (eventName, queuePath) => {
                this._emit(eventName, queuePath);
            });

            // Position it according to virtual tree layout
            cardElement.style.position = 'absolute';
            cardElement.style.left = `${position.x}px`;
            cardElement.style.top = `${position.y}px`;
            cardElement.style.width = `${position.width}px`;
            cardElement.style.height = `${position.height}px`;

            this.treeContainerEl.appendChild(cardElement);
            this.queueElements.set(node.path, cardElement);
        }
    }

    /**
     * Schedules connector drawing for virtual mode (visible nodes only).
     */
    _scheduleVirtualConnectorDraw() {
        if (!this.arrowSvgEl || !this.virtualTree) return;

        clearTimeout(this._connectorDrawTimeoutId);
        this._connectorDrawTimeoutId = setTimeout(() => {
            this.clearConnectors();
            this._drawVirtualConnectors();
        }, CONFIG.TIMEOUTS.ARROW_RENDER);
    }

    /**
     * Draws connectors for visible virtual nodes only.
     */
    _drawVirtualConnectors() {
        if (!this.virtualTree || !this.arrowSvgEl) return;

        const svgRect = this.arrowSvgEl.getBoundingClientRect();
        const visibleNodes = this.virtualTree.getVisibleNodes();

        // Create a map of visible node paths for quick lookup
        const visiblePaths = new Set(visibleNodes.map(({ node }) => node.path));

        // Draw connectors only between visible nodes
        for (const { node } of visibleNodes) {
            if (node.children) {
                for (const child of Object.values(node.children)) {
                    if (child && !child.isDeleted && visiblePaths.has(child.path)) {
                        const parentElement = this.queueElements.get(node.path);
                        const childElement = this.queueElements.get(child.path);

                        if (parentElement && childElement) {
                            const parentRect = parentElement.getBoundingClientRect();
                            const childRect = childElement.getBoundingClientRect();
                            this._drawSankeyLinkToChild(parentRect, childRect, svgRect, this.arrowSvgEl, child);
                        }
                    }
                }
            }
        }
    }

    /**
     * Traditional rendering method for smaller datasets.
     * @param {Object} formattedHierarchyRoot - The root of the formatted queue hierarchy
     * @param {boolean} drawConnectors - Whether to draw connectors
     */
    _renderTraditional(formattedHierarchyRoot, drawConnectors) {
        const isEffectivelyEmptyRoot =
            formattedHierarchyRoot.path === 'root' &&
            Object.keys(formattedHierarchyRoot.children || {}).length === 0 &&
            !formattedHierarchyRoot.isNew &&
            !formattedHierarchyRoot.hasPendingChanges &&
            (!formattedHierarchyRoot.effectiveProperties || formattedHierarchyRoot.effectiveProperties.size <= 1); // Only path prop

        if (isEffectivelyEmptyRoot) {
            this.treeContainerEl.innerHTML =
                "<p style='text-align:center; padding:20px;'>No queues configured beyond root.</p>";
            this._renderLevelHeaders(0); // Header for root
            
            // Create column containers for empty root case
            const columnContainers = [];
            const colDiv = DomUtils.createElement('div', 'queue-column');
            this.treeContainerEl.append(colDiv);
            columnContainers.push(colDiv);
            
            // Still need to render the root card itself if it exists
            const cardElement = QueueCardView.createCardElement(formattedHierarchyRoot, '', (eventName, queuePath) => {
                this._emit(eventName, queuePath);
            });
            if (columnContainers[0]) columnContainers[0].append(cardElement);
            this.queueElements.set(formattedHierarchyRoot.path, cardElement);

            this._emit('treeRendered', { hasContent: true });
            return; // No connectors to draw if only root
        }

        const searchTermLC = (this.appStateModel.getCurrentSearchTerm() || '').toLowerCase();
        const visibilityMemo = new Map();

        if (searchTermLC && !this._doesNodeOrDescendantMatch(formattedHierarchyRoot, searchTermLC, visibilityMemo)) {
            this.treeContainerEl.innerHTML =
                "<p style='text-align:center; padding:20px;'>No queues match your search criteria.</p>";
            this._renderLevelHeaders(-1);
            this._emit('treeRendered', { hasContent: false });
            return;
        }

        let maxActualDepthRendered = -1;
        const columnContainers = [];
        const estimatedMaxDepth = this._calculateMaxDepthOfFormattedTree(formattedHierarchyRoot);

        for (let i = 0; i <= Math.max(0, estimatedMaxDepth); i++) {
            const colDiv = DomUtils.createElement('div', 'queue-column');
            this.treeContainerEl.append(colDiv);
            columnContainers.push(colDiv);
        }

        const renderNodeRecursive = (node) => {
            if (!node || node.isDeleted) return;
            if (searchTermLC && !this._doesNodeOrDescendantMatch(node, searchTermLC, visibilityMemo)) return;

            const currentLevel = node.level;
            if (currentLevel > maxActualDepthRendered) maxActualDepthRendered = currentLevel;

            if (columnContainers[currentLevel]) {
                const cardElement = QueueCardView.createCardElement(node, searchTermLC, (eventName, queuePath) => {
                    this._emit(eventName, queuePath);
                });
                columnContainers[currentLevel].append(cardElement);
                this.queueElements.set(node.path, cardElement);
            } else {
                console.warn(
                    `QueueTreeView: Column container for level ${currentLevel} (queue: ${node.path}) not found.`
                );
            }

            if (node.children) {
                const childrenToRender = this._sortQueueChildren(Object.values(node.children));
                for (const childNode of childrenToRender) renderNodeRecursive(childNode);
            }
        };

        renderNodeRecursive(formattedHierarchyRoot);
        this._renderLevelHeaders(maxActualDepthRendered);

        if (drawConnectors && formattedHierarchyRoot && this.queueElements.size > 1) {
            // Only draw if more than root
            this._scheduleConnectorDraw(formattedHierarchyRoot);
        }

        this._emit('treeRendered', {
            hasContent: maxActualDepthRendered >= 0 || formattedHierarchyRoot.path === 'root',
        });
    }

    _scheduleConnectorDraw(hierarchyRootToDraw) {
        if (!this.arrowSvgEl || !hierarchyRootToDraw) return;
        clearTimeout(this._connectorDrawTimeoutId);

        this._connectorDrawTimeoutId = setTimeout(() => {
            this.clearConnectors(); // Clear previous connectors

            const svgRect = this.arrowSvgEl.getBoundingClientRect();
            if ((svgRect.width === 0 || svgRect.height === 0) && this.queueElements.size > 1) {
                // Could add a single retry attempt here if needed.
            }
            if (this.queueElements.size > 0) {
                this._actualDrawRecursive(hierarchyRootToDraw, svgRect, this.arrowSvgEl);
            }
        }, CONFIG.TIMEOUTS.ARROW_RENDER + 50); // Slightly increased delay
    }

    _actualDrawRecursive(parentNode, svgRect, svgContainer) {
        if (!parentNode || parentNode.isDeleted || !parentNode.path) return;
        const parentElement = this.queueElements.get(parentNode.path);
        if (!parentElement) return;

        const parentRect = parentElement.getBoundingClientRect();
        if ((parentRect.width === 0 || parentRect.height === 0) && parentNode.path !== 'root') return;

        if (parentNode.children) {
            for (const childNode of Object.values(parentNode.children)) {
                if (childNode && !childNode.isDeleted && childNode.path) {
                    const childElement = this.queueElements.get(childNode.path);
                    if (childElement) {
                        const childRect = childElement.getBoundingClientRect();
                        if (childRect.width === 0 || childRect.height === 0) continue;
                        this._drawSankeyLinkToChild(parentRect, childRect, svgRect, svgContainer, childNode);
                        this._actualDrawRecursive(childNode, svgRect, svgContainer);
                    }
                }
            }
        }
    }

    _drawSankeyLinkToChild(parentRect, childRect, svgRect, svgContainer, childNode) {
        // Calculate dynamic link width based on childNode.absoluteCapacity (live info)
        let dynamicWidth = DEFAULT_SANKEY_LINK_WIDTH;
        if (childNode && typeof childNode.absoluteCapacity === 'number' && !Number.isNaN(childNode.absoluteCapacity)) {
            const capacityPercent = Math.max(0, Math.min(100, childNode.absoluteCapacity)) / 100; // Normalize 0-1
            dynamicWidth = MIN_SANKEY_LINK_WIDTH + (MAX_SANKEY_LINK_WIDTH - MIN_SANKEY_LINK_WIDTH) * capacityPercent;
        }
        // Ensure the width is at least a minimally visible amount
        dynamicWidth = Math.max(MIN_VISIBLE_SANKEY_WIDTH, dynamicWidth);

        const startY = parentRect.top + parentRect.height / 2 - svgRect.top;
        const endY = childRect.top + childRect.height / 2 - svgRect.top;
        const startX = parentRect.right - svgRect.left;
        const endX = childRect.left - svgRect.left;

        if (startX >= endX - dynamicWidth) {
            // Ensure there's space for the link
            // console.warn(`Skipping link from ${childNode.parentPath} to ${childNode.path} due to layout.`);
            return;
        }

        const childState = childNode.state ? childNode.state.toUpperCase() : 'UNKNOWN';
        let linkClass = 'sankey-link';
        if (childState === 'STOPPED') linkClass += ' state-stopped';
        else if (childState === 'RUNNING') linkClass += ' state-running';
        else linkClass += ' state-unknown';

        const c1x = startX + (endX - startX) * 0.35;
        const c2x = endX - (endX - startX) * 0.35;

        const d = [
            `M ${startX},${startY - dynamicWidth / 2}`,
            `C ${c1x},${startY - dynamicWidth / 2}, ${c2x},${endY - dynamicWidth / 2}, ${endX},${endY - dynamicWidth / 2}`,
            `L ${endX},${endY + dynamicWidth / 2}`,
            `C ${c2x},${endY + dynamicWidth / 2}, ${c1x},${startY + dynamicWidth / 2}, ${startX},${startY + dynamicWidth / 2}`,
            `Z`,
        ].join(' ');

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', d);
        path.setAttribute('class', linkClass);
        svgContainer.append(path);
    }

    clearConnectors() {
        if (this.arrowSvgEl) {
            const existingPaths = this.arrowSvgEl.querySelectorAll('path.sankey-link, path.arrow-line');
            for (const path of existingPaths) path.remove();
        }
        clearTimeout(this._connectorDrawTimeoutId);
    }

    /**
     * Cleans up resources when the view is destroyed.
     */
    destroy() {
        if (this.virtualTree) {
            this.virtualTree.destroy();
            this.virtualTree = null;
        }
        
        this.queueElements.clear();
        this.clearConnectors();
        
        if (this._connectorDrawTimeoutId) {
            clearTimeout(this._connectorDrawTimeoutId);
            this._connectorDrawTimeoutId = null;
        }
    }

    /**
     * Scrolls to a specific queue, works with both traditional and virtual modes.
     * @param {string} queuePath - Full queue path to scroll to
     * @param {Object} options - Scroll options
     */
    scrollToQueue(queuePath, options = {}) {
        if (this.useVirtualScrolling && this.virtualTree) {
            this.virtualTree.scrollToQueue(queuePath, options);
        } else {
            // Traditional scrolling
            const element = this.queueElements.get(queuePath);
            if (element) {
                element.scrollIntoView({
                    behavior: options.smooth ? 'smooth' : 'auto',
                    block: options.center ? 'center' : 'nearest'
                });
            }
        }
    }

    _renderLevelHeaders(maxDepth) {
        if (!this.levelHeadersContainerEl) return;
        DomUtils.empty(this.levelHeadersContainerEl);
        if (maxDepth < 0) return;
        for (let i = 0; i <= maxDepth; i++) {
            const header = DomUtils.createElement('div', 'level-header', null, `Level ${i + 1}`);
            this.levelHeadersContainerEl.append(header);
        }
    }

    _calculateMaxDepthOfFormattedTree(node) {
        if (!node) return -1;
        let maxDepth = node.level === undefined ? 0 : node.level;
        if (node.children) {
            for (const child of Object.values(node.children)) {
                if (child && !child.isDeleted) {
                    maxDepth = Math.max(maxDepth, this._calculateMaxDepthOfFormattedTree(child));
                }
            }
        }
        return maxDepth;
    }

    _sortQueueChildren(childrenArray) {
        const sortCriteria = this.appStateModel.getCurrentSortCriteria();
        return childrenArray
            .filter((c) => c && !c.isDeleted)
            .sort((a, b) => {
                if (!a || !b) return 0;
                const getSortableCap = (q) => {
                    if (typeof q.sortableCapacity === 'number') return q.sortableCapacity;
                    if (q.capacityDisplayForLabel) {
                        // Prefer label-specific if shown
                        const value = Number.parseFloat(String(q.capacityDisplayForLabel).replaceAll(/[^\d.-]/g, ''));
                        return Number.isNaN(value) ? 0 : value;
                    }
                    if (q.capacityDisplay) {
                        const value = Number.parseFloat(String(q.capacityDisplay).replaceAll(/[^\d.-]/g, ''));
                        return Number.isNaN(value) ? 0 : value;
                    }
                    return 0;
                };
                if (sortCriteria === 'capacity') {
                    return getSortableCap(b) - getSortableCap(a);
                } else if (sortCriteria === 'name') {
                    return (a.displayName || '').localeCompare(b.displayName || '');
                }
                return 0;
            });
    }

    _nodeItselfMatches(node, searchTermLC) {
        if (!searchTermLC) return true;
        return (
            (node.displayName || '').toLowerCase().includes(searchTermLC) ||
            (node.path || '').toLowerCase().includes(searchTermLC)
        );
    }

    _doesNodeOrDescendantMatch(node, searchTermLC, memo) {
        if (!node) return false;
        if (!searchTermLC) return true;
        if (memo.has(node.path)) return memo.get(node.path);

        if (this._nodeItselfMatches(node, searchTermLC)) {
            memo.set(node.path, true);
            return true;
        }
        if (node.children) {
            for (const childSegment in node.children) {
                const child = node.children[childSegment];
                if (child && this._doesNodeOrDescendantMatch(child, searchTermLC, memo)) {
                    memo.set(node.path, true);
                    return true;
                }
            }
        }
        memo.set(node.path, false);
        return false;
    }
}
