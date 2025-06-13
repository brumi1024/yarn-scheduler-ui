import { hierarchy, tree } from 'd3-hierarchy';
import { easeCubicInOut } from 'd3-ease';
import type { HierarchyNode } from 'd3-hierarchy';
import type { Queue } from '../../types/Queue';

// Extended Queue type for layout purposes
export interface LayoutQueue extends Queue {
    id: string;
    queuePath?: string;
    children?: LayoutQueue[];
}

export interface TreeNode extends HierarchyNode<LayoutQueue> {
    x: number;
    y: number;
    collapsed?: boolean;
}

export interface LayoutNode {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    data: LayoutQueue;
    parent?: LayoutNode;
    children?: LayoutNode[];
}

export interface FlowPath {
    id: string;
    source: LayoutNode;
    target: LayoutNode;
    path: string;
    width: number;
    capacity: number;
    sourceStartY: number;
    sourceEndY: number;
    targetStartY: number;
    targetEndY: number;
}

export interface LayoutOptions {
    nodeWidth: number;
    nodeHeight: number;
    horizontalSpacing: number;
    verticalSpacing: number;
    orientation: 'horizontal' | 'vertical';
}

export interface LayoutData {
    nodes: LayoutNode[];
    flows: FlowPath[];
    bounds: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}

export class D3TreeLayout {
    private options: LayoutOptions;
    private collapsedNodes: Set<string> = new Set();

    constructor(options: Partial<LayoutOptions> = {}) {
        this.options = {
            nodeWidth: 280,
            nodeHeight: 120,
            horizontalSpacing: 120,
            verticalSpacing: 30,
            orientation: 'horizontal',
            ...options,
        };
    }

    /**
     * Compute layout for the queue hierarchy
     */
    computeLayout(root: LayoutQueue): LayoutData {
        // Create D3 hierarchy
        const hierarchyRoot = hierarchy<LayoutQueue>(root, (d) => (this.collapsedNodes.has(d.id) ? [] : d.children));

        // Create tree layout
        const treeLayout =
            this.options.orientation === 'horizontal'
                ? tree<LayoutQueue>()
                      .nodeSize([
                          this.options.nodeHeight + this.options.verticalSpacing,
                          this.options.nodeWidth + this.options.horizontalSpacing,
                      ])
                : tree<LayoutQueue>()
                      .nodeSize([
                          this.options.nodeWidth + this.options.horizontalSpacing,
                          this.options.nodeHeight + this.options.verticalSpacing,
                      ]);

        // Apply layout
        const treeNodes = treeLayout(hierarchyRoot);

        // Convert to LayoutNode format
        const layoutNodes = this.convertToLayoutNodes(treeNodes);

        // Calculate flow paths
        const flows = this.computeFlowPaths(layoutNodes);

        // Calculate bounds
        const bounds = this.calculateBounds(layoutNodes);

        return {
            nodes: layoutNodes,
            flows,
            bounds,
        };
    }

    /**
     * Toggle node collapse/expand state
     */
    toggleNodeCollapse(nodeId: string): void {
        if (this.collapsedNodes.has(nodeId)) {
            this.collapsedNodes.delete(nodeId);
        } else {
            this.collapsedNodes.add(nodeId);
        }
    }

    /**
     * Check if a node is collapsed
     */
    isNodeCollapsed(nodeId: string): boolean {
        return this.collapsedNodes.has(nodeId);
    }

    /**
     * Reset all collapsed states
     */
    resetCollapsedStates(): void {
        this.collapsedNodes.clear();
    }

    /**
     * Convert D3 hierarchy nodes to LayoutNode format
     */
    private convertToLayoutNodes(root: TreeNode): LayoutNode[] {
        const nodes: LayoutNode[] = [];
        const nodeMap = new Map<string, LayoutNode>();

        root.each((node) => {
            const layoutNode: LayoutNode = {
                id: node.data.id,
                x: this.options.orientation === 'horizontal' ? node.y : node.x,
                y: this.options.orientation === 'horizontal' ? node.x : node.y,
                width: this.options.nodeWidth,
                height: this.options.nodeHeight,
                data: node.data,
                children: [],
            };

            nodeMap.set(node.data.id, layoutNode);
            nodes.push(layoutNode);

            // Set parent reference
            if (node.parent && nodeMap.has(node.parent.data.id)) {
                layoutNode.parent = nodeMap.get(node.parent.data.id);
                layoutNode.parent!.children!.push(layoutNode);
            }
        });

        return nodes;
    }

    /**
     * Compute Sankey-style flow paths between nodes
     */
    private computeFlowPaths(nodes: LayoutNode[]): FlowPath[] {
        const flows: FlowPath[] = [];

        // Group nodes by parent to calculate proportional widths
        const nodesByParent = new Map<string, LayoutNode[]>();
        nodes.forEach((node) => {
            if (node.parent) {
                const parentId = node.parent.id;
                if (!nodesByParent.has(parentId)) {
                    nodesByParent.set(parentId, []);
                }
                nodesByParent.get(parentId)!.push(node);
            }
        });

        // Create Sankey-style flows for each parent-children group
        nodesByParent.forEach((children, parentId) => {
            const parent = nodes.find((n) => n.id === parentId);
            if (!parent) return;

            // TODO: Temporary hardcoded values for testing - replace with real capacity data
            const getTestCapacity = (queueName: string): number => {
                const testCapacities: { [key: string]: number } = {
                    prod: 50,
                    dev: 30,
                    test: 20,
                    app1: 50,
                    app2: 20,
                    app3: 20,
                };
                return testCapacities[queueName] || 50;
            };

            // Calculate total capacity of all children using test values
            const totalChildCapacity = children.reduce((sum, child) => {
                const childCapacity = getTestCapacity(child.data.queueName);
                return sum + childCapacity;
            }, 0);

            // Calculate proportional segments for each child, starting from top-right corner
            let currentY = 0;
            children.forEach((child) => {
                const childCapacity = getTestCapacity(child.data.queueName);
                const proportion = totalChildCapacity > 0 ? childCapacity / totalChildCapacity : 1 / children.length;
                const segmentHeight = parent.height * proportion;

                // Source segment (parent's right side, starting from top-right)
                const sourceStartY = parent.y + currentY;
                const sourceEndY = sourceStartY + segmentHeight;

                // Target segment (child's left side - full height)
                const targetStartY = child.y;
                const targetEndY = child.y + child.height;

                // Create Sankey path
                const path = this.calculateSankeyPath(
                    parent,
                    child,
                    sourceStartY,
                    sourceEndY,
                    targetStartY,
                    targetEndY
                );

                flows.push({
                    id: `${parent.id}-${child.id}`,
                    source: parent,
                    target: child,
                    path,
                    width: segmentHeight,
                    capacity: childCapacity,
                    sourceStartY,
                    sourceEndY,
                    targetStartY,
                    targetEndY,
                });

                currentY += segmentHeight;
            });
        });

        return flows;
    }

    /**
     * Calculate Sankey-style path with proper thickness
     */
    private calculateSankeyPath(
        source: LayoutNode,
        target: LayoutNode,
        sourceStartY: number,
        sourceEndY: number,
        targetStartY: number,
        targetEndY: number
    ): string {
        const borderRadius = 12; // Match the card border radius

        // Adjust connection points to account for rounded corners
        const sourceX = source.x + source.width;
        const targetX = target.x;

        // Clamp source Y coordinates to avoid sharp corners
        const sourceTop = Math.max(sourceStartY, source.y + borderRadius);
        const sourceBottom = Math.min(sourceEndY, source.y + source.height - borderRadius);

        // Clamp target Y coordinates to avoid sharp corners
        const targetTop = Math.max(targetStartY, target.y + borderRadius);
        const targetBottom = Math.min(targetEndY, target.y + target.height - borderRadius);

        // Control point distance for smooth curves
        const controlDistance = Math.abs(targetX - sourceX) * 0.4;

        // Create a path that represents the flow band
        const path = [
            // Start at top of source segment (avoiding rounded corner)
            `M ${sourceX} ${sourceTop}`,

            // Curve to top of target segment (avoiding rounded corner)
            `C ${sourceX + controlDistance} ${sourceTop}, ${targetX - controlDistance} ${targetTop}, ${targetX} ${targetTop}`,

            // Line down the left side of target (within safe zone)
            `L ${targetX} ${targetBottom}`,

            // Curve back to bottom of source segment (avoiding rounded corner)
            `C ${targetX - controlDistance} ${targetBottom}, ${sourceX + controlDistance} ${sourceBottom}, ${sourceX} ${sourceBottom}`,

            // Close path by going up the right side of source (within safe zone)
            `L ${sourceX} ${sourceTop}`,
            `Z`,
        ];

        return path.join(' ');
    }

    /**
     * Calculate bounding box for all nodes
     */
    private calculateBounds(nodes: LayoutNode[]): { x: number; y: number; width: number; height: number } {
        if (nodes.length === 0) {
            return { x: 0, y: 0, width: 0, height: 0 };
        }

        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        nodes.forEach((node) => {
            minX = Math.min(minX, node.x);
            minY = Math.min(minY, node.y);
            maxX = Math.max(maxX, node.x + node.width);
            maxY = Math.max(maxY, node.y + node.height);
        });

        // Add padding
        const padding = 50;
        return {
            x: minX - padding,
            y: minY - padding,
            width: maxX - minX + padding * 2,
            height: maxY - minY + padding * 2,
        };
    }

    /**
     * Update node positions for animated transitions
     */
    animateToNewLayout(
        currentNodes: LayoutNode[],
        targetLayout: LayoutData,
        _duration: number = 750
    ): { nodes: LayoutNode[]; flows: FlowPath[]; progress: number }[] {
        const frames: { nodes: LayoutNode[]; flows: FlowPath[]; progress: number }[] = [];
        const steps = 60; // 60 frames for smooth animation

        for (let i = 0; i <= steps; i++) {
            const progress = i / steps;
            const easedProgress = easeCubicInOut(progress);

            const interpolatedNodes = currentNodes.map((currentNode) => {
                const targetNode = targetLayout.nodes.find((n) => n.id === currentNode.id);
                if (!targetNode) return currentNode;

                return {
                    ...currentNode,
                    x: currentNode.x + (targetNode.x - currentNode.x) * easedProgress,
                    y: currentNode.y + (targetNode.y - currentNode.y) * easedProgress,
                };
            });

            // Recalculate flows for interpolated positions
            const interpolatedFlows = this.computeFlowPaths(interpolatedNodes);

            frames.push({
                nodes: interpolatedNodes,
                flows: interpolatedFlows,
                progress,
            });
        }

        return frames;
    }

    /**
     * Get nodes at a specific depth level
     */
    getNodesAtDepth(nodes: LayoutNode[], depth: number): LayoutNode[] {
        return nodes.filter((node) => {
            let currentDepth = 0;
            let parent = node.parent;
            while (parent) {
                currentDepth++;
                parent = parent.parent;
            }
            return currentDepth === depth;
        });
    }

    /**
     * Get maximum depth of the tree
     */
    getMaxDepth(nodes: LayoutNode[]): number {
        let maxDepth = 0;
        nodes.forEach((node) => {
            let depth = 0;
            let parent = node.parent;
            while (parent) {
                depth++;
                parent = parent.parent;
            }
            maxDepth = Math.max(maxDepth, depth);
        });
        return maxDepth;
    }
}
