import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import {
    useScheduler,
    useConfiguration,
    useNodeLabels,
    useNodes,
    useHealthCheck,
    useApiMutation,
} from '../useApiWithZustand';
import { useConfigurationStore, useActivityStore } from '../../store/zustand';

// Mock data
const mockSchedulerData = {
    scheduler: {
        schedulerInfo: {
            type: 'capacityScheduler',
            queueName: 'root',
            capacity: 100,
            queues: {
                queue: [{ queueName: 'default', queuePath: 'root.default', capacity: 60 }],
            },
        },
    },
};

const mockConfigurationData = {
    property: [{ name: 'yarn.scheduler.capacity.root.queues', value: 'default,production' }],
};

const mockNodeLabelsData = {
    nodeLabelsInfo: {
        nodeLabelInfo: [{ name: 'gpu', numActiveNMs: 2, numInactiveNMs: 0 }],
    },
};

const mockNodesData = {
    nodes: {
        node: [{ id: 'node1:8041', state: 'RUNNING', nodeLabels: ['gpu'] }],
    },
};

// Mock server setup
const server = setupServer(
    http.get('/ws/v1/cluster/scheduler', () => {
        return HttpResponse.json(mockSchedulerData);
    }),
    http.get('/ws/v1/cluster/scheduler-conf', () => {
        return HttpResponse.json(mockConfigurationData);
    }),
    http.get('/ws/v1/cluster/get-node-labels', () => {
        return HttpResponse.json(mockNodeLabelsData);
    }),
    http.get('/ws/v1/cluster/nodes', () => {
        return HttpResponse.json(mockNodesData);
    }),
    http.get('/health', () => {
        return HttpResponse.json({ status: 'ok', timestamp: Date.now() });
    })
);

// Helper to reset all stores
const resetStores = () => {
    useConfigurationStore.setState({
        scheduler: null,
        configuration: null,
        nodeLabels: null,
        nodes: null,
        loading: {
            scheduler: false,
            configuration: false,
            nodeLabels: false,
            nodes: false,
        },
        errors: {
            scheduler: null,
            configuration: null,
            nodeLabels: null,
            nodes: null,
        },
        lastUpdated: {},
    });

    useActivityStore.setState({
        logs: [],
        apiCalls: [],
        maxEntries: 1000,
    });
};

describe('useApiWithZustand hooks', () => {
    beforeEach(() => {
        server.listen({ onUnhandledRequest: 'error' });
        resetStores();
        vi.clearAllMocks();
    });

    afterEach(() => {
        server.resetHandlers();
        resetStores();
    });

    describe('useScheduler', () => {
        it('should load scheduler data successfully', async () => {
            const { result } = renderHook(() => useScheduler());

            // Initially loading
            expect(result.current.loading).toBe(true);
            expect(result.current.data).toBeNull();
            expect(result.current.error).toBeNull();

            // Wait for data to load
            await act(async () => {
                await waitFor(() => {
                    expect(result.current.loading).toBe(false);
                });
            });

            expect(result.current.data).toEqual(mockSchedulerData);
            expect(result.current.error).toBeNull();

            // Check store state
            const store = useConfigurationStore.getState();
            expect(store.scheduler).toEqual(mockSchedulerData);
            expect(store.loading.scheduler).toBe(false);
            expect(store.errors.scheduler).toBeNull();
            expect(store.lastUpdated.scheduler).toBeTypeOf('number');
        });

        it('should handle scheduler loading errors', async () => {
            server.use(
                http.get('/ws/v1/cluster/scheduler', () => {
                    return new HttpResponse(null, { status: 500 });
                })
            );

            const { result } = renderHook(() => useScheduler());

            await act(async () => {
                await waitFor(() => {
                    expect(result.current.loading).toBe(false);
                });
            });

            expect(result.current.data).toBeNull();
            expect(result.current.error).toBeInstanceOf(Error);

            // Check store state
            const store = useConfigurationStore.getState();
            expect(store.scheduler).toBeNull();
            expect(store.errors.scheduler).toBeInstanceOf(Error);
        });

        it('should allow manual refetch', async () => {
            const { result } = renderHook(() => useScheduler());

            await act(async () => {
                await waitFor(() => {
                    expect(result.current.loading).toBe(false);
                });
            });

            // Manually trigger refetch
            act(() => {
                result.current.refetch();
            });

            expect(result.current.loading).toBe(true);

            await act(async () => {
                await waitFor(() => {
                    expect(result.current.loading).toBe(false);
                });
            });

            expect(result.current.data).toEqual(mockSchedulerData);
        });

        it('should log API calls to activity store', async () => {
            renderHook(() => useScheduler());

            await act(async () => {
                await waitFor(() => {
                    const activityStore = useActivityStore.getState();
                    expect(activityStore.apiCalls).toHaveLength(1);
                    expect(activityStore.apiCalls[0].method).toBe('GET');
                    expect(activityStore.apiCalls[0].url).toBe('/ws/v1/cluster/scheduler');
                    expect(activityStore.logs).toHaveLength(1);
                    expect(activityStore.logs[0].message).toBe('Successfully loaded scheduler data');
                });
            });
        });
    });

    describe('useConfiguration', () => {
        it('should load configuration data successfully', async () => {
            const { result } = renderHook(() => useConfiguration());

            await act(async () => {
                await waitFor(() => {
                    expect(result.current.loading).toBe(false);
                });
            });

            expect(result.current.data).toEqual(mockConfigurationData);
            expect(result.current.error).toBeNull();

            // Check store state
            const store = useConfigurationStore.getState();
            expect(store.configuration).toEqual(mockConfigurationData);
            expect(store.loading.configuration).toBe(false);
        });

        it('should handle configuration loading errors', async () => {
            server.use(
                http.get('/ws/v1/cluster/scheduler-conf', () => {
                    return new HttpResponse(null, { status: 404 });
                })
            );

            const { result } = renderHook(() => useConfiguration());

            await act(async () => {
                await waitFor(() => {
                    expect(result.current.loading).toBe(false);
                });
            });

            expect(result.current.data).toBeNull();
            expect(result.current.error).toBeInstanceOf(Error);
        });

        it('should log configuration API calls', async () => {
            renderHook(() => useConfiguration());

            await act(async () => {
                await waitFor(() => {
                    const activityStore = useActivityStore.getState();
                    const configCall = activityStore.apiCalls.find((call) => call.url === '/ws/v1/cluster/scheduler-conf');
                    expect(configCall).toBeDefined();
                    expect(configCall?.method).toBe('GET');
                });
            });
        });
    });

    describe('useNodeLabels', () => {
        it('should load node labels data successfully', async () => {
            const { result } = renderHook(() => useNodeLabels());

            await act(async () => {
                await waitFor(() => {
                    expect(result.current.loading).toBe(false);
                });
            });

            expect(result.current.data).toEqual(mockNodeLabelsData);
            expect(result.current.error).toBeNull();

            // Check store state
            const store = useConfigurationStore.getState();
            expect(store.nodeLabels).toEqual(mockNodeLabelsData);
        });

        it('should handle node labels loading errors', async () => {
            server.use(
                http.get('/ws/v1/cluster/get-node-labels', () => {
                    return new HttpResponse(null, { status: 403 });
                })
            );

            const { result } = renderHook(() => useNodeLabels());

            await act(async () => {
                await waitFor(() => {
                    expect(result.current.loading).toBe(false);
                });
            });

            expect(result.current.error).toBeInstanceOf(Error);
        });
    });

    describe('useNodes', () => {
        it('should load nodes data successfully', async () => {
            const { result } = renderHook(() => useNodes());

            await act(async () => {
                await waitFor(() => {
                    expect(result.current.loading).toBe(false);
                });
            });

            expect(result.current.data).toEqual(mockNodesData);
            expect(result.current.error).toBeNull();

            // Check store state
            const store = useConfigurationStore.getState();
            expect(store.nodes).toEqual(mockNodesData);
        });

        it('should handle nodes loading errors', async () => {
            server.use(
                http.get('/ws/v1/cluster/nodes', () => {
                    return new HttpResponse(null, { status: 500 });
                })
            );

            const { result } = renderHook(() => useNodes());

            await act(async () => {
                await waitFor(() => {
                    expect(result.current.loading).toBe(false);
                });
            });

            expect(result.current.error).toBeInstanceOf(Error);
        });
    });

    describe('useHealthCheck', () => {
        it('should perform health check successfully', async () => {
            const { result } = renderHook(() => useHealthCheck());

            // Initially should be checking
            expect(result.current.status).toBe('checking');

            await waitFor(() => {
                expect(result.current.status).toBe('ok');
            }, { timeout: 5000 });

            expect(result.current.lastCheck).toBeTypeOf('number');
        });

        it('should handle health check errors', async () => {
            server.use(
                http.get('/ws/v1/cluster/scheduler', () => {
                    return new HttpResponse(null, { status: 500 });
                })
            );

            const { result } = renderHook(() => useHealthCheck());

            await waitFor(() => {
                expect(result.current.status).toBe('error');
            }, { timeout: 5000 });

            expect(result.current.lastCheck).toBeTypeOf('number');
        });

        it('should allow manual health check', async () => {
            const { result } = renderHook(() => useHealthCheck());

            // Wait for initial health check to complete
            await waitFor(() => {
                expect(result.current.status).toBe('ok');
            }, { timeout: 5000 });

            // Manual check
            act(() => {
                result.current.checkHealth();
            });

            expect(result.current.status).toBe('checking');

            await waitFor(() => {
                expect(result.current.status).toBe('ok');
            }, { timeout: 5000 });
        });
    });

    describe('useApiMutation', () => {
        it('should execute mutation successfully', async () => {
            const mockMutationFn = vi.fn().mockResolvedValue({ success: true });
            const { result } = renderHook(() => useApiMutation<{ success: boolean }, { param: string }>());

            let mutationResult: any;

            await act(async () => {
                mutationResult = await result.current.mutate(
                    mockMutationFn,
                    { param: 'test' },
                    {
                        description: 'Test mutation',
                        method: 'POST',
                        url: '/test-endpoint',
                    }
                );
            });

            expect(mockMutationFn).toHaveBeenCalledWith({ param: 'test' });
            expect(mutationResult).toEqual({ success: true });
            expect(result.current.loading).toBe(false);
            expect(result.current.error).toBeNull();

            // Check activity logging
            const activityStore = useActivityStore.getState();
            const successLog = activityStore.logs.find((log) => log.message === 'Test mutation');
            expect(successLog).toBeDefined();
            expect(successLog?.type).toBe('user_action');

            const apiCall = activityStore.apiCalls.find((call) => call.url === '/test-endpoint');
            expect(apiCall).toBeDefined();
            expect(apiCall?.method).toBe('POST');
        });

        it('should handle mutation errors', async () => {
            const mockError = new Error('Mutation failed');
            const mockMutationFn = vi.fn().mockRejectedValue(mockError);
            const { result } = renderHook(() => useApiMutation<any, { param: string }>());

            let thrownError: any;

            await act(async () => {
                try {
                    await result.current.mutate(mockMutationFn, { param: 'test' }, { description: 'Test mutation' });
                } catch (error) {
                    thrownError = error;
                }
            });

            expect(thrownError).toBe(mockError);
            expect(result.current.loading).toBe(false);
            expect(result.current.error).toBe(mockError);

            // Check error logging
            const activityStore = useActivityStore.getState();
            const errorLog = activityStore.logs.find((log) => log.message === 'Failed: Test mutation');
            expect(errorLog).toBeDefined();
            expect(errorLog?.level).toBe('error');
        });

        it('should set loading state during mutation', async () => {
            let resolveMutation: (value: any) => void;
            const mockMutationFn = vi.fn().mockImplementation(
                () =>
                    new Promise((resolve) => {
                        resolveMutation = resolve;
                    })
            );

            const { result } = renderHook(() => useApiMutation<any, void>());

            // Start the mutation without waiting
            act(() => {
                result.current.mutate(mockMutationFn, undefined);
            });

            // Check loading state before resolving
            expect(result.current.loading).toBe(true);

            // Resolve the mutation
            act(() => {
                resolveMutation({ success: true });
            });

            // Wait for loading to become false
            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });
        });
    });

    describe('Store Integration', () => {
        it('should handle multiple hooks loading data simultaneously', async () => {
            const scheduler = renderHook(() => useScheduler());
            const configuration = renderHook(() => useConfiguration());
            const nodeLabels = renderHook(() => useNodeLabels());

            await act(async () => {
                await waitFor(() => {
                    expect(scheduler.result.current.loading).toBe(false);
                    expect(configuration.result.current.loading).toBe(false);
                    expect(nodeLabels.result.current.loading).toBe(false);
                });
            });

            // All should have loaded successfully
            expect(scheduler.result.current.data).toEqual(mockSchedulerData);
            expect(configuration.result.current.data).toEqual(mockConfigurationData);
            expect(nodeLabels.result.current.data).toEqual(mockNodeLabelsData);

            // Check store has all data
            const store = useConfigurationStore.getState();
            expect(store.scheduler).toEqual(mockSchedulerData);
            expect(store.configuration).toEqual(mockConfigurationData);
            expect(store.nodeLabels).toEqual(mockNodeLabelsData);
        });

        it('should handle unmounting without memory leaks', async () => {
            const { result, unmount } = renderHook(() => useScheduler());

            await act(async () => {
                await waitFor(() => {
                    expect(result.current.loading).toBe(false);
                });
            });

            // Unmount should not cause errors
            unmount();

            // Store should still have data
            const store = useConfigurationStore.getState();
            expect(store.scheduler).toEqual(mockSchedulerData);
        });
    });

    describe('Error Recovery', () => {
        it('should recover from errors on retry', async () => {
            // First request fails
            server.use(
                http.get('/ws/v1/cluster/scheduler', () => {
                    return new HttpResponse(null, { status: 500 });
                })
            );

            const { result } = renderHook(() => useScheduler());

            await act(async () => {
                await waitFor(() => {
                    expect(result.current.error).toBeInstanceOf(Error);
                });
            });

            // Reset to success response
            server.use(
                http.get('/ws/v1/cluster/scheduler', () => {
                    return HttpResponse.json(mockSchedulerData);
                })
            );

            // Retry
            act(() => {
                result.current.refetch();
            });

            await act(async () => {
                await waitFor(() => {
                    expect(result.current.loading).toBe(false);
                });
            });

            expect(result.current.data).toEqual(mockSchedulerData);
            expect(result.current.error).toBeNull();
        });
    });
});
