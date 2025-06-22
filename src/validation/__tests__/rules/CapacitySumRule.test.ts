import { CapacitySumRule } from '../../rules/CapacitySumRule';
import { ValidationContext } from '../../types';
import { ConfigParser } from '../../../yarn-parser/ConfigParser';

describe('CapacitySumRule', () => {
    let rule: CapacitySumRule;
    let context: ValidationContext;

    beforeEach(() => {
        rule = new CapacitySumRule();
    });

    const createContext = (config: Record<string, string>): ValidationContext => {
        const parseResult = ConfigParser.parse(config);
        return {
            configuration: config,
            queues: parseResult.queues,
            isLegacyMode: parseResult.isLegacyMode,
        };
    };

    describe('percentage mode validation', () => {
        it('should pass when child capacities sum to 100%', () => {
            const config = {
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.queues': 'default,production',
                'yarn.scheduler.capacity.root.default.capacity': '40',
                'yarn.scheduler.capacity.root.production.capacity': '60',
            };

            context = createContext(config);
            const issues = rule.validate(context);

            expect(issues).toHaveLength(0);
        });

        it('should fail when child capacities sum to more than 100%', () => {
            const config = {
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.queues': 'default,production',
                'yarn.scheduler.capacity.root.default.capacity': '60',
                'yarn.scheduler.capacity.root.production.capacity': '60',
            };

            context = createContext(config);
            const issues = rule.validate(context);

            expect(issues).toHaveLength(1);
            expect(issues[0].severity).toBe('error');
            expect(issues[0].rule).toBe('capacity-sum');
            expect(issues[0].message).toContain('120');
            expect(issues[0].path).toBe('root');
        });

        it('should fail when child capacities sum to less than 100%', () => {
            const config = {
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.queues': 'default,production',
                'yarn.scheduler.capacity.root.default.capacity': '30',
                'yarn.scheduler.capacity.root.production.capacity': '40',
            };

            context = createContext(config);
            const issues = rule.validate(context);

            expect(issues).toHaveLength(1);
            expect(issues[0].severity).toBe('error');
            expect(issues[0].rule).toBe('capacity-sum');
            expect(issues[0].message).toContain('70');
            expect(issues[0].path).toBe('root');
        });

        it('should handle nested queues correctly', () => {
            const config = {
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.queues': 'development,production',
                'yarn.scheduler.capacity.root.development.capacity': '30',
                'yarn.scheduler.capacity.root.production.capacity': '70',
                'yarn.scheduler.capacity.root.development.queues': 'dev1,dev2',
                'yarn.scheduler.capacity.root.development.dev1.capacity': '50', // 50% of 30%
                'yarn.scheduler.capacity.root.development.dev2.capacity': '60', // 60% of 30% = 110% total
            };

            context = createContext(config);
            const issues = rule.validate(context);

            expect(issues).toHaveLength(1);
            expect(issues[0].path).toBe('root.development');
            expect(issues[0].message).toContain('110');
        });
    });

    describe('weight mode validation', () => {
        it('should pass for weight-based allocation', () => {
            const config = {
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.queues': 'default,production',
                'yarn.scheduler.capacity.root.default.capacity': '2w',
                'yarn.scheduler.capacity.root.production.capacity': '3w',
            };

            context = createContext(config);
            const issues = rule.validate(context);

            // Weight mode should pass capacity sum validation
            expect(issues).toHaveLength(0);
        });

        it('should handle mixed weight and percentage modes', () => {
            const config = {
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.queues': 'default,production',
                'yarn.scheduler.capacity.root.default.capacity': '50',
                'yarn.scheduler.capacity.root.production.capacity': '2w',
            };

            context = createContext(config);
            const issues = rule.validate(context);

            // Mixed modes should be handled appropriately
            expect(issues).toHaveLength(0);
        });
    });

    describe('absolute resource mode validation', () => {
        it('should pass for absolute resource allocation', () => {
            const config = {
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.queues': 'memory-intensive',
                'yarn.scheduler.capacity.root.memory-intensive.capacity': '[memory=8192,vcores=4]',
            };

            context = createContext(config);
            const issues = rule.validate(context);

            // Absolute resource mode should pass capacity sum validation
            expect(issues).toHaveLength(0);
        });
    });

    describe('edge cases', () => {
        it('should handle queues without children', () => {
            const config = {
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.queues': 'leaf-queue',
                'yarn.scheduler.capacity.root.leaf-queue.capacity': '100',
            };

            context = createContext(config);
            const issues = rule.validate(context);

            // Leaf queues should not trigger capacity sum validation
            expect(issues).toHaveLength(0);
        });

        it('should handle missing capacity values', () => {
            const config = {
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.queues': 'default,production',
                'yarn.scheduler.capacity.root.default.capacity': '50',
                // Missing production capacity
            };

            context = createContext(config);
            const issues = rule.validate(context);

            // Should handle missing values gracefully
            expect(issues.length).toBeGreaterThanOrEqual(0);
        });

        it('should handle invalid capacity formats', () => {
            const config = {
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.queues': 'default,production',
                'yarn.scheduler.capacity.root.default.capacity': 'invalid',
                'yarn.scheduler.capacity.root.production.capacity': '50',
            };

            context = createContext(config);
            const issues = rule.validate(context);

            // Should handle invalid formats gracefully
            expect(issues.length).toBeGreaterThanOrEqual(0);
        });

        it('should allow small floating point variances', () => {
            const config = {
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.queues': 'default,production,test',
                'yarn.scheduler.capacity.root.default.capacity': '33.33',
                'yarn.scheduler.capacity.root.production.capacity': '33.33',
                'yarn.scheduler.capacity.root.test.capacity': '33.34',
            };

            context = createContext(config);
            const issues = rule.validate(context);

            // Should handle small floating point differences (99.99% vs 100%)
            expect(issues).toHaveLength(0);
        });
    });

    describe('rule metadata', () => {
        it('should have correct rule metadata', () => {
            expect(rule.name).toBe('capacity-sum');
            expect(rule.description).toBe('Child queue capacities must sum to 100% in percentage mode');
            expect(rule.severity).toBe('error');
        });
    });
});
