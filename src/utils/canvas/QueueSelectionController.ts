import type { LayoutNode } from '../d3/D3TreeLayout';
import type { D3ZoomController } from './D3ZoomController';

export interface SelectionEvent {
    type: 'select' | 'deselect' | 'multi-select';
    nodeId: string;
    node: LayoutNode;
    selectedNodes: string[];
    modifiers: {
        shift: boolean;
        ctrl: boolean;
        meta: boolean;
    };
}

export interface HoverEvent {
    type: 'hover' | 'leave';
    nodeId?: string;
    node?: LayoutNode;
    position: { x: number; y: number };
}

export interface QueueSelectionConfig {
    enableMultiSelect: boolean;
    enableHover: boolean;
    hoverDelay: number;
}

const DEFAULT_CONFIG: QueueSelectionConfig = {
    enableMultiSelect: true,
    enableHover: true,
    hoverDelay: 200,
};

export class QueueSelectionController {
    private canvas: HTMLCanvasElement;
    private panZoomController: D3ZoomController;
    private config: QueueSelectionConfig;

    // State
    private nodes: LayoutNode[] = [];
    private selectedNodes: Set<string> = new Set();
    private hoveredNode: string | null = null;
    private hoverTimeout: number | null = null;

    // Event tracking (simplified since we only handle clicks now)

    // Event listeners
    private selectionListeners: ((event: SelectionEvent) => void)[] = [];
    private hoverListeners: ((event: HoverEvent) => void)[] = [];
    private eventListeners: (() => void)[] = [];

    constructor(
        canvas: HTMLCanvasElement,
        panZoomController: D3ZoomController,
        config: Partial<QueueSelectionConfig> = {}
    ) {
        this.canvas = canvas;
        this.panZoomController = panZoomController;
        this.config = { ...DEFAULT_CONFIG, ...config };

        this.setupEventListeners();
    }

    /**
     * Update the nodes for hit testing
     */
    updateNodes(nodes: LayoutNode[]): void {
        this.nodes = nodes;
    }

    /**
     * Get currently selected node IDs
     */
    getSelection(): string[] {
        return Array.from(this.selectedNodes);
    }

    /**
     * Select a node programmatically
     */
    selectNode(nodeId: string, multiSelect: boolean = false): void {
        const node = this.nodes.find((n) => n.id === nodeId);
        if (!node) return;

        if (!multiSelect) {
            this.selectedNodes.clear();
        }

        this.selectedNodes.add(nodeId);
        this.emitSelectionEvent('select', nodeId, node);
    }

    /**
     * Deselect a node
     */
    deselectNode(nodeId: string): void {
        const node = this.nodes.find((n) => n.id === nodeId);
        if (!node || !this.selectedNodes.has(nodeId)) return;

        this.selectedNodes.delete(nodeId);
        this.emitSelectionEvent('deselect', nodeId, node);
    }

    /**
     * Clear all selections
     */
    clearSelection(): void {
        // Emit deselect event for all previously selected nodes
        const prevSelected = Array.from(this.selectedNodes);
        this.selectedNodes.clear();

        prevSelected.forEach((nodeId) => {
            const node = this.nodes.find((n) => n.id === nodeId);
            if (node) {
                this.emitSelectionEvent('deselect', nodeId, node);
            }
        });
    }

    /**
     * Check if a node is selected
     */
    isSelected(nodeId: string): boolean {
        return this.selectedNodes.has(nodeId);
    }

    /**
     * Get hovered node ID
     */
    getHoveredNode(): string | null {
        return this.hoveredNode;
    }

    /**
     * Add selection event listener
     */
    addSelectionListener(listener: (event: SelectionEvent) => void): void {
        this.selectionListeners.push(listener);
    }

    /**
     * Remove selection event listener
     */
    removeSelectionListener(listener: (event: SelectionEvent) => void): void {
        this.selectionListeners = this.selectionListeners.filter(l => l !== listener);
    }

    /**
     * Add hover event listener
     */
    addHoverListener(listener: (event: HoverEvent) => void): void {
        this.hoverListeners.push(listener);
    }

    /**
     * Remove hover event listener
     */
    removeHoverListener(listener: (event: HoverEvent) => void): void {
        this.hoverListeners = this.hoverListeners.filter(l => l !== listener);
    }

    /**
     * Destroy controller and cleanup
     */
    destroy(): void {
        this.removeEventListeners();
        this.selectionListeners = [];
        this.hoverListeners = [];

        if (this.hoverTimeout !== null) {
            clearTimeout(this.hoverTimeout);
            this.hoverTimeout = null;
        }
    }

    /**
     * Setup event listeners
     */
    private setupEventListeners(): void {
        const onClick = (e: MouseEvent) => this.handleClick(e);
        const onMouseMove = (e: MouseEvent) => this.handleMouseMove(e);
        const onMouseLeave = () => this.handleMouseLeave();

        this.canvas.addEventListener('click', onClick);
        this.canvas.addEventListener('mousemove', onMouseMove);
        this.canvas.addEventListener('mouseleave', onMouseLeave);

        // Store cleanup functions
        this.eventListeners = [
            () => this.canvas.removeEventListener('click', onClick),
            () => this.canvas.removeEventListener('mousemove', onMouseMove),
            () => this.canvas.removeEventListener('mouseleave', onMouseLeave),
        ];
    }

    /**
     * Remove event listeners
     */
    private removeEventListeners(): void {
        this.eventListeners.forEach((cleanup) => cleanup());
        this.eventListeners = [];
    }

    /**
     * Handle mouse move
     */
    private handleMouseMove(e: MouseEvent): void {
        // Don't handle hover during pan/zoom operations
        // Note: dragging detection would need to be implemented in PanZoomController

        if (this.config.enableHover) {
            this.updateHover(e);
        }
    }

    /**
     * Handle mouse leave
     */
    private handleMouseLeave(): void {
        if (this.hoveredNode) {
            this.emitHoverEvent('leave', undefined, undefined, { x: 0, y: 0 });
            this.hoveredNode = null;
        }

        if (this.hoverTimeout !== null) {
            clearTimeout(this.hoverTimeout);
            this.hoverTimeout = null;
        }
    }

    /**
     * Handle click on canvas
     */
    private handleClick(e: MouseEvent): void {
        // Don't handle clicks if we were just dragging (pan/zoom)
        if (this.panZoomController.isDraggingActive()) {
            return;
        }

        const worldPos = this.panZoomController.screenToWorld(e.clientX, e.clientY);
        const hitNode = this.hitTest(worldPos.x, worldPos.y);

        const isMultiSelect = this.config.enableMultiSelect && (e.ctrlKey || e.metaKey);

        if (hitNode) {
            if (isMultiSelect) {
                if (this.selectedNodes.has(hitNode.id)) {
                    this.deselectNode(hitNode.id);
                } else {
                    this.selectNode(hitNode.id, true);
                }
            } else {
                this.selectNode(hitNode.id, false);
            }
        } else if (!isMultiSelect) {
            // Click on empty space - clear selection
            this.clearSelection();
        }
    }

    /**
     * Update hover state
     */
    private updateHover(e: MouseEvent): void {
        const worldPos = this.panZoomController.screenToWorld(e.clientX, e.clientY);
        const hitNode = this.hitTest(worldPos.x, worldPos.y);

        const newHoveredNodeId = hitNode?.id || null;

        if (newHoveredNodeId !== this.hoveredNode) {
            // Clear previous hover timeout
            if (this.hoverTimeout !== null) {
                clearTimeout(this.hoverTimeout);
                this.hoverTimeout = null;
            }

            // Emit leave event for previous node
            if (this.hoveredNode) {
                this.emitHoverEvent('leave', undefined, undefined, { x: e.clientX, y: e.clientY });
            }

            this.hoveredNode = newHoveredNodeId;

            // Emit hover event for new node (with delay)
            if (this.hoveredNode && hitNode) {
                this.hoverTimeout = window.setTimeout(() => {
                    this.emitHoverEvent('hover', this.hoveredNode!, hitNode, { x: e.clientX, y: e.clientY });
                }, this.config.hoverDelay);
            }
        }
    }

    /**
     * Hit test to find node at coordinates
     */
    private hitTest(worldX: number, worldY: number): LayoutNode | null {
        // Test nodes in reverse order (top nodes first)
        for (let i = this.nodes.length - 1; i >= 0; i--) {
            const node = this.nodes[i];

            if (
                worldX >= node.x &&
                worldX <= node.x + node.width &&
                worldY >= node.y &&
                worldY <= node.y + node.height
            ) {
                return node;
            }
        }

        return null;
    }

    /**
     * Emit selection event
     */
    private emitSelectionEvent(type: SelectionEvent['type'], nodeId: string, node: LayoutNode): void {
        const event: SelectionEvent = {
            type,
            nodeId,
            node,
            selectedNodes: Array.from(this.selectedNodes),
            modifiers: {
                shift: false, // We can add shift key detection later
                ctrl: false,
                meta: false,
            },
        };

        this.selectionListeners.forEach((listener) => listener(event));
    }

    /**
     * Emit hover event
     */
    private emitHoverEvent(
        type: HoverEvent['type'],
        nodeId?: string,
        node?: LayoutNode,
        position: { x: number; y: number } = { x: 0, y: 0 }
    ): void {
        const event: HoverEvent = {
            type,
            nodeId,
            node,
            position,
        };

        this.hoverListeners.forEach((listener) => listener(event));
    }
}
