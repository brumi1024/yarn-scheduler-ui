/**
 * Capacity Mode Detector for YARN Scheduler Configuration
 * 
 * Detects capacity modes based on the value format:
 * - Weight mode: values ending with 'w' (e.g., "50w")
 * - Percentage mode: plain float values (e.g., "50", "50.0")
 * - Absolute mode: values in brackets (e.g., "[memory=1024mb,vcores=1]")
 */

export type CapacityMode = 'percentage' | 'weight' | 'absolute';

export interface CapacityValue {
  mode: CapacityMode;
  value: string;
  numericValue?: number;
  resources?: Record<string, string>;
}

export class CapacityModeDetector {
  private static readonly ABSOLUTE_RESOURCE_PATTERN = /^\[[\w.,\-_= /]+\]$/;
  private static readonly WEIGHT_SUFFIX = 'w';

  /**
   * Detect capacity mode from a capacity value string
   */
  static detectMode(capacityValue: string): CapacityMode {
    if (!capacityValue) {
      return 'percentage';
    }

    const trimmed = capacityValue.trim();

    // Check for absolute mode: [memory=1024mb,vcores=1]
    if (this.ABSOLUTE_RESOURCE_PATTERN.test(trimmed)) {
      return 'absolute';
    }

    // Check for weight mode: ends with 'w'
    if (trimmed.endsWith(this.WEIGHT_SUFFIX)) {
      return 'weight';
    }

    // Default to percentage mode for plain float values
    return 'percentage';
  }

  /**
   * Parse capacity value into structured format
   */
  static parseCapacityValue(capacityValue: string): CapacityValue {
    const mode = this.detectMode(capacityValue);
    const trimmed = capacityValue.trim();

    switch (mode) {
      case 'weight':
        return {
          mode,
          value: trimmed,
          numericValue: this.parseWeightValue(trimmed)
        };

      case 'absolute':
        return {
          mode,
          value: trimmed,
          resources: this.parseAbsoluteResources(trimmed)
        };

      case 'percentage':
      default:
        return {
          mode: 'percentage',
          value: trimmed,
          numericValue: this.parsePercentageValue(trimmed)
        };
    }
  }

  /**
   * Parse weight value (removes 'w' suffix)
   */
  private static parseWeightValue(value: string): number {
    const numericPart = value.slice(0, -1); // Remove 'w' suffix
    const parsed = parseFloat(numericPart);
    return isNaN(parsed) ? 0 : parsed;
  }

  /**
   * Parse percentage value
   */
  private static parsePercentageValue(value: string): number {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }

  /**
   * Parse absolute resource string into key-value pairs
   * Example: "[memory=1024mb,vcores=1]" -> { memory: "1024mb", vcores: "1" }
   */
  private static parseAbsoluteResources(value: string): Record<string, string> {
    // Remove brackets
    const content = value.slice(1, -1);
    const resources: Record<string, string> = {};

    // Split by comma and parse key=value pairs
    const pairs = content.split(',');
    for (const pair of pairs) {
      const [key, val] = pair.split('=');
      if (key && val) {
        resources[key.trim()] = val.trim();
      }
    }

    return resources;
  }

  /**
   * Check if a capacity mode is compatible with another for comparison
   */
  static areModesCompatible(mode1: CapacityMode, mode2: CapacityMode): boolean {
    // Percentage and weight modes can be compared (both are relative)
    if ((mode1 === 'percentage' || mode1 === 'weight') && 
        (mode2 === 'percentage' || mode2 === 'weight')) {
      return true;
    }

    // Same modes are always compatible
    return mode1 === mode2;
  }

  /**
   * Convert capacity value to percentage for display purposes
   * Note: This is for display only, not for configuration updates
   */
  static toDisplayPercentage(capacityValue: CapacityValue): number {
    switch (capacityValue.mode) {
      case 'percentage':
        return capacityValue.numericValue ?? 0;
      
      case 'weight':
        // Weight values are displayed as-is (they're relative within siblings)
        return capacityValue.numericValue ?? 0;
      
      case 'absolute':
        // Absolute values cannot be converted to percentage without parent context
        return 0;
      
      default:
        return 0;
    }
  }
}