import type { LayoutNode, FlowPath } from '../d3/D3TreeLayout';

export interface Viewport {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CullingResult<T> {
  visible: T[];
  culled: T[];
}

export class ViewportCuller {
  private viewport: Viewport;
  private padding: number;

  constructor(viewport: Viewport, padding: number = 50) {
    this.viewport = viewport;
    this.padding = padding;
  }

  /**
   * Update viewport
   */
  updateViewport(viewport: Viewport): void {
    this.viewport = viewport;
  }

  /**
   * Cull nodes outside viewport
   */
  cullNodes(nodes: LayoutNode[]): CullingResult<LayoutNode> {
    const visible: LayoutNode[] = [];
    const culled: LayoutNode[] = [];

    const expandedViewport = this.getExpandedViewport();

    nodes.forEach(node => {
      if (this.isNodeInViewport(node, expandedViewport)) {
        visible.push(node);
      } else {
        culled.push(node);
      }
    });

    return { visible, culled };
  }

  /**
   * Cull flows outside viewport
   */
  cullFlows(flows: FlowPath[]): CullingResult<FlowPath> {
    const visible: FlowPath[] = [];
    const culled: FlowPath[] = [];

    const expandedViewport = this.getExpandedViewport();

    flows.forEach(flow => {
      if (this.isFlowInViewport(flow, expandedViewport)) {
        visible.push(flow);
      } else {
        culled.push(flow);
      }
    });

    return { visible, culled };
  }

  /**
   * Check if node is in viewport
   */
  private isNodeInViewport(node: LayoutNode, viewport: Viewport): boolean {
    return this.rectIntersectsViewport(
      node.x,
      node.y,
      node.width,
      node.height,
      viewport
    );
  }

  /**
   * Check if flow is in viewport
   */
  private isFlowInViewport(flow: FlowPath, viewport: Viewport): boolean {
    // Check if either source or target is in viewport
    return (
      this.isNodeInViewport(flow.source, viewport) ||
      this.isNodeInViewport(flow.target, viewport)
    );
  }

  /**
   * Check if rectangle intersects viewport
   */
  private rectIntersectsViewport(
    x: number,
    y: number,
    width: number,
    height: number,
    viewport: Viewport
  ): boolean {
    return !(
      x + width < viewport.x ||
      x > viewport.x + viewport.width ||
      y + height < viewport.y ||
      y > viewport.y + viewport.height
    );
  }

  /**
   * Get viewport expanded by padding
   */
  private getExpandedViewport(): Viewport {
    return {
      x: this.viewport.x - this.padding,
      y: this.viewport.y - this.padding,
      width: this.viewport.width + this.padding * 2,
      height: this.viewport.height + this.padding * 2
    };
  }

  /**
   * Get visible bounds for a set of nodes
   */
  getVisibleBounds(nodes: LayoutNode[]): Viewport | null {
    const visibleNodes = this.cullNodes(nodes).visible;
    
    if (visibleNodes.length === 0) {
      return null;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    visibleNodes.forEach(node => {
      minX = Math.min(minX, node.x);
      minY = Math.min(minY, node.y);
      maxX = Math.max(maxX, node.x + node.width);
      maxY = Math.max(maxY, node.y + node.height);
    });

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  /**
   * Create spatial index for faster culling
   */
  createSpatialIndex(nodes: LayoutNode[]): QuadTree {
    return new QuadTree(nodes, this.viewport);
  }
}

/**
 * Simple QuadTree implementation for spatial indexing
 */
export class QuadTree {
  private root: QuadNode;

  constructor(nodes: LayoutNode[], bounds: Viewport) {
    this.root = new QuadNode(bounds);
    nodes.forEach(node => this.root.insert(node));
  }

  /**
   * Query nodes in region
   */
  query(region: Viewport): LayoutNode[] {
    return this.root.query(region);
  }
}

class QuadNode {
  private bounds: Viewport;
  private nodes: LayoutNode[] = [];
  private children: QuadNode[] | null = null;
  private maxNodes = 4;
  private maxDepth = 8;
  private depth: number;

  constructor(bounds: Viewport, depth: number = 0) {
    this.bounds = bounds;
    this.depth = depth;
  }

  insert(node: LayoutNode): void {
    // If has children, insert into appropriate child
    if (this.children !== null) {
      const index = this.getIndex(node);
      if (index !== -1) {
        this.children[index].insert(node);
        return;
      }
    }

    // Add to this node
    this.nodes.push(node);

    // Split if needed
    if (this.nodes.length > this.maxNodes && this.depth < this.maxDepth && this.children === null) {
      this.split();
    }
  }

  query(region: Viewport): LayoutNode[] {
    const result: LayoutNode[] = [];

    // Check if region intersects this node
    if (!this.intersects(region)) {
      return result;
    }

    // Add nodes from this level
    this.nodes.forEach(node => {
      if (this.nodeInRegion(node, region)) {
        result.push(node);
      }
    });

    // Query children
    if (this.children !== null) {
      this.children.forEach(child => {
        result.push(...child.query(region));
      });
    }

    return result;
  }

  private split(): void {
    const { x, y, width, height } = this.bounds;
    const halfWidth = width / 2;
    const halfHeight = height / 2;

    this.children = [
      new QuadNode({ x, y, width: halfWidth, height: halfHeight }, this.depth + 1),
      new QuadNode({ x: x + halfWidth, y, width: halfWidth, height: halfHeight }, this.depth + 1),
      new QuadNode({ x, y: y + halfHeight, width: halfWidth, height: halfHeight }, this.depth + 1),
      new QuadNode({ x: x + halfWidth, y: y + halfHeight, width: halfWidth, height: halfHeight }, this.depth + 1)
    ];

    // Redistribute nodes
    const nodes = [...this.nodes];
    this.nodes = [];
    
    nodes.forEach(node => {
      const index = this.getIndex(node);
      if (index !== -1) {
        this.children![index].insert(node);
      } else {
        this.nodes.push(node);
      }
    });
  }

  private getIndex(node: LayoutNode): number {
    const { x, y, width, height } = this.bounds;
    const midX = x + width / 2;
    const midY = y + height / 2;

    const inTop = node.y + node.height < midY;
    const inBottom = node.y > midY;
    const inLeft = node.x + node.width < midX;
    const inRight = node.x > midX;

    if (inTop) {
      if (inLeft) return 0;
      if (inRight) return 1;
    } else if (inBottom) {
      if (inLeft) return 2;
      if (inRight) return 3;
    }

    return -1; // Node spans multiple quadrants
  }

  private intersects(region: Viewport): boolean {
    return !(
      region.x > this.bounds.x + this.bounds.width ||
      region.x + region.width < this.bounds.x ||
      region.y > this.bounds.y + this.bounds.height ||
      region.y + region.height < this.bounds.y
    );
  }

  private nodeInRegion(node: LayoutNode, region: Viewport): boolean {
    return !(
      node.x > region.x + region.width ||
      node.x + node.width < region.x ||
      node.y > region.y + region.height ||
      node.y + node.height < region.y
    );
  }
}