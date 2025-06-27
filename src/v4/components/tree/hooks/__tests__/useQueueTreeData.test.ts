import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useQueueTreeData } from '../useQueueTreeData';
import { useSchedulerStore } from '../../../../store/schedulerStore';
import type { QueueNode, StagedChange } from '../../../../types';

// Mock the scheduler store
vi.mock('../../../../store/schedulerStore');

describe('useQueueTreeData', () => {
    const mockQueueTree: QueueNode = {
        path: 'root',
        name: 'root',
        type: 'parent',
        properties: new Map([
            ['capacity', '100'],
            ['maximum-capacity', '100'],
            ['state', 'RUNNING'],
        ]),
        children: [
            {
                path: 'root.default',
                name: 'default',
                type: 'leaf',
                properties: new Map([
                    ['capacity', '30'],
                    ['maximum-capacity', '100'],
                    ['state', 'RUNNING'],
                ]),
                children: [],
                labelConfigs: new Map(),
                metrics: {
                    usedCapacity: 20,
                    absoluteUsedCapacity: 6,
                    numApplications: 2,
                    numActiveApplications: 1,
                    numPendingApplications: 1,
                    resourcesUsed: { memory: 2048, vCores: 2 },
                },
            },
            {
                path: 'root.production',
                name: 'production',
                type: 'parent',
                properties: new Map([
                    ['capacity', '70'],
                    ['maximum-capacity', '100'],
                    ['state', 'RUNNING'],
                ]),
                children: [
                    {
                        path: 'root.production.critical',
                        name: 'critical',
                        type: 'leaf',
                        properties: new Map([
                            ['capacity', '50'],
                            ['maximum-capacity', '80'],
                            ['state', 'RUNNING'],
                        ]),
                        children: [],
                        labelConfigs: new Map(),
                        metrics: {
                            usedCapacity: 60,
                            absoluteUsedCapacity: 21,
                            numApplications: 5,
                            numActiveApplications: 5,
                            numPendingApplications: 0,
                            resourcesUsed: { memory: 10240, vCores: 10 },
                        },
                    },
                ],
                labelConfigs: new Map(),
                metrics: {
                    usedCapacity: 45,
                    absoluteUsedCapacity: 31.5,
                    numApplications: 10,
                    numActiveApplications: 8,
                    numPendingApplications: 2,
                    resourcesUsed: { memory: 20480, vCores: 20 },
                },
            },
        ],
        labelConfigs: new Map(),
        metrics: {
            usedCapacity: 40,
            absoluteUsedCapacity: 40,
            numApplications: 12,
            numActiveApplications: 9,
            numPendingApplications: 3,
            resourcesUsed: { memory: 40960, vCores: 40 },
        },
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

    const mockStoreState = {
        queueTree: mockQueueTree,
        stagedChanges: mockStagedChanges,
        isLoading: false,
        error: null,
    };

    // Create a mock for the QueueInfo data that matches the queue tree structure
    const mockQueueInfoMap = new Map([
        ['root', { capacity: 100, maxCapacity: 100, usedCapacity: 40, absoluteUsedCapacity: 40, numApplications: 12 }],
        ['root.default', { capacity: 30, maxCapacity: 100, usedCapacity: 20, absoluteUsedCapacity: 6, numApplications: 2 }],
        ['root.production', { capacity: 70, maxCapacity: 100, usedCapacity: 45, absoluteUsedCapacity: 31.5, numApplications: 10 }],
        ['root.production.critical', { capacity: 50, maxCapacity: 80, usedCapacity: 60, absoluteUsedCapacity: 21, numApplications: 5 }],
    ]);

    // Mock the getState method with getQueueByPath
    (useSchedulerStore as any).getState = () => ({
        getQueueByPath: (path: string) => mockQueueInfoMap.get(path),
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
            numApplications: 12,
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

    it('should return empty arrays when no queue tree', () => {
        (useSchedulerStore as any).mockImplementation((selector: any) => {
            const state = { ...mockStoreState, queueTree: null };
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
});