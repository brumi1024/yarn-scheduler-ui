import { describe, it, expect } from 'vitest';
import { transformQueueInfoToQueueNode } from '../transformQueueInfoToQueueNode';
import type { QueueInfo, QueueNode } from '../../types';

describe('transformQueueInfoToQueueNode', () => {
    it('should transform a leaf queue correctly', () => {
        const queueInfo: QueueInfo = {
            type: 'capacitySchedulerLeafQueueInfo',
            capacity: 30,
            usedCapacity: 10,
            maxCapacity: 100,
            absoluteCapacity: 30,
            absoluteMaxCapacity: 100,
            absoluteUsedCapacity: 10,
            numApplications: 5,
            queueName: 'default',
            queuePath: 'root.default',
            state: 'RUNNING',
        };

        const configData = new Map([
            ['yarn.scheduler.capacity.root.default.capacity', '30'],
            ['yarn.scheduler.capacity.root.default.maximum-capacity', '100'],
            ['yarn.scheduler.capacity.root.default.state', 'RUNNING'],
            ['yarn.scheduler.capacity.root.default.user-limit-factor', '1'],
        ]);

        const result = transformQueueInfoToQueueNode(queueInfo, configData);

        expect(result).toEqual<QueueNode>({
            path: 'root.default',
            name: 'default',
            type: 'leaf',
            properties: new Map([
                ['capacity', '30'],
                ['maximum-capacity', '100'],
                ['state', 'RUNNING'],
                ['user-limit-factor', '1'],
            ]),
            children: [],
            metrics: {
                usedCapacity: 10,
                absoluteUsedCapacity: 10,
                numApplications: 5,
                numActiveApplications: 0,
                numPendingApplications: 0,
                resourcesUsed: { memory: 0, vCores: 0 },
            },
            labelConfigs: new Map(),
        });
    });

    it('should transform a parent queue with children correctly', () => {
        const queueInfo: QueueInfo = {
            type: 'capacityScheduler',
            capacity: 100,
            usedCapacity: 45,
            maxCapacity: 100,
            absoluteCapacity: 100,
            absoluteMaxCapacity: 100,
            absoluteUsedCapacity: 45,
            numApplications: 10,
            queueName: 'root',
            queuePath: 'root',
            state: 'RUNNING',
            queues: {
                queue: [
                    {
                        type: 'capacitySchedulerLeafQueueInfo',
                        capacity: 30,
                        usedCapacity: 10,
                        maxCapacity: 100,
                        absoluteCapacity: 30,
                        absoluteMaxCapacity: 100,
                        absoluteUsedCapacity: 10,
                        numApplications: 2,
                        queueName: 'default',
                        queuePath: 'root.default',
                        state: 'RUNNING',
                    },
                    {
                        type: 'capacityScheduler',
                        capacity: 70,
                        usedCapacity: 35,
                        maxCapacity: 100,
                        absoluteCapacity: 70,
                        absoluteMaxCapacity: 100,
                        absoluteUsedCapacity: 35,
                        numApplications: 8,
                        queueName: 'production',
                        queuePath: 'root.production',
                        state: 'RUNNING',
                        queues: {
                            queue: [],
                        },
                    },
                ],
            },
        };

        const configData = new Map([
            ['yarn.scheduler.capacity.root.capacity', '100'],
            ['yarn.scheduler.capacity.root.maximum-capacity', '100'],
            ['yarn.scheduler.capacity.root.state', 'RUNNING'],
            ['yarn.scheduler.capacity.root.default.capacity', '30'],
            ['yarn.scheduler.capacity.root.default.maximum-capacity', '100'],
            ['yarn.scheduler.capacity.root.default.state', 'RUNNING'],
            ['yarn.scheduler.capacity.root.production.capacity', '70'],
            ['yarn.scheduler.capacity.root.production.maximum-capacity', '100'],
            ['yarn.scheduler.capacity.root.production.state', 'RUNNING'],
        ]);

        const result = transformQueueInfoToQueueNode(queueInfo, configData);

        expect(result.path).toBe('root');
        expect(result.name).toBe('root');
        expect(result.type).toBe('parent');
        expect(result.children).toHaveLength(2);
        expect(result.children[0].name).toBe('default');
        expect(result.children[1].name).toBe('production');
        expect(result.properties.get('capacity')).toBe('100');
        expect(result.metrics?.numApplications).toBe(10);
    });

    it('should handle label configurations', () => {
        const queueInfo: QueueInfo = {
            type: 'capacitySchedulerLeafQueueInfo',
            capacity: 100,
            usedCapacity: 0,
            maxCapacity: 100,
            absoluteCapacity: 100,
            absoluteMaxCapacity: 100,
            absoluteUsedCapacity: 0,
            numApplications: 0,
            queueName: 'gpu-jobs',
            queuePath: 'root.gpu-jobs',
            state: 'RUNNING',
        };

        const configData = new Map([
            ['yarn.scheduler.capacity.root.gpu-jobs.capacity', '100'],
            ['yarn.scheduler.capacity.root.gpu-jobs.accessible-node-labels', 'gpu,cpu'],
            ['yarn.scheduler.capacity.root.gpu-jobs.accessible-node-labels.gpu.capacity', '80'],
            ['yarn.scheduler.capacity.root.gpu-jobs.accessible-node-labels.gpu.maximum-capacity', '100'],
            ['yarn.scheduler.capacity.root.gpu-jobs.accessible-node-labels.cpu.capacity', '20'],
            ['yarn.scheduler.capacity.root.gpu-jobs.accessible-node-labels.cpu.maximum-capacity', '50'],
        ]);

        const result = transformQueueInfoToQueueNode(queueInfo, configData);

        expect(result.properties.get('accessible-node-labels')).toBe('gpu,cpu');
        expect(result.labelConfigs.size).toBe(2);
        expect(result.labelConfigs.get('gpu')).toEqual({
            capacity: 80,
            maximumCapacity: 100,
        });
        expect(result.labelConfigs.get('cpu')).toEqual({
            capacity: 20,
            maximumCapacity: 50,
        });
    });

    it('should handle missing config data gracefully', () => {
        const queueInfo: QueueInfo = {
            type: 'capacitySchedulerLeafQueueInfo',
            capacity: 30,
            usedCapacity: 0,
            maxCapacity: 100,
            absoluteCapacity: 30,
            absoluteMaxCapacity: 100,
            absoluteUsedCapacity: 0,
            numApplications: 0,
            queueName: 'test',
            queuePath: 'root.test',
            state: 'RUNNING',
        };

        const configData = new Map(); // Empty config

        const result = transformQueueInfoToQueueNode(queueInfo, configData);

        expect(result.path).toBe('root.test');
        expect(result.name).toBe('test');
        expect(result.type).toBe('leaf');
        expect(result.properties.size).toBe(0);
        expect(result.labelConfigs.size).toBe(0);
    });

    it('should determine queue type correctly', () => {
        const leafQueue: QueueInfo = {
            type: 'capacitySchedulerLeafQueueInfo',
            capacity: 100,
            usedCapacity: 0,
            maxCapacity: 100,
            absoluteCapacity: 100,
            absoluteMaxCapacity: 100,
            absoluteUsedCapacity: 0,
            numApplications: 0,
            queueName: 'leaf',
            queuePath: 'root.leaf',
            state: 'RUNNING',
        };

        const parentQueueWithChildren: QueueInfo = {
            type: 'capacityScheduler',
            capacity: 100,
            usedCapacity: 0,
            maxCapacity: 100,
            absoluteCapacity: 100,
            absoluteMaxCapacity: 100,
            absoluteUsedCapacity: 0,
            numApplications: 0,
            queueName: 'parent',
            queuePath: 'root.parent',
            state: 'RUNNING',
            queues: {
                queue: [leafQueue],
            },
        };

        const parentQueueEmpty: QueueInfo = {
            type: 'capacityScheduler',
            capacity: 100,
            usedCapacity: 0,
            maxCapacity: 100,
            absoluteCapacity: 100,
            absoluteMaxCapacity: 100,
            absoluteUsedCapacity: 0,
            numApplications: 0,
            queueName: 'empty-parent',
            queuePath: 'root.empty-parent',
            state: 'RUNNING',
            queues: {
                queue: [],
            },
        };

        const configData = new Map();

        const leafResult = transformQueueInfoToQueueNode(leafQueue, configData);
        const parentResult = transformQueueInfoToQueueNode(parentQueueWithChildren, configData);
        const emptyParentResult = transformQueueInfoToQueueNode(parentQueueEmpty, configData);

        expect(leafResult.type).toBe('leaf');
        expect(parentResult.type).toBe('parent');
        expect(emptyParentResult.type).toBe('parent'); // Even empty parents are 'parent' type
    });
});