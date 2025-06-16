import { describe, it, expect } from 'vitest';
import { ConfigParser } from '../ConfigParser';
import type { Configuration } from '../../types/Queue';

describe('ConfigParser', () => {
    describe('basic parsing', () => {
        it('should parse a simple queue hierarchy', () => {
            const config: Configuration = {
                'yarn.scheduler.capacity.root.queues': 'default,production',
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.default.capacity': '50',
                'yarn.scheduler.capacity.root.default.maximum-capacity': '100',
                'yarn.scheduler.capacity.root.production.capacity': '50',
                'yarn.scheduler.capacity.root.production.maximum-capacity': '100',
            };

            const result = ConfigParser.parse(config);

            expect(result.errors).toHaveLength(0);
            expect(result.queues).toHaveLength(1);

            const rootQueue = result.queues[0];
            expect(rootQueue.name).toBe('root');
            expect(rootQueue.path).toBe('root');
            expect(rootQueue.children).toHaveLength(2);

            const defaultQueue = rootQueue.children.find((q) => q.name === 'default');
            const productionQueue = rootQueue.children.find((q) => q.name === 'production');

            expect(defaultQueue).toBeDefined();
            expect(defaultQueue?.capacity.mode).toBe('percentage');
            expect(defaultQueue?.capacity.numericValue).toBe(50);

            expect(productionQueue).toBeDefined();
            expect(productionQueue?.capacity.mode).toBe('percentage');
            expect(productionQueue?.capacity.numericValue).toBe(50);
        });

        it('should distinguish global from queue properties', () => {
            const config: Configuration = {
                'yarn.scheduler.capacity.maximum-applications': '10000',
                'yarn.scheduler.capacity.resource-calculator': 'DefaultResourceCalculator',
                'yarn.scheduler.capacity.root.queues': 'default',
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.default.capacity': '100',
            };

            const result = ConfigParser.parse(config);

            expect(result.errors).toHaveLength(0);
            expect(result.globalProperties).toHaveProperty('yarn.scheduler.capacity.maximum-applications', '10000');
            expect(result.globalProperties).toHaveProperty(
                'yarn.scheduler.capacity.resource-calculator',
                'DefaultResourceCalculator'
            );

            // Queue properties should not be in global properties
            expect(result.globalProperties).not.toHaveProperty('yarn.scheduler.capacity.root.queues');
            expect(result.globalProperties).not.toHaveProperty('yarn.scheduler.capacity.root.capacity');
        });

        it('should handle complex queue paths', () => {
            const config: Configuration = {
                'yarn.scheduler.capacity.root.queues': 'production',
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.production.queues': 'high,medium,low',
                'yarn.scheduler.capacity.root.production.capacity': '100',
                'yarn.scheduler.capacity.root.production.high.capacity': '50',
                'yarn.scheduler.capacity.root.production.medium.capacity': '30',
                'yarn.scheduler.capacity.root.production.low.capacity': '20',
            };

            const result = ConfigParser.parse(config);

            expect(result.errors).toHaveLength(0);

            const rootQueue = result.queues[0];
            const productionQueue = rootQueue.children[0];

            expect(productionQueue.name).toBe('production');
            expect(productionQueue.path).toBe('root.production');
            expect(productionQueue.children).toHaveLength(3);

            const highQueue = productionQueue.children.find((q) => q.name === 'high');
            expect(highQueue?.path).toBe('root.production.high');
            expect(highQueue?.parent).toBe('root.production');
        });
    });

    describe('capacity mode handling', () => {
        it('should handle weight-based capacities', () => {
            const config: Configuration = {
                'yarn.scheduler.capacity.root.queues': 'default,batch',
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.default.capacity': '3w',
                'yarn.scheduler.capacity.root.batch.capacity': '1w',
            };

            const result = ConfigParser.parse(config);

            const rootQueue = result.queues[0];
            const defaultQueue = rootQueue.children.find((q) => q.name === 'default');
            const batchQueue = rootQueue.children.find((q) => q.name === 'batch');

            expect(defaultQueue?.capacity.mode).toBe('weight');
            expect(defaultQueue?.capacity.numericValue).toBe(3);
            expect(batchQueue?.capacity.mode).toBe('weight');
            expect(batchQueue?.capacity.numericValue).toBe(1);
        });

        it('should handle absolute resource capacities', () => {
            const config: Configuration = {
                'yarn.scheduler.capacity.root.queues': 'gpu-queue',
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.gpu-queue.capacity': '[memory=8192mb,vcores=4,gpu=2]',
            };

            const result = ConfigParser.parse(config);

            const rootQueue = result.queues[0];
            const gpuQueue = rootQueue.children.find((q) => q.name === 'gpu-queue');

            expect(gpuQueue?.capacity.mode).toBe('absolute');
            expect(gpuQueue?.capacity.resources).toEqual({
                memory: '8192mb',
                vcores: '4',
                gpu: '2',
            });
        });
    });

    describe('legacy mode detection', () => {
        it('should default to legacy mode when not specified', () => {
            const config: Configuration = {
                'yarn.scheduler.capacity.root.queues': 'default',
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.default.capacity': '100',
            };

            const result = ConfigParser.parse(config);
            expect(result.isLegacyMode).toBe(true);
        });

        it('should detect legacy mode when explicitly enabled', () => {
            const config: Configuration = {
                'yarn.scheduler.capacity.legacy-queue-mode.enabled': 'true',
                'yarn.scheduler.capacity.root.queues': 'default',
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.default.capacity': '100',
            };

            const result = ConfigParser.parse(config);
            expect(result.isLegacyMode).toBe(true);
        });

        it('should detect non-legacy mode when explicitly disabled', () => {
            const config: Configuration = {
                'yarn.scheduler.capacity.legacy-queue-mode.enabled': 'false',
                'yarn.scheduler.capacity.root.queues': 'default',
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.default.capacity': '100',
            };

            const result = ConfigParser.parse(config);
            expect(result.isLegacyMode).toBe(false);
        });
    });

    describe('property parsing', () => {
        it('should parse all standard queue properties', () => {
            const config: Configuration = {
                'yarn.scheduler.capacity.root.queues': 'test',
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.test.capacity': '100',
                'yarn.scheduler.capacity.root.test.maximum-capacity': '100',
                'yarn.scheduler.capacity.root.test.state': 'STOPPED',
                'yarn.scheduler.capacity.root.test.maximum-applications': '1000',
                'yarn.scheduler.capacity.root.test.maximum-am-resource-percent': '0.2',
                'yarn.scheduler.capacity.root.test.minimum-user-limit-percent': '25',
                'yarn.scheduler.capacity.root.test.user-limit-factor': '2.0',
                'yarn.scheduler.capacity.root.test.priority': '5',
                'yarn.scheduler.capacity.root.test.acl_submit_applications': 'user1,user2',
                'yarn.scheduler.capacity.root.test.acl_administer_queue': 'admin1',
                'yarn.scheduler.capacity.root.test.disable_preemption': 'true',
            };

            const result = ConfigParser.parse(config);
            const testQueue = result.queues[0].children[0];

            expect(testQueue.state).toBe('STOPPED');
            expect(testQueue.maxApplications).toBe(1000);
            expect(testQueue.maxAMResourcePercent).toBe(0.2);
            expect(testQueue.minimumUserLimitPercent).toBe(25);
            expect(testQueue.userLimitFactor).toBe(2.0);
            expect(testQueue.priority).toBe(5);
            expect(testQueue.submitACL).toBe('user1,user2');
            expect(testQueue.adminACL).toBe('admin1');
            expect(testQueue.preemptionDisabled).toBe(true);
        });

        it('should handle node label properties', () => {
            const config: Configuration = {
                'yarn.scheduler.capacity.root.queues': 'gpu',
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.gpu.capacity': '100',
                'yarn.scheduler.capacity.root.gpu.accessible-node-labels': 'gpu,high-memory',
                'yarn.scheduler.capacity.root.gpu.default-node-label-expression': 'gpu',
                'yarn.scheduler.capacity.root.gpu.accessible-node-labels.gpu.capacity': '50',
                'yarn.scheduler.capacity.root.gpu.accessible-node-labels.gpu.maximum-capacity': '100',
            };

            const result = ConfigParser.parse(config);
            const gpuQueue = result.queues[0].children[0];

            expect(gpuQueue.accessibleNodeLabels).toEqual(['gpu', 'high-memory']);
            expect(gpuQueue.defaultNodeLabelExpression).toBe('gpu');
        });
    });

    describe('validation', () => {
        it('should detect missing root queue', () => {
            const config: Configuration = {
                'yarn.scheduler.capacity.production.queues': 'high,low',
                'yarn.scheduler.capacity.production.capacity': '100',
            };

            const result = ConfigParser.parse(config);
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors.some((error) => error.includes('No root queue found'))).toBe(true);
        });

        it('should validate capacity ranges in percentage mode', () => {
            const config: Configuration = {
                'yarn.scheduler.capacity.root.queues': 'invalid',
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.invalid.capacity': '150', // Invalid: > 100%
            };

            const result = ConfigParser.parse(config);
            expect(result.errors.some((error) => error.includes('invalid capacity'))).toBe(true);
        });

        it('should warn about capacity sum in legacy mode', () => {
            const config: Configuration = {
                'yarn.scheduler.capacity.legacy-queue-mode.enabled': 'true',
                'yarn.scheduler.capacity.root.queues': 'a,b,c',
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.a.capacity': '30',
                'yarn.scheduler.capacity.root.b.capacity': '30',
                'yarn.scheduler.capacity.root.c.capacity': '30', // Sum = 90%, not 100%
            };

            const result = ConfigParser.parse(config);
            expect(result.warnings.some((warning) => warning.includes('capacity sum'))).toBe(true);
        });

        it('should create child queues even without properties', () => {
            const config: Configuration = {
                'yarn.scheduler.capacity.root.queues': 'existing,missing',
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.existing.capacity': '100',
                // Missing: root.missing configuration
            };

            const result = ConfigParser.parse(config);
            // Should not warn - queues without properties are valid
            expect(result.warnings).toHaveLength(0);
            expect(result.queues[0].children).toHaveLength(2);

            const missingQueue = result.queues[0].children.find((q) => q.name === 'missing');
            expect(missingQueue).toBeDefined();
            expect(missingQueue?.capacity.numericValue).toBe(0); // Default capacity
        });
    });

    describe('edge cases', () => {
        it('should handle empty configuration', () => {
            const config: Configuration = {};
            const result = ConfigParser.parse(config);

            expect(result.queues).toHaveLength(0);
            expect(result.errors.some((error) => error.includes('No root queue found'))).toBe(true);
        });

        it('should handle malformed properties gracefully', () => {
            const config: Configuration = {
                'yarn.scheduler.capacity.root.queues': 'test',
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.test.capacity': 'invalid-number',
                'yarn.scheduler.capacity.root.test.maximum-applications': 'not-a-number',
                'yarn.scheduler.capacity.root.test.disable_preemption': 'not-boolean',
            };

            const result = ConfigParser.parse(config);

            // Should still create the queue with default values
            const testQueue = result.queues[0].children[0];
            expect(testQueue.capacity.numericValue).toBe(0); // Parsed as 0 for invalid number
            expect(testQueue.maxApplications).toBe(-1); // Default value
            expect(testQueue.preemptionDisabled).toBe(false); // Default value
        });

        it('should handle properties with spaces and special characters', () => {
            const config: Configuration = {
                'yarn.scheduler.capacity.root.queues': 'special-queue',
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.special-queue.capacity': '  50  ', // Spaces
                'yarn.scheduler.capacity.root.special-queue.acl_submit_applications': 'user with spaces,another user',
            };

            const result = ConfigParser.parse(config);
            const specialQueue = result.queues[0].children[0];

            expect(specialQueue.capacity.numericValue).toBe(50);
            expect(specialQueue.submitACL).toBe('user with spaces,another user');
        });

        it('should correctly handle queue names that conflict with property names', () => {
            // Test case: queue named "capacity" under root
            const config: Configuration = {
                'yarn.scheduler.capacity.root.queues': 'capacity,default',
                'yarn.scheduler.capacity.root.capacity': '100',
                // This is the capacity property of root queue
                'yarn.scheduler.capacity.root.capacity.capacity': '50',
                // This is the capacity property of the "capacity" queue
                'yarn.scheduler.capacity.root.default.capacity': '50',
            };

            const result = ConfigParser.parse(config);

            expect(result.errors).toHaveLength(0);
            expect(result.queues).toHaveLength(1);

            const rootQueue = result.queues[0];
            expect(rootQueue.children).toHaveLength(2);

            const capacityQueue = rootQueue.children.find((q) => q.name === 'capacity');
            const defaultQueue = rootQueue.children.find((q) => q.name === 'default');

            expect(capacityQueue).toBeDefined();
            expect(capacityQueue?.capacity.numericValue).toBe(50);
            expect(defaultQueue).toBeDefined();
            expect(defaultQueue?.capacity.numericValue).toBe(50);
        });

        it('should handle global properties that start with root', () => {
            const config: Configuration = {
                // These are global properties, not queue properties
                'yarn.scheduler.capacity.root-max-priority': '100',
                'yarn.scheduler.capacity.root-mapping.enable': 'true',
                // This is a queue property
                'yarn.scheduler.capacity.root.capacity': '100',
            };

            const result = ConfigParser.parse(config);

            expect(result.globalProperties['yarn.scheduler.capacity.root-max-priority']).toBe('100');
            expect(result.globalProperties['yarn.scheduler.capacity.root-mapping.enable']).toBe('true');
            expect(result.queues).toHaveLength(1);
            expect(result.queues[0].capacity.numericValue).toBe(100);
        });

        it.skip('should handle deeply nested queues with conflicting names', () => {
            const config: Configuration = {
                'yarn.scheduler.capacity.root.queues': 'queues',
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.queues.queues': 'state,capacity',
                'yarn.scheduler.capacity.root.queues.capacity': '100',
                // These are properties of queues under root.queues
                'yarn.scheduler.capacity.root.queues.state.capacity': '40',
                'yarn.scheduler.capacity.root.queues.state.state': 'STOPPED',
                'yarn.scheduler.capacity.root.queues.capacity.capacity': '60',
                'yarn.scheduler.capacity.root.queues.capacity.maximum-capacity': '80',
            };

            const result = ConfigParser.parse(config);

            expect(result.errors).toHaveLength(0);
            expect(result.warnings).toHaveLength(0); // No warnings about missing children
            expect(result.queues).toHaveLength(1);

            const rootQueue = result.queues[0];
            expect(rootQueue).toBeDefined();
            expect(rootQueue.path).toBe('root');
            expect(rootQueue.children).toBeDefined();
            expect(rootQueue.children.length).toBe(1); // Should have 'queues' child

            const queuesQueue = rootQueue.children.find((q) => q.name === 'queues');
            expect(queuesQueue).toBeDefined();
            expect(queuesQueue?.children).toHaveLength(2);

            const stateQueue = queuesQueue?.children.find((q) => q.name === 'state');
            const capacityQueue = queuesQueue?.children.find((q) => q.name === 'capacity');

            expect(stateQueue?.capacity.numericValue).toBe(40);
            expect(stateQueue?.state).toBe('STOPPED');
            expect(capacityQueue?.capacity.numericValue).toBe(60);
            expect(capacityQueue?.maxCapacity.numericValue).toBe(80);
        });
    });

    describe('two-pass approach validation', () => {
        it('should correctly parse root.capacity.capacity as queue property', () => {
            const config: Configuration = {
                'yarn.scheduler.capacity.root.queues': 'capacity',
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.capacity.capacity': '100',
            };

            const result = ConfigParser.parse(config);

            expect(result.errors).toHaveLength(0);
            expect(result.queues).toHaveLength(1);

            const rootQueue = result.queues[0];
            expect(rootQueue.children).toHaveLength(1);

            const capacityQueue = rootQueue.children[0];
            expect(capacityQueue.name).toBe('capacity');
            expect(capacityQueue.capacity.numericValue).toBe(100);
        });

        it('should handle simple nested case with queues property', () => {
            const config: Configuration = {
                'yarn.scheduler.capacity.root.queues': 'a',
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.a.queues': 'b',
                'yarn.scheduler.capacity.root.a.capacity': '100',
                'yarn.scheduler.capacity.root.a.b.capacity': '100',
            };

            const result = ConfigParser.parse(config);

            expect(result.errors).toHaveLength(0);
            expect(result.queues).toHaveLength(1);

            const rootQueue = result.queues[0];
            expect(rootQueue.children).toHaveLength(1);
            expect(rootQueue.children[0].name).toBe('a');
            expect(rootQueue.children[0].children).toHaveLength(1);
            expect(rootQueue.children[0].children[0].name).toBe('b');
        });
    });
});
