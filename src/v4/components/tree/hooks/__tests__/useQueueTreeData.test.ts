import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useQueueTreeData } from '../useQueueTreeData';
import { useSchedulerStore } from '../../../../store/schedulerStore';
import type { QueueInfo, StagedChange, SchedulerInfo } from '../../../../types';

// Mock the scheduler store
vi.mock('../../../../store/schedulerStore');

describe('useQueueTreeData', () => {
    const mockSchedulerData: QueueInfo = {
        type: 'capacityScheduler',
        queuePath: 'root',
        queueName: 'root',
        capacity: 100,
        usedCapacity: 40,
        maxCapacity: 100,
        absoluteCapacity: 100,
        absoluteMaxCapacity: 100,
        absoluteUsedCapacity: 40,
        numApplications: 12,
        numActiveApplications: 9,
        numPendingApplications: 3,
        state: 'RUNNING',
        resourcesUsed: { memory: 40960, vCores: 40 },
        queues: {
            queue: [
                {
                    type: 'capacitySchedulerLeafQueueInfo',
                    queuePath: 'root.default',
                    queueName: 'default',
                    capacity: 30,
                    usedCapacity: 20,
                    maxCapacity: 100,
                    absoluteCapacity: 30,
                    absoluteMaxCapacity: 100,
                    absoluteUsedCapacity: 6,
                    numApplications: 2,
                    numActiveApplications: 1,
                    numPendingApplications: 1,
                    state: 'RUNNING',
                    resourcesUsed: { memory: 2048, vCores: 2 },
                },
                {
                    type: 'capacityScheduler',
                    queuePath: 'root.production',
                    queueName: 'production',
                    capacity: 70,
                    usedCapacity: 45,
                    maxCapacity: 100,
                    absoluteCapacity: 70,
                    absoluteMaxCapacity: 100,
                    absoluteUsedCapacity: 31.5,
                    numApplications: 10,
                    numActiveApplications: 8,
                    numPendingApplications: 2,
                    state: 'RUNNING',
                    resourcesUsed: { memory: 20480, vCores: 20 },
                    queues: {
                        queue: {
                            type: 'capacitySchedulerLeafQueueInfo',
                            queuePath: 'root.production.critical',
                            queueName: 'critical',
                            capacity: 50,
                            usedCapacity: 60,
                            maxCapacity: 80,
                            absoluteCapacity: 35,
                            absoluteMaxCapacity: 56,
                            absoluteUsedCapacity: 21,
                            numApplications: 5,
                            numActiveApplications: 5,
                            numPendingApplications: 0,
                            state: 'RUNNING',
                            resourcesUsed: { memory: 10240, vCores: 10 },
                        }
                    }
                }
            ]
        }
    };

    const mockStagedChanges: StagedChange[] = [
        {
            id: '1',
            type: 'update',
            queuePath: 'root.default',
            property: 'capacity',
            oldValue: '30',
            newValue: '40',
            timestamp: Date.now(),
        },
        {
            id: '2',
            type: 'add',
            queuePath: 'root.staging',
            property: 'capacity',
            newValue: '10',
            timestamp: Date.now(),
        },
    ];

    // Create a proper SchedulerInfo structure that contains the children queues
    const mockSchedulerInfo = {
        type: 'capacityScheduler',
        capacity: 100,
        usedCapacity: 40,
        maxCapacity: 100,
        queueName: 'root',
        queues: {
            queue: [
                // Extract the children from our mock data
                ...mockSchedulerData.queues?.queue || []
            ]
        },
        // Add some missing properties that might be needed
        capacities: {
            queueCapacitiesByPartition: [{
                absoluteCapacity: 100,
                absoluteMaxCapacity: 100,
                absoluteUsedCapacity: 40,
                capacity: 100,
                maxCapacity: 100,
                usedCapacity: 40,
                partitionName: ''
            }]
        }
    };

    const mockStoreState = {
        schedulerData: mockSchedulerInfo,
        stagedChanges: mockStagedChanges,
        isLoading: false,
        error: null,
    };

    // Helper function to find queue in tree
    const findQueueInTree = (queue: QueueInfo, targetPath: string): QueueInfo | null => {
        if (queue.queuePath === targetPath) {
            return queue;
        }
        
        if (queue.queues?.queue) {
            const children = Array.isArray(queue.queues.queue) 
                ? queue.queues.queue 
                : [queue.queues.queue];
            
            for (const child of children) {
                const found = findQueueInTree(child, targetPath);
                if (found) return found;
            }
        }
        
        return null;
    };

    // Mock the getState method with getQueueByPath and getQueueDisplayValue
    (useSchedulerStore as any).getState = () => ({
        getQueueByPath: (path: string) => findQueueInTree(mockSchedulerData, path),
        getQueueDisplayValue: (queuePath: string, property: string) => {
            // Check staged changes first
            const stagedChange = mockStagedChanges.find(
                c => c.queuePath === queuePath && c.property === property
            );
            
            if (stagedChange?.newValue !== undefined) {
                return {
                    value: stagedChange.newValue,
                    isStaged: true,
                };
            }
            
            // Fallback to config data (simplified for test)
            if (property === 'capacity') {
                const queue = findQueueInTree(mockSchedulerData, queuePath);
                return {
                    value: queue?.capacity.toString() || '0',
                    isStaged: false,
                };
            }
            if (property === 'maximum-capacity') {
                const queue = findQueueInTree(mockSchedulerData, queuePath);
                return {
                    value: queue?.maxCapacity.toString() || '100',
                    isStaged: false,
                };
            }
            
            return {
                value: '',
                isStaged: false,
            };
        },
    });

    it('should return nodes and edges for queue tree', () => {
        // Mock individual selector calls
        (useSchedulerStore as any).mockImplementation((selector: any) => {
            const state = mockStoreState;
            return selector ? selector(state) : state;
        });

        const { result } = renderHook(() => useQueueTreeData());

        expect(result.current.nodes).toHaveLength(4); // root + 3 child nodes
        expect(result.current.edges).toHaveLength(3); // 3 parent-child connections
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBeNull();
    });

    it('should transform queue nodes to React Flow nodes', () => {
        (useSchedulerStore as any).mockImplementation((selector: any) => {
            const state = mockStoreState;
            return selector ? selector(state) : state;
        });

        const { result } = renderHook(() => useQueueTreeData());

        const rootNode = result.current.nodes.find(n => n.id === 'root');
        expect(rootNode).toBeDefined();
        expect(rootNode?.type).toBe('queueCard');
        expect(rootNode?.data).toMatchObject({
            queuePath: 'root',
            queueName: 'root',
            capacity: 100,
            maxCapacity: 100,
            state: 'RUNNING',
            usedCapacity: 40,
            numApplications: 0, // Root queue typically doesn't run applications directly
            isLeaf: false,
            capacityConfig: '100',
            maxCapacityConfig: '100',
        });
    });

    it('should create edges between parent and child nodes', () => {
        (useSchedulerStore as any).mockImplementation((selector: any) => {
            const state = mockStoreState;
            return selector ? selector(state) : state;
        });

        const { result } = renderHook(() => useQueueTreeData());

        const rootToDefault = result.current.edges.find(e => 
            e.source === 'root' && e.target === 'root.default'
        );
        expect(rootToDefault).toBeDefined();
        expect(rootToDefault?.type).toBe('sankeyFlow');
        expect(rootToDefault?.data.capacity).toBe(30);
    });

    it('should mark nodes with staged changes', () => {
        (useSchedulerStore as any).mockImplementation((selector: any) => {
            const state = mockStoreState;
            return selector ? selector(state) : state;
        });

        const { result } = renderHook(() => useQueueTreeData());

        const defaultNode = result.current.nodes.find(n => n.id === 'root.default');
        expect(defaultNode?.data.stagedStatus).toBe('modified');
    });

    it('should handle nodes marked for addition', () => {
        const changesWithAddition = [
            ...mockStagedChanges,
            {
                id: '3',
                type: 'add' as const,
                queuePath: 'root.newqueue',
                property: undefined,
                newValue: undefined,
                timestamp: Date.now(),
            },
        ];

        (useSchedulerStore as any).mockImplementation((selector: any) => {
            const state = { ...mockStoreState, stagedChanges: changesWithAddition };
            return selector ? selector(state) : state;
        });

        const { result } = renderHook(() => useQueueTreeData());

        // Should create a placeholder node for the new queue
        const newQueueNode = result.current.nodes.find(n => n.id === 'root.newqueue');
        expect(newQueueNode).toBeDefined();
        expect(newQueueNode?.data.stagedStatus).toBe('new');
    });

    it('should return empty arrays when no scheduler data', () => {
        (useSchedulerStore as any).mockImplementation((selector: any) => {
            const state = { ...mockStoreState, schedulerData: null };
            return selector ? selector(state) : state;
        });

        const { result } = renderHook(() => useQueueTreeData());

        expect(result.current.nodes).toHaveLength(0);
        expect(result.current.edges).toHaveLength(0);
    });

    it('should handle loading state', () => {
        (useSchedulerStore as any).mockImplementation((selector: any) => {
            const state = { ...mockStoreState, isLoading: true };
            return selector ? selector(state) : state;
        });

        const { result } = renderHook(() => useQueueTreeData());

        expect(result.current.isLoading).toBe(true);
        expect(result.current.nodes).toHaveLength(0);
        expect(result.current.edges).toHaveLength(0);
    });

    it('should handle error state', () => {
        const errorMessage = 'Failed to load data';
        (useSchedulerStore as any).mockImplementation((selector: any) => {
            const state = { ...mockStoreState, error: errorMessage };
            return selector ? selector(state) : state;
        });

        const { result } = renderHook(() => useQueueTreeData());

        expect(result.current.error).toBe(errorMessage);
    });

    it('should position nodes using layout algorithm', () => {
        (useSchedulerStore as any).mockImplementation((selector: any) => {
            const state = mockStoreState;
            return selector ? selector(state) : state;
        });

        const { result } = renderHook(() => useQueueTreeData());

        // All nodes should have positions
        result.current.nodes.forEach(node => {
            expect(node.position).toBeDefined();
            expect(typeof node.position.x).toBe('number');
            expect(typeof node.position.y).toBe('number');
        });

        // Check relative positions (parent should be to the left of children in horizontal layout)
        const rootNode = result.current.nodes.find(n => n.id === 'root');
        const defaultNode = result.current.nodes.find(n => n.id === 'root.default');
        
        expect(rootNode!.position.x).toBeLessThan(defaultNode!.position.x);
    });

    it('should calculate capacity flow data for edges', () => {
        (useSchedulerStore as any).mockImplementation((selector: any) => {
            const state = mockStoreState;
            return selector ? selector(state) : state;
        });

        const { result } = renderHook(() => useQueueTreeData());

        const edge = result.current.edges[0];
        expect(edge.data).toBeDefined();
        expect(edge.data.capacity).toBeDefined();
        expect(edge.data.targetState).toBeDefined();
    });

    it('should show staged values in queue card data', () => {
        (useSchedulerStore as any).mockImplementation((selector: any) => {
            const state = mockStoreState;
            return selector ? selector(state) : state;
        });

        const { result } = renderHook(() => useQueueTreeData());

        // root.default has a staged capacity change from 30 to 40
        const defaultNode = result.current.nodes.find(n => n.id === 'root.default');
        expect(defaultNode).toBeDefined();
        expect(defaultNode!.data.capacity).toBe(30); // Should show LIVE DATA, not staged config
        expect(defaultNode!.data.capacityConfig).toBe('40'); // Should show staged value in config string
        expect(defaultNode!.data.stagedStatus).toBe('modified');

        // root.production should show original values (no staged changes)
        const productionNode = result.current.nodes.find(n => n.id === 'root.production');
        expect(productionNode).toBeDefined();
        expect(productionNode!.data.capacity).toBe(70); // Should show live data
        expect(productionNode!.data.capacityConfig).toBe('70'); // Should show original config string
        expect(productionNode!.data.stagedStatus).toBeUndefined();
    });
});