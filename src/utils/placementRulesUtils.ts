import type { PlacementRulesData } from '~/types/features/placement-rules';
import { SPECIAL_VALUES } from '~/types/constants/special-values';

/**
 * Extracts placement rules configuration from the config data map
 * @param configData - Map of configuration properties
 * @returns PlacementRulesData with format and rules
 */
export function extractPlacementRulesFromConfig(
  configData: Map<string, string>,
): PlacementRulesData {
  const format = configData.get(SPECIAL_VALUES.MAPPING_RULE_FORMAT_PROPERTY);

  if (format === 'json') {
    const jsonStr = configData.get(SPECIAL_VALUES.MAPPING_RULE_JSON_PROPERTY);
    if (jsonStr) {
      try {
        const parsed = JSON.parse(jsonStr);
        return {
          format: 'json',
          rules: parsed.rules || [],
        };
      } catch {
        // If JSON parsing fails, return empty rules
        return {
          format: 'json',
          rules: [],
        };
      }
    }
    return {
      format: 'json',
      rules: [],
    };
  } else if (configData.has('yarn.scheduler.capacity.queue-mappings')) {
    return {
      format: 'legacy',
      legacyRules: configData.get('yarn.scheduler.capacity.queue-mappings') || '',
      requiresMigration: true,
    };
  }

  // Check if JSON rules exist even though format is not 'json'
  // This handles the edge case where format='legacy' but no queue-mappings exist and JSON rules do exist
  const jsonStr = configData.get(SPECIAL_VALUES.MAPPING_RULE_JSON_PROPERTY);
  if (jsonStr) {
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed.rules && parsed.rules.length > 0) {
        return {
          format: 'json',
          rules: parsed.rules,
          inconsistentFormat: true, // Flag that format property doesn't match the actual rules format
        };
      }
    } catch {
      // If JSON parsing fails, continue to return 'none'
    }
  }

  return { format: 'none' };
}
