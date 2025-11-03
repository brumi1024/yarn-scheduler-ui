import type { ResourceInfo } from '~/types/resource';
import type { QueueInfo } from '~/types/queue';

/**
 * Format memory value from MB to human-readable string
 * @param memoryMB Memory value in megabytes
 * @returns Formatted string (e.g., "512 MB", "1.5 GB")
 */
export const formatMemory = (memoryMB: number): string => {
  if (memoryMB < 1024) {
    return `${memoryMB} MB`;
  }
  const gb = memoryMB / 1024;
  return gb % 1 === 0 ? `${gb} GB` : `${gb.toFixed(1)} GB`;
};

/**
 * Format percentage value with optional decimal places
 * @param value Percentage value (0-100)
 * @param decimals Number of decimal places (default: 1)
 * @returns Formatted percentage string (e.g., "45.5%", "100.0%")
 */
export const formatPercentage = (value: number, decimals: number = 1): string => {
  return `${value.toFixed(decimals)}%`;
};

/**
 * Format number with thousand separators
 * @param value Number to format
 * @returns Formatted string (e.g., "1,000", "1,234,567")
 */
export const formatCount = (value: number): string => {
  return value.toLocaleString();
};

/**
 * Determine queue capacity mode
 * @param queue Queue information object
 * @returns Capacity mode string ("percentage", "weight", "absolute", or "unknown")
 */
export const formatCapacityType = (queue: QueueInfo | undefined): string => {
  if (!queue) return 'unknown';

  if (queue.isAbsoluteResource) {
    return 'absolute';
  }

  if (queue.normalizedWeight !== undefined && queue.normalizedWeight > 0) {
    return 'weight';
  }

  return 'percentage';
};
