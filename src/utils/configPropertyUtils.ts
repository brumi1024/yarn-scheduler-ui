/**
 * Utilities for accessing and filtering configuration properties
 */

/**
 * Get all properties for a specific queue from the configuration map
 * @param configData The configuration data map
 * @param queuePath The queue path (e.g., "root.default")
 * @returns Record of property names to values for the queue
 */
export function getQueueProperties(
  configData: Map<string, string>,
  queuePath: string,
): Record<string, string> {
  const prefix = `yarn.scheduler.capacity.${queuePath}.`;
  const properties: Record<string, string> = {};

  configData.forEach((value, key) => {
    if (key.startsWith(prefix)) {
      const propName = key.substring(prefix.length);
      // Skip nested properties (e.g., accessible-node-labels.gpu.capacity)
      if (!propName.includes('.')) {
        properties[propName] = value;
      }
    }
  });

  return properties;
}

/**
 * Get all global scheduler properties from the configuration map
 * Global properties are those that don't contain a queue path (no "root" in the key)
 * @param configData The configuration data map
 * @returns Record of global property names to values
 */
export function getGlobalProperties(configData: Map<string, string>): Record<string, string> {
  const properties: Record<string, string> = {};

  configData.forEach((value, key) => {
    // Global properties are those that don't contain a queue path
    // All queue properties contain "root" in their key
    if (!key.includes('.root.') && !key.endsWith('.root')) {
      properties[key] = value;
    }
  });

  return properties;
}

// Export as namespace for easier use
export const configPropertyUtils = {
  getQueueProperties,
  getGlobalProperties,
};
