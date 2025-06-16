import { hierarchy, tree } from 'd3-hierarchy';
import { easeCubicInOut } from 'd3-ease';
import { extent } from 'd3-array';
import { scaleLinear } from 'd3-scale';
import { interpolateObject } from 'd3-interpolate';
import { path } from 'd3-path';
import type { HierarchyNode } from 'd3-hierarchy';
import type { Queue } from '../../../../types/Queue';

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
    depth?: number; // Store D3's depth for efficiency
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
                ? tree<LayoutQueue>().nodeSize([
                      this.options.nodeHeight + this.options.verticalSpacing,
                      this.options.nodeWidth + this.options.horizontalSpacing,
                  ])
                : tree<LayoutQueue>().nodeSize([
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

        // Use D3's built-in traversal and properties
        root.each((node) => {
            const layoutNode: LayoutNode = {
                id: node.data.id,
                x: this.options.orientation === 'horizontal' ? node.y : node.x,
                y: this.options.orientation === 'horizontal' ? node.x : node.y,
                width: this.options.nodeWidth,
                height: this.options.nodeHeight,
                data: node.data,
                children: [],
                depth: node.depth, // Store D3's depth calculation
            };

            nodeMap.set(node.data.id, layoutNode);
            nodes.push(layoutNode);

            // Use D3's parent reference directly
            if (node.parent) {
                const parentLayout = nodeMap.get(node.parent.data.id);
                if (parentLayout) {
                    layoutNode.parent = parentLayout;
                    parentLayout.children!.push(layoutNode);
                }
            }
        });

        return nodes;
    }

    /**
     * Compute optimized flow paths between nodes using D3 scales
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

        // Create flows for each parent-children group
        nodesByParent.forEach((children, parentId) => {
            const parent = nodes.find((n) => n.id === parentId);
            if (!parent) return;

            // Get capacities from actual queue data
            const childCapacities = children.map((child) => child.data.capacity || 0);
            const totalChildCapacity = childCapacities.reduce((sum, cap) => sum + cap, 0);

            // Use D3 scale for proportional distribution
            const capacityScale = scaleLinear().domain([0, totalChildCapacity]).range([0, parent.height]);

            let currentY = 0;
            children.forEach((child, index) => {
                const childCapacity = childCapacities[index];
                const segmentHeight = capacityScale(childCapacity);

                // Source segment (parent's right side)
                const sourceStartY = parent.y + currentY;
                const sourceEndY = sourceStartY + segmentHeight;

                // Target segment (child's left side - full height)
                const targetStartY = child.y;
                const targetEndY = child.y + child.height;

                // Create optimized path
                const path = this.createOptimizedFlowPath(
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
                    width: segmentHeight, // This represents the visual thickness of the flow
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
     * Create optimized flow path using D3 path generators
     */
    private createOptimizedFlowPath(
        source: LayoutNode,
        target: LayoutNode,
        sourceStartY: number,
        sourceEndY: number,
        targetStartY: number,
        targetEndY: number
    ): string {
        const borderRadius = 12;
        const sourceX = source.x + source.width;
        const targetX = target.x;

        // Clamp coordinates to avoid rounded corners
        const sourceTop = Math.max(sourceStartY, source.y + borderRadius);
        const sourceBottom = Math.min(sourceEndY, source.y + source.height - borderRadius);
        const targetTop = Math.max(targetStartY, target.y + borderRadius);
        const targetBottom = Math.min(targetEndY, target.y + target.height - borderRadius);

        // Use D3's path generator for cleaner construction
        const pathGenerator = path();

        // Optimized control point calculation
        const horizontalDistance = Math.abs(targetX - sourceX);
        const controlDistance = Math.min(horizontalDistance * 0.4, 80);

        // Build path using D3's path API instead of manual string construction
        pathGenerator.moveTo(sourceX, sourceTop);

        // Top curve using bezier
        pathGenerator.bezierCurveTo(
            sourceX + controlDistance,
            sourceTop,
            targetX - controlDistance,
            targetTop,
            targetX,
            targetTop
        );

        // Right edge
        pathGenerator.lineTo(targetX, targetBottom);

        // Bottom curve back
        pathGenerator.bezierCurveTo(
            targetX - controlDistance,
            targetBottom,
            sourceX + controlDistance,
            sourceBottom,
            sourceX,
            sourceBottom
        );

        // Close the path
        pathGenerator.closePath();

        return pathGenerator.toString();
    }

    /**
     * Calculate bounding box for all nodes using D3's extent
     */
    private calculateBounds(nodes: LayoutNode[]): { x: number; y: number; width: number; height: number } {
        if (nodes.length === 0) {
            return { x: 0, y: 0, width: 0, height: 0 };
        }

        // Use D3's extent for cleaner min/max calculations
        const xExtent = extent(nodes.flatMap((n) => [n.x, n.x + n.width])) as [number, number];
        const yExtent = extent(nodes.flatMap((n) => [n.y, n.y + n.height])) as [number, number];

        // Add padding
        const padding = 50;
        return {
            x: xExtent[0] - padding,
            y: yExtent[0] - padding,
            width: xExtent[1] - xExtent[0] + padding * 2,
            height: yExtent[1] - yExtent[0] + padding * 2,
        };
    }

    /**
     * Create interpolation function for smooth layout transitions using D3
     */
    createLayoutInterpolator(
        currentNodes: LayoutNode[],
        targetLayout: LayoutData
    ): (t: number) => { nodes: LayoutNode[]; flows: FlowPath[] } {
        // Create interpolators for each node using D3's interpolateObject
        const nodeInterpolators = currentNodes.map((currentNode) => {
            const targetNode = targetLayout.nodes.find((n) => n.id === currentNode.id);
            if (!targetNode) return () => currentNode;

            return interpolateObject({ x: currentNode.x, y: currentNode.y }, { x: targetNode.x, y: targetNode.y });
        });

        return (t: number) => {
            const easedT = easeCubicInOut(t);

            const interpolatedNodes = currentNodes.map((currentNode, index) => {
                const interpolator = nodeInterpolators[index];
                const interpolated = interpolator(easedT);

                return {
                    ...currentNode,
                    x: interpolated.x,
                    y: interpolated.y,
                };
            });

            // Recalculate flows for interpolated positions
            const interpolatedFlows = this.computeFlowPaths(interpolatedNodes);

            return {
                nodes: interpolatedNodes,
                flows: interpolatedFlows,
            };
        };
    }

    /**
     * Get nodes at a specific depth level
     */
    getNodesAtDepth(nodes: LayoutNode[], targetDepth: number): LayoutNode[] {
        // Use stored depth from D3
        return nodes.filter((node) => node.depth === targetDepth);
    }

    /**
     * Get maximum depth of the tree
     */
    getMaxDepth(nodes: LayoutNode[]): number {
        // Use stored depth from D3
        return nodes.reduce((max, node) => Math.max(max, node.depth || 0), 0);
    }
}
