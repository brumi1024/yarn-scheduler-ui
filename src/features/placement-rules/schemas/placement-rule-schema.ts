import { z } from 'zod';
import type { PlacementRule } from '~/types/features/placement-rules';

const PARENT_QUEUE_POLICIES = new Set([
  'user',
  'primaryGroup',
  'primaryGroupUser',
  'secondaryGroup',
  'secondaryGroupUser',
]);

// Form-specific schema with enhanced validations
export const placementRuleFormSchema = z
  .object({
    type: z.enum(['user', 'group', 'application']),
    matches: z.string().min(1, 'Match pattern is required'),
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
    create: z.boolean().default(false),
    fallbackResult: z.enum(['skip', 'placeDefault', 'reject']).optional(),
  })
  .refine(
    (data) => {
      // Validate custom placement is provided when policy is 'custom'
      if (data.policy === 'custom' && !data.customPlacement) {
        return false;
      }
      return true;
    },
    {
      message: 'Custom placement pattern is required when policy is "custom"',
      path: ['customPlacement'],
    },
  )
  .refine(
    (data) => {
      // Validate value is provided when policy is 'setDefaultQueue'
      if (data.policy === 'setDefaultQueue' && !data.value) {
        return false;
      }
      return true;
    },
    {
      message: 'Queue value is required when policy is "setDefaultQueue"',
      path: ['value'],
    },
  )
  .refine(
    (data) => {
      // Disallow wildcard matching for group rules
      if (data.type === 'group' && data.matches.trim() === '*') {
        return false;
      }
      return true;
    },
    {
      message: 'Wildcard "*" is not supported for group rules',
      path: ['matches'],
    },
  );

export type PlacementRuleFormData = z.infer<typeof placementRuleFormSchema>;

// Helper to convert form data to placement rule (removing undefined optional fields)
export function formDataToPlacementRule(formData: PlacementRuleFormData): PlacementRule {
  const rule: PlacementRule = {
    type: formData.type,
    matches: formData.matches,
    policy: formData.policy,
  };

  // Only include optional fields if they have values
  if (formData.parentQueue && PARENT_QUEUE_POLICIES.has(formData.policy)) {
    rule.parentQueue = formData.parentQueue;
  }
  if (formData.value) {
    rule.value = formData.value;
  }
  if (formData.customPlacement) {
    rule.customPlacement = formData.customPlacement;
  }
  if (formData.create !== undefined) {
    rule.create = formData.create;
  }
  if (formData.fallbackResult !== undefined) {
    rule.fallbackResult = formData.fallbackResult;
  }

  return rule;
}
