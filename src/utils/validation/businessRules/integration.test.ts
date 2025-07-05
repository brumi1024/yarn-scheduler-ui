import { describe, it, expect } from 'vitest';
import { businessValidation } from './service';
import type { QueueValidationContext } from './types';

describe('Business Validation Integration', () => {
  it('should validate capacity relationships', () => {
    const context: QueueValidationContext = {
      queuePath: 'root.production',
      legacyModeEnabled: true,
      configData: new Map([
        ['yarn.scheduler.capacity.root.production.capacity', '50%'],
        ['yarn.scheduler.capacity.root.production.maximum-capacity', '30%'], // Invalid: less than capacity
      ]),
      schedulerData: undefined,
    };

    // Validate capacity field
    const capacityResult = businessValidation.validateField('capacity', '50%', context);
    expect(capacityResult.valid).toBe(true);

    // Validate maximum-capacity field
    const maxCapResult = businessValidation.validateField('maximum-capacity', '30%', context);
    expect(maxCapResult.valid).toBe(false);
    expect(maxCapResult.errors[0].rule).toBe('max-capacity-minimum');
  });

  it('should validate application lifetime relationships', () => {
    const context: QueueValidationContext = {
      queuePath: 'root.production',
      legacyModeEnabled: true,
      configData: new Map([
        ['yarn.scheduler.capacity.root.production.maximum-application-lifetime', '3600'],
        ['yarn.scheduler.capacity.root.production.default-application-lifetime', '7200'], // Invalid: greater than max
      ]),
      schedulerData: undefined,
    };

    const result = businessValidation.validateField('default-application-lifetime', '7200', context);
    expect(result.valid).toBe(false);
    expect(result.errors[0].rule).toBe('lifetime-relationship');
  });

  it('should validate user limit factor', () => {
    const context: QueueValidationContext = {
      queuePath: 'root.production',
      legacyModeEnabled: true,
      configData: new Map(),
      schedulerData: undefined,
    };

    // Negative value should fail
    const negativeResult = businessValidation.validateField('user-limit-factor', '-1', context);
    expect(negativeResult.valid).toBe(false);
    expect(negativeResult.errors[0].severity).toBe('error');

    // Zero should warn
    const zeroResult = businessValidation.validateField('user-limit-factor', '0', context);
    expect(zeroResult.valid).toBe(true); // Warnings don't make it invalid
    expect(zeroResult.errors[0].severity).toBe('warning');

    // Positive value should pass
    const positiveResult = businessValidation.validateField('user-limit-factor', '2.5', context);
    expect(positiveResult.valid).toBe(true);
    expect(positiveResult.errors).toHaveLength(0);
  });

  it('should validate all queue properties', () => {
    const context: QueueValidationContext = {
      queuePath: 'root.production',
      legacyModeEnabled: true,
      configData: new Map([
        ['yarn.scheduler.capacity.root.production.capacity', '50%'],
        ['yarn.scheduler.capacity.root.production.maximum-capacity', '75%'],
      ]),
      schedulerData: undefined,
    };

    const properties = {
      'capacity': '50%',
      'maximum-capacity': '75%',
      'state': 'RUNNING',
      'user-limit-factor': '1.5',
      'minimum-user-limit-percent': '25',
    };

    const result = businessValidation.validateQueue('root.production', properties, context);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should handle warnings appropriately', () => {
    const context: QueueValidationContext = {
      queuePath: 'root.production',
      legacyModeEnabled: true,
      configData: new Map(),
      schedulerData: undefined,
    };

    // User limit percent of 100 should warn
    const result = businessValidation.validateField('minimum-user-limit-percent', '100', context);
    expect(result.valid).toBe(true); // Warnings don't invalidate
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].severity).toBe('warning');
    expect(result.errors[0].rule).toBe('minimum-user-limit-percent-warning');
  });

  it('should handle empty/invalid values gracefully', () => {
    const context: QueueValidationContext = {
      queuePath: 'root.production',
      legacyModeEnabled: true,
      configData: new Map(),
      schedulerData: undefined,
    };

    // Empty values should pass (Zod handles required validation)
    expect(businessValidation.validateField('capacity', '', context).valid).toBe(true);
    expect(businessValidation.validateField('maximum-capacity', '', context).valid).toBe(true);
    expect(businessValidation.validateField('user-limit-factor', '', context).valid).toBe(true);

    // Non-numeric values should pass (Zod handles format validation)
    expect(businessValidation.validateField('user-limit-factor', 'invalid', context).valid).toBe(true);
  });
});