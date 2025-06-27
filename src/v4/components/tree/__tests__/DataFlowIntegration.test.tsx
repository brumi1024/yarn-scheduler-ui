import { describe, it, expect } from 'vitest';
import { transformQueueInfoToQueueNode } from '../../../store/transformQueueInfoToQueueNode';
import type { QueueInfo } from '../../../types';

describe('Data Flow Integration Test - API to Store Transform', () => {
    it('should correctly transform YARN API data including active/pending apps and resources', () => {
        // Mock YARN API response with all fields populated
        const mockRootQueue: QueueInfo = {
            type: 'capacityScheduler',
            capacity: 100,
            usedCapacity: 60,
            maxCapacity: 100,
            absoluteCapacity: 100,
            absoluteMaxCapacity: 100,
            absoluteUsedCapacity: 60,
            numApplications: 5,
            numActiveApplications: 3,
            numPendingApplications: 2,
            resourcesUsed: { memory: 8192, vCores: 8 },
            queueName: 'root',
            queuePath: 'root',
            state: 'RUNNING',
            queues: {
                queue: [
                    {
                        type: 'capacitySchedulerLeafQueueInfo',
                        capacity: 50,
                        usedCapacity: 80,
                        maxCapacity: 100,
                        absoluteCapacity: 50,
                        absoluteMaxCapacity: 100,
                        absoluteUsedCapacity: 40,
                        numApplications: 3,
                        numActiveApplications: 2,
                        numPendingApplications: 1,
                        resourcesUsed: { memory: 4096, vCores: 4 },
                        queueName: 'production',
                        queuePath: 'root.production',
                        state: 'RUNNING',
                    },
                    {
                        type: 'capacitySchedulerLeafQueueInfo',
                        capacity: 50,
                        usedCapacity: 40,
                        maxCapacity: 100,
                        absoluteCapacity: 50,
                        absoluteMaxCapacity: 100,
                        absoluteUsedCapacity: 20,
                        numApplications: 2,
                        numActiveApplications: 1,
                        numPendingApplications: 1,
                        resourcesUsed: { memory: 2048, vCores: 2 },
                        queueName: 'development',
                        queuePath: 'root.development',
                        state: 'RUNNING',
                    },
                ],
            },
        };

        const mockConfigData = new Map([
            ['yarn.scheduler.capacity.root.capacity', '100'],
            ['yarn.scheduler.capacity.root.maximum-capacity', '100'],
            ['yarn.scheduler.capacity.root.production.capacity', '50'],
            ['yarn.scheduler.capacity.root.production.maximum-capacity', '100'],
            ['yarn.scheduler.capacity.root.development.capacity', '50'],
            ['yarn.scheduler.capacity.root.development.maximum-capacity', '100'],
        ]);

        // Transform the data
        const queueTree = transformQueueInfoToQueueNode(mockRootQueue, mockConfigData);

        // Verify root node transformation
        expect(queueTree.path).toBe('root');
        expect(queueTree.name).toBe('root');
        expect(queueTree.type).toBe('parent');
        expect(queueTree.metrics).toEqual({
            usedCapacity: 60,
            absoluteUsedCapacity: 60,
            numApplications: 5,
            numActiveApplications: 3,
            numPendingApplications: 2,
            resourcesUsed: { memory: 8192, vCores: 8 },
        });

        // Verify properties extraction
        expect(queueTree.properties.get('capacity')).toBe('100');
        expect(queueTree.properties.get('maximum-capacity')).toBe('100');

        // Verify children
        expect(queueTree.children).toHaveLength(2);

        // Verify production queue transformation
        const productionQueue = queueTree.children.find(q => q.name === 'production');
        expect(productionQueue).toBeDefined();
        expect(productionQueue!.metrics).toEqual({
            usedCapacity: 80,
            absoluteUsedCapacity: 40,
            numApplications: 3,
            numActiveApplications: 2,
            numPendingApplications: 1,
            resourcesUsed: { memory: 4096, vCores: 4 },
        });

        // Verify development queue transformation
        const developmentQueue = queueTree.children.find(q => q.name === 'development');
        expect(developmentQueue).toBeDefined();
        expect(developmentQueue!.metrics).toEqual({
            usedCapacity: 40,
            absoluteUsedCapacity: 20,
            numApplications: 2,
            numActiveApplications: 1,
            numPendingApplications: 1,
            resourcesUsed: { memory: 2048, vCores: 2 },
        });
    });

    it('should handle queues with zero active/pending applications', () => {
        const queueWithZeroApps: QueueInfo = {
            type: 'capacityScheduler',
            capacity: 100,
            usedCapacity: 0,
            maxCapacity: 100,
            absoluteCapacity: 100,
            absoluteMaxCapacity: 100,
            absoluteUsedCapacity: 0,
            numApplications: 0,
            numActiveApplications: 0,
            numPendingApplications: 0,
            resourcesUsed: { memory: 0, vCores: 0 },
            queueName: 'root',
            queuePath: 'root',
            state: 'RUNNING',
            queues: {
                queue: [
                    {
                        type: 'capacitySchedulerLeafQueueInfo',
                        capacity: 100,
                        usedCapacity: 0,
                        maxCapacity: 100,
                        absoluteCapacity: 100,
                        absoluteMaxCapacity: 100,
                        absoluteUsedCapacity: 0,
                        numApplications: 0,
                        numActiveApplications: 0,
                        numPendingApplications: 0,
                        resourcesUsed: { memory: 0, vCores: 0 },
                        queueName: 'idle',
                        queuePath: 'root.idle',
                        state: 'RUNNING',
                    },
                ],
            },
        };

        const configData = new Map([
            ['yarn.scheduler.capacity.root.capacity', '100'],
            ['yarn.scheduler.capacity.root.idle.capacity', '100'],
        ]);

        const queueTree = transformQueueInfoToQueueNode(queueWithZeroApps, configData);

        // Verify root shows 0 for all metrics
        expect(queueTree.metrics).toEqual({
            usedCapacity: 0,
            absoluteUsedCapacity: 0,
            numApplications: 0,
            numActiveApplications: 0,
            numPendingApplications: 0,
            resourcesUsed: { memory: 0, vCores: 0 },
        });

        // Verify idle queue shows 0 for all metrics
        const idleQueue = queueTree.children[0];
        expect(idleQueue.metrics).toEqual({
            usedCapacity: 0,
            absoluteUsedCapacity: 0,
            numApplications: 0,
            numActiveApplications: 0,
            numPendingApplications: 0,
            resourcesUsed: { memory: 0, vCores: 0 },
        });
    });

    it('should handle missing resourcesUsed data gracefully', () => {
        const queueWithoutResources: QueueInfo = {
            type: 'capacityScheduler',
            capacity: 100,
            usedCapacity: 50,
            maxCapacity: 100,
            absoluteCapacity: 100,
            absoluteMaxCapacity: 100,
            absoluteUsedCapacity: 50,
            numApplications: 3,
            numActiveApplications: 2,
            numPendingApplications: 1,
            // resourcesUsed is optional and missing here
            queueName: 'root',
            queuePath: 'root',
            state: 'RUNNING',
            queues: {
                queue: [],
            },
        };

        const configData = new Map([
            ['yarn.scheduler.capacity.root.capacity', '100'],
        ]);

        const queueTree = transformQueueInfoToQueueNode(queueWithoutResources, configData);

        // Verify it uses default values when resourcesUsed is missing
        expect(queueTree.metrics?.resourcesUsed).toEqual({ memory: 0, vCores: 0 });
        expect(queueTree.metrics?.numActiveApplications).toBe(2);
        expect(queueTree.metrics?.numPendingApplications).toBe(1);
    });
});