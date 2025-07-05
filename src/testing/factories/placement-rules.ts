/**
 * Test data factory for placement rules
 */

import type { PlacementRule } from '~/types/features/placement-rules';

/**
 * Factory for creating test placement rule data
 */
export const placementRuleFactory = {
  /**
   * Build a single placement rule with optional overrides
   */
  build: (overrides?: Partial<PlacementRule>): PlacementRule => {
    const defaults: PlacementRule = {
      type: 'user',
      matches: '*',
      policy: 'specified',
      parentQueue: 'root',
      value: 'default',
      create: true,
      fallbackResult: 'skip',
    };

    return { ...defaults, ...overrides };
  },

  /**
   * Build a list of placement rules
   */
  buildList: (count: number, overrides?: Partial<PlacementRule>[]): PlacementRule[] => {
    return Array.from({ length: count }, (_, i) => placementRuleFactory.build(overrides?.[i]));
  },

  /**
   * Build a user-based placement rule
   */
  buildUserRule: (username: string, targetQueue: string): PlacementRule => {
    return placementRuleFactory.build({
      type: 'user',
      matches: username,
      policy: 'specified',
      value: targetQueue,
    });
  },

  /**
   * Build a group-based placement rule
   */
  buildGroupRule: (groupName: string, targetQueue: string): PlacementRule => {
    return placementRuleFactory.build({
      type: 'group',
      matches: groupName,
      policy: 'specified',
      value: targetQueue,
    });
  },

  /**
   * Build a primary group placement rule
   */
  buildPrimaryGroupRule: (): PlacementRule => {
    return placementRuleFactory.build({
      type: 'user',
      matches: '*',
      policy: 'primaryGroup',
      create: true,
      parentQueue: 'root',
    });
  },

  /**
   * Build a reject rule
   */
  buildRejectRule: (matches: string): PlacementRule => {
    return placementRuleFactory.build({
      type: 'user',
      matches,
      policy: 'reject',
      fallbackResult: 'reject',
    });
  },

  /**
   * Build a typical production rule set
   */
  buildProductionRuleSet: (): PlacementRule[] => {
    return [
      // Admins go to a dedicated queue
      placementRuleFactory.buildUserRule('admin*', 'root.admin'),

      // Production users go to production queue
      placementRuleFactory.buildGroupRule('production', 'root.production'),

      // Dev users go to dev queue
      placementRuleFactory.buildGroupRule('developers', 'root.development'),

      // Everyone else goes to default based on primary group
      placementRuleFactory.buildPrimaryGroupRule(),

      // Reject unknown users
      placementRuleFactory.buildRejectRule('guest*'),
    ];
  },
};
