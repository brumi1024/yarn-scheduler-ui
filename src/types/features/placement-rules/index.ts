/**
 * Types for YARN placement rules feature
 */

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
  | 'custom'
  | 'setDefaultQueue';

export type FallbackResult = 'skip' | 'placeDefault' | 'reject';

export interface PlacementRule {
  type: RuleType;
  matches: string;
  policy: PlacementPolicy;
  parentQueue?: string;
  value?: string;
  customPlacement?: string;
  create?: boolean;
  fallbackResult?: FallbackResult;
}

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
}

export interface MigrationResult {
  success: boolean;
  rules: PlacementRule[];
  errors: string[];
}

// Re-export validators
export {
  PlacementRuleSchema,
  isPlacementRule,
  validatePlacementRule,
  isValidPlacementRule,
} from './validators';
