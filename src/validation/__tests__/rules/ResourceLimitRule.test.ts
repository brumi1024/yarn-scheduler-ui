import { ResourceLimitRule } from '../../rules/ResourceLimitRule';
import { ValidationContext } from '../../types';
import { ConfigParser } from '../../../yarn-parser/ConfigParser';

describe('ResourceLimitRule', () => {
    let rule: ResourceLimitRule;
    let context: ValidationContext;

    beforeEach(() => {
        rule = new ResourceLimitRule();
    });

    const createContext = (config: Record<string, string>): ValidationContext => {
        const parseResult = ConfigParser.parse(config);
        return {
            configuration: config,
            queues: parseResult.queues,
            isLegacyMode: parseResult.isLegacyMode,
        };
    };

    describe('global maximum applications validation', () => {
        it('should pass for valid maximum applications', () => {
            const config = {
                'yarn.scheduler.capacity.maximum-applications': '10000',
                'yarn.scheduler.capacity.root.capacity': '100',
            };

            context = createContext(config);
            const issues = rule.validate(context);

            expect(issues).toHaveLength(0);
        });

        it('should fail for negative maximum applications', () => {
            const config = {
                'yarn.scheduler.capacity.maximum-applications': '-100',
                'yarn.scheduler.capacity.root.capacity': '100',
            };

            context = createContext(config);
            const issues = rule.validate(context);

            expect(issues).toHaveLength(1);
            expect(issues[0].severity).toBe('error');
            expect(issues[0].rule).toBe('resource-limits');
            expect(issues[0].path).toBe('yarn.scheduler.capacity.maximum-applications');
            expect(issues[0].message).toContain('Maximum applications must be positive');
        });

        it('should fail for zero maximum applications', () => {
            const config = {
                'yarn.scheduler.capacity.maximum-applications': '0',
                'yarn.scheduler.capacity.root.capacity': '100',
            };

            context = createContext(config);
            const issues = rule.validate(context);

            expect(issues).toHaveLength(1);
            expect(issues[0].message).toContain('Maximum applications must be positive');
        });

        it('should fail for non-numeric maximum applications', () => {
            const config = {
                'yarn.scheduler.capacity.maximum-applications': 'invalid',
                'yarn.scheduler.capacity.root.capacity': '100',
            };

            context = createContext(config);
            const issues = rule.validate(context);

            expect(issues).toHaveLength(1);
            expect(issues[0].message).toContain('Maximum applications must be positive');
        });
    });

    describe('maximum AM resource percent validation', () => {
        it('should pass for valid AM resource percent', () => {
            const config = {
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.queues': 'default',
                'yarn.scheduler.capacity.root.default.capacity': '100',
                'yarn.scheduler.capacity.root.default.maximum-am-resource-percent': '0.5',
            };

            context = createContext(config);
            const issues = rule.validate(context);

            expect(issues).toHaveLength(0);
        });

        it('should pass for AM resource percent at boundaries (0.0 and 1.0)', () => {
            const config = {
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.queues': 'queue1,queue2',
                'yarn.scheduler.capacity.root.queue1.capacity': '50',
                'yarn.scheduler.capacity.root.queue1.maximum-am-resource-percent': '0.0',
                'yarn.scheduler.capacity.root.queue2.capacity': '50',
                'yarn.scheduler.capacity.root.queue2.maximum-am-resource-percent': '1.0',
            };

            context = createContext(config);
            const issues = rule.validate(context);

            expect(issues).toHaveLength(0);
        });

        it('should fail for AM resource percent > 1.0', () => {
            const config = {
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.queues': 'default',
                'yarn.scheduler.capacity.root.default.capacity': '100',
                'yarn.scheduler.capacity.root.default.maximum-am-resource-percent': '1.5',
            };

            context = createContext(config);
            const issues = rule.validate(context);

            expect(issues).toHaveLength(1);
            expect(issues[0].severity).toBe('error');
            expect(issues[0].rule).toBe('resource-limits');
            expect(issues[0].path).toBe('root.default.maximum-am-resource-percent');
            expect(issues[0].message).toContain('AM resource percent must be 0.0-1.0');
        });

        it('should fail for negative AM resource percent', () => {
            const config = {
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.queues': 'default',
                'yarn.scheduler.capacity.root.default.capacity': '100',
                'yarn.scheduler.capacity.root.default.maximum-am-resource-percent': '-0.1',
            };

            context = createContext(config);
            const issues = rule.validate(context);

            expect(issues).toHaveLength(1);
            expect(issues[0].message).toContain('AM resource percent must be 0.0-1.0');
        });
    });

    describe('user limit factor validation', () => {
        it('should pass for positive user limit factor', () => {
            const config = {
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.queues': 'default',
                'yarn.scheduler.capacity.root.default.capacity': '100',
                'yarn.scheduler.capacity.root.default.user-limit-factor': '2.0',
            };

            context = createContext(config);
            const issues = rule.validate(context);

            expect(issues).toHaveLength(0);
        });

        it('should pass for user limit factor = -1 (disabled)', () => {
            const config = {
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.queues': 'default',
                'yarn.scheduler.capacity.root.default.capacity': '100',
                'yarn.scheduler.capacity.root.default.user-limit-factor': '-1',
            };

            context = createContext(config);
            const issues = rule.validate(context);

            expect(issues).toHaveLength(0);
        });

        it('should fail for user limit factor = 0', () => {
            const config = {
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.queues': 'default',
                'yarn.scheduler.capacity.root.default.capacity': '100',
                'yarn.scheduler.capacity.root.default.user-limit-factor': '0',
            };

            context = createContext(config);
            const issues = rule.validate(context);

            expect(issues).toHaveLength(1);
            expect(issues[0].severity).toBe('error');
            expect(issues[0].rule).toBe('resource-limits');
            expect(issues[0].path).toBe('root.default.user-limit-factor');
            expect(issues[0].message).toContain('User limit factor must be positive or disabled (-1)');
        });

        it('should fail for negative user limit factor other than -1', () => {
            const config = {
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.queues': 'default',
                'yarn.scheduler.capacity.root.default.capacity': '100',
                'yarn.scheduler.capacity.root.default.user-limit-factor': '-2',
            };

            context = createContext(config);
            const issues = rule.validate(context);

            expect(issues).toHaveLength(1);
            expect(issues[0].message).toContain('User limit factor must be positive or disabled (-1)');
        });
    });

    describe('minimum user limit percent validation', () => {
        it('should pass for valid minimum user limit percent', () => {
            const config = {
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.queues': 'default',
                'yarn.scheduler.capacity.root.default.capacity': '100',
                'yarn.scheduler.capacity.root.default.minimum-user-limit-percent': '25',
            };

            context = createContext(config);
            const issues = rule.validate(context);

            expect(issues).toHaveLength(0);
        });

        it('should pass for boundary values (1 and 100)', () => {
            const config = {
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.queues': 'queue1,queue2',
                'yarn.scheduler.capacity.root.queue1.capacity': '50',
                'yarn.scheduler.capacity.root.queue1.minimum-user-limit-percent': '1',
                'yarn.scheduler.capacity.root.queue2.capacity': '50',
                'yarn.scheduler.capacity.root.queue2.minimum-user-limit-percent': '100',
            };

            context = createContext(config);
            const issues = rule.validate(context);

            expect(issues).toHaveLength(0);
        });

        it('should fail for minimum user limit percent = 0', () => {
            const config = {
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.queues': 'default',
                'yarn.scheduler.capacity.root.default.capacity': '100',
                'yarn.scheduler.capacity.root.default.minimum-user-limit-percent': '0',
            };

            context = createContext(config);
            const issues = rule.validate(context);

            expect(issues).toHaveLength(1);
            expect(issues[0].severity).toBe('error');
            expect(issues[0].rule).toBe('resource-limits');
            expect(issues[0].path).toBe('root.default.minimum-user-limit-percent');
            expect(issues[0].message).toContain('Minimum user limit percent must be 1-100');
        });

        it('should fail for minimum user limit percent > 100', () => {
            const config = {
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.queues': 'default',
                'yarn.scheduler.capacity.root.default.capacity': '100',
                'yarn.scheduler.capacity.root.default.minimum-user-limit-percent': '150',
            };

            context = createContext(config);
            const issues = rule.validate(context);

            expect(issues).toHaveLength(1);
            expect(issues[0].message).toContain('Minimum user limit percent must be 1-100');
        });

        it('should fail for negative minimum user limit percent', () => {
            const config = {
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.queues': 'default',
                'yarn.scheduler.capacity.root.default.capacity': '100',
                'yarn.scheduler.capacity.root.default.minimum-user-limit-percent': '-10',
            };

            context = createContext(config);
            const issues = rule.validate(context);

            expect(issues).toHaveLength(1);
            expect(issues[0].message).toContain('Minimum user limit percent must be 1-100');
        });
    });

    describe('multiple queues and nested validation', () => {
        it('should validate all queues with resource limits', () => {
            const config = {
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.queues': 'queue1,queue2',
                'yarn.scheduler.capacity.root.queue1.capacity': '50',
                'yarn.scheduler.capacity.root.queue1.maximum-am-resource-percent': '1.2', // Invalid
                'yarn.scheduler.capacity.root.queue1.user-limit-factor': '2.0', // Valid
                'yarn.scheduler.capacity.root.queue2.capacity': '50',
                'yarn.scheduler.capacity.root.queue2.maximum-am-resource-percent': '0.5', // Valid
                'yarn.scheduler.capacity.root.queue2.minimum-user-limit-percent': '150', // Invalid
            };

            context = createContext(config);
            const issues = rule.validate(context);

            expect(issues).toHaveLength(2);
            expect(issues[0].path).toBe('root.queue1.maximum-am-resource-percent');
            expect(issues[1].path).toBe('root.queue2.minimum-user-limit-percent');
        });

        it('should validate nested queues', () => {
            const config = {
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.queues': 'development',
                'yarn.scheduler.capacity.root.development.capacity': '100',
                'yarn.scheduler.capacity.root.development.queues': 'dev1,dev2',
                'yarn.scheduler.capacity.root.development.dev1.capacity': '50',
                'yarn.scheduler.capacity.root.development.dev1.user-limit-factor': '-2', // Invalid
                'yarn.scheduler.capacity.root.development.dev2.capacity': '50',
                'yarn.scheduler.capacity.root.development.dev2.minimum-user-limit-percent': '50', // Valid
            };

            context = createContext(config);
            const issues = rule.validate(context);

            expect(issues).toHaveLength(1);
            expect(issues[0].path).toBe('root.development.dev1.user-limit-factor');
        });
    });

    describe('edge cases', () => {
        it('should handle queues without resource limits', () => {
            const config = {
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.queues': 'default',
                'yarn.scheduler.capacity.root.default.capacity': '100',
                // No resource limits set
            };

            context = createContext(config);
            const issues = rule.validate(context);

            expect(issues).toHaveLength(0);
        });

        it('should handle invalid numeric formats', () => {
            const config = {
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.queues': 'default',
                'yarn.scheduler.capacity.root.default.capacity': '100',
                'yarn.scheduler.capacity.root.default.maximum-am-resource-percent': 'not-a-number',
                'yarn.scheduler.capacity.root.default.user-limit-factor': 'invalid',
                'yarn.scheduler.capacity.root.default.minimum-user-limit-percent': 'bad-value',
            };

            context = createContext(config);
            const issues = rule.validate(context);

            expect(issues.length).toBeGreaterThan(0);
            expect(issues.every((issue) => issue.rule === 'resource-limits')).toBe(true);
        });
    });

    describe('rule metadata', () => {
        it('should have correct rule metadata', () => {
            expect(rule.name).toBe('resource-limits');
            expect(rule.description).toBe('Resource limits must be valid');
            expect(rule.severity).toBe('warning');
        });
    });
});
