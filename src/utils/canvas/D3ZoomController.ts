import { zoom, zoomIdentity, type ZoomBehavior } from 'd3-zoom';
import { select, type Selection } from 'd3-selection';
import 'd3-transition'; // Required for .transition() method
import { easeCubicInOut } from 'd3-ease';

export interface PanZoomState {
    x: number;
    y: number;
    scale: number;
}

export interface PanZoomConfig {
    minScale: number;
    maxScale: number;
    enableKeyboard: boolean;
    wheelSensitivity: number;
}

export interface ViewportBounds {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface PanZoomEvent {
    type: 'pan' | 'zoom' | 'reset';
    state: PanZoomState;
    bounds: ViewportBounds;
    delta?: { x: number; y: number; scale: number };
}

const DEFAULT_CONFIG: PanZoomConfig = {
    minScale: 0.1,
    maxScale: 5.0,
    enableKeyboard: true,
    wheelSensitivity: 0.002,
};

export class D3ZoomController {
    private canvas: HTMLCanvasElement;
    private config: PanZoomConfig;
    private selection: Selection<HTMLCanvasElement, unknown, null, undefined>;
    private zoomBehavior: ZoomBehavior<HTMLCanvasElement, unknown>;
    private state: PanZoomState = { x: 0, y: 0, scale: 1 };
    private bounds: ViewportBounds = { x: 0, y: 0, width: 0, height: 0 };

    // Event listeners
    private listeners: ((event: PanZoomEvent) => void)[] = [];
    private clickListeners: ((event: MouseEvent) => void)[] = [];
    private keydownListener: ((e: KeyboardEvent) => void) | null = null;
    private canvasClickListener: ((event: MouseEvent) => void) | null = null;
    private isDragging: boolean = false;
    private dragEndTime: number = 0;
    private lastZoomState: PanZoomState = { x: 0, y: 0, scale: 1 };
    private hasActuallyMoved: boolean = false;

    constructor(canvas: HTMLCanvasElement, config: Partial<PanZoomConfig> = {}) {
        this.canvas = canvas;
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.selection = select(canvas);

        // Create D3 zoom behavior
        this.zoomBehavior = zoom<HTMLCanvasElement, unknown>()
            .scaleExtent([this.config.minScale, this.config.maxScale])
            .wheelDelta((event) => -event.deltaY * this.config.wheelSensitivity)
            .filter((event) => {
                // Allow all events except right-clicks
                return event.button !== 2;
            })
            .on('start', () => this.handleZoomStart())
            .on('zoom', (event) => this.handleZoom(event))
            .on('end', () => this.handleZoomEnd());

        this.setupEventListeners();
        this.updateBounds();
    }

    /**
     * Get current pan/zoom state
     */
    getState(): PanZoomState {
        return { ...this.state };
    }

    /**
     * Check if currently dragging
     */
    isDraggingActive(): boolean {
        return this.isDragging || Date.now() - this.dragEndTime < 50;
    }

    /**
     * Get viewport bounds
     */
    getBounds(): ViewportBounds {
        return { ...this.bounds };
    }

    /**
     * Set pan/zoom state
     */
    setState(newState: Partial<PanZoomState>, animate: boolean = false): void {
        const targetState = {
            x: newState.x !== undefined ? newState.x : this.state.x,
            y: newState.y !== undefined ? newState.y : this.state.y,
            scale:
                newState.scale !== undefined
                    ? Math.max(this.config.minScale, Math.min(this.config.maxScale, newState.scale))
                    : this.state.scale,
        };

        const transform = zoomIdentity.translate(targetState.x, targetState.y).scale(targetState.scale);

        if (animate) {
            this.selection.transition().duration(300).ease(easeCubicInOut).call(this.zoomBehavior.transform, transform);
        } else {
            this.selection.call(this.zoomBehavior.transform, transform);
        }
    }

    /**
     * Reset to default state
     */
    reset(animate: boolean = true): void {
        this.setState({ x: 0, y: 0, scale: 1 }, animate);
    }

    /**
     * Zoom to fit content
     */
    zoomToFit(contentBounds: ViewportBounds, padding: number = 50, animate: boolean = true): void {
        const canvasRect = this.canvas.getBoundingClientRect();
        const availableWidth = canvasRect.width - padding * 2;
        const availableHeight = canvasRect.height - padding * 2;

        const scaleX = availableWidth / contentBounds.width;
        const scaleY = availableHeight / contentBounds.height;
        const scale = Math.min(scaleX, scaleY, this.config.maxScale);

        const centerX = canvasRect.width / 2;
        const centerY = canvasRect.height / 2;
        const contentCenterX = contentBounds.x + contentBounds.width / 2;
        const contentCenterY = contentBounds.y + contentBounds.height / 2;

        const x = centerX - contentCenterX * scale;
        const y = centerY - contentCenterY * scale;

        this.setState({ x, y, scale }, animate);
    }

    /**
     * Zoom to specific point
     */
    zoomToPoint(clientX: number, clientY: number, newScale: number, animate: boolean = false): void {
        const rect = this.canvas.getBoundingClientRect();
        const canvasX = clientX - rect.left;
        const canvasY = clientY - rect.top;

        // Calculate world coordinates before zoom
        const worldX = (canvasX - this.state.x) / this.state.scale;
        const worldY = (canvasY - this.state.y) / this.state.scale;

        // Calculate new pan to keep point under cursor
        const clampedScale = Math.max(this.config.minScale, Math.min(this.config.maxScale, newScale));
        const x = canvasX - worldX * clampedScale;
        const y = canvasY - worldY * clampedScale;

        this.setState({ x, y, scale: clampedScale }, animate);
    }

    /**
     * Pan by delta
     */
    panBy(deltaX: number, deltaY: number): void {
        this.setState({
            x: this.state.x + deltaX,
            y: this.state.y + deltaY,
        });
    }

    /**
     * Zoom by factor
     */
    zoomBy(factor: number, centerX?: number, centerY?: number): void {
        const newScale = this.state.scale * factor;

        if (centerX !== undefined && centerY !== undefined) {
            this.zoomToPoint(centerX, centerY, newScale);
        } else {
            const rect = this.canvas.getBoundingClientRect();
            this.zoomToPoint(rect.width / 2, rect.height / 2, newScale);
        }
    }

    /**
     * Add event listener
     */
    addEventListener(listener: (event: PanZoomEvent) => void): void {
        this.listeners.push(listener);
    }

    /**
     * Remove event listener
     */
    removeEventListener(listener: (event: PanZoomEvent) => void): void {
        const index = this.listeners.indexOf(listener);
        if (index !== -1) {
            this.listeners.splice(index, 1);
        }
    }

    /**
     * Add click event listener
     */
    addClickListener(listener: (event: MouseEvent) => void): void {
        this.clickListeners.push(listener);
    }

    /**
     * Remove click event listener
     */
    removeClickListener(listener: (event: MouseEvent) => void): void {
        const index = this.clickListeners.indexOf(listener);
        if (index !== -1) {
            this.clickListeners.splice(index, 1);
        }
    }

    /**
     * Convert screen coordinates to world coordinates
     */
    screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
        const rect = this.canvas.getBoundingClientRect();
        const canvasX = screenX - rect.left;
        const canvasY = screenY - rect.top;

        return {
            x: (canvasX - this.state.x) / this.state.scale,
            y: (canvasY - this.state.y) / this.state.scale,
        };
    }

    /**
     * Convert world coordinates to screen coordinates
     */
    worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
        const rect = this.canvas.getBoundingClientRect();

        return {
            x: worldX * this.state.scale + this.state.x + rect.left,
            y: worldY * this.state.scale + this.state.y + rect.top,
        };
    }

    /**
     * Destroy controller and cleanup
     */
    destroy(): void {
        this.selection.on('.zoom', null);
        this.removeKeyboardListeners();
        
        // Remove canvas click listener
        if (this.canvasClickListener) {
            this.canvas.removeEventListener('click', this.canvasClickListener);
            this.canvasClickListener = null;
        }
        
        this.listeners = [];
        this.clickListeners = [];
    }

    /**
     * Setup event listeners
     */
    private setupEventListeners(): void {
        // Apply D3 zoom behavior to canvas
        this.selection.call(this.zoomBehavior);

        // Prevent context menu
        this.selection.on('contextmenu', (event) => {
            event.preventDefault();
        });

        // Add click handler using addEventListener on the raw canvas element
        // This bypasses D3's event handling which can interfere with clicks
        this.canvasClickListener = (event) => {
            // Check if this was a click vs a drag
            const timeSinceDragEnd = Date.now() - this.dragEndTime;
            // Allow clicks if we're not dragging and either haven't moved significantly or enough time has passed
            const isQuickClick = !this.isDragging && (!this.hasActuallyMoved || timeSinceDragEnd > 50);
            
            if (isQuickClick) {
                this.clickListeners.forEach(listener => {
                    try {
                        listener(event);
                    } catch {
                        // Silently ignore listener errors
                    }
                });
            }
        };
        
        this.canvas.addEventListener('click', this.canvasClickListener);

        // Setup keyboard listeners if enabled
        if (this.config.enableKeyboard) {
            this.setupKeyboardListeners();
        }
    }

    /**
     * Setup keyboard event listeners
     */
    private setupKeyboardListeners(): void {
        this.keydownListener = (e: KeyboardEvent) => this.handleKeyDown(e);
        window.addEventListener('keydown', this.keydownListener);
    }

    /**
     * Remove keyboard event listeners
     */
    private removeKeyboardListeners(): void {
        if (this.keydownListener) {
            window.removeEventListener('keydown', this.keydownListener);
            this.keydownListener = null;
        }
    }

    /**
     * Handle zoom start event
     */
    private handleZoomStart(): void {
        this.isDragging = true;
        this.hasActuallyMoved = false;
        this.lastZoomState = { ...this.state };
    }

    /**
     * Handle zoom event (includes pan and zoom)
     */
    private handleZoom(event: { transform: { x: number; y: number; k: number } }): void {
        const { transform } = event;
        const oldState = { ...this.state };

        this.state = {
            x: transform.x,
            y: transform.y,
            scale: transform.k,
        };

        // Check if we've actually moved significantly from the start
        const movementThreshold = 5; // pixels
        const scaleThreshold = 0.01; // scale difference
        const deltaX = Math.abs(this.state.x - this.lastZoomState.x);
        const deltaY = Math.abs(this.state.y - this.lastZoomState.y);
        const deltaScale = Math.abs(this.state.scale - this.lastZoomState.scale);
        
        if (deltaX > movementThreshold || deltaY > movementThreshold || deltaScale > scaleThreshold) {
            this.hasActuallyMoved = true;
        }

        this.updateBounds();

        const delta = {
            x: this.state.x - oldState.x,
            y: this.state.y - oldState.y,
            scale: this.state.scale - oldState.scale,
        };

        this.notifyListeners({
            type: delta.scale !== 0 ? 'zoom' : 'pan',
            state: this.state,
            bounds: this.bounds,
            delta,
        });
    }

    /**
     * Handle zoom end event
     */
    private handleZoomEnd(): void {
        this.isDragging = false;
        this.dragEndTime = Date.now();
    }

    /**
     * Handle keyboard shortcuts
     */
    private handleKeyDown(e: KeyboardEvent): void {
        if (!this.config.enableKeyboard) return;

        // Only handle if canvas has focus or no input is focused
        if (
            document.activeElement &&
            document.activeElement !== this.canvas &&
            document.activeElement.tagName.match(/INPUT|TEXTAREA|SELECT/)
        ) {
            return;
        }

        const panStep = 50;
        const zoomStep = 0.1;

        switch (e.code) {
            case 'ArrowLeft':
                e.preventDefault();
                this.panBy(panStep, 0);
                break;
            case 'ArrowRight':
                e.preventDefault();
                this.panBy(-panStep, 0);
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.panBy(0, panStep);
                break;
            case 'ArrowDown':
                e.preventDefault();
                this.panBy(0, -panStep);
                break;
            case 'Equal':
            case 'NumpadAdd':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    this.zoomBy(1 + zoomStep);
                }
                break;
            case 'Minus':
            case 'NumpadSubtract':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    this.zoomBy(1 - zoomStep);
                }
                break;
            case 'Digit0':
            case 'Numpad0':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    this.reset();
                }
                break;
        }
    }

    /**
     * Update viewport bounds
     */
    private updateBounds(): void {
        const rect = this.canvas.getBoundingClientRect();

        this.bounds = {
            x: -this.state.x / this.state.scale,
            y: -this.state.y / this.state.scale,
            width: rect.width / this.state.scale,
            height: rect.height / this.state.scale,
        };
    }

    /**
     * Notify all listeners
     */
    private notifyListeners(event: PanZoomEvent): void {
        this.listeners.forEach((listener) => {
            try {
                listener(event);
            } catch {
                // Silently ignore listener errors
            }
        });
    }
}
