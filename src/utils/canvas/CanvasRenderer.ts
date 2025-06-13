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
        selectedBackground: '#f0f8ff',
        hoverBackground: '#f8f9fa',
    },
    flow: {
        running: '#64b5f6',
        stopped: '#e57373',
        default: '#bdbdbd',
        opacity: 0.6,
    },
    state: {
        default: '#1976d2',
        pending: '#ffc107',
        error: '#e53935',
        new: '#43a047',
        deleted: '#dc3545',
    },
};

export interface Transform {
    x: number;
    y: number;
    scale: number;
}

export class CanvasRenderer {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private devicePixelRatio: number;
    private theme: RenderTheme;
    private layers: Map<string, RenderLayer> = new Map();
    private animationFrameId: number | null = null;
    private hoveredNode: LayoutNode | null = null;
    private selectedNodes: Set<string> = new Set();
    private nodes: LayoutNode[] = [];
    private hoverAnimations: Map<string, { currentScale: number; targetScale: number; startTime: number }> = new Map();
    private readonly HOVER_ANIMATION_DURATION = 800; // milliseconds
    private flows: FlowPath[] = [];
    private currentTransform: Transform = { x: 0, y: 0, scale: 1 };

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

        // Reset transform and scale canvas to match device pixel ratio
        this.ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform matrix
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
            render: (ctx) => this.renderBackground(ctx),
        });

        // Flow layer
        this.layers.set('flows', {
            name: 'flows',
            visible: true,
            opacity: 1,
            render: (ctx) => this.renderFlows(ctx),
        });

        // Node layer
        this.layers.set('nodes', {
            name: 'nodes',
            visible: true,
            opacity: 1,
            render: (ctx) => this.renderNodes(ctx),
        });

        // Overlay layer (selection, hover)
        this.layers.set('overlay', {
            name: 'overlay',
            visible: true,
            opacity: 1,
            render: (ctx) => this.renderOverlay(ctx),
        });
    }

    /**
     * Render the entire scene
     */
    render(nodes: LayoutNode[], flows: FlowPath[], transform?: Transform): void {
        // Store data for rendering
        this.nodes = nodes;
        this.flows = flows;
        if (transform) {
            this.currentTransform = transform;
        }

        // Clear canvas - use logical dimensions since context is already scaled
        const rect = this.canvas.getBoundingClientRect();
        this.ctx.clearRect(0, 0, rect.width, rect.height);

        // Apply transform
        this.ctx.save();
        this.ctx.translate(this.currentTransform.x, this.currentTransform.y);
        this.ctx.scale(this.currentTransform.scale, this.currentTransform.scale);

        // Render each layer
        this.layers.forEach((layer) => {
            if (layer.visible) {
                this.ctx.save();
                this.ctx.globalAlpha = layer.opacity;
                layer.render(this.ctx);
                this.ctx.restore();
            }
        });

        // Restore transform
        this.ctx.restore();

        // Continue animation loop if animations are active
        if (this.hasActiveAnimations()) {
            requestAnimationFrame(() => {
                if (this.nodes && this.flows) {
                    this.render(this.nodes, this.flows, this.currentTransform);
                }
            });
        }
    }

    /**
     * Render using requestAnimationFrame
     */
    startRenderLoop(nodes: LayoutNode[], flows: FlowPath[], transform?: Transform): void {
        const renderFrame = () => {
            this.render(nodes, flows, transform);
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
        // Save current state
        ctx.save();

        // Reset any transforms to fill the entire canvas
        ctx.setTransform(this.devicePixelRatio, 0, 0, this.devicePixelRatio, 0, 0);

        // Fill entire logical canvas area
        const rect = this.canvas.getBoundingClientRect();
        ctx.fillStyle = this.theme.background;
        ctx.fillRect(0, 0, rect.width, rect.height);

        // Restore state
        ctx.restore();
    }

    /**
     * Render flow paths
     */
    private renderFlows(ctx: CanvasRenderingContext2D): void {
        if (!this.flows) return;

        this.flows.forEach((flow) => {
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

        this.nodes.forEach((node) => {
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

        // Very subtle scale increase for hover effect (minimal distortion)
        const scale = isHovered ? 1.02 : 1.0; // Only 2% increase
        const scaledWidth = width * scale;
        const scaledHeight = height * scale;
        const scaledX = x - (scaledWidth - width) / 2;
        const scaledY = y - (scaledHeight - height) / 2;

        // Get card style
        const style = this.getCardStyle(data, isSelected, isHovered);

        // Draw shadow first (behind the card) - enhanced for hover elevation
        ctx.save();
        ctx.shadowColor = style.shadowColor;

        if (isSelected) {
            // Selected: very deep shadow with large blur
            ctx.shadowBlur = 30;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 15;
            ctx.globalAlpha = 0.5;
        } else if (isHovered) {
            // Hovered: dramatic elevation effect - card clearly brought to foreground
            ctx.shadowBlur = 24;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 12;
            ctx.globalAlpha = 0.4;
        } else {
            // Normal: subtle shadow
            ctx.shadowBlur = 4;
            ctx.shadowOffsetX = 1;
            ctx.shadowOffsetY = 2;
            ctx.globalAlpha = 0.15;
        }

        // Draw shadow shape
        ctx.fillStyle = '#000000';
        this.drawRoundedRect(ctx, scaledX, scaledY, scaledWidth, scaledHeight, 12);
        ctx.fill();
        ctx.restore();

        // Draw card background
        ctx.fillStyle = style.backgroundColor;
        ctx.strokeStyle = style.borderColor;
        ctx.lineWidth = 1;

        // Draw rounded rectangle
        this.drawRoundedRect(ctx, scaledX, scaledY, scaledWidth, scaledHeight, 12);
        ctx.fill();
        ctx.stroke();

        // Add bright overlay for hovered cards to enhance "closer to screen" effect
        if (isHovered) {
            ctx.save();
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            this.drawRoundedRect(ctx, scaledX, scaledY, scaledWidth, scaledHeight, 12);
            ctx.fill();
            ctx.restore();
        }

        // === HEADER SECTION ===
        // Draw queue name with prominent styling and background highlight
        const headerHeight = 40;

        // Subtle header background
        ctx.fillStyle = '#f8fafc';
        this.drawRoundedRect(ctx, scaledX + 1, scaledY + 1, scaledWidth - 2, headerHeight, 12);
        ctx.fill();

        // Queue name - prominent but not oversized
        ctx.fillStyle = style.textColor;
        ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        const nameText = this.truncateText(ctx, data.queueName, scaledWidth - 32);
        ctx.fillText(nameText, scaledX + 16, scaledY + headerHeight / 2);

        // === BADGES SECTION ===
        // Draw badges below the queue name
        this.drawStateBadges(ctx, {
            ...node,
            x: scaledX,
            y: scaledY + headerHeight + 8,
            width: scaledWidth,
            height: scaledHeight,
        });

        // === CAPACITY SECTION ===
        const capacitySectionY = scaledY + headerHeight + 48;

        // Section divider
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(scaledX + 16, capacitySectionY - 8);
        ctx.lineTo(scaledX + scaledWidth - 16, capacitySectionY - 8);
        ctx.stroke();

        // Capacity bar
        this.drawCapacityBar(ctx, data, scaledX + 16, capacitySectionY, scaledWidth - 32);

        // Capacity information with better spacing
        const capacityInfo = this.getDetailedCapacityInfo(data);

        // Emphasize current allocated capacity
        ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = '#374151';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(capacityInfo.allocated, scaledX + 16, capacitySectionY + 20);

        // Show used capacity in smaller, secondary text
        ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = '#6b7280';
        ctx.textAlign = 'left';
        ctx.fillText(capacityInfo.used, scaledX + 16, capacitySectionY + 37);

        // Emphasize max capacity
        ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = '#4b5563';
        ctx.textAlign = 'left';
        ctx.fillText(capacityInfo.max, scaledX + 16, capacitySectionY + 52);

        // === RESOURCES SECTION ===
        if (data.resourcesUsed && (data.resourcesUsed.memory > 0 || data.resourcesUsed.vCores > 0)) {
            const resourcesSectionY = capacitySectionY + 75;

            // Section divider
            ctx.strokeStyle = '#e5e7eb';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(scaledX + 16, resourcesSectionY - 8);
            ctx.lineTo(scaledX + scaledWidth - 16, resourcesSectionY - 8);
            ctx.stroke();

            const resourceText = this.getResourceUsageText(data);
            ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.fillStyle = '#6b7280';
            ctx.fillText(resourceText, scaledX + 16, resourcesSectionY);
        }
    }

    /**
     * Draw state badges (capacity mode, running state, etc.)
     */
    private drawStateBadges(ctx: CanvasRenderingContext2D, node: LayoutNode): void {
        const { x, y, data } = node;

        // Position badges in horizontal flow from left to right
        let currentX = x + 16; // Start from left edge with margin
        const badgeY = y;

        // Capacity mode badge (leftmost)
        const modeText = this.getCapacityMode(data);
        if (modeText) {
            const modeDisplay = modeText.toUpperCase();
            this.drawEnhancedBadge(ctx, modeDisplay, currentX, badgeY, '#3b82f6', '#dbeafe');
            const modeBadge = this.measureBadge(ctx, modeDisplay);
            currentX += modeBadge.width + 8; // spacing
        }

        // State badge
        const stateText = data.state === 'RUNNING' ? 'RUNNING' : 'STOPPED';
        const stateColor = data.state === 'RUNNING' ? '#10b981' : '#ef4444';
        const stateBgColor = data.state === 'RUNNING' ? '#d1fae5' : '#fee2e2';
        this.drawEnhancedBadge(ctx, stateText, currentX, badgeY, stateColor, stateBgColor);
        const stateBadge = this.measureBadge(ctx, stateText);
        currentX += stateBadge.width + 8; // spacing

        // Auto-creation badge if enabled
        if (data.autoCreateChildQueueEnabled) {
            this.drawEnhancedBadge(ctx, 'AUTO', currentX, badgeY, '#f59e0b', '#fef3c7');
            const autoBadge = this.measureBadge(ctx, 'AUTO');
            currentX += autoBadge.width + 8; // spacing for potential future badges
        }

        // Additional badges can be added here in the future
        // Examples: PREEMPTION, ELASTIC, MANAGED, etc.
    }

    /**
     * Calculate total space needed for badges
     */
    private calculateBadgeSpace(ctx: CanvasRenderingContext2D, data: Queue): number {
        let totalWidth = 0;
        let badgeCount = 0;

        // Capacity mode badge
        const modeText = this.getCapacityMode(data);
        if (modeText) {
            const modeBadge = this.measureBadge(ctx, modeText.toUpperCase());
            totalWidth += modeBadge.width;
            badgeCount++;
        }

        // State badge (always present)
        const stateText = data.state === 'RUNNING' ? 'RUNNING' : 'STOPPED';
        const stateBadge = this.measureBadge(ctx, stateText);
        totalWidth += stateBadge.width;
        badgeCount++;

        // Auto-creation badge if enabled
        if (data.autoCreateChildQueueEnabled) {
            const autoBadge = this.measureBadge(ctx, 'AUTO');
            totalWidth += autoBadge.width;
            badgeCount++;
        }

        // Add spacing between badges (8px between each badge)
        const spacing = Math.max(0, (badgeCount - 1) * 8);

        return totalWidth + spacing;
    }

    /**
     * Measure badge dimensions
     */
    private measureBadge(ctx: CanvasRenderingContext2D, text: string): { width: number; height: number } {
        ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        const metrics = ctx.measureText(text);
        return {
            width: metrics.width + 16,
            height: 20,
        };
    }

    /**
     * Draw enhanced badge with background and text color
     */
    private drawEnhancedBadge(
        ctx: CanvasRenderingContext2D,
        text: string,
        x: number,
        y: number,
        textColor: string,
        backgroundColor: string
    ): void {
        const dimensions = this.measureBadge(ctx, text);

        // Draw badge shadow
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
        ctx.shadowBlur = 2;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 1;

        // Draw background
        ctx.fillStyle = backgroundColor;
        this.drawRoundedRect(ctx, x, y, dimensions.width, dimensions.height, 6);
        ctx.fill();
        ctx.restore();

        // Draw border
        ctx.strokeStyle = textColor + '20'; // 20% opacity
        ctx.lineWidth = 1;
        this.drawRoundedRect(ctx, x, y, dimensions.width, dimensions.height, 6);
        ctx.stroke();

        // Draw text
        ctx.fillStyle = textColor;
        ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x + dimensions.width / 2, y + dimensions.height / 2);
    }

    /**
     * Draw a badge (legacy method - kept for compatibility)
     */
    private drawBadge(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string): number {
        ctx.font = '11px sans-serif';
        const metrics = ctx.measureText(text);
        const width = metrics.width + 12;
        const height = 20;

        // Draw badge shadow
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        ctx.shadowBlur = 2;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 1;
        ctx.fillStyle = color;
        this.drawRoundedRect(ctx, x, y, width, height, 10);
        ctx.fill();
        ctx.restore();

        // Draw badge background (without shadow)
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
        // Draw modern selection overlays
        this.selectedNodes.forEach((nodeId) => {
            const node = this.nodes?.find((n) => n.id === nodeId);
            if (node) {
                this.drawModernSelectionOverlay(ctx, node);
            }
        });

        // Hover effect is now handled by card scaling in drawQueueCard
    }

    /**
     * Draw modern selection overlay with gradient and glow
     */
    private drawModernSelectionOverlay(ctx: CanvasRenderingContext2D, node: LayoutNode): void {
        const padding = 3;
        const x = node.x - padding;
        const y = node.y - padding;
        const width = node.width + padding * 2;
        const height = node.height + padding * 2;
        const radius = 16;

        // Create pulsing animation
        const time = Date.now() / 1000;
        const pulseIntensity = 0.3 + 0.2 * Math.sin(time * 2);

        // Draw outer glow
        ctx.save();
        ctx.shadowColor = `rgba(25, 118, 210, ${pulseIntensity})`;
        ctx.shadowBlur = 12;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        ctx.strokeStyle = `rgba(25, 118, 210, ${0.8 + pulseIntensity * 0.2})`;
        ctx.lineWidth = 3;
        this.drawRoundedRect(ctx, x, y, width, height, radius);
        ctx.stroke();
        ctx.restore();

        // Draw inner highlight
        ctx.save();
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.6 + pulseIntensity * 0.4})`;
        ctx.lineWidth = 1;
        this.drawRoundedRect(ctx, x + 1, y + 1, width - 2, height - 2, radius - 1);
        ctx.stroke();
        ctx.restore();
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
     * Draw rounded left border
     */
    private drawRoundedLeftBorder(
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        borderWidth: number,
        height: number,
        radius: number
    ): void {
        ctx.beginPath();

        // Start at top-left corner
        ctx.moveTo(x + radius, y);

        // Top edge of border
        ctx.lineTo(x + borderWidth, y);

        // Right edge of border (straight line down)
        ctx.lineTo(x + borderWidth, y + height);

        // Bottom edge of border
        ctx.lineTo(x + radius, y + height);

        // Bottom-left corner (rounded)
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);

        // Left edge (straight line up)
        ctx.lineTo(x, y + radius);

        // Top-left corner (rounded)
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
            shadowColor: this.theme.queueCard.shadow,
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
     * Draw capacity bar visualization
     */
    private drawCapacityBar(ctx: CanvasRenderingContext2D, queue: Queue, x: number, y: number, width: number): void {
        const barHeight = 6;
        const barRadius = 3;

        // Determine capacity type and values
        const capacityMode = this.getCapacityMode(queue);
        const usedCapacity = queue.usedCapacity || 0;
        const totalCapacity = queue.capacity || 0;
        const maxCapacity = queue.maxCapacity || 100;

        // Background bar (total available capacity relative to parent)
        ctx.fillStyle = '#f0f0f0';
        this.drawRoundedRect(ctx, x, y, width, barHeight, barRadius);
        ctx.fill();

        // Max capacity bar (shows the maximum this queue can grow to)
        if (maxCapacity > totalCapacity) {
            const maxWidth = (maxCapacity / 100) * width;
            ctx.fillStyle = '#e8f4ff';
            this.drawRoundedRect(ctx, x, y, Math.min(maxWidth, width), barHeight, barRadius);
            ctx.fill();
        }

        // Current capacity bar (allocated capacity)
        if (totalCapacity > 0) {
            const currentWidth = (totalCapacity / 100) * width;
            ctx.fillStyle = capacityMode === 'weight' ? '#dbeafe' : '#bfdbfe';
            this.drawRoundedRect(ctx, x, y, Math.min(currentWidth, width), barHeight, barRadius);
            ctx.fill();
        }

        // Used capacity bar (actually used portion)
        if (usedCapacity > 0 && totalCapacity > 0) {
            // usedCapacity in scheduler data is a percentage, but we need to show it relative to the allocated capacity
            // So if total capacity is 30% and used is 42.5%, we show 42.5% of the 30% allocated portion
            const usedWidth = (usedCapacity / 100) * (totalCapacity / 100) * width;
            const color = this.getUsageColor(usedCapacity, totalCapacity);
            ctx.fillStyle = color;
            this.drawRoundedRect(ctx, x, y, Math.min(usedWidth, width), barHeight, barRadius);
            ctx.fill();
        }
    }

    /**
     * Get detailed capacity information from partition data
     */
    private getDetailedCapacityInfo(queue: Queue): { allocated: string; used: string; max: string } {
        const capacityMode = this.getCapacityMode(queue);
        const usedCapacity = queue.usedCapacity || 0;
        const totalCapacity = queue.capacity || 0;
        const maxCapacity = queue.maxCapacity || 100;

        let allocated: string;
        let used: string;
        let max: string;

        if (capacityMode === 'weight') {
            allocated = `Capacity: ${totalCapacity} weight`;
            used = `${usedCapacity.toFixed(1)}% in use`;
            max = `Max Capacity: ${maxCapacity} weight`;
        } else if (capacityMode === 'absolute') {
            allocated = `Capacity: ${totalCapacity} resources`;
            used = `${usedCapacity.toFixed(1)}% in use`;
            max = `Max Capacity: ${maxCapacity} resources`;
        } else {
            allocated = `Capacity: ${totalCapacity}%`;
            used = `${usedCapacity.toFixed(1)}% in use`;
            max = `Max Capacity: ${maxCapacity}%`;
        }

        return { allocated, used, max };
    }

    /**
     * Get resource usage text
     */
    private getResourceUsageText(queue: Queue): string {
        const resources = queue.resourcesUsed;
        if (!resources) return '';

        const parts: string[] = [];

        if (resources.memory > 0) {
            const memory = this.formatBytes(resources.memory * 1024 * 1024);
            parts.push(`Memory: ${memory}`);
        }

        if (resources.vCores > 0) {
            parts.push(`vCores: ${resources.vCores}`);
        }

        if (queue.numApplications > 0) {
            parts.push(`Apps: ${queue.numApplications}`);
        }

        return parts.join(' • ');
    }

    /**
     * Get usage color based on percentage
     */
    private getUsageColor(used: number, total: number): string {
        if (total === 0) return '#94a3b8';

        const percentage = (used / total) * 100;

        if (percentage >= 90) return '#ef4444'; // Red
        if (percentage >= 75) return '#f97316'; // Orange
        if (percentage >= 50) return '#eab308'; // Yellow
        return '#22c55e'; // Green
    }

    /**
     * Format bytes to human readable string
     */
    private formatBytes(bytes: number): string {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    /**
     * Get capacity display text (legacy - kept for compatibility)
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
        const previousHovered = this.hoveredNode;
        this.hoveredNode = node;

        // Handle hover animations
        if (previousHovered && previousHovered.id !== node?.id) {
            // Start fade out animation for previously hovered node
            this.startHoverAnimation(previousHovered.id, 1.0);
        }

        if (node && node.id !== previousHovered?.id) {
            // Start fade in animation for newly hovered node
            this.startHoverAnimation(node.id, 1.05);
        }
    }

    /**
     * Set selected nodes
     */
    setSelectedNodes(nodeIds: Set<string>): void {
        this.selectedNodes = nodeIds;
    }

    /**
     * Start hover animation for a node
     */
    private startHoverAnimation(nodeId: string, targetScale: number): void {
        const currentAnimation = this.hoverAnimations.get(nodeId);
        const currentScale = currentAnimation?.currentScale || 1.0;

        this.hoverAnimations.set(nodeId, {
            currentScale,
            targetScale,
            startTime: performance.now(),
        });
    }

    /**
     * Update hover animations and return current scale for a node
     */
    private getAnimatedScale(nodeId: string): number {
        const animation = this.hoverAnimations.get(nodeId);
        if (!animation) return 1.0;

        const now = performance.now();
        const elapsed = now - animation.startTime;
        const progress = Math.min(elapsed / this.HOVER_ANIMATION_DURATION, 1);

        // Smooth easing function (ease-out)
        const easedProgress = 1 - Math.pow(1 - progress, 3);

        const currentScale = animation.currentScale + (animation.targetScale - animation.currentScale) * easedProgress;

        // Update current scale for next frame
        animation.currentScale = currentScale;

        // Remove animation when complete
        if (progress >= 1) {
            if (animation.targetScale === 1.0) {
                this.hoverAnimations.delete(nodeId);
            }
        }

        return currentScale;
    }

    /**
     * Check if any hover animations are currently running
     */
    private hasActiveAnimations(): boolean {
        return this.hoverAnimations.size > 0;
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
        this.hoverAnimations.clear();
    }
}
