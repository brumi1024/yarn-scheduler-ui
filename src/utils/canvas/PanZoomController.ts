export interface PanZoomState {
    x: number;
    y: number;
    scale: number;
}

export interface PanZoomConfig {
    minScale: number;
    maxScale: number;
    zoomSpeed: number;
    panSpeed: number;
    enableTouch: boolean;
    enableKeyboard: boolean;
    wheelSensitivity: number;
    touchSensitivity: number;
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
    zoomSpeed: 0.1,
    panSpeed: 1.0,
    enableTouch: true,
    enableKeyboard: true,
    wheelSensitivity: 0.002,
    touchSensitivity: 0.01,
};

export class PanZoomController {
    private canvas: HTMLCanvasElement;
    private config: PanZoomConfig;
    private state: PanZoomState;
    private bounds: ViewportBounds;

    // Event tracking
    private isDragging: boolean = false;
    private lastPointerPos: { x: number; y: number } | null = null;
    private activePointers: Map<number, { x: number; y: number }> = new Map();
    private lastTouchDistance: number = 0;
    // private lastTouchCenter: { x: number; y: number } = { x: 0, y: 0 };
    private dragEndTime: number = 0;

    // Event listeners
    private listeners: ((event: PanZoomEvent) => void)[] = [];
    private eventListeners: (() => void)[] = [];

    // Animation
    private animationFrame: number | null = null;
    private targetState: PanZoomState | null = null;
    private animationDuration: number = 0;
    private animationStart: number = 0;
    private animationStartState: PanZoomState | null = null;

    constructor(canvas: HTMLCanvasElement, config: Partial<PanZoomConfig> = {}) {
        this.canvas = canvas;
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.state = { x: 0, y: 0, scale: 1 };
        this.bounds = this.calculateBounds();

        this.setupEventListeners();
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
        // Consider dragging active if currently dragging or just finished (within 100ms)
        return this.isDragging || Date.now() - this.dragEndTime < 100;
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

        if (animate) {
            this.animateToState(targetState, 300);
        } else {
            // Cancel any ongoing animation
            if (this.animationFrame !== null) {
                cancelAnimationFrame(this.animationFrame);
                this.animationFrame = null;
                this.targetState = null;
            }
            this.applyState(targetState);
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
            x: this.state.x + deltaX * this.config.panSpeed,
            y: this.state.y + deltaY * this.config.panSpeed,
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
        this.removeEventListeners();
        this.listeners = [];

        if (this.animationFrame !== null) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    }

    /**
     * Setup event listeners
     */
    private setupEventListeners(): void {
        // Mouse events
        const onMouseDown = (e: MouseEvent) => this.handlePointerDown(e.clientX, e.clientY, 0);
        const onMouseMove = (e: MouseEvent) => this.handlePointerMove(e.clientX, e.clientY, 0);
        const onMouseUp = () => this.handlePointerUp(0);
        const onWheel = (e: WheelEvent) => this.handleWheel(e);

        // Touch events
        const onTouchStart = (e: TouchEvent) => this.handleTouchStart(e);
        const onTouchMove = (e: TouchEvent) => this.handleTouchMove(e);
        const onTouchEnd = (e: TouchEvent) => this.handleTouchEnd(e);

        // Keyboard events
        const onKeyDown = (e: KeyboardEvent) => this.handleKeyDown(e);

        // Context menu (disable on canvas)
        const onContextMenu = (e: Event) => e.preventDefault();

        this.canvas.addEventListener('mousedown', onMouseDown);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        this.canvas.addEventListener('wheel', onWheel, { passive: false });

        if (this.config.enableTouch) {
            this.canvas.addEventListener('touchstart', onTouchStart, { passive: false });
            this.canvas.addEventListener('touchmove', onTouchMove, { passive: false });
            this.canvas.addEventListener('touchend', onTouchEnd);
        }

        if (this.config.enableKeyboard) {
            window.addEventListener('keydown', onKeyDown);
        }

        this.canvas.addEventListener('contextmenu', onContextMenu);

        // Store cleanup functions
        this.eventListeners = [
            () => this.canvas.removeEventListener('mousedown', onMouseDown),
            () => window.removeEventListener('mousemove', onMouseMove),
            () => window.removeEventListener('mouseup', onMouseUp),
            () => this.canvas.removeEventListener('wheel', onWheel),
            () => this.canvas.removeEventListener('touchstart', onTouchStart),
            () => this.canvas.removeEventListener('touchmove', onTouchMove),
            () => this.canvas.removeEventListener('touchend', onTouchEnd),
            () => window.removeEventListener('keydown', onKeyDown),
            () => this.canvas.removeEventListener('contextmenu', onContextMenu),
        ];
    }

    /**
     * Remove event listeners
     */
    private removeEventListeners(): void {
        this.eventListeners.forEach((cleanup) => cleanup());
        this.eventListeners = [];
    }

    /**
     * Handle pointer down
     */
    private handlePointerDown(clientX: number, clientY: number, pointerId: number): void {
        // Don't set isDragging to true yet - wait for actual movement
        this.lastPointerPos = { x: clientX, y: clientY };
        this.activePointers.set(pointerId, { x: clientX, y: clientY });

        // Cancel any ongoing animation
        if (this.animationFrame !== null) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
            this.targetState = null;
        }
    }

    /**
     * Handle pointer move
     */
    private handlePointerMove(clientX: number, clientY: number, pointerId: number): void {
        // Must have at least one active pointer
        if (this.activePointers.size === 0) return;

        if (!this.lastPointerPos) return;

        // Check if we've moved enough to consider it a drag (threshold of 3 pixels)
        const deltaX = clientX - this.lastPointerPos.x;
        const deltaY = clientY - this.lastPointerPos.y;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        if (!this.isDragging && distance > 3) {
            this.isDragging = true;
        }

        if (!this.isDragging) return;

        this.activePointers.set(pointerId, { x: clientX, y: clientY });

        // Single pointer panning
        if (this.activePointers.size === 1) {
            this.panBy(deltaX, deltaY);
        }

        this.lastPointerPos = { x: clientX, y: clientY };
    }

    /**
     * Handle pointer up
     */
    private handlePointerUp(pointerId: number): void {
        this.activePointers.delete(pointerId);

        if (this.activePointers.size === 0) {
            // Only set dragEndTime if we were actually dragging
            if (this.isDragging) {
                this.dragEndTime = Date.now();
            }
            this.isDragging = false;
            this.lastPointerPos = null;
        }
    }

    /**
     * Handle wheel zoom
     */
    private handleWheel(e: WheelEvent): void {
        e.preventDefault();

        const delta = -e.deltaY * this.config.wheelSensitivity;
        const factor = 1 + delta * this.config.zoomSpeed;

        this.zoomBy(factor, e.clientX, e.clientY);
    }

    /**
     * Handle touch start
     */
    private handleTouchStart(e: TouchEvent): void {
        e.preventDefault();

        Array.from(e.changedTouches).forEach((touch) => {
            this.handlePointerDown(touch.clientX, touch.clientY, touch.identifier);
        });

        // Store initial touch state for pinch zoom
        if (e.touches.length === 2) {
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];

            this.lastTouchDistance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);

            // this.lastTouchCenter = {
            //   x: (touch1.clientX + touch2.clientX) / 2,
            //   y: (touch1.clientY + touch2.clientY) / 2
            // };
        }
    }

    /**
     * Handle touch move
     */
    private handleTouchMove(e: TouchEvent): void {
        e.preventDefault();

        if (e.touches.length === 2) {
            // Pinch zoom
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];

            const distance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);

            const center = {
                x: (touch1.clientX + touch2.clientX) / 2,
                y: (touch1.clientY + touch2.clientY) / 2,
            };

            if (this.lastTouchDistance > 0) {
                const scale = distance / this.lastTouchDistance;
                this.zoomBy(scale, center.x, center.y);
            }

            this.lastTouchDistance = distance;
            // this.lastTouchCenter = center;
        } else if (e.touches.length === 1) {
            // Single finger panning
            const touch = e.touches[0];
            this.handlePointerMove(touch.clientX, touch.clientY, touch.identifier);
        }
    }

    /**
     * Handle touch end
     */
    private handleTouchEnd(e: TouchEvent): void {
        Array.from(e.changedTouches).forEach((touch) => {
            this.handlePointerUp(touch.identifier);
        });

        if (e.touches.length < 2) {
            this.lastTouchDistance = 0;
        }
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
     * Apply state and notify listeners
     */
    private applyState(newState: PanZoomState): void {
        const oldState = { ...this.state };
        this.state = { ...newState };
        this.bounds = this.calculateBounds();

        const delta = {
            x: newState.x - oldState.x,
            y: newState.y - oldState.y,
            scale: newState.scale - oldState.scale,
        };

        this.notifyListeners({
            type: 'pan',
            state: this.state,
            bounds: this.bounds,
            delta,
        });
    }

    /**
     * Animate to target state
     */
    private animateToState(targetState: PanZoomState, duration: number): void {
        this.targetState = targetState;
        this.animationDuration = duration;
        this.animationStart = performance.now();
        this.animationStartState = { ...this.state };

        if (this.animationFrame !== null) {
            cancelAnimationFrame(this.animationFrame);
        }

        this.animationFrame = requestAnimationFrame(() => this.updateAnimation());
    }

    /**
     * Update animation frame
     */
    private updateAnimation(): void {
        if (!this.targetState || !this.animationStartState) {
            this.animationFrame = null;
            return;
        }

        const elapsed = performance.now() - this.animationStart;
        const progress = Math.min(elapsed / this.animationDuration, 1);

        // Easing function (ease-out)
        const eased = 1 - Math.pow(1 - progress, 3);

        const currentState = {
            x: this.animationStartState.x + (this.targetState.x - this.animationStartState.x) * eased,
            y: this.animationStartState.y + (this.targetState.y - this.animationStartState.y) * eased,
            scale: this.animationStartState.scale + (this.targetState.scale - this.animationStartState.scale) * eased,
        };

        this.applyState(currentState);

        if (progress < 1) {
            this.animationFrame = requestAnimationFrame(() => this.updateAnimation());
        } else {
            this.animationFrame = null;
            this.targetState = null;
            this.animationStartState = null;
        }
    }

    /**
     * Calculate viewport bounds
     */
    private calculateBounds(): ViewportBounds {
        const rect = this.canvas.getBoundingClientRect();

        return {
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
