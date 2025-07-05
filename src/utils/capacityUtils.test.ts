import { describe, it, expect } from 'vitest';
import {
  parseCapacityValue,
  getCapacityType,
  isPercentageCapacity,
  isWeightCapacity,
  isAbsoluteCapacity,
  formatCapacityDisplay,
  compareCapacityValues,
} from './capacityUtils';

describe('capacityUtils', () => {
  describe('parseCapacityValue', () => {
    it('should parse percentage values', () => {
      const result = parseCapacityValue('50%');
      expect(result).toEqual({
        type: 'percentage',
        value: 50,
        rawValue: '50%',
      });
    });

    it('should parse percentage values without % symbol', () => {
      const result = parseCapacityValue('75');
      expect(result).toEqual({
        type: 'percentage',
        value: 75,
        rawValue: '75',
      });
    });

    it('should parse weight values', () => {
      const result = parseCapacityValue('2.5w');
      expect(result).toEqual({
        type: 'weight',
        value: 2.5,
        rawValue: '2.5w',
      });
    });

    it('should parse absolute values', () => {
      const result = parseCapacityValue('[memory=1024,vcores=2]');
      expect(result).toEqual({
        type: 'absolute',
        value: 0,
        resources: {
          memory: 1024,
          vcores: 2,
        },
        rawValue: '[memory=1024,vcores=2]',
      });
    });

    it('should handle -1 as 100%', () => {
      const result = parseCapacityValue('-1');
      expect(result).toEqual({
        type: 'percentage',
        value: 100,
        rawValue: '-1',
      });
    });

    it('should return null for invalid values', () => {
      expect(parseCapacityValue('')).toBeNull();
      expect(parseCapacityValue('invalid')).toBeNull();
      expect(parseCapacityValue('0w')).toBeNull();
      expect(parseCapacityValue('-5w')).toBeNull();
      expect(parseCapacityValue('[]')).toBeNull();
      expect(parseCapacityValue('[invalid]')).toBeNull();
    });

    it('should handle edge cases', () => {
      expect(parseCapacityValue('0%')).toEqual({
        type: 'percentage',
        value: 0,
        rawValue: '0%',
      });
      
      expect(parseCapacityValue('100%')).toEqual({
        type: 'percentage',
        value: 100,
        rawValue: '100%',
      });

      expect(parseCapacityValue('0.001w')).toEqual({
        type: 'weight',
        value: 0.001,
        rawValue: '0.001w',
      });
    });
  });

  describe('getCapacityType', () => {
    it('should return correct capacity type', () => {
      expect(getCapacityType('50%')).toBe('percentage');
      expect(getCapacityType('2w')).toBe('weight');
      expect(getCapacityType('[memory=1024]')).toBe('absolute');
      expect(getCapacityType('invalid')).toBeNull();
    });
  });

  describe('type checking functions', () => {
    it('should correctly identify percentage capacity', () => {
      expect(isPercentageCapacity('50%')).toBe(true);
      expect(isPercentageCapacity('50')).toBe(true);
      expect(isPercentageCapacity('2w')).toBe(false);
      expect(isPercentageCapacity('[memory=1024]')).toBe(false);
    });

    it('should correctly identify weight capacity', () => {
      expect(isWeightCapacity('2w')).toBe(true);
      expect(isWeightCapacity('50%')).toBe(false);
      expect(isWeightCapacity('[memory=1024]')).toBe(false);
    });

    it('should correctly identify absolute capacity', () => {
      expect(isAbsoluteCapacity('[memory=1024]')).toBe(true);
      expect(isAbsoluteCapacity('50%')).toBe(false);
      expect(isAbsoluteCapacity('2w')).toBe(false);
    });
  });

  describe('formatCapacityDisplay', () => {
    it('should format parsed capacity values', () => {
      expect(
        formatCapacityDisplay({
          type: 'percentage',
          value: 50,
          rawValue: '50',
        })
      ).toBe('50%');

      expect(
        formatCapacityDisplay({
          type: 'weight',
          value: 2.5,
          rawValue: '2.5w',
        })
      ).toBe('2.5w');

      expect(
        formatCapacityDisplay({
          type: 'absolute',
          value: 0,
          resources: { memory: 1024, vcores: 2 },
          rawValue: '[memory=1024,vcores=2]',
        })
      ).toBe('[memory=1024,vcores=2]');
    });
  });

  describe('compareCapacityValues', () => {
    it('should compare percentage values', () => {
      const cap1 = parseCapacityValue('30%');
      const cap2 = parseCapacityValue('50%');
      expect(compareCapacityValues(cap1, cap2)).toBe(-20);
    });

    it('should compare weight values', () => {
      const cap1 = parseCapacityValue('2w');
      const cap2 = parseCapacityValue('1.5w');
      expect(compareCapacityValues(cap1, cap2)).toBe(0.5);
    });

    it('should throw error for different types', () => {
      const cap1 = parseCapacityValue('50%');
      const cap2 = parseCapacityValue('2w');
      expect(() => compareCapacityValues(cap1, cap2)).toThrow(
        'Cannot compare capacities of different types'
      );
    });

    it('should throw error for absolute capacities', () => {
      const cap1 = parseCapacityValue('[memory=1024]');
      const cap2 = parseCapacityValue('[memory=2048]');
      expect(() => compareCapacityValues(cap1, cap2)).toThrow(
        'Cannot compare absolute capacities directly'
      );
    });

    it('should handle null values', () => {
      const cap1 = parseCapacityValue('50%');
      expect(compareCapacityValues(cap1, null)).toBe(0);
      expect(compareCapacityValues(null, cap1)).toBe(0);
    });
  });
});