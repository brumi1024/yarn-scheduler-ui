import type { LayoutNode, FlowPath } from './D3TreeLayout';

export interface SankeyNode {
    id: string;
    node: LayoutNode;
    x0?: number;
    x1?: number;
    y0?: number;
    y1?: number;
}

export interface SankeyLink {
    source: SankeyNode;
    target: SankeyNode;
    value: number;
    width?: number;
    y0?: number;
    y1?: number;
}

export interface SankeyFlowOptions {
    minWidth: number;
    maxWidth: number;
    padding: number;
    curvature: number;
}

export class SankeyFlowCalculator {
    private options: SankeyFlowOptions;

    constructor(options: Partial<SankeyFlowOptions> = {}) {
        this.options = {
            minWidth: 8,
            maxWidth: 60,
            padding: 2,
            curvature: 0.5,
            ...options,
        };
    }

    /**
     * Calculate Sankey-style flow paths for queue connections
     */
    calculateFlows(nodes: LayoutNode[]): FlowPath[] {
        // Group nodes by depth level
        const nodesByLevel = this.groupNodesByLevel(nodes);

        // Calculate flow paths for each level transition
        const flows: FlowPath[] = [];

        for (let level = 0; level < nodesByLevel.length - 1; level++) {
            const sourceLevel = nodesByLevel[level];
            const targetLevel = nodesByLevel[level + 1];

            // Calculate flows between these levels
            const levelFlows = this.calculateLevelFlows(sourceLevel, targetLevel);
            flows.push(...levelFlows);
        }

        return flows;
    }

    /**
     * Group nodes by their depth level
     */
    private groupNodesByLevel(nodes: LayoutNode[]): LayoutNode[][] {
        const levels: Map<number, LayoutNode[]> = new Map();

        nodes.forEach((node) => {
            const depth = this.getNodeDepth(node);
            if (!levels.has(depth)) {
                levels.set(depth, []);
            }
            levels.get(depth)!.push(node);
        });

        // Convert to array and sort by level
        const sortedLevels: LayoutNode[][] = [];
        const maxDepth = Math.max(...levels.keys());

        for (let i = 0; i <= maxDepth; i++) {
            sortedLevels.push(levels.get(i) || []);
        }

        return sortedLevels;
    }

    /**
     * Get the depth of a node in the tree
     */
    private getNodeDepth(node: LayoutNode): number {
        let depth = 0;
        let current = node;
        while (current.parent) {
            depth++;
            current = current.parent;
        }
        return depth;
    }

    /**
     * Calculate flows between two levels
     */
    private calculateLevelFlows(sourceLevel: LayoutNode[], targetLevel: LayoutNode[]): FlowPath[] {
        const flows: FlowPath[] = [];

        // Create connections from parents to children
        targetLevel.forEach((targetNode) => {
            if (targetNode.parent && sourceLevel.includes(targetNode.parent)) {
                const flow = this.createFlow(targetNode.parent, targetNode);
                flows.push(flow);
            }
        });

        // Adjust flow positions to avoid overlaps
        this.adjustFlowPositions(flows);

        return flows;
    }

    /**
     * Create a single flow between two nodes
     */
    private createFlow(source: LayoutNode, target: LayoutNode): FlowPath {
        const capacity = target.data.absoluteCapacity || 0;
        const width = this.calculateFlowWidth(capacity);
        const path = this.calculateFlowPath(source, target, width);

        return {
            id: `${source.id}-${target.id}`,
            source,
            target,
            path,
            width,
            capacity,
        };
    }

    /**
     * Calculate flow width based on capacity
     */
    private calculateFlowWidth(capacity: number): number {
        const { minWidth, maxWidth } = this.options;
        const normalizedCapacity = Math.max(0, Math.min(100, capacity));
        return minWidth + (normalizedCapacity / 100) * (maxWidth - minWidth);
    }

    /**
     * Calculate the SVG path for a flow
     */
    private calculateFlowPath(source: LayoutNode, target: LayoutNode, width: number): string {
        // Start from right edge of source
        const sourceX = source.x + source.width;
        const sourceY = source.y + source.height / 2;

        // End at left edge of target
        const targetX = target.x;
        const targetY = target.y + target.height / 2;

        // Use cubic Bezier curve
        const dx = targetX - sourceX;
        const controlOffset = dx * this.options.curvature;

        // Create path for the flow ribbon
        const topPath =
            `M ${sourceX},${sourceY - width / 2} ` +
            `C ${sourceX + controlOffset},${sourceY - width / 2} ` +
            `${targetX - controlOffset},${targetY - width / 2} ` +
            `${targetX},${targetY - width / 2}`;

        const bottomPath =
            `L ${targetX},${targetY + width / 2} ` +
            `C ${targetX - controlOffset},${targetY + width / 2} ` +
            `${sourceX + controlOffset},${sourceY + width / 2} ` +
            `${sourceX},${sourceY + width / 2}`;

        return topPath + ' ' + bottomPath + ' Z';
    }

    /**
     * Adjust flow positions to minimize overlaps
     */
    private adjustFlowPositions(flows: FlowPath[]): void {
        // Group flows by source node
        const flowsBySource = new Map<string, FlowPath[]>();

        flows.forEach((flow) => {
            const sourceId = flow.source.id;
            if (!flowsBySource.has(sourceId)) {
                flowsBySource.set(sourceId, []);
            }
            flowsBySource.get(sourceId)!.push(flow);
        });

        // Adjust positions for each source node's flows
        flowsBySource.forEach((sourceFlows) => {
            // Sort by target Y position
            sourceFlows.sort((a, b) => a.target.y - b.target.y);

            // Calculate total width needed
            const totalWidth = sourceFlows.reduce(
                (sum, flow) => sum + flow.width + this.options.padding,
                -this.options.padding
            );

            // Position flows
            let currentY = -totalWidth / 2;
            sourceFlows.forEach((flow) => {
                // Update the flow path with adjusted position
                // This would require storing offset information in the flow
                // For now, the basic implementation doesn't adjust positions
                currentY += flow.width + this.options.padding;
            });
        });
    }

    /**
     * Calculate flow metrics for analysis
     */
    calculateFlowMetrics(flows: FlowPath[]): {
        totalCapacity: number;
        averageWidth: number;
        maxWidth: number;
        flowCount: number;
    } {
        if (flows.length === 0) {
            return {
                totalCapacity: 0,
                averageWidth: 0,
                maxWidth: 0,
                flowCount: 0,
            };
        }

        const totalCapacity = flows.reduce((sum, flow) => sum + flow.capacity, 0);
        const averageWidth = flows.reduce((sum, flow) => sum + flow.width, 0) / flows.length;
        const maxWidth = Math.max(...flows.map((flow) => flow.width));

        return {
            totalCapacity,
            averageWidth,
            maxWidth,
            flowCount: flows.length,
        };
    }

    /**
     * Create a simplified Sankey diagram data structure
     */
    createSankeyData(nodes: LayoutNode[]): {
        nodes: SankeyNode[];
        links: SankeyLink[];
    } {
        const sankeyNodes: SankeyNode[] = nodes.map((node) => ({
            id: node.id,
            node: node,
        }));

        const nodeMap = new Map(sankeyNodes.map((n) => [n.id, n]));

        const sankeyLinks: SankeyLink[] = [];
        nodes.forEach((node) => {
            if (node.parent) {
                const sourceNode = nodeMap.get(node.parent.id);
                const targetNode = nodeMap.get(node.id);
                if (sourceNode && targetNode) {
                    sankeyLinks.push({
                        source: sourceNode,
                        target: targetNode,
                        value: node.data.absoluteCapacity || 0,
                    });
                }
            }
        });

        return { nodes: sankeyNodes, links: sankeyLinks };
    }
}
