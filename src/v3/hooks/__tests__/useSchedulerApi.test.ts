import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { apiService } from '../../../api/ApiService';
import { useYarnSchedulerStore } from '../../store/yarnSchedulerStore';
import {
    useSchedulerData,
    useSchedulerConfig,
    useUpdateConfig,
    useNodeLabels,
    useNodes,
} from '../useSchedulerApi';
import type { SchedulerResponse, ConfigurationResponse } from '../../store/schemas/apiSchemas';
import type { NodeInfo } from '../../store/types';

// Mock the API service
vi.mock('../../../api/ApiService', () => ({
    apiService: {
        getScheduler: vi.fn(),
        getConfiguration: vi.fn(),
        updateConfiguration: vi.fn(),
        getNodeLabels: vi.fn(),
        getNodes: vi.fn(),
    },
}));

// Mock the store
vi.mock('../../store/yarnSchedulerStore', () => ({
    useYarnSchedulerStore: vi.fn(),
}));

// Mock the apiFormatter
vi.mock('../../store/utils/apiFormatter', () => ({
    formatChangesForAPI: vi.fn(),
}));

describe('V3 API Hooks', () => {
    let queryClient: QueryClient;
    let mockStore: any;

    beforeEach(() => {
        vi.clearAllMocks();
        queryClient = new QueryClient({
            defaultOptions: {
                queries: { retry: false },
                mutations: { retry: false },
            },
        });

        mockStore = {
            loadInitialData: vi.fn(),
            propertyChanges: new Map(),
            commitChanges: vi.fn(),
            reset: vi.fn(),
        };

        (useYarnSchedulerStore as unknown as Mock).mockReturnValue(mockStore);
    });

    function wrapper({ children }: { children: React.ReactNode }) {
        return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    }

    describe('useSchedulerData', () => {
        it('should fetch scheduler data and update store', async () => {
            const mockSchedulerData: SchedulerResponse = {
                scheduler: {
                    schedulerInfo: {
                        type: 'capacityScheduler',
                        capacity: 100,
                        usedCapacity: 50,
                        maxCapacity: 100,
                        queueName: 'root',
                        queues: {
                            queue: [],
                        },
                    },
                },
            };

            const mockConfigData: ConfigurationResponse = {
                property: [
                    { name: 'yarn.scheduler.capacity.root.capacity', value: '100' },
                ],
            };

            (apiService.getScheduler as Mock).mockResolvedValue(mockSchedulerData);
            (apiService.getConfiguration as Mock).mockResolvedValue(mockConfigData);

            const { result } = renderHook(() => useSchedulerData(), { wrapper });

            await waitFor(() => {
                expect(result.current.isSuccess).toBe(true);
            });

            expect(apiService.getScheduler).toHaveBeenCalledTimes(1);
            expect(mockStore.loadInitialData).toHaveBeenCalledWith({
                configEndpoint: expect.any(Function),
                metricsEndpoint: expect.any(Function),
            });

            expect(result.current.data).toEqual(mockSchedulerData);
        });

        it('should handle errors when fetching scheduler data', async () => {
            const error = new Error('Network error');
            (apiService.getScheduler as Mock).mockRejectedValue(error);

            const { result } = renderHook(() => useSchedulerData(), { wrapper });

            await waitFor(() => {
                expect(result.current.isError).toBe(true);
            });

            expect(result.current.error).toBe(error);
            expect(mockStore.loadInitialData).not.toHaveBeenCalled();
        });
    });

    describe('useSchedulerConfig', () => {
        it('should fetch configuration data', async () => {
            const mockConfigData: ConfigurationResponse = {
                property: [
                    { name: 'yarn.scheduler.capacity.root.capacity', value: '100' },
                    { name: 'yarn.scheduler.capacity.root.queues', value: 'default,prod' },
                ],
            };

            (apiService.getConfiguration as Mock).mockResolvedValue(mockConfigData);

            const { result } = renderHook(() => useSchedulerConfig(), { wrapper });

            await waitFor(() => {
                expect(result.current.isSuccess).toBe(true);
            });

            expect(apiService.getConfiguration).toHaveBeenCalledTimes(1);
            expect(result.current.data).toEqual(mockConfigData);
        });
    });

    describe('useUpdateConfig', () => {
        it('should update configuration and invalidate queries', async () => {
            const mockChanges = {
                'update-queue': [
                    {
                        'queue-name': 'root.default',
                        params: {
                            capacity: '60',
                        },
                    },
                ],
            };

            const { formatChangesForAPI } = await import('../../store/utils/apiFormatter');
            (formatChangesForAPI as Mock).mockReturnValue(mockChanges);
            (apiService.updateConfiguration as Mock).mockResolvedValue({ status: 'success' });

            const { result } = renderHook(() => useUpdateConfig(), { wrapper });

            await result.current.mutateAsync();

            await waitFor(() => {
                expect(result.current.isSuccess).toBe(true);
            });

            expect(formatChangesForAPI).toHaveBeenCalledWith(mockStore.propertyChanges);
            expect(apiService.updateConfiguration).toHaveBeenCalledWith(mockChanges);
            expect(mockStore.commitChanges).toHaveBeenCalled();
        });

        it('should handle errors during configuration update', async () => {
            const error = new Error('Update failed');
            const { formatChangesForAPI } = await import('../../store/utils/apiFormatter');
            (formatChangesForAPI as Mock).mockReturnValue({});
            (apiService.updateConfiguration as Mock).mockRejectedValue(error);

            const { result } = renderHook(() => useUpdateConfig(), { wrapper });

            await expect(result.current.mutateAsync()).rejects.toThrow('Update failed');

            expect(mockStore.commitChanges).not.toHaveBeenCalled();
        });
    });

    describe('useNodeLabels', () => {
        it('should fetch node labels', async () => {
            const mockNodeLabels = {
                nodeLabels: ['GPU', 'SSD', 'LARGE_MEM'],
            };

            (apiService.getNodeLabels as Mock).mockResolvedValue(mockNodeLabels);

            const { result } = renderHook(() => useNodeLabels(), { wrapper });

            await waitFor(() => {
                expect(result.current.isSuccess).toBe(true);
            });

            expect(apiService.getNodeLabels).toHaveBeenCalledTimes(1);
            expect(result.current.data).toEqual(mockNodeLabels);
        });
    });

    describe('useNodes', () => {
        it('should fetch nodes and update store', async () => {
            const mockNodesData = {
                nodes: {
                    node: [
                        {
                            id: 'node1:8041',
                            rack: '/default-rack',
                            state: 'RUNNING',
                            nodeLabels: ['GPU'],
                        },
                        {
                            id: 'node2:8041',
                            rack: '/default-rack',
                            state: 'RUNNING',
                            nodeLabels: ['SSD'],
                        },
                    ],
                },
            };

            (apiService.getNodes as Mock).mockResolvedValue(mockNodesData);

            const { result } = renderHook(() => useNodes(), { wrapper });

            await waitFor(() => {
                expect(result.current.isSuccess).toBe(true);
            });

            expect(apiService.getNodes).toHaveBeenCalledTimes(1);
            expect(mockStore.setNodes).toHaveBeenCalledWith(expect.any(Map));

            // Verify the nodes were transformed correctly
            const setNodesCall = (mockStore.setNodes as Mock).mock.calls[0][0];
            expect(setNodesCall.get('node1:8041')).toEqual({
                id: 'node1:8041',
                rack: '/default-rack',
                state: 'RUNNING',
                labels: new Set(['GPU']),
            });
        });

        it('should handle nodes without labels', async () => {
            const mockNodesData = {
                nodes: {
                    node: [
                        {
                            id: 'node1:8041',
                            rack: '/default-rack',
                            state: 'RUNNING',
                        },
                    ],
                },
            };

            (apiService.getNodes as Mock).mockResolvedValue(mockNodesData);

            const { result } = renderHook(() => useNodes(), { wrapper });

            await waitFor(() => {
                expect(result.current.isSuccess).toBe(true);
            });

            const setNodesCall = (mockStore.setNodes as Mock).mock.calls[0][0];
            expect(setNodesCall.get('node1:8041').labels).toEqual(new Set());
        });
    });
});