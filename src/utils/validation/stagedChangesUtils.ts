import type { StagedChange } from '~/types';
import { buildGlobalPropertyKey, buildPropertyKey } from '~/utils/propertyUtils';
import { SPECIAL_VALUES } from '~/types';

/**
 * Merges staged changes with base configuration data to create a view
 * of what the configuration will look like after changes are applied.
 *
 * This is essential for validation to check the "future state" of the
 * configuration rather than the current state.
 *
 * @param configData - The base configuration data from YARN
 * @param stagedChanges - Array of staged changes to apply
 * @returns A new Map with staged changes applied on top of base config
 */
export function getMergedConfigData(
  configData: Map<string, string>,
  stagedChanges: StagedChange[],
): Map<string, string> {
  // Create a new Map to avoid mutating the original
  const mergedData = new Map(configData);

  // Apply each staged change
  stagedChanges.forEach((change) => {
    // Skip changes without property (e.g., queue operations)
    if (!change.property) return;

    // Build the full property key
    const propertyKey =
      change.queuePath === SPECIAL_VALUES.GLOBAL_QUEUE_PATH
        ? buildGlobalPropertyKey(change.property)
        : buildPropertyKey(change.queuePath, change.property);

    if (change.newValue === '' || change.newValue === null || change.newValue === undefined) {
      // If the new value is empty, remove the property
      mergedData.delete(propertyKey);
    } else {
      // Otherwise, set the new value
      mergedData.set(propertyKey, change.newValue);
    }
  });

  return mergedData;
}

/**
 * Gets a single property value considering staged changes.
 * This is a simpler alternative when you only need one value.
 *
 * @param configData - The base configuration data
 * @param stagedChanges - Array of staged changes
 * @param queuePath - The queue path (or GLOBAL_QUEUE_PATH for global properties)
 * @param property - The property name
 * @returns The effective value considering staged changes
 */
export function getEffectivePropertyValue(
  configData: Map<string, string>,
  stagedChanges: StagedChange[],
  queuePath: string,
  property: string,
): string {
  // Check if there's a staged change for this property
  const stagedChange = stagedChanges.find(
    (c) => c.queuePath === queuePath && c.property === property,
  );

  if (stagedChange && stagedChange.newValue !== undefined) {
    return stagedChange.newValue;
  }

  // Otherwise, get from config data
  const propertyKey =
    queuePath === SPECIAL_VALUES.GLOBAL_QUEUE_PATH
      ? buildGlobalPropertyKey(property)
      : buildPropertyKey(queuePath, property);

  return configData.get(propertyKey) || '';
}
