import * as d3 from 'd3';
import type { Queue } from '../../types/Queue';

export interface TreeNode extends d3.HierarchyNode<Queue> {
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
  data: Queue;
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
      ...options
    };
  }

  /**
   * Compute layout for the queue hierarchy
   */
  computeLayout(root: Queue): LayoutData {
    // Create D3 hierarchy
    const hierarchy = d3.hierarchy<Queue>(root, d => 
      this.collapsedNodes.has(d.id) ? [] : d.children
    );

    // Create tree layout
    const treeLayout = this.options.orientation === 'horizontal'
      ? d3.tree<Queue>()
          .nodeSize([
            this.options.nodeHeight + this.options.verticalSpacing,
            this.options.nodeWidth + this.options.horizontalSpacing
          ])
      : d3.tree<Queue>()
          .nodeSize([
            this.options.nodeWidth + this.options.horizontalSpacing,
            this.options.nodeHeight + this.options.verticalSpacing
          ]);

    // Apply layout
    const treeNodes = treeLayout(hierarchy);
    
    // Convert to LayoutNode format
    const layoutNodes = this.convertToLayoutNodes(treeNodes);
    
    // Calculate flow paths
    const flows = this.computeFlowPaths(layoutNodes);
    
    // Calculate bounds
    const bounds = this.calculateBounds(layoutNodes);

    return {
      nodes: layoutNodes,
      flows,
      bounds
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
        children: []
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

    nodes.forEach(node => {
      if (node.parent) {
        const source = node.parent;
        const target = node;
        
        // Calculate flow width based on capacity
        const capacity = node.data.absoluteCapacity || 0;
        const width = 8 + (capacity / 100) * 52;

        // Calculate path
        const path = this.calculateBezierPath(source, target);

        flows.push({
          id: `${source.id}-${target.id}`,
          source,
          target,
          path,
          width,
          capacity
        });
      }
    });

    return flows;
  }

  /**
   * Calculate cubic Bezier path between two nodes
   */
  private calculateBezierPath(source: LayoutNode, target: LayoutNode): string {
    const sourceX = source.x + source.width;
    const sourceY = source.y + source.height / 2;
    const targetX = target.x;
    const targetY = target.y + target.height / 2;

    // Control points for cubic Bezier curve
    const controlPointOffset = Math.abs(sourceX - targetX) * 0.5;
    const cp1x = sourceX + controlPointOffset;
    const cp1y = sourceY;
    const cp2x = targetX - controlPointOffset;
    const cp2y = targetY;

    return `M ${sourceX} ${sourceY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${targetX} ${targetY}`;
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

    nodes.forEach(node => {
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
      height: maxY - minY + padding * 2
    };
  }

  /**
   * Update node positions for animated transitions
   */
  animateToNewLayout(
    currentNodes: LayoutNode[],
    targetLayout: LayoutData,
    duration: number = 750
  ): { nodes: LayoutNode[]; flows: FlowPath[]; progress: number }[] {
    const frames: { nodes: LayoutNode[]; flows: FlowPath[]; progress: number }[] = [];
    const steps = 60; // 60 frames for smooth animation

    for (let i = 0; i <= steps; i++) {
      const progress = i / steps;
      const easedProgress = d3.easeCubicInOut(progress);

      const interpolatedNodes = currentNodes.map(currentNode => {
        const targetNode = targetLayout.nodes.find(n => n.id === currentNode.id);
        if (!targetNode) return currentNode;

        return {
          ...currentNode,
          x: currentNode.x + (targetNode.x - currentNode.x) * easedProgress,
          y: currentNode.y + (targetNode.y - currentNode.y) * easedProgress
        };
      });

      // Recalculate flows for interpolated positions
      const interpolatedFlows = this.computeFlowPaths(interpolatedNodes);

      frames.push({
        nodes: interpolatedNodes,
        flows: interpolatedFlows,
        progress
      });
    }

    return frames;
  }

  /**
   * Get nodes at a specific depth level
   */
  getNodesAtDepth(nodes: LayoutNode[], depth: number): LayoutNode[] {
    return nodes.filter(node => {
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
    nodes.forEach(node => {
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