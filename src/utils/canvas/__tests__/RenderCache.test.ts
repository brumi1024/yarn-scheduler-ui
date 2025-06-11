import { describe, it, expect, beforeEach } from 'vitest';
import { RenderCache } from '../RenderCache';
import type { LayoutNode } from '../../d3/D3TreeLayout';

describe('RenderCache', () => {
  let cache: RenderCache;
  let mockNode: LayoutNode;

  beforeEach(() => {
    cache = new RenderCache(5); // Small cache for testing
    mockNode = createMockNode();
  });

  describe('constructor', () => {
    it('should initialize with default max size', () => {
      const defaultCache = new RenderCache();
      expect(defaultCache).toBeDefined();
    });

    it('should initialize with custom max size', () => {
      const customCache = new RenderCache(10);
      expect(customCache).toBeDefined();
    });
  });

  describe('get and set', () => {
    it('should return null for cache miss', () => {
      const result = cache.get(mockNode);
      expect(result).toBeNull();
    });

    it('should cache and retrieve canvas', () => {
      const canvas = cache.createOffscreenCanvas(100, 100);
      cache.set(mockNode, canvas);
      
      const result = cache.get(mockNode);
      expect(result).toBe(canvas);
    });

    it('should track cache hits and misses', () => {
      // Initial miss
      cache.get(mockNode);
      
      // Set and hit
      const canvas = cache.createOffscreenCanvas(100, 100);
      cache.set(mockNode, canvas);
      cache.get(mockNode);
      
      const stats = cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(0.5);
    });

    it('should invalidate cache when node changes', () => {
      const canvas = cache.createOffscreenCanvas(100, 100);
      cache.set(mockNode, canvas);
      
      // Modify node to change hash
      mockNode.data.name = 'changed';
      
      const result = cache.get(mockNode);
      expect(result).toBeNull(); // Should be cache miss due to changed hash
    });
  });

  describe('createOffscreenCanvas', () => {
    it('should create canvas with specified dimensions', () => {
      const canvas = cache.createOffscreenCanvas(200, 150);
      expect(canvas.width).toBe(200);
      expect(canvas.height).toBe(150);
    });
  });

  describe('cache eviction', () => {
    it('should evict oldest entry when cache is full', () => {
      // Fill cache to capacity
      for (let i = 0; i < 5; i++) {
        const node = { ...mockNode, id: `node${i}` };
        const canvas = cache.createOffscreenCanvas(100, 100);
        cache.set(node, canvas);
      }
      
      expect(cache.getStats().size).toBe(5);
      
      // Add one more to trigger eviction
      const newNode = { ...mockNode, id: 'newNode' };
      const newCanvas = cache.createOffscreenCanvas(100, 100);
      cache.set(newNode, newCanvas);
      
      expect(cache.getStats().size).toBe(5); // Should still be 5
    });
  });

  describe('invalidate', () => {
    it('should remove specific cache entry', () => {
      const canvas = cache.createOffscreenCanvas(100, 100);
      cache.set(mockNode, canvas);
      
      cache.invalidate(mockNode.id);
      
      const result = cache.get(mockNode);
      expect(result).toBeNull();
    });
  });

  describe('clear', () => {
    it('should clear entire cache', () => {
      const canvas = cache.createOffscreenCanvas(100, 100);
      cache.set(mockNode, canvas);
      
      cache.clear();
      
      const stats = cache.getStats();
      expect(stats.size).toBe(0);
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });
  });

  describe('renderToCache', () => {
    it('should render node to cache', () => {
      const renderFn = (ctx: CanvasRenderingContext2D, node: LayoutNode) => {
        ctx.fillRect(0, 0, node.width, node.height);
      };
      
      const canvas = cache.renderToCache(mockNode, renderFn);
      
      expect(canvas).toBeDefined();
      expect(canvas.width).toBe(mockNode.width + 20); // With padding
      expect(canvas.height).toBe(mockNode.height + 20);
      
      // Should be cached
      const cached = cache.get(mockNode);
      expect(cached).toBe(canvas);
    });
  });

  describe('statistics', () => {
    it('should track cache statistics', () => {
      const canvas = cache.createOffscreenCanvas(100, 100);
      
      // Miss
      cache.get(mockNode);
      
      // Set and hit
      cache.set(mockNode, canvas);
      cache.get(mockNode);
      cache.get(mockNode);
      
      const stats = cache.getStats();
      expect(stats.size).toBe(1);
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBeCloseTo(0.667, 2);
    });
  });
});

function createMockNode(): LayoutNode {
  return {
    id: 'testNode',
    x: 100,
    y: 100,
    width: 280,
    height: 120,
    data: {
      id: 'testNode',
      name: 'Test Queue',
      path: 'root.test',
      type: 'LEAF',
      state: 'RUNNING',
      capacity: 50,
      maxCapacity: 100,
      absoluteCapacity: 50,
      absoluteMaxCapacity: 100,
      weight: 0.5,
      children: []
    }
  };
}