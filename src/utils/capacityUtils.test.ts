import { describe, it, expect } from 'vitest';
import { parseCapacityValue, getCapacityType } from './capacityUtils';

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
});
