import { describe, it, expect } from 'vitest';
import { CapacityModeDetector } from '../CapacityModeDetector';

describe('CapacityModeDetector', () => {
    describe('detectMode', () => {
        it('should detect percentage mode for plain float values', () => {
            expect(CapacityModeDetector.detectMode('50')).toBe('percentage');
            expect(CapacityModeDetector.detectMode('50.0')).toBe('percentage');
            expect(CapacityModeDetector.detectMode('0')).toBe('percentage');
            expect(CapacityModeDetector.detectMode('100')).toBe('percentage');
            expect(CapacityModeDetector.detectMode('75.5')).toBe('percentage');
        });

        it('should detect weight mode for values ending with w', () => {
            expect(CapacityModeDetector.detectMode('50w')).toBe('weight');
            expect(CapacityModeDetector.detectMode('0w')).toBe('weight');
            expect(CapacityModeDetector.detectMode('100w')).toBe('weight');
            expect(CapacityModeDetector.detectMode('25.5w')).toBe('weight');
        });

        it('should detect absolute mode for values in brackets', () => {
            expect(CapacityModeDetector.detectMode('[memory=1024mb,vcores=1]')).toBe('absolute');
            expect(CapacityModeDetector.detectMode('[vcores=2]')).toBe('absolute');
            expect(CapacityModeDetector.detectMode('[memory=8192mb,vcores=8,gpu=1]')).toBe('absolute');
            expect(CapacityModeDetector.detectMode('[custom-resource=100]')).toBe('absolute');
        });

        it('should handle edge cases', () => {
            expect(CapacityModeDetector.detectMode('')).toBe('percentage');
            expect(CapacityModeDetector.detectMode('  50w  ')).toBe('weight');
            expect(CapacityModeDetector.detectMode('  [memory=1024]  ')).toBe('absolute');
        });

        it('should default to percentage for invalid inputs', () => {
            expect(CapacityModeDetector.detectMode('')).toBe('percentage');
            // @ts-expect-error Testing runtime behavior
            expect(CapacityModeDetector.detectMode(null)).toBe('percentage');
            // @ts-expect-error Testing runtime behavior
            expect(CapacityModeDetector.detectMode(undefined)).toBe('percentage');
        });
    });

    describe('parseCapacityValue', () => {
        it('should parse percentage values correctly', () => {
            const result = CapacityModeDetector.parseCapacityValue('50.5');
            expect(result.mode).toBe('percentage');
            expect(result.value).toBe('50.5');
            expect(result.numericValue).toBe(50.5);
        });

        it('should parse weight values correctly', () => {
            const result = CapacityModeDetector.parseCapacityValue('75w');
            expect(result.mode).toBe('weight');
            expect(result.value).toBe('75w');
            expect(result.numericValue).toBe(75);
        });

        it('should parse absolute values correctly', () => {
            const result = CapacityModeDetector.parseCapacityValue('[memory=1024mb,vcores=2]');
            expect(result.mode).toBe('absolute');
            expect(result.value).toBe('[memory=1024mb,vcores=2]');
            expect(result.resources).toEqual({
                memory: '1024mb',
                vcores: '2',
            });
        });

        it('should handle complex absolute resources', () => {
            const result = CapacityModeDetector.parseCapacityValue(
                '[memory=8192mb,vcores=8,gpu=1,custom-resource=100]'
            );
            expect(result.mode).toBe('absolute');
            expect(result.resources).toEqual({
                memory: '8192mb',
                vcores: '8',
                gpu: '1',
                'custom-resource': '100',
            });
        });

        it('should handle malformed weight values', () => {
            const result = CapacityModeDetector.parseCapacityValue('invalidw');
            expect(result.mode).toBe('weight');
            expect(result.numericValue).toBe(0);
        });

        it('should handle malformed percentage values', () => {
            const result = CapacityModeDetector.parseCapacityValue('invalid');
            expect(result.mode).toBe('percentage');
            expect(result.numericValue).toBe(0);
        });
    });

    describe('areModesCompatible', () => {
        it('should consider percentage and weight modes compatible', () => {
            expect(CapacityModeDetector.areModesCompatible('percentage', 'weight')).toBe(true);
            expect(CapacityModeDetector.areModesCompatible('weight', 'percentage')).toBe(true);
        });

        it('should consider same modes compatible', () => {
            expect(CapacityModeDetector.areModesCompatible('percentage', 'percentage')).toBe(true);
            expect(CapacityModeDetector.areModesCompatible('weight', 'weight')).toBe(true);
            expect(CapacityModeDetector.areModesCompatible('absolute', 'absolute')).toBe(true);
        });

        it('should consider absolute mode incompatible with others', () => {
            expect(CapacityModeDetector.areModesCompatible('absolute', 'percentage')).toBe(false);
            expect(CapacityModeDetector.areModesCompatible('absolute', 'weight')).toBe(false);
            expect(CapacityModeDetector.areModesCompatible('percentage', 'absolute')).toBe(false);
            expect(CapacityModeDetector.areModesCompatible('weight', 'absolute')).toBe(false);
        });
    });

    describe('toDisplayPercentage', () => {
        it('should return percentage values as-is', () => {
            const capacity = CapacityModeDetector.parseCapacityValue('75.5');
            expect(CapacityModeDetector.toDisplayPercentage(capacity)).toBe(75.5);
        });

        it('should return weight values as-is', () => {
            const capacity = CapacityModeDetector.parseCapacityValue('50w');
            expect(CapacityModeDetector.toDisplayPercentage(capacity)).toBe(50);
        });

        it('should return 0 for absolute values', () => {
            const capacity = CapacityModeDetector.parseCapacityValue('[memory=1024mb,vcores=1]');
            expect(CapacityModeDetector.toDisplayPercentage(capacity)).toBe(0);
        });

        it('should handle missing numeric values', () => {
            const capacity = { mode: 'percentage' as const, value: 'invalid' };
            expect(CapacityModeDetector.toDisplayPercentage(capacity)).toBe(0);
        });
    });
});
