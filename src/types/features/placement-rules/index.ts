/**
 * Types for YARN placement rules feature
 */

// Import PlacementRule type for local use, then re-export
import type { PlacementRule } from './validators';
export type { PlacementRule };
export {
  PlacementRuleSchema,
  isPlacementRule,
  validatePlacementRule,
  isValidPlacementRule,
} from './validators';

export type RuleType = 'user' | 'group' | 'application';

export type PlacementPolicy =
  | 'specified'
  | 'primaryGroup'
  | 'primaryGroupUser'
  | 'secondaryGroup'
  | 'secondaryGroupUser'
  | 'reject'
  | 'defaultQueue'
  | 'user'
  | 'applicationName'
  | 'custom'
  | 'setDefaultQueue';

export type FallbackResult = 'skip' | 'placeDefault' | 'reject';

export interface PlacementRulesConfig {
  rules: PlacementRule[];
}

export interface LegacyRuleFormat {
  raw: string;
  type: 'user' | 'group';
  source: string;
  target: string;
}

export interface PlacementRulesData {
  format: 'json' | 'legacy' | 'none';
  rules?: PlacementRule[];
  legacyRules?: string;
  requiresMigration?: boolean;
  inconsistentFormat?: boolean; // True when JSON rules exist but format property is not 'json'
}

export interface MigrationResult {
  success: boolean;
  rules: PlacementRule[];
  errors: string[];
}
