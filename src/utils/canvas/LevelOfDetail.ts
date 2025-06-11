import type { LayoutNode } from '../d3/D3TreeLayout';

export enum DetailLevel {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  MINIMAL = 'minimal'
}

export interface LODConfig {
  highThreshold: number;
  mediumThreshold: number;
  lowThreshold: number;
}

export interface RenderDetail {
  level: DetailLevel;
  showText: boolean;
  showBadges: boolean;
  showCapacity: boolean;
  showShadows: boolean;
  showFlowDetails: boolean;
  simplifyPaths: boolean;
}

const DEFAULT_CONFIG: LODConfig = {
  highThreshold: 1.0,
  mediumThreshold: 0.5,
  lowThreshold: 0.25
};

export class LevelOfDetail {
  private config: LODConfig;
  private currentZoom: number = 1;
  private currentLevel: DetailLevel = DetailLevel.HIGH;

  constructor(config: Partial<LODConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Update zoom level
   */
  updateZoom(zoom: number): void {
    this.currentZoom = zoom;
    this.currentLevel = this.calculateDetailLevel(zoom);
  }

  /**
   * Get current detail level
   */
  getDetailLevel(): DetailLevel {
    return this.currentLevel;
  }

  /**
   * Get render details for current zoom
   */
  getRenderDetail(): RenderDetail {
    const level = this.currentLevel;

    switch (level) {
      case DetailLevel.HIGH:
        return {
          level,
          showText: true,
          showBadges: true,
          showCapacity: true,
          showShadows: true,
          showFlowDetails: true,
          simplifyPaths: false
        };

      case DetailLevel.MEDIUM:
        return {
          level,
          showText: true,
          showBadges: true,
          showCapacity: true,
          showShadows: false,
          showFlowDetails: true,
          simplifyPaths: false
        };

      case DetailLevel.LOW:
        return {
          level,
          showText: true,
          showBadges: false,
          showCapacity: false,
          showShadows: false,
          showFlowDetails: false,
          simplifyPaths: true
        };

      case DetailLevel.MINIMAL:
        return {
          level,
          showText: false,
          showBadges: false,
          showCapacity: false,
          showShadows: false,
          showFlowDetails: false,
          simplifyPaths: true
        };
    }
  }

  /**
   * Calculate detail level based on zoom
   */
  private calculateDetailLevel(zoom: number): DetailLevel {
    if (zoom >= this.config.highThreshold) {
      return DetailLevel.HIGH;
    } else if (zoom >= this.config.mediumThreshold) {
      return DetailLevel.MEDIUM;
    } else if (zoom >= this.config.lowThreshold) {
      return DetailLevel.LOW;
    } else {
      return DetailLevel.MINIMAL;
    }
  }

  /**
   * Should render node details
   */
  shouldRenderNodeDetails(node: LayoutNode): boolean {
    const detail = this.getRenderDetail();
    
    // Always show details for selected or important nodes
    if (node.data.isSelected || node.data.isImportant) {
      return true;
    }

    return detail.showText;
  }

  /**
   * Should render flow details
   */
  shouldRenderFlowDetails(): boolean {
    return this.getRenderDetail().showFlowDetails;
  }

  /**
   * Get simplified path for low detail
   */
  getSimplifiedPath(originalPath: string): string {
    const detail = this.getRenderDetail();
    
    if (!detail.simplifyPaths) {
      return originalPath;
    }

    // Simple path simplification - replace curves with straight lines
    // This is a basic implementation; more sophisticated algorithms could be used
    const points = this.extractPathPoints(originalPath);
    if (points.length < 2) return originalPath;

    // Create simplified path with straight lines
    let simplifiedPath = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      simplifiedPath += ` L ${points[i].x} ${points[i].y}`;
    }

    return simplifiedPath;
  }

  /**
   * Extract key points from SVG path
   */
  private extractPathPoints(path: string): { x: number; y: number }[] {
    const points: { x: number; y: number }[] = [];
    
    // Simple regex to extract M and C commands
    const regex = /([ML])\s*(-?\d+(?:\.\d+)?)\s*(-?\d+(?:\.\d+)?)|C\s*(-?\d+(?:\.\d+)?)\s*(-?\d+(?:\.\d+)?)\s*(-?\d+(?:\.\d+)?)\s*(-?\d+(?:\.\d+)?)\s*(-?\d+(?:\.\d+)?)\s*(-?\d+(?:\.\d+)?)/g;
    
    let match;
    while ((match = regex.exec(path)) !== null) {
      if (match[1] === 'M' || match[1] === 'L') {
        points.push({ x: parseFloat(match[2]), y: parseFloat(match[3]) });
      } else if (match[0].startsWith('C')) {
        // For curves, just take the end point
        points.push({ x: parseFloat(match[8]), y: parseFloat(match[9]) });
      }
    }

    return points;
  }

  /**
   * Get text truncation length based on detail level
   */
  getMaxTextLength(): number {
    switch (this.currentLevel) {
      case DetailLevel.HIGH:
        return 50;
      case DetailLevel.MEDIUM:
        return 30;
      case DetailLevel.LOW:
        return 20;
      case DetailLevel.MINIMAL:
        return 0;
    }
  }

  /**
   * Should use bitmap caching for this zoom level
   */
  shouldUseBitmapCache(): boolean {
    // Use bitmap caching for lower detail levels
    return this.currentLevel === DetailLevel.LOW || this.currentLevel === DetailLevel.MINIMAL;
  }

  /**
   * Get render quality settings
   */
  getRenderQuality(): {
    antialiasing: boolean;
    shadowBlur: number;
    lineWidth: number;
  } {
    switch (this.currentLevel) {
      case DetailLevel.HIGH:
        return {
          antialiasing: true,
          shadowBlur: 4,
          lineWidth: 1
        };
      case DetailLevel.MEDIUM:
        return {
          antialiasing: true,
          shadowBlur: 0,
          lineWidth: 1
        };
      case DetailLevel.LOW:
      case DetailLevel.MINIMAL:
        return {
          antialiasing: false,
          shadowBlur: 0,
          lineWidth: 1
        };
    }
  }
}