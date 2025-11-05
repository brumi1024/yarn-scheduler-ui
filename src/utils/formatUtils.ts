import type { ResourceInfo } from '~/types/resource';
import type { QueueInfo } from '~/types/queue';
import { SPECIAL_VALUES } from '~/types/constants/special-values';

/**
 * Format a property name for display
 * @param property Property name (e.g., "maximum-capacity", "accessible-node-labels.gpu.capacity")
 * @returns Formatted property name (e.g., "Maximum Capacity", "capacity (label: gpu)")
 */
export const formatPropertyName = (property: string | undefined): string => {
  if (!property) return 'Queue operation';

  // Handle queue marker (queue removal operations)
  if (property === SPECIAL_VALUES.QUEUE_MARKER) {
    return 'Queue removal';
  }

  // Handle node label properties with better formatting
  // Format: "accessible-node-labels.{label}.{property}" -> "{property} (label: {label})"
  if (property.includes('accessible-node-labels.') && property.split('.').length === 3) {
    const parts = property.split('.');
    const label = parts[1];
    const labelProperty = parts[2];
    const formattedProperty = labelProperty
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    return `${formattedProperty} (label: ${label})`;
  }

  // Default: convert kebab-case to Title Case
  return property
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Get the category for a property (used for grouping)
 * @param property Property name
 * @returns Category name (e.g., "Capacity", "Resources", "Node Labels")
 */
export const getPropertyCategory = (property: string): string => {
  if (property.startsWith('accessible-node-labels')) return 'Node Labels';
  if (property.includes('resource')) return 'Resources';
  if (property.includes('application')) return 'Applications';
  if (['capacity', 'maximum-capacity'].includes(property)) {
    return 'Capacity';
  }
  if (property.includes('user')) return 'User Limits';
  return 'General';
};

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
