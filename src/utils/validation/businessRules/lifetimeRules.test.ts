import { describe, it, expect } from 'vitest';
import {
  validateApplicationLifetime,
  validateUserLimitFactor,
  validateMinimumUserLimitPercent,
} from './lifetimeRules';
import type { QueueValidationContext } from './types';

const createMockContext = (
  overrides?: Partial<QueueValidationContext>,
): QueueValidationContext => ({
  queuePath: 'root.a',
  legacyModeEnabled: true,
  schedulerData: undefined,
  configData: new Map(),
  parentQueue: undefined,
  siblingQueues: [],
  ...overrides,
});

describe('lifetimeRules', () => {
  describe('validateApplicationLifetime', () => {
    it('should pass when value is empty or -1', () => {
      const context = createMockContext();
      expect(validateApplicationLifetime('', context).valid).toBe(true);
      expect(validateApplicationLifetime('-1', context).valid).toBe(true);
    });

    it('should pass when default lifetime <= maximum lifetime', () => {
      const context = createMockContext({
        field: 'default-application-lifetime',
        configData: new Map([
          ['yarn.scheduler.capacity.root.a.maximum-application-lifetime', '3600'],
        ]),
      });

      const result = validateApplicationLifetime('1800', context);
      expect(result.valid).toBe(true);
    });

    it('should fail when default lifetime > maximum lifetime', () => {
      const context = createMockContext({
        field: 'default-application-lifetime',
        configData: new Map([
          ['yarn.scheduler.capacity.root.a.maximum-application-lifetime', '1800'],
        ]),
      });

      const result = validateApplicationLifetime('3600', context);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].rule).toBe('lifetime-relationship');
      expect(result.errors[0].message).toContain('3600s');
      expect(result.errors[0].message).toContain('1800s');
    });

    it('should fail when maximum lifetime < default lifetime', () => {
      const context = createMockContext({
        field: 'maximum-application-lifetime',
        configData: new Map([
          ['yarn.scheduler.capacity.root.a.default-application-lifetime', '3600'],
        ]),
      });

      const result = validateApplicationLifetime('1800', context);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].rule).toBe('lifetime-relationship');
      expect(result.errors[0].field).toBe('maximum-application-lifetime');
    });

    it('should handle non-numeric values gracefully', () => {
      const context = createMockContext({
        field: 'default-application-lifetime',
        configData: new Map([
          ['yarn.scheduler.capacity.root.a.maximum-application-lifetime', 'invalid'],
        ]),
      });

      const result = validateApplicationLifetime('1800', context);
      expect(result.valid).toBe(true);
    });

    it('should ignore -1 (unlimited) in comparisons', () => {
      const context = createMockContext({
        field: 'default-application-lifetime',
        configData: new Map([
          ['yarn.scheduler.capacity.root.a.maximum-application-lifetime', '-1'],
        ]),
      });

      const result = validateApplicationLifetime('99999', context);
      expect(result.valid).toBe(true);
    });
  });

  describe('validateUserLimitFactor', () => {
    it('should pass for valid positive values', () => {
      const context = createMockContext();
      const result = validateUserLimitFactor('2.5', context);
      expect(result.valid).toBe(true);
    });

    it('should fail for negative values', () => {
      const context = createMockContext();
      const result = validateUserLimitFactor('-2', context);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].rule).toBe('user-limit-factor-range');
    });

    it('should pass for -1 value', () => {
      const context = createMockContext();
      const result = validateUserLimitFactor('-1', context);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should warn for zero value', () => {
      const context = createMockContext();
      const result = validateUserLimitFactor('0', context);
      expect(result.valid).toBe(true); // Warning, not error
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].severity).toBe('warning');
      expect(result.errors[0].rule).toBe('user-limit-factor-zero-warning');
    });

    it('should pass for empty value', () => {
      const context = createMockContext();
      const result = validateUserLimitFactor('', context);
      expect(result.valid).toBe(true);
    });

    it('should handle non-numeric values', () => {
      const context = createMockContext();
      const result = validateUserLimitFactor('invalid', context);
      expect(result.valid).toBe(true); // Let Zod handle format validation
    });
  });

  describe('validateMinimumUserLimitPercent', () => {
    it('should pass for valid percentage values', () => {
      const context = createMockContext();
      expect(validateMinimumUserLimitPercent('50', context).valid).toBe(true);
      expect(validateMinimumUserLimitPercent('0', context).valid).toBe(true);
    });

    it('should fail for values > 100', () => {
      const context = createMockContext();
      const result = validateMinimumUserLimitPercent('150', context);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].rule).toBe('minimum-user-limit-percent-max');
    });

    it('should warn for 100% value', () => {
      const context = createMockContext();
      const result = validateMinimumUserLimitPercent('100', context);
      expect(result.valid).toBe(true); // Warning, not error
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].severity).toBe('warning');
      expect(result.errors[0].rule).toBe('minimum-user-limit-percent-warning');
    });

    it('should pass for empty value', () => {
      const context = createMockContext();
      const result = validateMinimumUserLimitPercent('', context);
      expect(result.valid).toBe(true);
    });
  });
});
