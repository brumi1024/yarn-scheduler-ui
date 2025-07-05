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
  const format = configData.get('yarn.scheduler.capacity.mapping-rule-format');

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

  return { format: 'none' };
}
