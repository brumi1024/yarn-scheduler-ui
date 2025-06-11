import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CanvasRenderer } from '../CanvasRenderer';
import type { LayoutNode, FlowPath } from '../../d3/D3TreeLayout';
import type { Queue } from '../../../types/Queue';

// Mock Path2D
class MockPath2D {
  constructor(path?: string) {}
}
vi.stubGlobal('Path2D', MockPath2D);

// Mock HTMLCanvasElement and CanvasRenderingContext2D
class MockCanvasRenderingContext2D {
  fillStyle = '';
  strokeStyle = '';
  lineWidth = 1;
  globalAlpha = 1;
  font = '';
  textAlign = 'left';
  textBaseline = 'alphabetic';
  shadowColor = '';
  shadowBlur = 0;
  shadowOffsetX = 0;
  shadowOffsetY = 0;

  save = vi.fn();
  restore = vi.fn();
  clearRect = vi.fn();
  fillRect = vi.fn();
  strokeRect = vi.fn();
  beginPath = vi.fn();
  moveTo = vi.fn();
  lineTo = vi.fn();
  quadraticCurveTo = vi.fn();
  closePath = vi.fn();
  fill = vi.fn();
  stroke = vi.fn();
  fillText = vi.fn();
  measureText = vi.fn(() => ({ width: 50 }));
  scale = vi.fn();
  setLineDash = vi.fn();
}

class MockHTMLCanvasElement {
  width = 800;
  height = 600;
  style = { width: '800px', height: '600px' };
  
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

  getContext = vi.fn(() => new MockCanvasRenderingContext2D());
}

describe('CanvasRenderer', () => {
  let canvas: MockHTMLCanvasElement;
  let renderer: CanvasRenderer;
  let mockNodes: LayoutNode[];
  let mockFlows: FlowPath[];

  beforeEach(() => {
    // Mock window.devicePixelRatio
    vi.stubGlobal('window', { devicePixelRatio: 1 });
    
    canvas = new MockHTMLCanvasElement();
    renderer = new CanvasRenderer({
      canvas: canvas as any,
      devicePixelRatio: 1
    });
    
    mockNodes = createMockNodes();
    mockFlows = createMockFlows();
  });

  afterEach(() => {
    renderer.destroy();
  });

  describe('constructor', () => {
    it('should initialize with canvas', () => {
      expect(renderer).toBeDefined();
      expect(canvas.getContext).toHaveBeenCalledWith('2d');
    });

    it('should setup canvas with device pixel ratio', () => {
      const ctx = canvas.getContext();
      expect(ctx.scale).toHaveBeenCalledWith(1, 1);
    });

    it('should throw error if canvas context is null', () => {
      const invalidCanvas = {
        ...canvas,
        getContext: vi.fn(() => null)
      };

      expect(() => {
        new CanvasRenderer({ canvas: invalidCanvas as any });
      }).toThrow('Failed to get 2D context from canvas');
    });
  });

  describe('render', () => {
    it('should render nodes and flows', () => {
      const ctx = canvas.getContext();
      
      renderer.render(mockNodes, mockFlows);
      
      expect(ctx.clearRect).toHaveBeenCalled();
      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.restore).toHaveBeenCalled();
    });

    it('should render background layer', () => {
      const ctx = canvas.getContext();
      
      renderer.render(mockNodes, mockFlows);
      
      // Background should be filled
      expect(ctx.fillStyle).toContain('#');
      expect(ctx.fillRect).toHaveBeenCalled();
    });

    it('should render flows', () => {
      const ctx = canvas.getContext();
      
      renderer.render(mockNodes, mockFlows);
      
      expect(ctx.fill).toHaveBeenCalled();
    });

    it('should render nodes', () => {
      const ctx = canvas.getContext();
      
      renderer.render(mockNodes, mockFlows);
      
      expect(ctx.fillText).toHaveBeenCalled();
    });
  });

  describe('selection', () => {
    it('should set selected nodes', () => {
      const nodeIds = new Set(['node1', 'node2']);
      
      renderer.setSelectedNodes(nodeIds);
      renderer.render(mockNodes, mockFlows);
      
      const ctx = canvas.getContext();
      expect(ctx.stroke).toHaveBeenCalled();
    });

    it('should add selected node', () => {
      renderer.addSelectedNode('node1');
      renderer.render(mockNodes, mockFlows);
      
      const ctx = canvas.getContext();
      expect(ctx.stroke).toHaveBeenCalled();
    });

    it('should remove selected node', () => {
      renderer.addSelectedNode('node1');
      renderer.removeSelectedNode('node1');
      renderer.render(mockNodes, mockFlows);
      
      // Should not render selection overlay
      const ctx = canvas.getContext();
      const strokeCalls = ctx.stroke.mock.calls.length;
      expect(strokeCalls).toBeLessThan(3); // Only background strokes
    });

    it('should clear all selections', () => {
      renderer.addSelectedNode('node1');
      renderer.addSelectedNode('node2');
      renderer.clearSelection();
      renderer.render(mockNodes, mockFlows);
      
      const ctx = canvas.getContext();
      const strokeCalls = ctx.stroke.mock.calls.length;
      expect(strokeCalls).toBeLessThan(3);
    });
  });

  describe('hover', () => {
    it('should set hovered node', () => {
      renderer.setHoveredNode(mockNodes[0]);
      renderer.render(mockNodes, mockFlows);
      
      const ctx = canvas.getContext();
      expect(ctx.setLineDash).toHaveBeenCalledWith([5, 5]);
    });

    it('should clear hovered node', () => {
      renderer.setHoveredNode(mockNodes[0]);
      renderer.setHoveredNode(null);
      renderer.render(mockNodes, mockFlows);
      
      const ctx = canvas.getContext();
      const lineDashCalls = ctx.setLineDash.mock.calls;
      expect(lineDashCalls).toContain([[]]); // Reset line dash
    });
  });

  describe('theme', () => {
    it('should update theme', () => {
      const newTheme = {
        background: '#000000',
        queueCard: {
          background: '#333333',
          border: '#666666',
          shadow: '#000000',
          text: '#ffffff',
          selectedBackground: '#444444',
          hoverBackground: '#555555'
        },
        flow: {
          running: '#4caf50',
          stopped: '#f44336',
          default: '#999999',
          opacity: 0.8
        },
        state: {
          default: '#999999',
          pending: '#ffc107',
          error: '#e53935',
          new: '#4caf50',
          deleted: '#f44336'
        }
      };

      renderer.updateTheme(newTheme);
      renderer.render(mockNodes, mockFlows);
      
      const ctx = canvas.getContext();
      expect(ctx.fillStyle).toBe('#000000');
    });
  });

  describe('layers', () => {
    it('should set layer visibility', () => {
      renderer.setLayerVisibility('flows', false);
      renderer.render(mockNodes, mockFlows);
      
      // Flows should not be rendered
      const ctx = canvas.getContext();
      const fillCalls = ctx.fill.mock.calls.length;
      expect(fillCalls).toBeLessThan(5); // Fewer fills without flow layer
    });

    it('should set layer opacity', () => {
      renderer.setLayerOpacity('nodes', 0.5);
      renderer.render(mockNodes, mockFlows);
      
      const ctx = canvas.getContext();
      expect(ctx.globalAlpha).toBe(0.5);
    });
  });

  describe('render loop', () => {
    beforeEach(() => {
      vi.stubGlobal('requestAnimationFrame', vi.fn((callback) => {
        setTimeout(callback, 16);
        return 1;
      }));
      vi.stubGlobal('cancelAnimationFrame', vi.fn());
    });

    it('should start render loop', () => {
      renderer.startRenderLoop(mockNodes, mockFlows);
      
      expect(requestAnimationFrame).toHaveBeenCalled();
    });

    it('should stop render loop', () => {
      renderer.startRenderLoop(mockNodes, mockFlows);
      renderer.stopRenderLoop();
      
      expect(cancelAnimationFrame).toHaveBeenCalledWith(1);
    });
  });

  describe('text rendering', () => {
    it('should truncate long text', () => {
      const longNameNode = {
        ...mockNodes[0],
        data: {
          ...mockNodes[0].data,
          queueName: 'very-long-queue-name-that-should-be-truncated'
        }
      };

      renderer.render([longNameNode], []);
      
      const ctx = canvas.getContext();
      expect(ctx.fillText).toHaveBeenCalled();
      
      // Check that measureText was called (part of truncation logic)
      expect(ctx.measureText).toHaveBeenCalled();
    });

    it('should render capacity text', () => {
      renderer.render(mockNodes, mockFlows);
      
      const ctx = canvas.getContext();
      expect(ctx.fillText).toHaveBeenCalledWith(
        expect.stringContaining('Capacity'),
        expect.any(Number),
        expect.any(Number)
      );
    });
  });

  describe('badge rendering', () => {
    it('should render state badges', () => {
      renderer.render(mockNodes, mockFlows);
      
      const ctx = canvas.getContext();
      // Should render badges for capacity mode and state
      expect(ctx.fillText).toHaveBeenCalledWith(
        expect.stringMatching(/percentage|weight|absolute/),
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('should render running state badge', () => {
      renderer.render(mockNodes, mockFlows);
      
      const ctx = canvas.getContext();
      expect(ctx.fillText).toHaveBeenCalledWith(
        'running',
        expect.any(Number),
        expect.any(Number)
      );
    });
  });

  describe('resize', () => {
    it('should resize canvas', () => {
      const originalScale = canvas.getContext().scale;
      
      renderer.resize();
      
      expect(canvas.getBoundingClientRect).toHaveBeenCalled();
      expect(originalScale).toHaveBeenCalled();
    });
  });

  describe('card styling', () => {
    it('should use error styling for queues with errors', () => {
      const errorNode = {
        ...mockNodes[0],
        data: {
          ...mockNodes[0].data,
          hasValidationError: true
        } as any
      };

      renderer.render([errorNode], []);
      
      const ctx = canvas.getContext();
      expect(ctx.strokeStyle).toBe('#e53935'); // Error color
    });

    it('should use pending styling for queues with changes', () => {
      const pendingNode = {
        ...mockNodes[0],
        data: {
          ...mockNodes[0].data,
          hasPendingChanges: true
        } as any
      };

      renderer.render([pendingNode], []);
      
      const ctx = canvas.getContext();
      expect(ctx.strokeStyle).toBe('#ffc107'); // Pending color
    });
  });
});

function createMockNodes(): LayoutNode[] {
  const mockQueue = (_id: string, name: string): Queue => ({
    queueName: name,
    capacity: 50,
    usedCapacity: 25,
    maxCapacity: 100,
    absoluteCapacity: 50,
    absoluteUsedCapacity: 25,
    absoluteMaxCapacity: 100,
    state: 'RUNNING',
    numApplications: 5,
    resourcesUsed: {
      memory: 1024,
      vCores: 2
    }
  });

  return [
    {
      id: 'node1',
      x: 100,
      y: 100,
      width: 280,
      height: 120,
      data: mockQueue('node1', 'queue1')
    },
    {
      id: 'node2',
      x: 500,
      y: 100,
      width: 280,
      height: 120,
      data: mockQueue('node2', 'queue2')
    }
  ];
}

function createMockFlows(): FlowPath[] {
  const nodes = createMockNodes();
  
  return [
    {
      id: 'flow1',
      source: nodes[0],
      target: nodes[1],
      path: 'M 380 160 C 440 160, 440 160, 500 160',
      width: 20,
      capacity: 50
    }
  ];
}