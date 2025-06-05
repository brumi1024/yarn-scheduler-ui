/**
 * @file Implements virtual scrolling for large queue hierarchies to improve rendering performance.
 * Only renders visible queues plus a buffer, significantly reducing DOM operations.
 */

class VirtualQueueTree {
    constructor(container, options = {}) {
        this.container = container;
        this.scrollContainer = null;
        this.contentContainer = null;
        
        // Configuration
        this.itemHeight = options.itemHeight || 120; // Average queue card height
        this.itemWidth = options.itemWidth || 300; // Average queue card width
        this.columnGap = options.columnGap || 50;
        this.levelIndent = options.levelIndent || 350;
        this.buffer = options.buffer || 5; // Render buffer items outside viewport
        
        // State
        this.allNodes = [];
        this.nodePositions = new Map();
        this.visibleRange = { start: 0, end: 0 };
        this.scrollTop = 0;
        this.scrollLeft = 0;
        
        this._initializeContainers();
        this._bindScrollEvents();
    }

    /**
     * Sets the queue data and prepares for virtual rendering.
     * @param {Object} hierarchyData - Formatted queue hierarchy from ViewDataFormatterService
     */
    setData(hierarchyData) {
        this.allNodes = this._flattenHierarchy(hierarchyData);
        this._calculateNodePositions();
        this._updateVirtualContent();
    }

    /**
     * Updates the visible nodes based on current scroll position.
     * Called automatically on scroll, but can be triggered manually.
     */
    updateVisibleNodes() {
        const viewportTop = this.scrollTop;
        const viewportBottom = viewportTop + this.container.clientHeight;
        const viewportLeft = this.scrollLeft;
        const viewportRight = viewportLeft + this.container.clientWidth;
        
        // Calculate visible range with buffer
        const startIndex = Math.max(0, 
            Math.floor(viewportTop / this.itemHeight) - this.buffer
        );
        const endIndex = Math.min(this.allNodes.length - 1,
            Math.ceil(viewportBottom / this.itemHeight) + this.buffer
        );
        
        // Check if range changed significantly
        if (Math.abs(this.visibleRange.start - startIndex) > 1 || 
            Math.abs(this.visibleRange.end - endIndex) > 1) {
            this.visibleRange = { start: startIndex, end: endIndex };
            this._renderVisibleNodes(viewportLeft, viewportRight);
        }
    }

    /**
     * Forces a complete re-render of visible nodes.
     * Useful after data changes or container resize.
     */
    forceUpdate() {
        this._calculateNodePositions();
        this._updateVirtualContent();
        this.updateVisibleNodes();
    }

    /**
     * Scrolls to a specific queue by path.
     * @param {string} queuePath - Full queue path to scroll to
     * @param {Object} options - Scroll options (smooth, center, etc.)
     */
    scrollToQueue(queuePath, options = {}) {
        const nodeIndex = this.allNodes.findIndex(node => node.path === queuePath);
        if (nodeIndex === -1) return;
        
        const position = this.nodePositions.get(queuePath);
        if (!position) return;
        
        const scrollOptions = {
            top: position.y - (options.center ? this.container.clientHeight / 2 : 0),
            left: position.x - (options.center ? this.container.clientWidth / 2 : 0),
            behavior: options.smooth ? 'smooth' : 'auto'
        };
        
        this.scrollContainer.scrollTo(scrollOptions);
    }

    /**
     * Cleans up event listeners and DOM references.
     */
    destroy() {
        if (this.scrollContainer) {
            this.scrollContainer.removeEventListener('scroll', this._onScroll);
        }
        this.allNodes = [];
        this.nodePositions.clear();
    }

    _initializeContainers() {
        // Create scroll container
        this.scrollContainer = document.createElement('div');
        this.scrollContainer.className = 'virtual-scroll-container';
        this.scrollContainer.style.cssText = `
            position: relative;
            width: 100%;
            height: 100%;
            overflow: auto;
        `;
        
        // Create content container for actual size
        this.contentContainer = document.createElement('div');
        this.contentContainer.className = 'virtual-content-container';
        this.contentContainer.style.cssText = `
            position: relative;
            width: 1px;
            height: 1px;
        `;
        
        this.scrollContainer.appendChild(this.contentContainer);
        this.container.appendChild(this.scrollContainer);
    }

    _bindScrollEvents() {
        this._onScroll = () => {
            this.scrollTop = this.scrollContainer.scrollTop;
            this.scrollLeft = this.scrollContainer.scrollLeft;
            
            // Debounce scroll updates
            if (this._scrollTimeout) {
                cancelAnimationFrame(this._scrollTimeout);
            }
            this._scrollTimeout = requestAnimationFrame(() => {
                this.updateVisibleNodes();
            });
        };
        
        this.scrollContainer.addEventListener('scroll', this._onScroll, { passive: true });
    }

    _flattenHierarchy(node, result = [], level = 0) {
        if (!node) return result;
        
        result.push({
            ...node,
            level,
            index: result.length
        });
        
        if (node.children) {
            const childrenArray = Object.values(node.children);
            // Sort children for consistent positioning
            childrenArray.sort((a, b) => (a.sortableCapacity || 0) - (b.sortableCapacity || 0));
            
            for (const child of childrenArray) {
                this._flattenHierarchy(child, result, level + 1);
            }
        }
        
        return result;
    }

    _calculateNodePositions() {
        this.nodePositions.clear();
        let maxX = 0;
        let maxY = 0;
        
        // Group nodes by level for column layout
        const levelGroups = new Map();
        for (const node of this.allNodes) {
            if (!levelGroups.has(node.level)) {
                levelGroups.set(node.level, []);
            }
            levelGroups.get(node.level).push(node);
        }
        
        // Calculate positions
        let currentY = 0;
        for (const [level, nodes] of levelGroups) {
            const x = level * this.levelIndent;
            let levelHeight = 0;
            
            for (let i = 0; i < nodes.length; i++) {
                const node = nodes[i];
                const y = currentY + (i * (this.itemHeight + 20)); // 20px gap
                
                this.nodePositions.set(node.path, {
                    x,
                    y,
                    width: this.itemWidth,
                    height: this.itemHeight
                });
                
                levelHeight = Math.max(levelHeight, y + this.itemHeight);
                maxX = Math.max(maxX, x + this.itemWidth);
                maxY = Math.max(maxY, y + this.itemHeight);
            }
            
            currentY = levelHeight + this.columnGap;
        }
        
        // Update content container size
        this.contentContainer.style.width = `${maxX + 100}px`;
        this.contentContainer.style.height = `${maxY + 100}px`;
    }

    _updateVirtualContent() {
        // Clear existing rendered nodes
        const existingNodes = this.scrollContainer.querySelectorAll('.queue-node-virtual');
        for (const node of existingNodes) {
            node.remove();
        }
    }

    _renderVisibleNodes(viewportLeft, viewportRight) {
        // Clear previous renders
        const existingNodes = this.scrollContainer.querySelectorAll('.queue-node-virtual');
        for (const node of existingNodes) {
            node.remove();
        }
        
        // Render only visible nodes
        for (let i = this.visibleRange.start; i <= this.visibleRange.end; i++) {
            const node = this.allNodes[i];
            if (!node) continue;
            
            const position = this.nodePositions.get(node.path);
            if (!position) continue;
            
            // Check if node is in horizontal viewport
            if (position.x + position.width < viewportLeft - 100 || 
                position.x > viewportRight + 100) {
                continue;
            }
            
            const element = this._createNodeElement(node, position);
            this.scrollContainer.appendChild(element);
        }
        
        // Render connections for visible nodes
        this._renderVisibleConnections();
    }

    _createNodeElement(node, position) {
        const element = document.createElement('div');
        element.className = `queue-node-virtual ${node.statusClass || ''}`;
        element.dataset.queuePath = node.path;
        element.style.cssText = `
            position: absolute;
            left: ${position.x}px;
            top: ${position.y}px;
            width: ${position.width}px;
            height: ${position.height}px;
        `;
        
        // Create a placeholder that will be replaced by actual QueueCardView render
        element.innerHTML = `
            <div class="queue-card-placeholder" data-queue-path="${node.path}">
                <!-- QueueCardView will render here -->
            </div>
        `;
        
        return element;
    }

    _renderVisibleConnections() {
        // Simplified connection rendering for visible nodes
        const visibleNodes = new Set();
        for (let i = this.visibleRange.start; i <= this.visibleRange.end; i++) {
            const node = this.allNodes[i];
            if (node) visibleNodes.add(node.path);
        }
        
        // SVG for connections could be optimized here
        // For now, connections are handled by the main QueueTreeView
    }

    /**
     * Gets the currently visible queue nodes for external rendering.
     * @returns {Array} Array of visible queue nodes with positions
     */
    getVisibleNodes() {
        const visible = [];
        for (let i = this.visibleRange.start; i <= this.visibleRange.end; i++) {
            const node = this.allNodes[i];
            if (node) {
                const position = this.nodePositions.get(node.path);
                if (position) {
                    visible.push({ node, position });
                }
            }
        }
        return visible;
    }
}