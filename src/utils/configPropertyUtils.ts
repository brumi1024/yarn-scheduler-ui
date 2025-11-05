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
