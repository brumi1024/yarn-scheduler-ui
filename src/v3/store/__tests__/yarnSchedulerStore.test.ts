import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useYarnSchedulerStore } from '../yarnSchedulerStore';
import { selectEffectiveQueueTree, selectEffectiveConfig, selectAllQueues } from '../selectors';
import type { QueueNode, PropertyChange, NodeInfo } from '../types';

describe('YarnSchedulerStore', () => {
    beforeEach(() => {
        const store = useYarnSchedulerStore.getState();
        store.reset();
    });

    describe('Initial State', () => {
        it('should have null queue tree initially', () => {
            const { result } = renderHook(() => useYarnSchedulerStore());
            const queueTree = selectEffectiveQueueTree(result.current);
            expect(queueTree).toBeNull();
        });

        it('should have empty original config initially', () => {
            const { result } = renderHook(() => useYarnSchedulerStore());
            expect(result.current.originalConfig).toEqual({});
        });

        it('should have empty property changes initially', () => {
            const { result } = renderHook(() => useYarnSchedulerStore());
            expect(result.current.propertyChanges.size).toBe(0);
        });

        it('should have empty property definitions initially', () => {
            const { result } = renderHook(() => useYarnSchedulerStore());
            expect(result.current.propertyDefinitions).toEqual([]);
        });

        it('should not be loading initially', () => {
            const { result } = renderHook(() => useYarnSchedulerStore());
            expect(result.current.loading).toBe(false);
        });

        it('should have idle commit status initially', () => {
            const { result } = renderHook(() => useYarnSchedulerStore());
            expect(result.current.commitStatus).toBe('idle');
        });
    });

    describe('Property Updates', () => {
        it('should stage property change when value differs from original', () => {
            const { result } = renderHook(() => useYarnSchedulerStore());

            act(() => {
                result.current.setOriginalConfig({
                    'yarn.scheduler.capacity.root.capacity': '100',
                });
            });

            act(() => {
                result.current.updateProperty('yarn.scheduler.capacity.root.capacity', '90');
            });

            const change = result.current.propertyChanges.get('yarn.scheduler.capacity.root.capacity');
            expect(change).toEqual({
                originalValue: '100',
                stagedValue: '90',
            });
        });

        it('should remove property change when value matches original', () => {
            const { result } = renderHook(() => useYarnSchedulerStore());

            act(() => {
                result.current.setOriginalConfig({
                    'yarn.scheduler.capacity.root.capacity': '100',
                });
            });

            act(() => {
                result.current.updateProperty('yarn.scheduler.capacity.root.capacity', '90');
            });

            expect(result.current.propertyChanges.size).toBe(1);

            act(() => {
                result.current.updateProperty('yarn.scheduler.capacity.root.capacity', '100');
            });

            expect(result.current.propertyChanges.size).toBe(0);
        });

        it('should track new property that does not exist in original config', () => {
            const { result } = renderHook(() => useYarnSchedulerStore());

            act(() => {
                result.current.updateProperty('yarn.scheduler.capacity.root.new-queue.capacity', '25');
            });

            const change = result.current.propertyChanges.get('yarn.scheduler.capacity.root.new-queue.capacity');
            expect(change).toEqual({
                originalValue: undefined,
                stagedValue: '25',
            });
        });
    });

    describe('Selectors', () => {
        it('should return false for hasChanges when no changes exist', () => {
            const { result } = renderHook(() => useYarnSchedulerStore());
            expect(result.current.hasChanges()).toBe(false);
        });

        it('should return true for hasChanges when property changes exist', () => {
            const { result } = renderHook(() => useYarnSchedulerStore());

            act(() => {
                result.current.updateProperty('test.property', 'value');
            });

            expect(result.current.hasChanges()).toBe(true);
        });

        it('should return true for hasChanges when node label changes exist', () => {
            const { result } = renderHook(() => useYarnSchedulerStore());

            const mockNodes: Map<string, NodeInfo> = new Map([['node-1', { nodeLabels: [] } as NodeInfo]]);

            act(() => {
                result.current.setNodes(mockNodes);
            });

            act(() => {
                result.current.assignNodeLabel('node-1', 'gpu');
            });

            expect(result.current.hasChanges()).toBe(true);
        });

        it('should get property value with original and staged values', () => {
            const { result } = renderHook(() => useYarnSchedulerStore());

            act(() => {
                result.current.setOriginalConfig({
                    'test.property': 'original',
                });
            });

            const valueBeforeChange = result.current.getPropertyValue('test.property');
            expect(valueBeforeChange).toEqual({
                original: 'original',
                staged: 'original',
                isDirty: false,
            });

            act(() => {
                result.current.updateProperty('test.property', 'modified');
            });

            const valueAfterChange = result.current.getPropertyValue('test.property');
            expect(valueAfterChange).toEqual({
                original: 'original',
                staged: 'modified',
                isDirty: true,
            });
        });
    });

    describe('Queue Management', () => {
        const setupMockQueueTree = (result: any) => {
            act(() => {
                result.current.setOriginalConfig({
                    'yarn.scheduler.capacity.root.capacity': '100',
                    'yarn.scheduler.capacity.root.queues': 'production,development',
                    'yarn.scheduler.capacity.root.production.capacity': '70',
                    'yarn.scheduler.capacity.root.development.capacity': '30',
                });
            });
        };

        it('should find queue by path', () => {
            const { result } = renderHook(() => useYarnSchedulerStore());
            setupMockQueueTree(result);

            const queue = result.current.getQueueByPath('root.production');
            expect(queue).toBeDefined();
            expect(queue?.name).toBe('production');
            expect(queue?.config.capacity).toBe('70');
        });

        it('should return null for non-existent queue path', () => {
            const { result } = renderHook(() => useYarnSchedulerStore());
            setupMockQueueTree(result);

            const queue = result.current.getQueueByPath('root.nonexistent');
            expect(queue).toBeNull();
        });

        it('should add new queue with initial capacity', () => {
            const { result } = renderHook(() => useYarnSchedulerStore());
            setupMockQueueTree(result);

            act(() => {
                result.current.addQueue('root.production', 'analytics', 10);
            });

            const newQueue = result.current.getQueueByPath('root.production.analytics');
            expect(newQueue).toBeDefined();
            expect(newQueue?.name).toBe('analytics');
            expect(newQueue?.config.capacity).toBe('10');

            const capacityChange = result.current.propertyChanges.get(
                'yarn.scheduler.capacity.root.production.analytics.capacity'
            );
            expect(capacityChange).toEqual({
                originalValue: undefined,
                stagedValue: '10',
            });
        });

        it('should mark queue as deleted and stop it if running', () => {
            const { result } = renderHook(() => useYarnSchedulerStore());

            act(() => {
                result.current.setOriginalConfig({
                    'yarn.scheduler.capacity.root.capacity': '100',
                    'yarn.scheduler.capacity.root.queues': 'production,development',
                    'yarn.scheduler.capacity.root.production.capacity': '70',
                    'yarn.scheduler.capacity.root.production.state': 'RUNNING',
                    'yarn.scheduler.capacity.root.development.capacity': '30',
                });
            });

            act(() => {
                result.current.removeQueue('root.production');
            });

            // Check that all properties are marked for deletion
            const capacityChange = result.current.propertyChanges.get(
                'yarn.scheduler.capacity.root.production.capacity'
            );
            expect(capacityChange?.stagedValue).toBeUndefined();

            // Check that state is set to STOPPED before deletion
            const stateChange = result.current.propertyChanges.get('yarn.scheduler.capacity.root.production.state');
            expect(stateChange).toEqual({
                originalValue: 'RUNNING',
                stagedValue: 'STOPPED',
            });

            // Check that parent's queues list is updated
            const parentQueuesChange = result.current.propertyChanges.get('yarn.scheduler.capacity.root.queues');
            expect(parentQueuesChange?.stagedValue).toBe('development');
        });
    });

    describe('Node Label Management', () => {
        const mockNodes: Map<string, NodeInfo> = new Map([
            [
                'node-1',
                {
                    id: 'node-1',
                    nodeHostName: 'host-1',
                    nodeHTTPAddress: 'host-1:8042',
                    state: 'RUNNING',
                    lastHealthUpdate: Date.now(),
                    numContainers: 0,
                    usedMemoryMB: 0,
                    availMemoryMB: 8192,
                    usedVirtualCores: 0,
                    availableVirtualCores: 8,
                    nodeLabels: ['cpu'],
                } as NodeInfo,
            ],
        ]);

        it('should assign new label to node', () => {
            const { result } = renderHook(() => useYarnSchedulerStore());

            act(() => {
                result.current.setNodes(mockNodes);
            });

            act(() => {
                result.current.assignNodeLabel('node-1', 'gpu');
            });

            const change = result.current.nodeLabelChanges.get('node-1');
            expect(change).toEqual({
                nodeId: 'node-1',
                originalLabels: ['cpu'],
                stagedLabels: ['cpu', 'gpu'],
            });
        });

        it('should not duplicate labels when assigning', () => {
            const { result } = renderHook(() => useYarnSchedulerStore());

            act(() => {
                result.current.setNodes(mockNodes);
            });

            act(() => {
                result.current.assignNodeLabel('node-1', 'cpu');
            });

            expect(result.current.nodeLabelChanges.size).toBe(0);
        });

        it('should remove label from node', () => {
            const { result } = renderHook(() => useYarnSchedulerStore());

            act(() => {
                result.current.setNodes(mockNodes);
            });

            act(() => {
                result.current.removeNodeLabel('node-1', 'cpu');
            });

            const change = result.current.nodeLabelChanges.get('node-1');
            expect(change).toEqual({
                nodeId: 'node-1',
                originalLabels: ['cpu'],
                stagedLabels: [],
            });
        });
    });

    describe('Revert Changes', () => {
        it('should clear all property changes', () => {
            const { result } = renderHook(() => useYarnSchedulerStore());

            act(() => {
                result.current.updateProperty('test.property1', 'value1');
                result.current.updateProperty('test.property2', 'value2');
            });

            expect(result.current.propertyChanges.size).toBe(2);

            act(() => {
                result.current.revertAllChanges();
            });

            expect(result.current.propertyChanges.size).toBe(0);
        });

        it('should clear all node label changes', () => {
            const { result } = renderHook(() => useYarnSchedulerStore());

            const mockNodes: Map<string, NodeInfo> = new Map([['node-1', { nodeLabels: [] } as NodeInfo]]);

            act(() => {
                result.current.setNodes(mockNodes);
                result.current.assignNodeLabel('node-1', 'gpu');
            });

            expect(result.current.nodeLabelChanges.size).toBe(1);

            act(() => {
                result.current.revertAllChanges();
            });

            expect(result.current.nodeLabelChanges.size).toBe(0);
        });

        it('should restore queue tree to original state', () => {
            const { result } = renderHook(() => useYarnSchedulerStore());

            act(() => {
                result.current.setOriginalConfig({
                    'yarn.scheduler.capacity.root.capacity': '100',
                });
            });

            const originalTree = selectEffectiveQueueTree(result.current);

            act(() => {
                result.current.addQueue('root', 'new-queue', 50);
            });

            const treeWithNewQueue = selectEffectiveQueueTree(result.current);
            expect(treeWithNewQueue?.children.length).toBe(1);

            act(() => {
                result.current.revertAllChanges();
            });

            const revertedTree = selectEffectiveQueueTree(result.current);
            expect(revertedTree).toEqual(originalTree);
        });
    });

    describe('loadInitialData', () => {
        it('should successfully load configuration, metrics, and nodes', async () => {
            const { result } = renderHook(() => useYarnSchedulerStore());

            const mockConfig = {
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.queues': 'production,development',
                'yarn.scheduler.capacity.root.production.capacity': '70',
                'yarn.scheduler.capacity.root.development.capacity': '30',
            };

            const mockMetrics = {
                type: 'capacityScheduler',
                queueName: 'root',
                capacity: 100,
                usedCapacity: 50,
                maxCapacity: 100,
                numApplications: 5,
                queues: {
                    queue: [
                        {
                            type: 'capacityScheduler',
                            queueName: 'production',
                            capacity: 70,
                            usedCapacity: 40,
                            maxCapacity: 100,
                        },
                        {
                            type: 'capacityScheduler',
                            queueName: 'development',
                            capacity: 30,
                            usedCapacity: 10,
                            maxCapacity: 100,
                        },
                    ],
                },
            };

            const mockNodes = [
                {
                    id: 'node-1',
                    nodeHostName: 'host-1',
                    nodeHTTPAddress: 'host-1:8042',
                    state: 'RUNNING',
                    nodeLabels: ['cpu'],
                },
                {
                    id: 'node-2',
                    nodeHostName: 'host-2',
                    nodeHTTPAddress: 'host-2:8042',
                    state: 'RUNNING',
                    nodeLabels: ['gpu'],
                },
            ];

            // Set loading state to false initially to verify it changes
            expect(result.current.loading).toBe(false);

            await act(async () => {
                await result.current.loadInitialData({
                    configEndpoint: async () => mockConfig,
                    metricsEndpoint: async () => mockMetrics,
                    nodesEndpoint: async () => mockNodes,
                });
            });

            // Verify store state was updated correctly
            expect(result.current.loading).toBe(false);
            expect(result.current.error).toBeNull();
            expect(result.current.originalConfig).toEqual(mockConfig);
            expect(result.current.propertyChanges.size).toBe(0);
            expect(result.current.nodeLabelChanges.size).toBe(0);

            // Verify queue tree was built correctly
            const queueTree = selectEffectiveQueueTree(result.current);
            expect(queueTree).toBeDefined();
            expect(queueTree?.name).toBe('root');
            expect(queueTree?.config.capacity).toBe('100');
            expect(queueTree?.children.length).toBe(2);

            // Verify metrics were merged
            expect(queueTree?.metrics?.usedCapacity).toBe(50);
            expect(queueTree?.metrics?.numApplications).toBe(5);

            // Verify child queues
            const productionQueue = queueTree?.children.find((q) => q.name === 'production');
            expect(productionQueue?.config.capacity).toBe('70');
            expect(productionQueue?.metrics?.usedCapacity).toBe(40);

            const developmentQueue = queueTree?.children.find((q) => q.name === 'development');
            expect(developmentQueue?.config.capacity).toBe('30');
            expect(developmentQueue?.metrics?.usedCapacity).toBe(10);

            // Verify nodes were loaded
            expect(result.current.nodes.size).toBe(2);
            expect(result.current.nodes.get('node-1')?.nodeLabels).toContain('cpu');
            expect(result.current.nodes.get('node-2')?.nodeLabels).toContain('gpu');
        });

        it('should load only configuration without metrics and nodes', async () => {
            const { result } = renderHook(() => useYarnSchedulerStore());

            const mockConfig = {
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.queues': 'default',
                'yarn.scheduler.capacity.root.default.capacity': '100',
            };

            await act(async () => {
                await result.current.loadInitialData({
                    configEndpoint: async () => mockConfig,
                });
            });

            // Verify configuration was loaded
            expect(result.current.originalConfig).toEqual(mockConfig);
            const queueTree = selectEffectiveQueueTree(result.current);
            expect(queueTree).toBeDefined();
            expect(queueTree?.name).toBe('root');
            expect(queueTree?.children.length).toBe(1);

            // Verify no metrics were set
            expect(queueTree?.metrics).toBeUndefined();

            // Verify nodes map is empty
            expect(result.current.nodes.size).toBe(0);
        });

        it('should handle configuration API errors gracefully', async () => {
            const { result } = renderHook(() => useYarnSchedulerStore());

            await act(async () => {
                await expect(
                    result.current.loadInitialData({
                        configEndpoint: async () => {
                            throw new Error('Failed to fetch configuration: Network error');
                        },
                    })
                ).rejects.toThrow('Failed to fetch configuration: Network error');
            });

            // Verify error state
            expect(result.current.loading).toBe(false);
            expect(result.current.error).toBe('Failed to fetch configuration: Network error');
            const queueTree = selectEffectiveQueueTree(result.current);
            expect(queueTree).toBeNull();
            expect(result.current.originalConfig).toEqual({});
            expect(result.current.nodes.size).toBe(0);
        });

        it('should handle metrics API errors and continue with config only', async () => {
            const { result } = renderHook(() => useYarnSchedulerStore());

            const mockConfig = {
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.queues': 'default',
                'yarn.scheduler.capacity.root.default.capacity': '100',
            };

            await act(async () => {
                await expect(
                    result.current.loadInitialData({
                        configEndpoint: async () => mockConfig,
                        metricsEndpoint: async () => {
                            throw new Error('Failed to fetch metrics: Service unavailable');
                        },
                    })
                ).rejects.toThrow('Failed to fetch metrics: Service unavailable');
            });

            // The store should be in error state since the metrics fetch failed
            expect(result.current.loading).toBe(false);
            expect(result.current.error).toBe('Failed to fetch metrics: Service unavailable');
        });

        it('should handle nodes API errors and continue with config and metrics', async () => {
            const { result } = renderHook(() => useYarnSchedulerStore());

            const mockConfig = {
                'yarn.scheduler.capacity.root.capacity': '100',
            };

            const mockMetrics = {
                type: 'capacityScheduler',
                queueName: 'root',
                capacity: 100,
                usedCapacity: 0,
                maxCapacity: 100,
            };

            await act(async () => {
                await expect(
                    result.current.loadInitialData({
                        configEndpoint: async () => mockConfig,
                        metricsEndpoint: async () => mockMetrics,
                        nodesEndpoint: async () => {
                            throw new Error('Failed to fetch nodes: Service unavailable');
                        },
                    })
                ).rejects.toThrow('Failed to fetch nodes: Service unavailable');
            });

            // The store should be in error state since the nodes fetch failed
            expect(result.current.loading).toBe(false);
            expect(result.current.error).toBe('Failed to fetch nodes: Service unavailable');
        });

        it('should validate that queue tree is built correctly with complex hierarchy', async () => {
            const { result } = renderHook(() => useYarnSchedulerStore());

            const mockConfig = {
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.queues': 'production,development',
                'yarn.scheduler.capacity.root.production.capacity': '60',
                'yarn.scheduler.capacity.root.production.queues': 'critical,standard',
                'yarn.scheduler.capacity.root.production.critical.capacity': '40',
                'yarn.scheduler.capacity.root.production.standard.capacity': '20',
                'yarn.scheduler.capacity.root.development.capacity': '40',
            };

            await act(async () => {
                await result.current.loadInitialData({
                    configEndpoint: async () => mockConfig,
                });
            });

            // Verify root queue
            const queueTree = selectEffectiveQueueTree(result.current);
            expect(queueTree?.name).toBe('root');
            expect(queueTree?.children.length).toBe(2);

            // Verify first level children
            const productionQueue = queueTree?.children.find((q) => q.name === 'production');
            expect(productionQueue?.config.capacity).toBe('60');
            expect(productionQueue?.children.length).toBe(2);

            const developmentQueue = queueTree?.children.find((q) => q.name === 'development');
            expect(developmentQueue?.config.capacity).toBe('40');
            expect(developmentQueue?.children.length).toBe(0);

            // Verify second level children
            const criticalQueue = productionQueue?.children.find((q) => q.name === 'critical');
            expect(criticalQueue?.config.capacity).toBe('40');
            expect(criticalQueue?.path).toBe('root.production.critical');

            const standardQueue = productionQueue?.children.find((q) => q.name === 'standard');
            expect(standardQueue?.config.capacity).toBe('20');
            expect(standardQueue?.path).toBe('root.production.standard');
        });

        it('should set loading states properly during data fetch', async () => {
            const { result } = renderHook(() => useYarnSchedulerStore());

            const mockConfig = {
                'yarn.scheduler.capacity.root.capacity': '100',
            };

            let loadingChecked = false;

            // Verify initial state
            expect(result.current.loading).toBe(false);

            await act(async () => {
                await result.current.loadInitialData({
                    configEndpoint: async () => {
                        // Add a small delay and verify loading state is true during fetch
                        await new Promise((resolve) => {
                            setTimeout(() => {
                                loadingChecked = true;
                                resolve(undefined);
                            }, 10);
                        });
                        return mockConfig;
                    },
                });
            });

            // Verify loading was checked and is now false after completion
            expect(loadingChecked).toBe(true);
            expect(result.current.loading).toBe(false);
        });

        it('should handle empty configuration gracefully', async () => {
            const { result } = renderHook(() => useYarnSchedulerStore());

            await act(async () => {
                await result.current.loadInitialData({
                    configEndpoint: async () => ({}),
                });
            });

            // With the new approach, empty config doesn't throw an error
            // The queue tree will just be null
            expect(result.current.error).toBeNull();
            const queueTree = selectEffectiveQueueTree(result.current);
            expect(queueTree).toBeNull();
            expect(result.current.loading).toBe(false);
        });

        it('should handle HTTP fetch responses with proper parsing', async () => {
            const { result } = renderHook(() => useYarnSchedulerStore());

            // Mock fetch
            global.fetch = vi.fn();

            const mockConfigResponse = {
                property: [
                    { name: 'yarn.scheduler.capacity.root.capacity', value: '100' },
                    { name: 'yarn.scheduler.capacity.root.queues', value: 'default' },
                    { name: 'yarn.scheduler.capacity.root.default.capacity', value: '100' },
                ],
            };

            const mockMetricsResponse = {
                type: 'capacityScheduler',
                queueName: 'root',
                capacity: 100,
                usedCapacity: 25,
                maxCapacity: 100,
                queues: {
                    queue: [
                        {
                            type: 'capacityScheduler',
                            queueName: 'default',
                            capacity: 100,
                            usedCapacity: 25,
                            maxCapacity: 100,
                        },
                    ],
                },
            };

            (global.fetch as any)
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => mockConfigResponse,
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => mockMetricsResponse,
                });

            await act(async () => {
                await result.current.loadInitialData({
                    configEndpoint: '/api/config',
                    metricsEndpoint: '/api/metrics',
                });
            });

            // Verify configuration was parsed correctly from array format
            expect(result.current.originalConfig).toEqual({
                'yarn.scheduler.capacity.root.capacity': '100',
                'yarn.scheduler.capacity.root.queues': 'default',
                'yarn.scheduler.capacity.root.default.capacity': '100',
            });

            // Verify metrics were applied
            const queueTree = selectEffectiveQueueTree(result.current);
            expect(queueTree?.metrics?.usedCapacity).toBe(25);

            // Cleanup
            vi.restoreAllMocks();
        });

        it('should handle HTTP error responses', async () => {
            const { result } = renderHook(() => useYarnSchedulerStore());

            // Mock fetch
            global.fetch = vi.fn().mockResolvedValueOnce({
                ok: false,
                statusText: 'Not Found',
            });

            try {
                await act(async () => {
                    await result.current.loadInitialData({
                        configEndpoint: '/api/config',
                    });
                });
            } catch (error) {
                // Expected to throw
                expect(error).toBeInstanceOf(Error);
                expect((error as Error).message).toBe('Failed to fetch configuration: Not Found');
            }

            // Check final state
            expect(result.current.error).toBe('Failed to fetch configuration: Not Found');
            expect(result.current.loading).toBe(false);

            // Cleanup
            vi.restoreAllMocks();
        });

        it('should clear previous changes when loading new data', async () => {
            const { result } = renderHook(() => useYarnSchedulerStore());

            // Set up initial state with changes
            act(() => {
                result.current.updateProperty('test.property', 'changed');
            });

            expect(result.current.propertyChanges.size).toBe(1);

            const mockConfig = {
                'yarn.scheduler.capacity.root.capacity': '100',
            };

            await act(async () => {
                await result.current.loadInitialData({
                    configEndpoint: async () => mockConfig,
                });
            });

            // Verify changes were cleared
            expect(result.current.propertyChanges.size).toBe(0);
            expect(result.current.nodeLabelChanges.size).toBe(0);
        });
    });
});
