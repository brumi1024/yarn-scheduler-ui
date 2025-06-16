// src/yarn-parser/__tests__/ConfigParser.spec.ts

import { ConfigParser } from '../ConfigParser';
import { mockSimpleConfig } from '../../api/mocks/mockConfigData';
import type { Configuration } from '../../types/Queue';

describe('ConfigParser Characterization Tests', () => {
    it('should parse the root queue correctly', () => {
        const result = ConfigParser.parse(mockSimpleConfig);
        expect(result.queues).toHaveLength(1);
        expect(result.queues[0].name).toBe('root');
        expect(result.queues[0].path).toBe('root');
    });

    it('should handle nested queues', () => {
        const result = ConfigParser.parse(mockSimpleConfig);
        expect(result.queues[0].children).toHaveLength(1);
        expect(result.queues[0].children[0].name).toBe('default');
        expect(result.queues[0].children[0].path).toBe('root.default');
    });

    describe('capacity value parsing characterization', () => {
        it('should correctly parse percentage capacity values', () => {
            const config: Configuration = {
                'yarn.scheduler.capacity.root.queues': 'test',
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.test.capacity': '75',
                'yarn.scheduler.capacity.root.test.maximum-capacity': '90',
            };

            const result = ConfigParser.parse(config);
            const testQueue = result.queues[0].children[0];

            expect(testQueue.capacity.mode).toBe('percentage');
            expect(testQueue.capacity.numericValue).toBe(75);
            expect(testQueue.maxCapacity.mode).toBe('percentage');
            expect(testQueue.maxCapacity.numericValue).toBe(90);
        });

        it('should correctly parse weight capacity values', () => {
            const config: Configuration = {
                'yarn.scheduler.capacity.root.queues': 'weighted',
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.weighted.capacity': '3.5w',
            };

            const result = ConfigParser.parse(config);
            const weightedQueue = result.queues[0].children[0];

            expect(weightedQueue.capacity.mode).toBe('weight');
            expect(weightedQueue.capacity.numericValue).toBe(3.5);
            expect(weightedQueue.capacity.value).toBe('3.5w');
        });

        it('should correctly parse absolute capacity values', () => {
            const config: Configuration = {
                'yarn.scheduler.capacity.root.queues': 'absolute',
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.absolute.capacity': '[memory=8192,vcores=4]',
            };

            const result = ConfigParser.parse(config);
            const absoluteQueue = result.queues[0].children[0];

            expect(absoluteQueue.capacity.mode).toBe('absolute');
            expect(absoluteQueue.capacity.resources).toEqual({
                memory: '8192',
                vcores: '4',
            });
        });
    });

    describe('auto-queue creation properties characterization', () => {
        it('should parse auto-created queue properties', () => {
            const config: Configuration = {
                'yarn.scheduler.capacity.root.queues': 'users',
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.users.capacity': '100',
                'yarn.scheduler.capacity.root.users.auto-create-child-queue.enabled': 'true',
                'yarn.scheduler.capacity.root.users.auto-create-child-queue.management-policy': 'USER',
                'yarn.scheduler.capacity.root.users.auto-create-child-queue.template.capacity': '1w',
                'yarn.scheduler.capacity.root.users.auto-create-child-queue.template.maximum-capacity': '100',
            };

            const result = ConfigParser.parse(config);
            const usersQueue = result.queues[0].children[0];

            expect(usersQueue.properties['auto-create-child-queue.enabled']).toBe('true');
            expect(usersQueue.properties['auto-create-child-queue.management-policy']).toBe('USER');
            expect(usersQueue.properties['auto-create-child-queue.template.capacity']).toBe('1w');
            expect(usersQueue.properties['auto-create-child-queue.template.maximum-capacity']).toBe('100');
        });
    });

    describe('edge cases with conflicting property names', () => {
        it('should handle queues named after properties correctly', () => {
            const config: Configuration = {
                'yarn.scheduler.capacity.root.queues': 'capacity,maximum-capacity,state',
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.capacity.capacity': '30',
                'yarn.scheduler.capacity.root.maximum-capacity.capacity': '40',
                'yarn.scheduler.capacity.root.state.capacity': '30',
            };

            const result = ConfigParser.parse(config);
            expect(result.errors).toHaveLength(0);

            const rootQueue = result.queues[0];
            expect(rootQueue.children).toHaveLength(3);

            const capacityQueue = rootQueue.children.find((q) => q.name === 'capacity');
            const maxCapacityQueue = rootQueue.children.find((q) => q.name === 'maximum-capacity');
            const stateQueue = rootQueue.children.find((q) => q.name === 'state');

            expect(capacityQueue?.capacity.numericValue).toBe(30);
            expect(maxCapacityQueue?.capacity.numericValue).toBe(40);
            expect(stateQueue?.capacity.numericValue).toBe(30);
        });

        it('should distinguish between global properties starting with root', () => {
            const config: Configuration = {
                'yarn.scheduler.capacity.root-queue-mapping.enabled': 'true',
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.queues': 'test',
                'yarn.scheduler.capacity.root.test.capacity': '100',
            };

            const result = ConfigParser.parse(config);

            // Global property should be captured
            expect(result.globalProperties['yarn.scheduler.capacity.root-queue-mapping.enabled']).toBe('true');

            // Queue structure should still be correct
            expect(result.queues[0].capacity.numericValue).toBe(100);
            expect(result.queues[0].children[0].name).toBe('test');
        });
    });

    describe('legacy mode detection characterization', () => {
        it('should default to legacy mode when property is missing', () => {
            const config: Configuration = {
                'yarn.scheduler.capacity.root.queues': 'test',
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.test.capacity': '100',
            };

            const result = ConfigParser.parse(config);
            expect(result.isLegacyMode).toBe(true);
        });

        it('should detect legacy mode when explicitly set to true', () => {
            const config: Configuration = {
                'yarn.scheduler.capacity.legacy-queue-mode.enabled': 'true',
                'yarn.scheduler.capacity.root.queues': 'test',
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.test.capacity': '100',
            };

            const result = ConfigParser.parse(config);
            expect(result.isLegacyMode).toBe(true);
        });

        it('should detect non-legacy mode when explicitly set to false', () => {
            const config: Configuration = {
                'yarn.scheduler.capacity.legacy-queue-mode.enabled': 'false',
                'yarn.scheduler.capacity.root.queues': 'test',
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.test.capacity': '100',
            };

            const result = ConfigParser.parse(config);
            expect(result.isLegacyMode).toBe(false);
        });
    });

    describe('validation behavior characterization', () => {
        it('should validate percentage capacity ranges', () => {
            const config: Configuration = {
                'yarn.scheduler.capacity.root.queues': 'invalid',
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.invalid.capacity': '150',
            };

            const result = ConfigParser.parse(config);
            expect(result.errors.some((error) => error.includes('invalid capacity'))).toBe(true);
        });

        it('should warn about capacity sum mismatches in legacy mode', () => {
            const config: Configuration = {
                'yarn.scheduler.capacity.legacy-queue-mode.enabled': 'true',
                'yarn.scheduler.capacity.root.queues': 'a,b',
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.a.capacity': '60',
                'yarn.scheduler.capacity.root.b.capacity': '30', // Sum = 90%, not 100%
            };

            const result = ConfigParser.parse(config);
            expect(result.warnings.some((warning) => warning.includes('capacity sum'))).toBe(true);
        });

        it('should handle missing root queue gracefully', () => {
            const config: Configuration = {
                'yarn.scheduler.capacity.some.other.property': 'value',
            };

            const result = ConfigParser.parse(config);
            expect(result.errors.some((error) => error.includes('No root queue found'))).toBe(true);
            expect(result.queues).toHaveLength(0);
        });
    });

    describe('malformed input handling characterization', () => {
        it('should handle invalid numeric values gracefully', () => {
            const config: Configuration = {
                'yarn.scheduler.capacity.root.queues': 'test',
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.test.capacity': 'not-a-number',
                'yarn.scheduler.capacity.root.test.maximum-applications': 'invalid',
            };

            const result = ConfigParser.parse(config);
            const testQueue = result.queues[0].children[0];

            expect(testQueue.capacity.numericValue).toBe(0); // Fallback for invalid percentage
            expect(testQueue.maxApplications).toBe(-1); // Fallback for invalid number
        });

        it('should trim whitespace from property values', () => {
            const config: Configuration = {
                'yarn.scheduler.capacity.root.queues': '  test  ',
                'yarn.scheduler.capacity.root.capacity': ' 100 ',
                'yarn.scheduler.capacity.root.test.capacity': '  50  ',
            };

            const result = ConfigParser.parse(config);
            const testQueue = result.queues[0].children[0];

            expect(testQueue.name).toBe('test'); // Whitespace trimmed
            expect(testQueue.capacity.numericValue).toBe(50);
        });
    });
});
