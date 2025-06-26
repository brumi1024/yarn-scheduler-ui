import dagre from 'dagre';
import type { QueueNode } from '../../../types';

export interface LayoutPosition {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface DagreLayoutOptions {
    nodeWidth?: number;
    nodeHeight?: number;
    horizontalSpacing?: number;
    verticalSpacing?: number;
    orientation?: 'horizontal' | 'vertical';
}

export class DagreLayout {
    private options: Required<DagreLayoutOptions>;

    constructor(options: DagreLayoutOptions = {}) {
        this.options = {
            nodeWidth: 280,
            nodeHeight: 220,
            horizontalSpacing: 50,
            verticalSpacing: 100,
            orientation: 'vertical',
            ...options,
        };
    }

    /**
     * Calculate positions for all nodes in the queue tree using Dagre
     */
    calculatePositions(root: QueueNode): Map<string, LayoutPosition> {
        const positions = new Map<string, LayoutPosition>();
        
        // Create a new directed graph
        const g = new dagre.graphlib.Graph();
        
        // Set graph configuration
        g.setGraph({
            rankdir: this.options.orientation === 'horizontal' ? 'LR' : 'TB',
            nodesep: this.options.horizontalSpacing,
            ranksep: this.options.verticalSpacing,
            marginx: 0,
            marginy: 0,
        });
        
        // Default edge label
        g.setDefaultEdgeLabel(() => ({}));
        
        // Add nodes and edges recursively
        this.addNodesRecursively(g, root);
        
        // Run the layout algorithm
        dagre.layout(g);
        
        // Extract positions
        g.nodes().forEach((nodeId) => {
            const node = g.node(nodeId);
            if (node) {
                positions.set(nodeId, {
                    x: node.x - this.options.nodeWidth / 2,
                    y: node.y - this.options.nodeHeight / 2,
                    width: this.options.nodeWidth,
                    height: this.options.nodeHeight,
                });
            }
        });
        
        return positions;
    }

    /**
     * Get the bounds of the layout
     */
    getBounds(positions: Map<string, LayoutPosition>): {
        minX: number;
        minY: number;
        maxX: number;
        maxY: number;
    } {
        if (positions.size === 0) {
            return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
        }

        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        positions.forEach((pos) => {
            minX = Math.min(minX, pos.x);
            minY = Math.min(minY, pos.y);
            maxX = Math.max(maxX, pos.x + pos.width);
            maxY = Math.max(maxY, pos.y + pos.height);
        });

        return { minX, minY, maxX, maxY };
    }

    /**
     * Recursively add nodes and edges to the Dagre graph
     */
    private addNodesRecursively(
        g: dagre.graphlib.Graph,
        node: QueueNode,
        parent?: string
    ): void {
        // Add the node
        g.setNode(node.path, {
            label: node.name,
            width: this.options.nodeWidth,
            height: this.options.nodeHeight,
        });

        // Add edge from parent if exists
        if (parent) {
            g.setEdge(parent, node.path);
        }

        // Recursively add children
        node.children.forEach((child) => {
            this.addNodesRecursively(g, child, node.path);
        });
    }
}