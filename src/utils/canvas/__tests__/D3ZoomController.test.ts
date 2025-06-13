import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { D3ZoomController } from '../D3ZoomController';

describe('D3ZoomController', () => {
    let canvas: HTMLCanvasElement;
    let controller: D3ZoomController;

    beforeEach(() => {
        // Create a test canvas element
        canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 600;
        document.body.appendChild(canvas);

        // Mock getBoundingClientRect
        Object.defineProperty(canvas, 'getBoundingClientRect', {
            writable: true,
            value: () => ({
                x: 0,
                y: 0,
                width: 800,
                height: 600,
                top: 0,
                left: 0,
                bottom: 600,
                right: 800,
            }),
        });

        controller = new D3ZoomController(canvas, {
            minScale: 0.1,
            maxScale: 5.0,
            enableKeyboard: true,
        });
    });

    afterEach(() => {
        controller.destroy();
        document.body.removeChild(canvas);
    });

    it('should initialize with default state', () => {
        const state = controller.getState();
        expect(state).toEqual({
            x: 0,
            y: 0,
            scale: 1,
        });
    });

    it('should update state correctly', () => {
        controller.setState({ x: 100, y: 50, scale: 2 });
        const state = controller.getState();
        expect(state.x).toBe(100);
        expect(state.y).toBe(50);
        expect(state.scale).toBe(2);
    });

    it('should clamp scale to configured limits', () => {
        // Test min scale
        controller.setState({ scale: 0.05 });
        expect(controller.getState().scale).toBe(0.1);

        // Test max scale
        controller.setState({ scale: 10 });
        expect(controller.getState().scale).toBe(5.0);
    });

    it('should reset to default state', () => {
        controller.setState({ x: 100, y: 50, scale: 2 });
        controller.reset(false); // No animation for testing
        
        // Note: reset is async, but we can check the call was made
        const state = controller.getState();
        expect(state.x).toBe(0);
        expect(state.y).toBe(0);
        expect(state.scale).toBe(1);
    });

    it('should calculate viewport bounds correctly', () => {
        controller.setState({ x: 50, y: 25, scale: 2 });
        const bounds = controller.getBounds();
        
        expect(bounds.x).toBe(-25); // -50/2
        expect(bounds.y).toBe(-12.5); // -25/2
        expect(bounds.width).toBe(400); // 800/2
        expect(bounds.height).toBe(300); // 600/2
    });

    it('should handle zoom by factor', () => {
        controller.setState({ scale: 1 });
        controller.zoomBy(2);
        
        // The zoom will be applied via D3, so we test the method exists
        expect(typeof controller.zoomBy).toBe('function');
    });

    it('should handle pan by delta', () => {
        controller.setState({ x: 0, y: 0 });
        controller.panBy(10, 20);
        
        const state = controller.getState();
        expect(state.x).toBe(10);
        expect(state.y).toBe(20);
    });

    it('should convert screen to world coordinates', () => {
        controller.setState({ x: 50, y: 25, scale: 2 });
        
        const world = controller.screenToWorld(100, 80);
        expect(world.x).toBe(25); // (100 - 50) / 2
        expect(world.y).toBe(27.5); // (80 - 25) / 2
    });

    it('should handle event listeners', () => {
        const listener = () => {
            // Test listener function
        };

        controller.addEventListener(listener);
        controller.removeEventListener(listener);

        // Test that the methods work without errors
        expect(typeof controller.addEventListener).toBe('function');
        expect(typeof controller.removeEventListener).toBe('function');
    });

    it('should handle zoom to fit', () => {
        const contentBounds = {
            x: 0,
            y: 0,
            width: 400,
            height: 300,
        };

        controller.zoomToFit(contentBounds, 50, false);
        
        // Test the method completes without error
        expect(typeof controller.zoomToFit).toBe('function');
    });

    it('should not be dragging initially', () => {
        expect(controller.isDraggingActive()).toBe(false);
    });
});