import { z } from 'zod';
import type { PlacementRule } from '~/types/features/placement-rules';

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
      'custom',
      'setDefaultQueue',
    ]),
    parentQueue: z.string().optional(),
    value: z.string().optional(),
    customPlacement: z.string().optional(),
    create: z.boolean(),
    fallbackResult: z.enum(['skip', 'placeDefault', 'reject']),
  })
  .refine(
    (data) => {
      // Validate value is provided when policy is 'specified'
      if (data.policy === 'specified' && !data.value) {
        return false;
      }
      return true;
    },
    {
      message: 'Queue value is required when policy is "specified"',
      path: ['value'],
    },
  )
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
      // Validate parent queue for policies that require it
      const requiresParent = ['primaryGroupUser', 'secondaryGroupUser', 'custom'].includes(
        data.policy,
      );
      if (requiresParent && !data.parentQueue) {
        return false;
      }
      return true;
    },
    {
      message: 'Parent queue is required for this policy',
      path: ['parentQueue'],
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
  if (formData.parentQueue) {
    rule.parentQueue = formData.parentQueue;
  }
  if (formData.value) {
    rule.value = formData.value;
  }
  if (formData.customPlacement) {
    rule.customPlacement = formData.customPlacement;
  }
  if (formData.create) {
    rule.create = formData.create;
  }
  if (formData.fallbackResult) {
    rule.fallbackResult = formData.fallbackResult;
  }

  return rule;
}
