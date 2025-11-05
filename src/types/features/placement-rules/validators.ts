/**
 * Validators for placement rules types
 */

import { z } from 'zod';

export const PlacementRuleSchema = z.object({
  type: z.enum(['user', 'group', 'application']),
  matches: z.string().min(1, 'Matches pattern is required'),
  policy: z.enum([
    'specified',
    'primaryGroup',
    'primaryGroupUser',
    'secondaryGroup',
    'secondaryGroupUser',
    'reject',
    'defaultQueue',
    'user',
    'applicationName',
    'custom',
    'setDefaultQueue',
  ]),
  parentQueue: z.string().optional(),
  value: z.string().optional(),
  customPlacement: z.string().optional(),
  create: z.boolean().optional(),
  fallbackResult: z.enum(['skip', 'placeDefault', 'reject']).optional(),
});

export type PlacementRule = z.infer<typeof PlacementRuleSchema>;

/**
 * Type guard to check if a value is a valid PlacementRule
 */
export function isPlacementRule(value: unknown): value is PlacementRule {
  return PlacementRuleSchema.safeParse(value).success;
}

/**
 * Validate and parse a placement rule, throwing if invalid
 */
export function validatePlacementRule(value: unknown): PlacementRule {
  return PlacementRuleSchema.parse(value);
}

/**
 * Check if a placement rule is valid without throwing
 */
export function isValidPlacementRule(
  value: unknown,
): { valid: true; data: PlacementRule } | { valid: false; error: z.ZodError } {
  const result = PlacementRuleSchema.safeParse(value);
  if (result.success) {
    return { valid: true, data: result.data };
  }
  return { valid: false, error: result.error };
}
