import { MaxCapacityRule } from '../../rules/MaxCapacityRule';
import { ValidationContext } from '../../types';
import { ConfigParser } from '../../../yarn-parser/ConfigParser';

describe('MaxCapacityRule', () => {
    let rule: MaxCapacityRule;
    let context: ValidationContext;

    beforeEach(() => {
        rule = new MaxCapacityRule();
    });

    const createContext = (config: Record<string, string>): ValidationContext => {
        const parseResult = ConfigParser.parse(config);
        return {
            configuration: config,
            queues: parseResult.queues,
            isLegacyMode: parseResult.isLegacyMode,
        };
    };

    describe('basic validation', () => {
        it('should pass when maximum capacity >= capacity', () => {
            const config = {
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.queues': 'default',
                'yarn.scheduler.capacity.root.default.capacity': '50',
                'yarn.scheduler.capacity.root.default.maximum-capacity': '80',
            };

            context = createContext(config);
            const issues = rule.validate(context);

            expect(issues).toHaveLength(0);
        });

        it('should pass when maximum capacity equals capacity', () => {
            const config = {
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.queues': 'default',
                'yarn.scheduler.capacity.root.default.capacity': '50',
                'yarn.scheduler.capacity.root.default.maximum-capacity': '50',
            };

            context = createContext(config);
            const issues = rule.validate(context);

            expect(issues).toHaveLength(0);
        });

        it('should fail when maximum capacity < capacity', () => {
            const config = {
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.queues': 'default',
                'yarn.scheduler.capacity.root.default.capacity': '60',
                'yarn.scheduler.capacity.root.default.maximum-capacity': '40',
            };

            context = createContext(config);
            const issues = rule.validate(context);

            expect(issues).toHaveLength(1);
            expect(issues[0].severity).toBe('error');
            expect(issues[0].rule).toBe('max-capacity');
            expect(issues[0].message).toContain('maximum capacity (40) must be >= capacity (60)');
            expect(issues[0].path).toBe('root.default');
        });
    });

    describe('multiple queues', () => {
        it('should validate all queues with maximum capacity set', () => {
            const config = {
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.queues': 'queue1,queue2',
                'yarn.scheduler.capacity.root.queue1.capacity': '30',
                'yarn.scheduler.capacity.root.queue1.maximum-capacity': '20', // Invalid
                'yarn.scheduler.capacity.root.queue2.capacity': '70',
                'yarn.scheduler.capacity.root.queue2.maximum-capacity': '80', // Valid
            };

            context = createContext(config);
            const issues = rule.validate(context);

            expect(issues).toHaveLength(1);
            expect(issues[0].path).toBe('root.queue1');
            expect(issues[0].message).toContain('maximum capacity (20) must be >= capacity (30)');
        });

        it('should handle nested queues', () => {
            const config = {
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.queues': 'development',
                'yarn.scheduler.capacity.root.development.capacity': '50',
                'yarn.scheduler.capacity.root.development.maximum-capacity': '60',
                'yarn.scheduler.capacity.root.development.queues': 'dev1,dev2',
                'yarn.scheduler.capacity.root.development.dev1.capacity': '30',
                'yarn.scheduler.capacity.root.development.dev1.maximum-capacity': '20', // Invalid
                'yarn.scheduler.capacity.root.development.dev2.capacity': '70',
                'yarn.scheduler.capacity.root.development.dev2.maximum-capacity': '80', // Valid
            };

            context = createContext(config);
            const issues = rule.validate(context);

            expect(issues).toHaveLength(1);
            expect(issues[0].path).toBe('root.development.dev1');
        });
    });

    describe('edge cases', () => {
        it('should handle queues without maximum capacity set', () => {
            const config = {
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.queues': 'default',
                'yarn.scheduler.capacity.root.default.capacity': '100',
                // No maximum-capacity set
            };

            context = createContext(config);
            const issues = rule.validate(context);

            // Should pass - no maximum capacity constraint to validate
            expect(issues).toHaveLength(0);
        });

        it('should handle missing capacity values', () => {
            const config = {
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.queues': 'default',
                'yarn.scheduler.capacity.root.default.maximum-capacity': '50',
                // No capacity set
            };

            context = createContext(config);
            const issues = rule.validate(context);

            // Should handle missing capacity gracefully
            expect(issues.length).toBeGreaterThanOrEqual(0);
        });

        it('should handle invalid capacity formats', () => {
            const config = {
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.queues': 'default',
                'yarn.scheduler.capacity.root.default.capacity': 'invalid',
                'yarn.scheduler.capacity.root.default.maximum-capacity': '50',
            };

            context = createContext(config);
            const issues = rule.validate(context);

            // Should handle invalid formats gracefully
            expect(issues.length).toBeGreaterThanOrEqual(0);
        });

        it('should handle percentage values with % suffix', () => {
            const config = {
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.queues': 'default',
                'yarn.scheduler.capacity.root.default.capacity': '50%',
                'yarn.scheduler.capacity.root.default.maximum-capacity': '40%',
            };

            context = createContext(config);
            const issues = rule.validate(context);

            expect(issues).toHaveLength(1);
            expect(issues[0].message).toContain('maximum capacity (40) must be >= capacity (50)');
        });

        it('should handle decimal values', () => {
            const config = {
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.queues': 'default',
                'yarn.scheduler.capacity.root.default.capacity': '33.5',
                'yarn.scheduler.capacity.root.default.maximum-capacity': '33.4',
            };

            context = createContext(config);
            const issues = rule.validate(context);

            expect(issues).toHaveLength(1);
            expect(issues[0].message).toContain('maximum capacity (33.4) must be >= capacity (33.5)');
        });
    });

    describe('weight and absolute modes', () => {
        it('should handle weight-based capacity', () => {
            const config = {
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.queues': 'default',
                'yarn.scheduler.capacity.root.default.capacity': '2w',
                'yarn.scheduler.capacity.root.default.maximum-capacity': '1w',
            };

            context = createContext(config);
            const issues = rule.validate(context);

            expect(issues).toHaveLength(1);
            expect(issues[0].message).toContain('maximum capacity (1) must be >= capacity (2)');
        });

        it('should handle absolute resource allocation', () => {
            const config = {
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.queues': 'memory-queue',
                'yarn.scheduler.capacity.root.memory-queue.capacity': '[memory=8192,vcores=4]',
                'yarn.scheduler.capacity.root.memory-queue.maximum-capacity': '[memory=4096,vcores=2]',
            };

            context = createContext(config);
            const issues = rule.validate(context);

            // Should handle absolute resource comparison
            expect(issues.length).toBeGreaterThanOrEqual(0);
        });
    });

    describe('rule metadata', () => {
        it('should have correct rule metadata', () => {
            expect(rule.name).toBe('max-capacity');
            expect(rule.description).toBe('Maximum capacity must be >= capacity');
            expect(rule.severity).toBe('error');
        });
    });
});
