/**
 * Dagre-based Layout Engine for YARN Queue Visualization
 * 
 * Replaces the D3 tree layout with Dagre for more stable and maintainable
 * graph layouts while preserving the exact same interface and visual behavior.
 */

import * as dagre from 'dagre';
import { scaleLinear } from 'd3-scale';
import { extent } from 'd3-array';
import { path } from 'd3-path';
import { easeCubicInOut } from 'd3-ease';
import { interpolateObject } from 'd3-interpolate';

// Re-export the exact same types from D3TreeLayout for compatibility
export interface LayoutQueue {
    id: string;
    queueName: string;
    queuePath?: string;
    capacity: number;
    usedCapacity: number;
    maxCapacity: number;
    absoluteCapacity: number;
    absoluteUsedCapacity: number;
    absoluteMaxCapacity: number;
    state: 'RUNNING' | 'STOPPED';
    numApplications: number;
    resourcesUsed: {
        memory: number;
        vCores: number;
    };
    children?: LayoutQueue[];
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
    depth?: number;
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
    rankdir?: 'TB' | 'BT' | 'LR' | 'RL';
    align?: 'UL' | 'UR' | 'DL' | 'DR';
    ranksep?: number;
    edgesep?: number;
    nodesep?: number;
    marginx?: number;
    marginy?: number;
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

export class DagreLayout {
    private options: LayoutOptions;
    private collapsedNodes: Set<string> = new Set();
    private dagreGraph: dagre.graphlib.Graph;

    constructor(options: Partial<LayoutOptions> = {}) {
        this.options = {
            nodeWidth: 280,
            nodeHeight: 120,
            horizontalSpacing: 120,
            verticalSpacing: 30,
            orientation: 'horizontal',
            rankdir: 'LR', // Left-to-Right for horizontal layout
            align: 'DL',   // Align nodes to lower-left for better centering
            marginx: 20,   // Horizontal margin for centering
            marginy: 20,   // Vertical margin for centering
            ...options,
        };

        this.dagreGraph = new dagre.graphlib.Graph();
        this.dagreGraph.setGraph({
            rankdir: this.options.rankdir,
            align: this.options.align,
            nodesep: this.options.horizontalSpacing,
            ranksep: this.options.verticalSpacing,
            edgesep: 20,
            marginx: this.options.marginx,
            marginy: this.options.marginy,
        });
        this.dagreGraph.setDefaultEdgeLabel(() => ({}));
    }

    /**
     * Compute layout for the queue hierarchy - same interface as D3TreeLayout
     */
    computeLayout(root: LayoutQueue): LayoutData {
        // Clear the graph for fresh layout
        this.dagreGraph = new dagre.graphlib.Graph();
        this.dagreGraph.setGraph({
            rankdir: this.options.rankdir,
            align: this.options.align,
            nodesep: this.options.horizontalSpacing,
            ranksep: this.options.verticalSpacing,
            edgesep: 20,
            marginx: this.options.marginx,
            marginy: this.options.marginy,
        });
        this.dagreGraph.setDefaultEdgeLabel(() => ({}));

        // Recursively add nodes and edges to the Dagre graph
        this.addNodesRecursively(root, null);

        // Calculate the layout
        dagre.layout(this.dagreGraph);

        // Convert to LayoutNode format with proper hierarchy
        const layoutNodes = this.convertToLayoutNodes(root);

        // Calculate flow paths (same logic as D3 implementation)
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
     * Toggle node collapse/expand state - same interface as D3TreeLayout
     */
    toggleNodeCollapse(nodeId: string): void {
        if (this.collapsedNodes.has(nodeId)) {
            this.collapsedNodes.delete(nodeId);
        } else {
            this.collapsedNodes.add(nodeId);
        }
    }

    /**
     * Check if a node is collapsed - same interface as D3TreeLayout
     */
    isNodeCollapsed(nodeId: string): boolean {
        return this.collapsedNodes.has(nodeId);
    }

    /**
     * Reset all collapsed states - same interface as D3TreeLayout
     */
    resetCollapsedStates(): void {
        this.collapsedNodes.clear();
    }

    /**
     * Recursively add nodes and edges to Dagre graph
     */
    private addNodesRecursively(queue: LayoutQueue, parentId: string | null): void {
        // Skip collapsed nodes
        if (this.collapsedNodes.has(queue.id)) {
            return;
        }

        this.dagreGraph.setNode(queue.id, {
            label: queue.queueName,
            width: this.options.nodeWidth,
            height: this.options.nodeHeight,
            data: queue,
        });

        if (parentId) {
            this.dagreGraph.setEdge(parentId, queue.id);
        }

        if (queue.children && queue.children.length > 0) {
            queue.children.forEach(child => {
                this.addNodesRecursively(child, queue.id);
            });
        }
    }

    /**
     * Convert Dagre output to LayoutNode format with hierarchy preservation
     */
    private convertToLayoutNodes(root: LayoutQueue): LayoutNode[] {
        const nodes: LayoutNode[] = [];
        const nodeMap = new Map<string, LayoutNode>();

        // Build hierarchy recursively to preserve parent-child relationships
        const buildHierarchy = (queue: LayoutQueue, parent: LayoutNode | null, depth: number) => {
            const dagreNode = this.dagreGraph.node(queue.id);
            if (!dagreNode) return; // Skip if node was collapsed

            const layoutNode: LayoutNode = {
                id: queue.id,
                x: dagreNode.x - dagreNode.width / 2, // Dagre positions from center, adjust to top-left
                y: dagreNode.y - dagreNode.height / 2,
                width: dagreNode.width,
                height: dagreNode.height,
                data: queue,
                children: [],
                depth: depth,
                parent: parent || undefined,
            };

            nodeMap.set(queue.id, layoutNode);
            nodes.push(layoutNode);

            // Add to parent's children
            if (parent) {
                parent.children!.push(layoutNode);
            }

            // Recursively process children
            if (queue.children && !this.collapsedNodes.has(queue.id)) {
                queue.children.forEach(child => {
                    buildHierarchy(child, layoutNode, depth + 1);
                });
            }
        };

        buildHierarchy(root, null, 0);
        return nodes;
    }

    /**
     * Compute flow paths - exact same logic as D3TreeLayout to preserve visual behavior
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

            // Use D3 scale for proportional distribution (same as D3TreeLayout)
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

                // Create optimized path (same as D3TreeLayout)
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
     * Create optimized flow path - exact same implementation as D3TreeLayout
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
     * Calculate bounding box - same implementation as D3TreeLayout
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
     * Create interpolation function - same interface as D3TreeLayout
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
     * Get nodes at a specific depth level - same interface as D3TreeLayout
     */
    getNodesAtDepth(nodes: LayoutNode[], targetDepth: number): LayoutNode[] {
        return nodes.filter((node) => node.depth === targetDepth);
    }

    /**
     * Get maximum depth of the tree - same interface as D3TreeLayout
     */
    getMaxDepth(nodes: LayoutNode[]): number {
        return nodes.reduce((max, node) => Math.max(max, node.depth || 0), 0);
    }

}