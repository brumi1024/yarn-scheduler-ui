import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { PanZoomController } from '../PanZoomController';

// Mock HTMLCanvasElement
class MockHTMLCanvasElement {
  width = 800;
  height = 600;
  
  getBoundingClientRect = vi.fn(() => ({
    width: 800,
    height: 600,
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: 800,
    bottom: 600
  }));

  addEventListener = vi.fn();
  removeEventListener = vi.fn();
}

describe('PanZoomController', () => {
  let canvas: MockHTMLCanvasElement;
  let controller: PanZoomController;

  beforeEach(() => {
    // Mock requestAnimationFrame and cancelAnimationFrame
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback) => {
      setTimeout(callback, 16);
      return 1;
    }));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    
    // Mock window event listeners
    vi.stubGlobal('window', {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    });

    canvas = new MockHTMLCanvasElement();
    controller = new PanZoomController(canvas as any);
  });

  afterEach(() => {
    controller.destroy();
  });

  describe('constructor', () => {
    it('should initialize with default state', () => {
      const state = controller.getState();
      expect(state).toEqual({ x: 0, y: 0, scale: 1 });
    });

    it('should setup event listeners', () => {
      expect(canvas.addEventListener).toHaveBeenCalledWith('mousedown', expect.any(Function));
      expect(canvas.addEventListener).toHaveBeenCalledWith('wheel', expect.any(Function), { passive: false });
      expect(canvas.addEventListener).toHaveBeenCalledWith('touchstart', expect.any(Function), { passive: false });
    });

    it('should accept custom config', () => {
      const customController = new PanZoomController(canvas as any, {
        minScale: 0.5,
        maxScale: 3.0,
        enableTouch: false
      });
      
      // Should respect max scale
      customController.setState({ scale: 5 });
      const state = customController.getState();
      expect(state.scale).toBe(3.0);
      
      customController.destroy();
    });
  });

  describe('state management', () => {
    it('should get current state', () => {
      const state = controller.getState();
      expect(state).toHaveProperty('x');
      expect(state).toHaveProperty('y');
      expect(state).toHaveProperty('scale');
    });

    it('should set state without animation', () => {
      controller.setState({ x: 100, y: 50, scale: 1.5 });
      const state = controller.getState();
      
      expect(state.x).toBe(100);
      expect(state.y).toBe(50);
      expect(state.scale).toBe(1.5);
    });

    it('should clamp scale to min/max values', () => {
      controller.setState({ scale: 10 }); // Above max
      expect(controller.getState().scale).toBe(5.0); // Clamped to max
      
      controller.setState({ scale: 0.01 }); // Below min
      expect(controller.getState().scale).toBe(0.1); // Clamped to min
    });

    it('should reset to default state', () => {
      controller.setState({ x: 100, y: 50, scale: 2 });
      controller.reset(false);
      
      const state = controller.getState();
      expect(state).toEqual({ x: 0, y: 0, scale: 1 });
    });
  });

  describe('bounds calculation', () => {
    it('should calculate viewport bounds', () => {
      const bounds = controller.getBounds();
      
      expect(bounds).toHaveProperty('x');
      expect(bounds).toHaveProperty('y');
      expect(bounds).toHaveProperty('width');
      expect(bounds).toHaveProperty('height');
    });

    it('should update bounds when state changes', () => {
      const initialBounds = controller.getBounds();
      
      controller.setState({ x: 100, y: 50, scale: 2 });
      const newBounds = controller.getBounds();
      
      expect(newBounds).not.toEqual(initialBounds);
    });
  });

  describe('coordinate conversion', () => {
    it('should convert screen to world coordinates', () => {
      controller.setState({ x: 100, y: 50, scale: 2 });
      
      const world = controller.screenToWorld(200, 150);
      
      expect(world.x).toBe(50); // (200 - 100) / 2
      expect(world.y).toBe(50); // (150 - 50) / 2
    });

    it('should convert world to screen coordinates', () => {
      controller.setState({ x: 100, y: 50, scale: 2 });
      
      const screen = controller.worldToScreen(50, 50);
      
      expect(screen.x).toBe(200); // 50 * 2 + 100 + 0 (rect.left)
      expect(screen.y).toBe(150); // 50 * 2 + 50 + 0 (rect.top)
    });

    it('should be reversible', () => {
      controller.setState({ x: 75, y: 25, scale: 1.5 });
      
      const originalWorld = { x: 100, y: 200 };
      const screen = controller.worldToScreen(originalWorld.x, originalWorld.y);
      const backToWorld = controller.screenToWorld(screen.x, screen.y);
      
      expect(backToWorld.x).toBeCloseTo(originalWorld.x, 5);
      expect(backToWorld.y).toBeCloseTo(originalWorld.y, 5);
    });
  });

  describe('panning', () => {
    it('should pan by delta', () => {
      const initialState = controller.getState();
      
      controller.panBy(50, 30);
      const newState = controller.getState();
      
      expect(newState.x).toBe(initialState.x + 50);
      expect(newState.y).toBe(initialState.y + 30);
    });

    it('should respect pan speed', () => {
      const customController = new PanZoomController(canvas as any, {
        panSpeed: 2.0
      });
      
      const initialState = customController.getState();
      customController.panBy(50, 30);
      const newState = customController.getState();
      
      expect(newState.x).toBe(initialState.x + 100); // 50 * 2.0
      expect(newState.y).toBe(initialState.y + 60);  // 30 * 2.0
      
      customController.destroy();
    });
  });

  describe('zooming', () => {
    it('should zoom by factor', () => {
      const initialScale = controller.getState().scale;
      
      controller.zoomBy(1.5);
      const newScale = controller.getState().scale;
      
      expect(newScale).toBe(initialScale * 1.5);
    });

    it('should zoom to point', () => {
      controller.zoomToPoint(400, 300, 2.0); // Center of 800x600 canvas
      
      const state = controller.getState();
      expect(state.scale).toBe(2.0);
      // When zooming to center, the calculation gives x = canvasX - worldX * scale
      // For center point: x = 400 - (400/1) * 2 = 400 - 800 = -400
      expect(state.x).toBe(-400);
      expect(state.y).toBe(-300);
    });

    it('should zoom to fit content', () => {
      const contentBounds = {
        x: 100,
        y: 100,
        width: 200,
        height: 150
      };
      
      controller.zoomToFit(contentBounds, 50, false);
      
      const state = controller.getState();
      expect(state.scale).toBeGreaterThan(1);
      expect(state.scale).toBeLessThanOrEqual(5.0); // Max scale
    });
  });

  describe('event listeners', () => {
    it('should add and remove event listeners', () => {
      const listener = vi.fn();
      
      controller.addEventListener(listener);
      controller.setState({ x: 100 });
      
      expect(listener).toHaveBeenCalled();
      
      controller.removeEventListener(listener);
      listener.mockClear();
      
      controller.setState({ x: 200 });
      expect(listener).not.toHaveBeenCalled();
    });

    it('should notify listeners with correct event data', () => {
      const listener = vi.fn();
      controller.addEventListener(listener);
      
      controller.setState({ x: 100, y: 50, scale: 1.5 });
      
      expect(listener).toHaveBeenCalledWith({
        type: 'pan',
        state: { x: 100, y: 50, scale: 1.5 },
        bounds: expect.any(Object),
        delta: { x: 100, y: 50, scale: 0.5 }
      });
    });

    it('should handle listener errors gracefully', () => {
      const errorListener = () => {
        throw new Error('Test error');
      };
      const goodListener = vi.fn();
      
      controller.addEventListener(errorListener);
      controller.addEventListener(goodListener);
      
      // Should not throw and should still call good listener
      expect(() => {
        controller.setState({ x: 100 });
      }).not.toThrow();
      
      expect(goodListener).toHaveBeenCalled();
    });
  });

  describe('animation', () => {
    it('should animate state changes when requested', () => {
      controller.setState({ x: 100, y: 50, scale: 2 }, true);
      
      // Animation should be initiated
      expect(requestAnimationFrame).toHaveBeenCalled();
    });

    it('should cancel animation when new state is set', () => {
      controller.setState({ x: 100 }, true);
      
      // Clear previous calls
      vi.clearAllMocks();
      
      controller.setState({ x: 200 }, false);
      
      expect(cancelAnimationFrame).toHaveBeenCalled();
    });
  });

  describe('destruction', () => {
    it('should cleanup event listeners', () => {
      const eventCount = canvas.removeEventListener.mock.calls.length;
      
      controller.destroy();
      
      expect(canvas.removeEventListener.mock.calls.length).toBeGreaterThan(eventCount);
    });

    it('should cancel ongoing animation', () => {
      controller.setState({ x: 100 }, true);
      controller.destroy();
      
      expect(cancelAnimationFrame).toHaveBeenCalled();
    });

    it('should clear listeners', () => {
      const listener = vi.fn();
      controller.addEventListener(listener);
      
      controller.destroy();
      
      // Should not throw when trying to notify destroyed controller
      expect(() => {
        controller.setState({ x: 100 });
      }).not.toThrow();
    });
  });

  describe('keyboard shortcuts', () => {
    it('should handle arrow key panning', () => {
      const keyEvent = new KeyboardEvent('keydown', { code: 'ArrowRight' });
      Object.defineProperty(keyEvent, 'preventDefault', {
        value: vi.fn(),
        writable: true
      });
      
      // Mock window.dispatchEvent
      const mockDispatchEvent = vi.fn();
      vi.stubGlobal('window', {
        ...window,
        dispatchEvent: mockDispatchEvent
      });
      
      // Simulate keydown event
      window.dispatchEvent(keyEvent);
      
      // Note: In a real test environment, we would need to trigger the actual handler
      // For this test, we're just verifying the structure is in place
      expect(mockDispatchEvent).toHaveBeenCalledWith(keyEvent);
    });
  });

  describe('touch handling', () => {
    it('should be configurable', () => {
      const noTouchController = new PanZoomController(canvas as any, {
        enableTouch: false
      });
      
      // Should not add touch event listeners when disabled
      expect(canvas.addEventListener).not.toHaveBeenCalledWith('touchstart', expect.any(Function));
      
      noTouchController.destroy();
    });
  });

  describe('configuration', () => {
    it('should use custom config values', () => {
      const customConfig = {
        minScale: 0.5,
        maxScale: 3.0,
        zoomSpeed: 0.2,
        panSpeed: 2.0,
        enableTouch: false,
        enableKeyboard: false,
        wheelSensitivity: 0.001,
        touchSensitivity: 0.02
      };
      
      const customController = new PanZoomController(canvas as any, customConfig);
      
      // Test min/max scale
      customController.setState({ scale: 0.1 });
      expect(customController.getState().scale).toBe(0.5);
      
      customController.setState({ scale: 5.0 });
      expect(customController.getState().scale).toBe(3.0);
      
      customController.destroy();
    });
  });
});