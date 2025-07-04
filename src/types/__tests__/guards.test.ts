import { describe, it, expect } from 'vitest';
import {
    isQueueInfo,
    isCapacitySchedulerInfo,
    isLeafQueue,
    isParentQueue,
    hasQueueChildren,
    isValidQueueName,
    isValidPropertyValue,
    isGlobalProperty,
    isNodeLabelProperty,
    isResourceInfo,
    isMutationError,
} from '../guards';
import type { QueueInfo } from '../queue';
import type { SchedulerInfo } from '../scheduler';
import type { ResourceInfo } from '../resource';

describe('Type Guards', () => {
    describe('isQueueInfo', () => {
        it('should identify valid QueueInfo object', () => {
            const queueInfo = {
                queueType: 'leaf',
                capacity: 70,
                usedCapacity: 45.5,
                maxCapacity: 100,
                absoluteCapacity: 70,
                absoluteMaxCapacity: 100,
                absoluteUsedCapacity: 31.85,
                numApplications: 150,
                queueName: 'production',
                queuePath: 'root.production',
                state: 'RUNNING',
            };

            expect(isQueueInfo(queueInfo)).toBe(true);
        });

        it('should reject objects missing required fields', () => {
            const invalidQueue = {
                queueType: 'leaf',
                capacity: 70,
                // missing other required fields
            };

            expect(isQueueInfo(invalidQueue)).toBe(false);
        });

        it('should reject non-objects', () => {
            expect(isQueueInfo(null)).toBe(false);
            expect(isQueueInfo(undefined)).toBe(false);
            expect(isQueueInfo('string')).toBe(false);
            expect(isQueueInfo(123)).toBe(false);
            expect(isQueueInfo([])).toBe(false);
        });
    });

    describe('isCapacitySchedulerInfo', () => {
        it('should identify capacity scheduler info', () => {
            const schedulerInfo: SchedulerInfo = {
                type: 'capacityScheduler',
                capacity: 100,
                usedCapacity: 60,
                maxCapacity: 100,
                queueName: 'root',
                queues: { queue: [] },
            };

            expect(isCapacitySchedulerInfo(schedulerInfo)).toBe(true);
        });

        it('should reject non-capacity scheduler types', () => {
            const fairScheduler = {
                type: 'fairScheduler',
                capacity: 100,
                usedCapacity: 60,
                maxCapacity: 100,
                queueName: 'root',
                queues: { queue: [] },
            };

            expect(isCapacitySchedulerInfo(fairScheduler)).toBe(false);
        });
    });

    describe('isLeafQueue', () => {
        it('should identify leaf queues', () => {
            const leafQueue: QueueInfo = {
                queueType: 'leaf',
                capacity: 70,
                usedCapacity: 45.5,
                maxCapacity: 100,
                absoluteCapacity: 70,
                absoluteMaxCapacity: 100,
                absoluteUsedCapacity: 31.85,
                numApplications: 150,
                queueName: 'batch',
                queuePath: 'root.production.batch',
                state: 'RUNNING',
            };

            expect(isLeafQueue(leafQueue)).toBe(true);
        });

        it('should reject parent queues', () => {
            const parentQueue: QueueInfo = {
                queueType: 'parent',
                capacity: 100,
                usedCapacity: 60,
                maxCapacity: 100,
                absoluteCapacity: 100,
                absoluteMaxCapacity: 100,
                absoluteUsedCapacity: 60,
                numApplications: 500,
                queueName: 'root',
                queuePath: 'root',
                state: 'RUNNING',
                queues: { queue: [] },
            };

            expect(isLeafQueue(parentQueue)).toBe(false);
        });
    });

    describe('isParentQueue', () => {
        it('should identify parent queues', () => {
            const parentQueue: QueueInfo = {
                queueType: 'parent',
                capacity: 100,
                usedCapacity: 60,
                maxCapacity: 100,
                absoluteCapacity: 100,
                absoluteMaxCapacity: 100,
                absoluteUsedCapacity: 60,
                numApplications: 500,
                queueName: 'root',
                queuePath: 'root',
                state: 'RUNNING',
                queues: { queue: [] },
            };

            expect(isParentQueue(parentQueue)).toBe(true);
        });
    });

    describe('hasQueueChildren', () => {
        it('should detect queues with children', () => {
            const queueWithChildren = {
                queues: {
                    queue: [
                        { queueName: 'child1' },
                        { queueName: 'child2' },
                    ],
                },
            };

            expect(hasQueueChildren(queueWithChildren)).toBe(true);
        });

        it('should detect queues without children', () => {
            const emptyParent = {
                queues: { queue: [] },
            };

            expect(hasQueueChildren(emptyParent)).toBe(false);
        });

        it('should handle queues without queues property', () => {
            const leafQueue = {
                queueName: 'leaf',
            };

            expect(hasQueueChildren(leafQueue)).toBe(false);
        });
    });

    describe('isValidQueueName', () => {
        it('should accept valid queue names', () => {
            expect(isValidQueueName('production')).toBe(true);
            expect(isValidQueueName('prod-01')).toBe(true);
            expect(isValidQueueName('batch_jobs')).toBe(true);
            expect(isValidQueueName('GPU')).toBe(true);
            expect(isValidQueueName('a')).toBe(true);
        });

        it('should reject queue names with dots', () => {
            expect(isValidQueueName('prod.batch')).toBe(false);
            expect(isValidQueueName('.production')).toBe(false);
            expect(isValidQueueName('production.')).toBe(false);
        });

        it('should reject empty or invalid names', () => {
            expect(isValidQueueName('')).toBe(false);
            expect(isValidQueueName(' ')).toBe(false);
            expect(isValidQueueName('queue name')).toBe(false); // spaces not allowed
            expect(isValidQueueName('queue@special')).toBe(false);
        });
    });

    describe('isValidPropertyValue', () => {
        it('should validate number properties', () => {
            const descriptor = {
                type: 'number' as const,
                validationRules: [{
                    type: 'range' as const,
                    min: 0,
                    max: 100,
                    message: 'Must be between 0 and 100',
                }],
            };

            expect(isValidPropertyValue('50', descriptor)).toBe(true);
            expect(isValidPropertyValue('0', descriptor)).toBe(true);
            expect(isValidPropertyValue('100', descriptor)).toBe(true);
            expect(isValidPropertyValue('101', descriptor)).toBe(false);
            expect(isValidPropertyValue('-1', descriptor)).toBe(false);
            expect(isValidPropertyValue('abc', descriptor)).toBe(false);
        });

        it('should validate boolean properties', () => {
            const descriptor = { type: 'boolean' as const };

            expect(isValidPropertyValue('true', descriptor)).toBe(true);
            expect(isValidPropertyValue('false', descriptor)).toBe(true);
            expect(isValidPropertyValue('TRUE', descriptor)).toBe(true);
            expect(isValidPropertyValue('FALSE', descriptor)).toBe(true);
            expect(isValidPropertyValue('yes', descriptor)).toBe(false);
            expect(isValidPropertyValue('1', descriptor)).toBe(false);
        });

        it('should validate enum properties', () => {
            const descriptor = {
                type: 'enum' as const,
                enumValues: ['RUNNING', 'STOPPED', 'DRAINING'],
            };

            expect(isValidPropertyValue('RUNNING', descriptor)).toBe(true);
            expect(isValidPropertyValue('STOPPED', descriptor)).toBe(true);
            expect(isValidPropertyValue('PAUSED', descriptor)).toBe(false);
            expect(isValidPropertyValue('', descriptor)).toBe(false);
        });

        it('should validate string with pattern', () => {
            const descriptor = {
                type: 'string' as const,
                validationRules: [{
                    type: 'pattern' as const,
                    pattern: '^[a-zA-Z0-9_-]+$',
                    message: 'Invalid characters',
                }],
            };

            expect(isValidPropertyValue('valid_name-123', descriptor)).toBe(true);
            expect(isValidPropertyValue('invalid.name', descriptor)).toBe(false);
            expect(isValidPropertyValue('invalid name', descriptor)).toBe(false);
        });
    });

    describe('isGlobalProperty', () => {
        it('should identify global properties', () => {
            expect(isGlobalProperty('yarn.scheduler.capacity.maximum-applications')).toBe(true);
            expect(isGlobalProperty('yarn.scheduler.capacity.resource-calculator')).toBe(true);
            expect(isGlobalProperty('yarn.scheduler.capacity.maximum-am-resource-percent')).toBe(true);
        });

        it('should reject queue-specific properties', () => {
            expect(isGlobalProperty('yarn.scheduler.capacity.root.capacity')).toBe(false);
            expect(isGlobalProperty('yarn.scheduler.capacity.root.production.capacity')).toBe(false);
        });

        it('should reject invalid property names', () => {
            expect(isGlobalProperty('invalid.property')).toBe(false);
            expect(isGlobalProperty('yarn.scheduler.fair.property')).toBe(false);
        });
    });

    describe('isNodeLabelProperty', () => {
        it('should identify node label properties', () => {
            expect(isNodeLabelProperty('accessible-node-labels.gpu.capacity')).toBe(true);
            expect(isNodeLabelProperty('accessible-node-labels.fpga.maximum-capacity')).toBe(true);
            expect(isNodeLabelProperty('accessible-node-labels')).toBe(true);
        });

        it('should reject non-label properties', () => {
            expect(isNodeLabelProperty('capacity')).toBe(false);
            expect(isNodeLabelProperty('maximum-capacity')).toBe(false);
            expect(isNodeLabelProperty('node-labels.gpu')).toBe(false);
        });
    });

    describe('isResourceInfo', () => {
        it('should identify valid ResourceInfo objects', () => {
            const resource: ResourceInfo = {
                memory: 4096,
                vCores: 8,
            };

            expect(isResourceInfo(resource)).toBe(true);
        });

        it('should accept ResourceInfo with extended resources', () => {
            const extendedResource = {
                memory: 8192,
                vCores: 16,
                resourceInformations: {
                    'gpu': 4,
                    'fpga': 2,
                },
            };

            expect(isResourceInfo(extendedResource)).toBe(true);
        });

        it('should reject invalid resource objects', () => {
            expect(isResourceInfo({ memory: 4096 })).toBe(false); // missing vCores
            expect(isResourceInfo({ vCores: 8 })).toBe(false); // missing memory
            expect(isResourceInfo({ memory: '4096', vCores: 8 })).toBe(false); // wrong type
            expect(isResourceInfo(null)).toBe(false);
            expect(isResourceInfo({})).toBe(false);
        });
    });

    describe('isMutationError', () => {
        it('should identify mutation error objects', () => {
            const error = {
                RemoteException: {
                    exception: 'YarnException',
                    message: 'Configuration error',
                    javaClassName: 'org.apache.hadoop.yarn.exceptions.YarnException',
                },
            };

            expect(isMutationError(error)).toBe(true);
        });

        it('should reject invalid error objects', () => {
            expect(isMutationError({ error: 'message' })).toBe(false);
            expect(isMutationError({ RemoteException: {} })).toBe(false);
            expect(isMutationError(null)).toBe(false);
        });
    });
});