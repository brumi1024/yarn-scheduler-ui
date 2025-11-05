import type { CapacityType, ParsedCapacity } from '~/types';

/**
 * Parse a capacity value string into a structured format
 * Supports: percentages (50%), weights (5w), absolute resources ([memory=1024,vcores=2])
 * @param value Capacity value string
 * @returns Parsed capacity object or null if invalid
 */
export function parseCapacityValue(value: string | undefined): ParsedCapacity | null {
  if (!value || value.trim() === '') {
    return null;
  }

  const trimmedValue = value.trim();

  if (trimmedValue === '-1') {
    return {
      type: 'percentage',
      value: 100,
      rawValue: trimmedValue,
    };
  }

  if (trimmedValue.endsWith('%')) {
    const numericPart = trimmedValue.slice(0, -1);
    const numericValue = parseFloat(numericPart);

    if (isNaN(numericValue)) {
      return null;
    }

    return {
      type: 'percentage',
      value: numericValue,
      rawValue: trimmedValue,
    };
  }

  if (trimmedValue.endsWith('w')) {
    const numericPart = trimmedValue.slice(0, -1);
    const numericValue = parseFloat(numericPart);

    if (isNaN(numericValue) || numericValue <= 0) {
      return null;
    }

    return {
      type: 'weight',
      value: numericValue,
      rawValue: trimmedValue,
    };
  }

  if (trimmedValue.startsWith('[') && trimmedValue.endsWith(']')) {
    const resourcePart = trimmedValue.slice(1, -1);
    if (resourcePart.trim() === '') {
      return null;
    }

    const resources: Record<string, number> = {};
    const resourcePairs = resourcePart.split(',');

    for (const pair of resourcePairs) {
      const [resource, val] = pair.trim().split('=');
      if (!resource || !val) {
        return null;
      }

      const numericValue = parseFloat(val);
      if (isNaN(numericValue)) {
        return null;
      }

      resources[resource.trim()] = numericValue;
    }

    return {
      type: 'absolute',
      value: 0,
      resources,
      rawValue: trimmedValue,
    };
  }

  const numericValue = parseFloat(trimmedValue);
  if (!isNaN(numericValue) && numericValue >= 0 && numericValue <= 100) {
    return {
      type: 'percentage',
      value: numericValue,
      rawValue: trimmedValue,
    };
  }

  return null;
}

export function getCapacityType(value: string | undefined): CapacityType | null {
  const parsed = parseCapacityValue(value);
  return parsed?.type || null;
}
