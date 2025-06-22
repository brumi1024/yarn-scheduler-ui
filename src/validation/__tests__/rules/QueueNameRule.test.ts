import { QueueNameRule } from '../../rules/QueueNameRule';
import { ValidationContext } from '../../types';
import { ConfigParser } from '../../../yarn-parser/ConfigParser';

describe('QueueNameRule', () => {
    let rule: QueueNameRule;
    let context: ValidationContext;

    beforeEach(() => {
        rule = new QueueNameRule();
    });

    const createContext = (config: Record<string, string>): ValidationContext => {
        const parseResult = ConfigParser.parse(config);
        return {
            configuration: config,
            queues: parseResult.queues,
            isLegacyMode: parseResult.isLegacyMode,
        };
    };

    describe('valid queue names', () => {
        it('should pass for simple alphanumeric queue names', () => {
            const config = {
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.queues': 'default,production,development',
                'yarn.scheduler.capacity.root.default.capacity': '33',
                'yarn.scheduler.capacity.root.production.capacity': '33',
                'yarn.scheduler.capacity.root.development.capacity': '34',
            };

            context = createContext(config);
            const issues = rule.validate(context);

            expect(issues).toHaveLength(0);
        });

        it('should pass for queue names with hyphens', () => {
            const config = {
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.queues': 'high-priority,low-priority',
                'yarn.scheduler.capacity.root.high-priority.capacity': '70',
                'yarn.scheduler.capacity.root.low-priority.capacity': '30',
            };

            context = createContext(config);
            const issues = rule.validate(context);

            expect(issues).toHaveLength(0);
        });

        it('should pass for queue names with underscores', () => {
            const config = {
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.queues': 'user_jobs,system_jobs',
                'yarn.scheduler.capacity.root.user_jobs.capacity': '80',
                'yarn.scheduler.capacity.root.system_jobs.capacity': '20',
            };

            context = createContext(config);
            const issues = rule.validate(context);

            expect(issues).toHaveLength(0);
        });

        it('should pass for queue names with numbers', () => {
            const config = {
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.queues': 'queue1,queue2,queue123',
                'yarn.scheduler.capacity.root.queue1.capacity': '30',
                'yarn.scheduler.capacity.root.queue2.capacity': '30',
                'yarn.scheduler.capacity.root.queue123.capacity': '40',
            };

            context = createContext(config);
            const issues = rule.validate(context);

            expect(issues).toHaveLength(0);
        });

        it('should pass for mixed valid characters', () => {
            const config = {
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.queues': 'queue_1-test,another-queue_2',
                'yarn.scheduler.capacity.root.queue_1-test.capacity': '50',
                'yarn.scheduler.capacity.root.another-queue_2.capacity': '50',
            };

            context = createContext(config);
            const issues = rule.validate(context);

            expect(issues).toHaveLength(0);
        });
    });

    describe('invalid queue names', () => {
        it('should fail for queue names with special characters', () => {
            const config = {
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.queues': 'queue@invalid,queue#invalid',
                'yarn.scheduler.capacity.root.queue@invalid.capacity': '50',
                'yarn.scheduler.capacity.root.queue#invalid.capacity': '50',
            };

            context = createContext(config);
            const issues = rule.validate(context);

            expect(issues).toHaveLength(2);
            expect(issues[0].severity).toBe('error');
            expect(issues[0].rule).toBe('queue-name');
            expect(issues[0].message).toContain('Invalid queue name');
            expect(issues[0].path).toContain('queue@invalid');
            expect(issues[1].path).toContain('queue#invalid');
        });

        it('should fail for queue names with spaces', () => {
            const config = {
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.queues': 'queue with spaces',
                'yarn.scheduler.capacity.root.queue with spaces.capacity': '100',
            };

            context = createContext(config);
            const issues = rule.validate(context);

            expect(issues).toHaveLength(1);
            expect(issues[0].message).toContain('Invalid queue name');
            expect(issues[0].path).toContain('queue with spaces');
        });

        it('should fail for queue names with dots', () => {
            const config = {
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.queues': 'queue.invalid',
                'yarn.scheduler.capacity.root.queue.invalid.capacity': '100',
            };

            context = createContext(config);
            const issues = rule.validate(context);

            expect(issues).toHaveLength(1);
            expect(issues[0].message).toContain('Invalid queue name');
            expect(issues[0].path).toContain('queue.invalid');
        });

        it('should fail for queue names with forward slashes', () => {
            const config = {
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.queues': 'queue/invalid',
                'yarn.scheduler.capacity.root.queue/invalid.capacity': '100',
            };

            context = createContext(config);
            const issues = rule.validate(context);

            expect(issues).toHaveLength(1);
            expect(issues[0].message).toContain('Invalid queue name');
            expect(issues[0].path).toContain('queue/invalid');
        });

        it('should fail for empty queue names', () => {
            const config = {
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.queues': 'valid,',
                'yarn.scheduler.capacity.root.valid.capacity': '50',
                'yarn.scheduler.capacity.root..capacity': '50', // Empty name
            };

            context = createContext(config);
            const issues = rule.validate(context);

            expect(issues.length).toBeGreaterThan(0);
        });
    });

    describe('nested queue validation', () => {
        it('should validate nested queue names', () => {
            const config = {
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.queues': 'development',
                'yarn.scheduler.capacity.root.development.capacity': '100',
                'yarn.scheduler.capacity.root.development.queues': 'valid-name,invalid@name',
                'yarn.scheduler.capacity.root.development.valid-name.capacity': '50',
                'yarn.scheduler.capacity.root.development.invalid@name.capacity': '50',
            };

            context = createContext(config);
            const issues = rule.validate(context);

            expect(issues).toHaveLength(1);
            expect(issues[0].path).toContain('invalid@name');
        });

        it('should validate deeply nested queue names', () => {
            const config = {
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.queues': 'level1',
                'yarn.scheduler.capacity.root.level1.capacity': '100',
                'yarn.scheduler.capacity.root.level1.queues': 'level2',
                'yarn.scheduler.capacity.root.level1.level2.capacity': '100',
                'yarn.scheduler.capacity.root.level1.level2.queues': 'valid-leaf,invalid$leaf',
                'yarn.scheduler.capacity.root.level1.level2.valid-leaf.capacity': '50',
                'yarn.scheduler.capacity.root.level1.level2.invalid$leaf.capacity': '50',
            };

            context = createContext(config);
            const issues = rule.validate(context);

            expect(issues).toHaveLength(1);
            expect(issues[0].path).toContain('invalid$leaf');
        });
    });

    describe('edge cases', () => {
        it('should handle configuration without queues', () => {
            const config = {
                'yarn.scheduler.capacity.root.capacity': '100',
                // No queues defined
            };

            context = createContext(config);
            const issues = rule.validate(context);

            // Should not crash, should handle gracefully
            expect(issues).toBeDefined();
        });

        it('should handle malformed queue list', () => {
            const config = {
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.queues': '',
            };

            context = createContext(config);
            const issues = rule.validate(context);

            // Should handle empty queue list gracefully
            expect(issues).toBeDefined();
        });

        it('should handle single character queue names', () => {
            const config = {
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.queues': 'a,b,c',
                'yarn.scheduler.capacity.root.a.capacity': '33',
                'yarn.scheduler.capacity.root.b.capacity': '33',
                'yarn.scheduler.capacity.root.c.capacity': '34',
            };

            context = createContext(config);
            const issues = rule.validate(context);

            expect(issues).toHaveLength(0);
        });

        it('should handle queue names starting with numbers', () => {
            const config = {
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.queues': '1queue,2queue',
                'yarn.scheduler.capacity.root.1queue.capacity': '50',
                'yarn.scheduler.capacity.root.2queue.capacity': '50',
            };

            context = createContext(config);
            const issues = rule.validate(context);

            expect(issues).toHaveLength(0);
        });
    });

    describe('rule metadata', () => {
        it('should have correct rule metadata', () => {
            expect(rule.name).toBe('queue-name');
            expect(rule.description).toBe(
                'Queue names must contain only alphanumeric characters, hyphens, and underscores'
            );
            expect(rule.severity).toBe('error');
        });
    });
});
