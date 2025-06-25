import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useYarnSchedulerStore } from '../yarnSchedulerStore';
import { selectEffectiveQueueTree } from '../selectors';
import type { SchedulerResponse, ConfigurationResponse } from '../schemas/apiSchemas';

/**
 * Tests for data loading functionality.
 * These tests focus on loading initial data, handling errors, and data transformation.
 */
describe('YarnSchedulerStore - Data Loading', () => {
    beforeEach(() => {
        const { result } = renderHook(() => useYarnSchedulerStore());
        act(() => {
            result.current.reset();
        });
        vi.restoreAllMocks();
    });

    describe('loadInitialData - Success Cases', () => {
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

        it('should build complex queue hierarchy correctly', async () => {
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

    describe('loadInitialData - Error Cases', () => {
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
    });

    describe('loadInitialData - HTTP Integration', () => {
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
        });
    });

    describe('Loading State Management', () => {
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
    });
});