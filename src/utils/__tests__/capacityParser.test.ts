import { CapacityParser, ParsedCapacity, CapacityMode } from '../capacityParser';

describe('CapacityParser', () => {
    describe('parse()', () => {
        describe('percentage mode', () => {
            it('should parse percentage values with % suffix', () => {
                const result = CapacityParser.parse('50%');

                expect(result.mode).toBe('percentage');
                expect(result.rawValue).toBe('50%');
                expect(result.numericValue).toBe(50);
            });

            it('should parse decimal percentage values', () => {
                const result = CapacityParser.parse('33.33%');

                expect(result.mode).toBe('percentage');
                expect(result.rawValue).toBe('33.33%');
                expect(result.numericValue).toBe(33.33);
            });

            it('should parse numeric values without % as percentage', () => {
                const result = CapacityParser.parse('75');

                expect(result.mode).toBe('percentage');
                expect(result.rawValue).toBe('75');
                expect(result.numericValue).toBe(75);
            });

            it('should parse decimal values without % as percentage', () => {
                const result = CapacityParser.parse('25.5');

                expect(result.mode).toBe('percentage');
                expect(result.rawValue).toBe('25.5');
                expect(result.numericValue).toBe(25.5);
            });

            it('should handle zero percentage', () => {
                const result = CapacityParser.parse('0%');

                expect(result.mode).toBe('percentage');
                expect(result.numericValue).toBe(0);
            });

            it('should handle 100 percentage', () => {
                const result = CapacityParser.parse('100%');

                expect(result.mode).toBe('percentage');
                expect(result.numericValue).toBe(100);
            });
        });

        describe('weight mode', () => {
            it('should parse weight values with w suffix', () => {
                const result = CapacityParser.parse('2w');

                expect(result.mode).toBe('weight');
                expect(result.rawValue).toBe('2w');
                expect(result.numericValue).toBe(2);
            });

            it('should parse decimal weight values', () => {
                const result = CapacityParser.parse('1.5w');

                expect(result.mode).toBe('weight');
                expect(result.rawValue).toBe('1.5w');
                expect(result.numericValue).toBe(1.5);
            });

            it('should handle zero weight', () => {
                const result = CapacityParser.parse('0w');

                expect(result.mode).toBe('weight');
                expect(result.numericValue).toBe(0);
            });

            it('should handle large weight values', () => {
                const result = CapacityParser.parse('100.75w');

                expect(result.mode).toBe('weight');
                expect(result.numericValue).toBe(100.75);
            });
        });

        describe('absolute mode', () => {
            it('should parse basic absolute resource allocation', () => {
                const result = CapacityParser.parse('[memory=1024,vcores=2]');

                expect(result.mode).toBe('absolute');
                expect(result.rawValue).toBe('[memory=1024,vcores=2]');
                expect(result.resources).toEqual({
                    memory: 1024,
                    vcores: 2,
                });
            });

            it('should parse absolute allocation with decimal values', () => {
                const result = CapacityParser.parse('[memory=2048.5,vcores=4.0]');

                expect(result.mode).toBe('absolute');
                expect(result.resources).toEqual({
                    memory: 2048.5,
                    vcores: 4.0,
                });
            });

            it('should parse absolute allocation with additional resources', () => {
                const result = CapacityParser.parse('[memory=4096,vcores=8,gpus=2]');

                expect(result.mode).toBe('absolute');
                expect(result.resources).toEqual({
                    memory: 4096,
                    vcores: 8,
                    gpus: 2,
                });
            });

            it('should handle single resource in absolute mode', () => {
                const result = CapacityParser.parse('[memory=2048]');

                expect(result.mode).toBe('absolute');
                expect(result.resources).toEqual({
                    memory: 2048,
                });
            });

            it('should handle spaces in absolute allocation', () => {
                const result = CapacityParser.parse('[memory = 1024, vcores = 2]');

                expect(result.mode).toBe('absolute');
                expect(result.resources).toEqual({
                    memory: 1024,
                    vcores: 2,
                });
            });

            it('should handle empty absolute allocation', () => {
                const result = CapacityParser.parse('[]');

                expect(result.mode).toBe('absolute');
                expect(result.resources).toEqual({});
            });
        });

        describe('edge cases and error handling', () => {
            it('should handle whitespace', () => {
                const result = CapacityParser.parse('  50%  ');

                expect(result.mode).toBe('percentage');
                expect(result.numericValue).toBe(50);
            });

            it('should throw error for invalid format', () => {
                expect(() => CapacityParser.parse('invalid-format')).toThrow('Invalid capacity format');
            });

            it('should throw error for empty string', () => {
                expect(() => CapacityParser.parse('')).toThrow('Invalid capacity format');
            });

            it('should throw error for malformed absolute allocation', () => {
                expect(() => CapacityParser.parse('[invalid')).toThrow('Invalid capacity format');
            });

            it('should handle malformed resource pairs gracefully', () => {
                const result = CapacityParser.parse('[memory=1024,invalid,vcores=2]');

                expect(result.mode).toBe('absolute');
                expect(result.resources).toEqual({
                    memory: 1024,
                    vcores: 2,
                });
            });

            it('should handle non-numeric resource values', () => {
                const result = CapacityParser.parse('[memory=invalid,vcores=2]');

                expect(result.mode).toBe('absolute');
                expect(result.resources).toEqual({
                    memory: NaN,
                    vcores: 2,
                });
            });
        });
    });

    describe('format()', () => {
        describe('percentage mode', () => {
            it('should format percentage capacity', () => {
                const capacity: ParsedCapacity = {
                    mode: 'percentage',
                    rawValue: '50%',
                    numericValue: 50,
                };

                const result = CapacityParser.format(capacity);

                expect(result).toBe('50%');
            });

            it('should format decimal percentage capacity', () => {
                const capacity: ParsedCapacity = {
                    mode: 'percentage',
                    rawValue: '33.33%',
                    numericValue: 33.33,
                };

                const result = CapacityParser.format(capacity);

                expect(result).toBe('33.33%');
            });
        });

        describe('weight mode', () => {
            it('should format weight capacity', () => {
                const capacity: ParsedCapacity = {
                    mode: 'weight',
                    rawValue: '2w',
                    numericValue: 2,
                };

                const result = CapacityParser.format(capacity);

                expect(result).toBe('2w');
            });

            it('should format decimal weight capacity', () => {
                const capacity: ParsedCapacity = {
                    mode: 'weight',
                    rawValue: '1.5w',
                    numericValue: 1.5,
                };

                const result = CapacityParser.format(capacity);

                expect(result).toBe('1.5w');
            });
        });

        describe('absolute mode', () => {
            it('should format absolute capacity', () => {
                const capacity: ParsedCapacity = {
                    mode: 'absolute',
                    rawValue: '[memory=1024,vcores=2]',
                    resources: {
                        memory: 1024,
                        vcores: 2,
                    },
                };

                const result = CapacityParser.format(capacity);

                expect(result).toBe('[memory=1024,vcores=2]');
            });

            it('should format absolute capacity with multiple resources', () => {
                const capacity: ParsedCapacity = {
                    mode: 'absolute',
                    rawValue: '[memory=4096,vcores=8,gpus=2]',
                    resources: {
                        memory: 4096,
                        vcores: 8,
                        gpus: 2,
                    },
                };

                const result = CapacityParser.format(capacity);

                expect(result).toBe('[memory=4096,vcores=8,gpus=2]');
            });

            it('should handle empty resources', () => {
                const capacity: ParsedCapacity = {
                    mode: 'absolute',
                    rawValue: '[]',
                    resources: {},
                };

                const result = CapacityParser.format(capacity);

                expect(result).toBe('[]');
            });
        });

        describe('fallback', () => {
            it('should return raw value for unknown mode', () => {
                const capacity: ParsedCapacity = {
                    mode: 'mixed' as CapacityMode,
                    rawValue: 'unknown-format',
                };

                const result = CapacityParser.format(capacity);

                expect(result).toBe('unknown-format');
            });
        });
    });

    describe('convertMode()', () => {
        describe('percentage to weight conversion', () => {
            it('should convert percentage to weight', () => {
                const capacity: ParsedCapacity = {
                    mode: 'percentage',
                    rawValue: '50%',
                    numericValue: 50,
                };

                const result = CapacityParser.convertMode(capacity, 'weight');

                expect(result.mode).toBe('weight');
                expect(result.numericValue).toBe(50);
                expect(result.rawValue).toBe('50w');
            });
        });

        describe('weight to percentage conversion', () => {
            it('should convert weight to percentage', () => {
                const capacity: ParsedCapacity = {
                    mode: 'weight',
                    rawValue: '2w',
                    numericValue: 2,
                };

                const result = CapacityParser.convertMode(capacity, 'percentage');

                expect(result.mode).toBe('percentage');
                expect(result.numericValue).toBe(2);
                expect(result.rawValue).toBe('2%');
            });
        });

        describe('to absolute conversion', () => {
            it('should convert to absolute with default values', () => {
                const capacity: ParsedCapacity = {
                    mode: 'percentage',
                    rawValue: '50%',
                    numericValue: 50,
                };

                const result = CapacityParser.convertMode(capacity, 'absolute');

                expect(result.mode).toBe('absolute');
                expect(result.resources).toEqual({
                    memory: 1024,
                    vcores: 2,
                });
            });
        });

        describe('same mode conversion', () => {
            it('should return same capacity if target mode matches', () => {
                const capacity: ParsedCapacity = {
                    mode: 'percentage',
                    rawValue: '50%',
                    numericValue: 50,
                };

                const result = CapacityParser.convertMode(capacity, 'percentage');

                expect(result).toBe(capacity);
            });
        });

        describe('unsupported conversion', () => {
            it('should return original capacity for unsupported conversion', () => {
                const capacity: ParsedCapacity = {
                    mode: 'absolute',
                    rawValue: '[memory=1024,vcores=2]',
                    resources: { memory: 1024, vcores: 2 },
                };

                const result = CapacityParser.convertMode(capacity, 'percentage');

                expect(result).toBe(capacity);
            });
        });
    });

    describe('round-trip parsing and formatting', () => {
        it('should maintain consistency for percentage values', () => {
            const original = '33.33%';
            const parsed = CapacityParser.parse(original);
            const formatted = CapacityParser.format(parsed);

            expect(formatted).toBe('33.33%');
        });

        it('should maintain consistency for weight values', () => {
            const original = '2.5w';
            const parsed = CapacityParser.parse(original);
            const formatted = CapacityParser.format(parsed);

            expect(formatted).toBe('2.5w');
        });

        it('should maintain consistency for absolute values', () => {
            const original = '[memory=1024,vcores=2]';
            const parsed = CapacityParser.parse(original);
            const formatted = CapacityParser.format(parsed);

            expect(formatted).toBe('[memory=1024,vcores=2]');
        });
    });
});
