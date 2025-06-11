import type { LayoutNode, FlowPath } from '../d3/D3TreeLayout';
import type { Queue } from '../../types/Queue';

export interface RenderOptions {
  canvas: HTMLCanvasElement;
  devicePixelRatio?: number;
  theme?: RenderTheme;
}

export interface RenderTheme {
  background: string;
  queueCard: {
    background: string;
    border: string;
    shadow: string;
    text: string;
    selectedBackground: string;
    hoverBackground: string;
  };
  flow: {
    running: string;
    stopped: string;
    default: string;
    opacity: number;
  };
  state: {
    default: string;
    pending: string;
    error: string;
    new: string;
    deleted: string;
  };
}

export interface RenderLayer {
  name: string;
  visible: boolean;
  opacity: number;
  render: (ctx: CanvasRenderingContext2D) => void;
}

export interface QueueCardStyle {
  borderColor: string;
  backgroundColor: string;
  textColor: string;
  shadowColor: string;
}

const DEFAULT_THEME: RenderTheme = {
  background: '#fafafa',
  queueCard: {
    background: '#ffffff',
    border: '#e0e0e0',
    shadow: 'rgba(0, 0, 0, 0.1)',
    text: '#333333',
    selectedBackground: '#e3f2fd',
    hoverBackground: '#f5f5f5'
  },
  flow: {
    running: '#64b5f6',
    stopped: '#e57373',
    default: '#bdbdbd',
    opacity: 0.6
  },
  state: {
    default: '#1976d2',
    pending: '#ffc107',
    error: '#e53935',
    new: '#43a047',
    deleted: '#dc3545'
  }
};

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private devicePixelRatio: number;
  private theme: RenderTheme;
  private layers: Map<string, RenderLayer> = new Map();
  private animationFrameId: number | null = null;
  private hoveredNode: LayoutNode | null = null;
  private selectedNodes: Set<string> = new Set();

  constructor(options: RenderOptions) {
    this.canvas = options.canvas;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context from canvas');
    }
    this.ctx = ctx;
    this.devicePixelRatio = options.devicePixelRatio || window.devicePixelRatio || 1;
    this.theme = options.theme || DEFAULT_THEME;

    this.setupCanvas();
    this.setupLayers();
  }

  /**
   * Setup canvas with proper device pixel ratio
   */
  private setupCanvas(): void {
    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    // Set actual canvas size with device pixel ratio
    this.canvas.width = width * this.devicePixelRatio;
    this.canvas.height = height * this.devicePixelRatio;

    // Scale canvas to match device pixel ratio
    this.ctx.scale(this.devicePixelRatio, this.devicePixelRatio);

    // Ensure canvas CSS size matches
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
  }

  /**
   * Setup rendering layers
   */
  private setupLayers(): void {
    // Background layer
    this.layers.set('background', {
      name: 'background',
      visible: true,
      opacity: 1,
      render: (ctx) => this.renderBackground(ctx)
    });

    // Flow layer
    this.layers.set('flows', {
      name: 'flows',
      visible: true,
      opacity: 1,
      render: (ctx) => this.renderFlows(ctx)
    });

    // Node layer
    this.layers.set('nodes', {
      name: 'nodes',
      visible: true,
      opacity: 1,
      render: (ctx) => this.renderNodes(ctx)
    });

    // Overlay layer (selection, hover)
    this.layers.set('overlay', {
      name: 'overlay',
      visible: true,
      opacity: 1,
      render: (ctx) => this.renderOverlay(ctx)
    });
  }

  /**
   * Render the entire scene
   */
  render(nodes: LayoutNode[], flows: FlowPath[]): void {
    // Store data for rendering
    this.nodes = nodes;
    this.flows = flows;

    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Render each layer
    this.layers.forEach(layer => {
      if (layer.visible) {
        this.ctx.save();
        this.ctx.globalAlpha = layer.opacity;
        layer.render(this.ctx);
        this.ctx.restore();
      }
    });
  }

  /**
   * Render using requestAnimationFrame
   */
  startRenderLoop(nodes: LayoutNode[], flows: FlowPath[]): void {
    const renderFrame = () => {
      this.render(nodes, flows);
      this.animationFrameId = requestAnimationFrame(renderFrame);
    };
    renderFrame();
  }

  /**
   * Stop render loop
   */
  stopRenderLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Render background
   */
  private renderBackground(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = this.theme.background;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Render flow paths
   */
  private renderFlows(ctx: CanvasRenderingContext2D): void {
    if (!this.flows) return;

    this.flows.forEach(flow => {
      ctx.save();
      
      // Set flow color based on target state
      const color = this.getFlowColor(flow.target.data);
      ctx.fillStyle = color;
      ctx.strokeStyle = color;
      ctx.globalAlpha = this.theme.flow.opacity;

      // Draw flow path
      const path = new Path2D(flow.path);
      ctx.fill(path);

      ctx.restore();
    });
  }

  /**
   * Render queue nodes
   */
  private renderNodes(ctx: CanvasRenderingContext2D): void {
    if (!this.nodes) return;

    this.nodes.forEach(node => {
      this.drawQueueCard(ctx, node);
    });
  }

  /**
   * Draw a single queue card
   */
  private drawQueueCard(ctx: CanvasRenderingContext2D, node: LayoutNode): void {
    const { x, y, width, height, data } = node;
    const isSelected = this.selectedNodes.has(node.id);
    const isHovered = this.hoveredNode?.id === node.id;

    // Get card style
    const style = this.getCardStyle(data, isSelected, isHovered);

    // Draw card background
    ctx.fillStyle = style.backgroundColor;
    ctx.strokeStyle = style.borderColor;
    ctx.lineWidth = 1;

    // Draw rounded rectangle
    this.drawRoundedRect(ctx, x, y, width, height, 12);
    ctx.fill();
    ctx.stroke();

    // Draw left border (4px)
    ctx.fillStyle = style.borderColor;
    ctx.fillRect(x, y, 4, height);

    // Draw shadow
    if (!isSelected && !isHovered) {
      ctx.save();
      ctx.shadowColor = style.shadowColor;
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 2;
      this.drawRoundedRect(ctx, x, y, width, height, 12);
      ctx.restore();
    }

    // Draw queue name
    ctx.fillStyle = style.textColor;
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    
    const nameText = this.truncateText(ctx, data.queueName, width - 100);
    ctx.fillText(nameText, x + 20, y + 25);

    // Draw divider line
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 10, y + 45);
    ctx.lineTo(x + width - 10, y + 45);
    ctx.stroke();

    // Draw capacity info
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#666666';
    const capacityText = this.getCapacityText(data);
    ctx.fillText(capacityText, x + 20, y + 70);

    // Draw state badges
    this.drawStateBadges(ctx, node);
  }

  /**
   * Draw state badges (capacity mode, running state, etc.)
   */
  private drawStateBadges(ctx: CanvasRenderingContext2D, node: LayoutNode): void {
    const { x, y, width, data } = node;
    let badgeX = x + 20;
    const badgeY = y + 90;

    // Capacity mode badge
    const modeText = this.getCapacityMode(data);
    if (modeText) {
      const badgeWidth = this.drawBadge(ctx, modeText, badgeX, badgeY, '#2196f3');
      badgeX += badgeWidth + 8;
    }

    // State badge
    const stateColor = data.state === 'RUNNING' ? '#4caf50' : '#f44336';
    const stateWidth = this.drawBadge(ctx, data.state.toLowerCase(), badgeX, badgeY, stateColor);
    badgeX += stateWidth + 8;

    // Auto-creation badge if enabled
    if (data.autoCreateChildQueueEnabled) {
      this.drawBadge(ctx, 'auto', badgeX, badgeY, '#ff9800');
    }
  }

  /**
   * Draw a badge
   */
  private drawBadge(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string): number {
    ctx.font = '11px sans-serif';
    const metrics = ctx.measureText(text);
    const width = metrics.width + 12;
    const height = 20;

    // Draw badge background
    ctx.fillStyle = color;
    this.drawRoundedRect(ctx, x, y, width, height, 10);
    ctx.fill();

    // Draw badge text
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + width / 2, y + height / 2);

    return width;
  }

  /**
   * Render overlay (selection, hover effects)
   */
  private renderOverlay(ctx: CanvasRenderingContext2D): void {
    // Draw selection overlays
    this.selectedNodes.forEach(nodeId => {
      const node = this.nodes?.find(n => n.id === nodeId);
      if (node) {
        ctx.strokeStyle = '#1976d2';
        ctx.lineWidth = 2;
        this.drawRoundedRect(ctx, node.x - 2, node.y - 2, node.width + 4, node.height + 4, 14);
        ctx.stroke();
      }
    });

    // Draw hover overlay
    if (this.hoveredNode) {
      ctx.strokeStyle = '#2196f3';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      this.drawRoundedRect(ctx, 
        this.hoveredNode.x - 2, 
        this.hoveredNode.y - 2, 
        this.hoveredNode.width + 4, 
        this.hoveredNode.height + 4, 
        14
      );
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  /**
   * Draw rounded rectangle
   */
  private drawRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  /**
   * Get card style based on queue state
   */
  private getCardStyle(queue: Queue, isSelected: boolean, isHovered: boolean): QueueCardStyle {
    let borderColor = this.theme.state.default;
    let backgroundColor = this.theme.queueCard.background;

    // Determine border color based on state
    if ((queue as any).hasValidationError) {
      borderColor = this.theme.state.error;
    } else if ((queue as any).hasPendingChanges) {
      borderColor = this.theme.state.pending;
    } else if ((queue as any).isNew) {
      borderColor = this.theme.state.new;
    } else if ((queue as any).isDeleted) {
      borderColor = this.theme.state.deleted;
    }

    // Background color for selection/hover
    if (isSelected) {
      backgroundColor = this.theme.queueCard.selectedBackground;
    } else if (isHovered) {
      backgroundColor = this.theme.queueCard.hoverBackground;
    }

    return {
      borderColor,
      backgroundColor,
      textColor: this.theme.queueCard.text,
      shadowColor: this.theme.queueCard.shadow
    };
  }

  /**
   * Get flow color based on queue state
   */
  private getFlowColor(queue: Queue): string {
    if (queue.state === 'RUNNING') {
      return this.theme.flow.running;
    } else if (queue.state === 'STOPPED') {
      return this.theme.flow.stopped;
    }
    return this.theme.flow.default;
  }

  /**
   * Get capacity display text
   */
  private getCapacityText(queue: Queue): string {
    return `Capacity: ${queue.capacity || 0}% (${queue.usedCapacity || 0}% used)`;
  }

  /**
   * Get capacity mode text
   */
  private getCapacityMode(_queue: Queue): string {
    return 'percentage';
  }

  /**
   * Truncate text to fit width
   */
  private truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
    const ellipsis = '...';
    let truncated = text;
    
    if (ctx.measureText(text).width <= maxWidth) {
      return text;
    }

    while (ctx.measureText(truncated + ellipsis).width > maxWidth && truncated.length > 0) {
      truncated = truncated.slice(0, -1);
    }

    return truncated + ellipsis;
  }

  /**
   * Set hovered node
   */
  setHoveredNode(node: LayoutNode | null): void {
    this.hoveredNode = node;
  }

  /**
   * Set selected nodes
   */
  setSelectedNodes(nodeIds: Set<string>): void {
    this.selectedNodes = nodeIds;
  }

  /**
   * Add selected node
   */
  addSelectedNode(nodeId: string): void {
    this.selectedNodes.add(nodeId);
  }

  /**
   * Remove selected node
   */
  removeSelectedNode(nodeId: string): void {
    this.selectedNodes.delete(nodeId);
  }

  /**
   * Clear selection
   */
  clearSelection(): void {
    this.selectedNodes.clear();
  }

  /**
   * Update theme
   */
  updateTheme(theme: Partial<RenderTheme>): void {
    this.theme = { ...this.theme, ...theme };
  }

  /**
   * Set layer visibility
   */
  setLayerVisibility(layerName: string, visible: boolean): void {
    const layer = this.layers.get(layerName);
    if (layer) {
      layer.visible = visible;
    }
  }

  /**
   * Set layer opacity
   */
  setLayerOpacity(layerName: string, opacity: number): void {
    const layer = this.layers.get(layerName);
    if (layer) {
      layer.opacity = Math.max(0, Math.min(1, opacity));
    }
  }

  /**
   * Resize canvas
   */
  resize(): void {
    this.setupCanvas();
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stopRenderLoop();
    this.layers.clear();
  }

  // Store nodes and flows for rendering
  private nodes: LayoutNode[] = [];
  private flows: FlowPath[] = [];
}