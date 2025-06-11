export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DirtyRegion extends Rectangle {
  id: string;
  timestamp: number;
}

export class DirtyRectangleTracker {
  private dirtyRegions: Map<string, DirtyRegion> = new Map();
  private isDirty: boolean = false;
  private fullRedrawRequired: boolean = false;

  /**
   * Mark a region as dirty
   */
  markDirty(id: string, rect: Rectangle): void {
    this.dirtyRegions.set(id, {
      ...rect,
      id,
      timestamp: Date.now()
    });
    this.isDirty = true;
  }

  /**
   * Mark the entire canvas as dirty
   */
  markFullRedraw(): void {
    this.fullRedrawRequired = true;
    this.isDirty = true;
  }

  /**
   * Check if any regions are dirty
   */
  hasDirtyRegions(): boolean {
    return this.isDirty;
  }

  /**
   * Get all dirty regions
   */
  getDirtyRegions(): DirtyRegion[] {
    return Array.from(this.dirtyRegions.values());
  }

  /**
   * Get merged dirty rectangle that encompasses all dirty regions
   */
  getMergedDirtyRect(): Rectangle | null {
    if (this.fullRedrawRequired) {
      return null; // Full redraw needed
    }

    const regions = this.getDirtyRegions();
    if (regions.length === 0) {
      return null;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    regions.forEach(region => {
      minX = Math.min(minX, region.x);
      minY = Math.min(minY, region.y);
      maxX = Math.max(maxX, region.x + region.width);
      maxY = Math.max(maxY, region.y + region.height);
    });

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  /**
   * Clear specific dirty region
   */
  clearDirtyRegion(id: string): void {
    this.dirtyRegions.delete(id);
    this.updateDirtyState();
  }

  /**
   * Clear all dirty regions
   */
  clearAll(): void {
    this.dirtyRegions.clear();
    this.isDirty = false;
    this.fullRedrawRequired = false;
  }

  /**
   * Get optimal clear rectangles for efficient clearing
   */
  getOptimalClearRects(canvasWidth: number, canvasHeight: number): Rectangle[] {
    if (this.fullRedrawRequired) {
      return [{ x: 0, y: 0, width: canvasWidth, height: canvasHeight }];
    }

    const mergedRect = this.getMergedDirtyRect();
    if (!mergedRect) {
      return [];
    }

    // For now, return the merged rectangle
    // More sophisticated algorithms could split into multiple rectangles
    return [mergedRect];
  }

  /**
   * Check if two rectangles intersect
   */
  private rectanglesIntersect(rect1: Rectangle, rect2: Rectangle): boolean {
    return !(
      rect1.x + rect1.width < rect2.x ||
      rect2.x + rect2.width < rect1.x ||
      rect1.y + rect1.height < rect2.y ||
      rect2.y + rect2.height < rect1.y
    );
  }

  /**
   * Expand rectangle by padding
   */
  private expandRectangle(rect: Rectangle, padding: number): Rectangle {
    return {
      x: rect.x - padding,
      y: rect.y - padding,
      width: rect.width + padding * 2,
      height: rect.height + padding * 2
    };
  }

  /**
   * Update dirty state based on current regions
   */
  private updateDirtyState(): void {
    this.isDirty = this.dirtyRegions.size > 0 || this.fullRedrawRequired;
  }

  /**
   * Optimize dirty regions by merging overlapping ones
   */
  optimizeDirtyRegions(): void {
    const regions = this.getDirtyRegions();
    if (regions.length <= 1) return;

    const optimized: DirtyRegion[] = [];
    const processed = new Set<string>();

    regions.forEach(region => {
      if (processed.has(region.id)) return;

      let merged = { ...region };
      
      // Find all regions that intersect with this one
      regions.forEach(other => {
        if (other.id !== region.id && !processed.has(other.id)) {
          if (this.rectanglesIntersect(merged, other)) {
            // Merge rectangles
            const minX = Math.min(merged.x, other.x);
            const minY = Math.min(merged.y, other.y);
            const maxX = Math.max(merged.x + merged.width, other.x + other.width);
            const maxY = Math.max(merged.y + merged.height, other.y + other.height);

            merged = {
              ...merged,
              x: minX,
              y: minY,
              width: maxX - minX,
              height: maxY - minY
            };

            processed.add(other.id);
          }
        }
      });

      optimized.push(merged);
      processed.add(region.id);
    });

    // Replace regions with optimized ones
    this.dirtyRegions.clear();
    optimized.forEach(region => {
      this.dirtyRegions.set(region.id, region);
    });
  }

  /**
   * Get statistics about dirty regions
   */
  getStats(): {
    regionCount: number;
    totalArea: number;
    averageAge: number;
  } {
    const regions = this.getDirtyRegions();
    const now = Date.now();
    
    let totalArea = 0;
    let totalAge = 0;

    regions.forEach(region => {
      totalArea += region.width * region.height;
      totalAge += now - region.timestamp;
    });

    return {
      regionCount: regions.length,
      totalArea,
      averageAge: regions.length > 0 ? totalAge / regions.length : 0
    };
  }
}