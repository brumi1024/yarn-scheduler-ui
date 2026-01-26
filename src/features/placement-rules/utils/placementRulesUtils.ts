import type { PlacementRulesData, PlacementRule } from '~/types/features/placement-rules';
import { SPECIAL_VALUES } from '~/types/constants/special-values';

/**
 * Attempts to parse JSON placement rules from a string
 * @returns Parsed rules array or null if parsing fails or no rules exist
 */
function parseJsonRules(jsonStr: string | undefined): PlacementRule[] | null {
  if (!jsonStr) return null;
  try {
    const parsed = JSON.parse(jsonStr);
    return (parsed.rules as PlacementRule[]) ?? null;
  } catch {
    return null;
  }
}

/**
 * Extracts placement rules configuration from the config data map
 * @param configData - Map of configuration properties
 * @returns PlacementRulesData with format and rules
 */
export function extractPlacementRulesFromConfig(
  configData: Map<string, string>,
): PlacementRulesData {
  const format = configData.get(SPECIAL_VALUES.MAPPING_RULE_FORMAT_PROPERTY);
  const jsonStr = configData.get(SPECIAL_VALUES.MAPPING_RULE_JSON_PROPERTY);

  if (format === 'json') {
    const rules = parseJsonRules(jsonStr);
    return { format: 'json', rules: rules ?? [] };
  }

  if (configData.has('yarn.scheduler.capacity.queue-mappings')) {
    return {
      format: 'legacy',
      legacyRules: configData.get('yarn.scheduler.capacity.queue-mappings') || '',
      requiresMigration: true,
    };
  }

  // Check if JSON rules exist even though format is not 'json'
  // This handles the edge case where format='legacy' but no queue-mappings exist and JSON rules do exist
  const rules = parseJsonRules(jsonStr);
  if (rules && rules.length > 0) {
    return {
      format: 'json',
      rules,
      inconsistentFormat: true, // Flag that format property doesn't match the actual rules format
    };
  }

  return { format: 'none' };
}
