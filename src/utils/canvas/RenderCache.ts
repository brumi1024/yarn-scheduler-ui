import type { LayoutNode } from '../d3/D3TreeLayout';

export interface CacheEntry {
  id: string;
  canvas: OffscreenCanvas | HTMLCanvasElement;
  lastUpdate: number;
  hash: string;
}

export class RenderCache {
  private cache: Map<string, CacheEntry> = new Map();
  private maxCacheSize: number;
  private cacheHits: number = 0;
  private cacheMisses: number = 0;

  constructor(maxCacheSize: number = 100) {
    this.maxCacheSize = maxCacheSize;
  }

  /**
   * Get cached rendering for a node
   */
  get(node: LayoutNode): OffscreenCanvas | HTMLCanvasElement | null {
    const hash = this.computeNodeHash(node);
    const entry = this.cache.get(node.id);

    if (entry && entry.hash === hash) {
      this.cacheHits++;
      entry.lastUpdate = Date.now();
      return entry.canvas;
    }

    this.cacheMisses++;
    return null;
  }

  /**
   * Cache a rendered node
   */
  set(node: LayoutNode, canvas: OffscreenCanvas | HTMLCanvasElement): void {
    const hash = this.computeNodeHash(node);
    
    // Check cache size limit
    if (this.cache.size >= this.maxCacheSize) {
      this.evictOldest();
    }

    this.cache.set(node.id, {
      id: node.id,
      canvas,
      lastUpdate: Date.now(),
      hash
    });
  }

  /**
   * Create an offscreen canvas for caching
   */
  createOffscreenCanvas(width: number, height: number): OffscreenCanvas | HTMLCanvasElement {
    // Use OffscreenCanvas if available
    if (typeof OffscreenCanvas !== 'undefined') {
      return new OffscreenCanvas(width, height);
    }
    
    // Fallback to regular canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }

  /**
   * Compute hash for node state
   */
  private computeNodeHash(node: LayoutNode): string {
    // Create a hash based on node properties that affect rendering
    const props = [
      (node.data as any).name || node.data.queueName,
      node.data.state,
      node.data.capacity,
      (node.data as any).capacityMode || 'percentage',
      (node.data as any).hasPendingChanges || false,
      (node.data as any).hasValidationError || false,
      node.width,
      node.height
    ];
    
    return props.join('|');
  }

  /**
   * Evict oldest cache entry
   */
  private evictOldest(): void {
    let oldestTime = Infinity;
    let oldestId = '';

    this.cache.forEach((entry) => {
      if (entry.lastUpdate < oldestTime) {
        oldestTime = entry.lastUpdate;
        oldestId = entry.id;
      }
    });

    if (oldestId) {
      this.cache.delete(oldestId);
    }
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  /**
   * Invalidate cache for specific node
   */
  invalidate(nodeId: string): void {
    this.cache.delete(nodeId);
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    hits: number;
    misses: number;
    hitRate: number;
  } {
    const total = this.cacheHits + this.cacheMisses;
    return {
      size: this.cache.size,
      hits: this.cacheHits,
      misses: this.cacheMisses,
      hitRate: total > 0 ? this.cacheHits / total : 0
    };
  }

  /**
   * Render node to cache
   */
  renderToCache(
    node: LayoutNode,
    renderFn: (ctx: CanvasRenderingContext2D, node: LayoutNode) => void
  ): OffscreenCanvas | HTMLCanvasElement {
    // Create canvas with padding for effects
    const padding = 10;
    const width = node.width + padding * 2;
    const height = node.height + padding * 2;
    
    const canvas = this.createOffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Failed to get 2D context for cache canvas');
    }

    // Translate to account for padding
    ctx.translate(padding, padding);
    
    // Render node
    renderFn(ctx, node);
    
    // Cache the result
    this.set(node, canvas);
    
    return canvas;
  }
}