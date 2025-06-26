/**
 * Tests for React Query hooks for YARN API
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { ReactNode } from 'react';
import { YarnApiClient } from '../api/YarnApiClient';
import {
    initializeYarnApi,
    useSchedulerQuery,
    useSchedulerConfQuery,
    useSchedulerConfVersionQuery,
    useNodeLabelsQuery,
    useNodeToLabelsQuery,
    useUpdateSchedulerConfMutation,
    useValidateSchedulerConfMutation,
    useAddNodeLabelsMutation,
    useRemoveNodeLabelsMutation,
    useReplaceNodeToLabelsMutation,
    useSchedulerAndConfig,
    usePrefetchScheduler,
    queryKeys,
} from './useYarnApi';
import type {
    SchedulerResponse,
    SchedulerConfResponse,
    SchedConfUpdateInfo,
    NodeLabelsResponse,
    NodeToLabelsResponse,
    VersionResponse,
} from '../types';

// Mock the YarnApiClient
vi.mock('../api/YarnApiClient');

// Mock data
const mockSchedulerResponse: SchedulerResponse = {
    scheduler: {
        schedulerInfo: {
            type: 'capacityScheduler',
            capacity: 100,
            usedCapacity: 45.5,
            maxCapacity: 100,
            queueName: 'root',
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
                        numApplications: 5,
                        queueName: 'default',
                        queuePath: 'root.default',
                        state: 'RUNNING',
                    },
                ],
            },
        },
    },
};

const mockConfigResponse: SchedulerConfResponse = {
    property: [
        { name: 'yarn.scheduler.capacity.root.queues', value: 'default,production' },
        { name: 'yarn.scheduler.capacity.root.default.capacity', value: '50' },
    ],
};

const mockNodeLabelsResponse: NodeLabelsResponse = {
    nodeLabelsInfo: {
        nodeLabelInfo: [
            { name: 'gpu', exclusivity: true },
            { name: 'ssd', exclusivity: false },
        ],
    },
};

const mockVersionResponse: VersionResponse = {
    versionID: 1234567890,
};

const mockNodeToLabelsResponse: NodeToLabelsResponse = {
    nodeToLabels: {
        nodeToLabels: [
            { nodeId: 'node1.cluster.com:8041', labels: ['gpu', 'ssd'] },
            { nodeId: 'node2.cluster.com:8041', labels: ['ssd'] },
        ],
    },
};

// Create a wrapper component for React Query
const createWrapper = (): React.FC<{ children: ReactNode }> => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false, // Disable retries for tests
                cacheTime: 0, // Disable cache for tests
            },
        },
    });

    return ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
};

describe('useYarnApi hooks', () => {
    let mockClient: YarnApiClient;

    beforeEach(() => {
        // Reset mocks
        vi.clearAllMocks();

        // Create mock client
        mockClient = {
            getScheduler: vi.fn().mockResolvedValue(mockSchedulerResponse),
            getSchedulerConf: vi.fn().mockResolvedValue(mockConfigResponse),
            getSchedulerConfVersion: vi.fn().mockResolvedValue(mockVersionResponse),
            getNodeLabels: vi.fn().mockResolvedValue(mockNodeLabelsResponse),
            getNodeToLabels: vi.fn().mockResolvedValue(mockNodeToLabelsResponse),
            updateSchedulerConf: vi.fn().mockResolvedValue(undefined),
            validateSchedulerConf: vi.fn().mockResolvedValue(undefined),
            addNodeLabels: vi.fn().mockResolvedValue(undefined),
            removeNodeLabels: vi.fn().mockResolvedValue(undefined),
            replaceNodeToLabels: vi.fn().mockResolvedValue(undefined),
        } as unknown as YarnApiClient;

        // Mock the constructor
        const MockedYarnApiClient = YarnApiClient as unknown as vi.MockedClass<typeof YarnApiClient>;
        MockedYarnApiClient.mockImplementation(() => mockClient);

        // Initialize the API
        initializeYarnApi('/ws/v1/cluster');
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('initialization', () => {
        it('should throw error when using hooks without initialization', async () => {
            // Create a new mock that throws when getScheduler is called
            const errorMock = {
                getScheduler: vi.fn().mockRejectedValue(new Error('YarnApiClient not initialized. Call initializeYarnApi first.')),
            } as unknown as YarnApiClient;

            // Mock the constructor to return the error mock
            const MockedYarnApiClient = YarnApiClient as unknown as vi.MockedClass<typeof YarnApiClient>;
            MockedYarnApiClient.mockImplementation(() => errorMock);

            // Re-initialize with the error mock
            initializeYarnApi('/ws/v1/cluster');

            const { result } = renderHook(() => useSchedulerQuery(), {
                wrapper: createWrapper(),
            });

            await waitFor(() => {
                expect(result.current.isError).toBe(true);
            });

            expect(result.current.error).toBeDefined();
            expect(result.current.error?.message).toContain('YarnApiClient not initialized');
        });
    });

    describe('query keys', () => {
        it('should generate correct query keys', () => {
            expect(queryKeys.all).toEqual(['yarn']);
            expect(queryKeys.scheduler()).toEqual(['yarn', 'scheduler']);
            expect(queryKeys.schedulerConf()).toEqual(['yarn', 'scheduler-conf']);
            expect(queryKeys.schedulerConfVersion()).toEqual(['yarn', 'scheduler-conf', 'version']);
            expect(queryKeys.nodeLabels()).toEqual(['yarn', 'node-labels']);
            expect(queryKeys.nodeToLabels()).toEqual(['yarn', 'node-to-labels']);
        });
    });

    describe('useSchedulerQuery', () => {
        it('should fetch scheduler data successfully', async () => {
            const { result } = renderHook(() => useSchedulerQuery(), {
                wrapper: createWrapper(),
            });

            await waitFor(() => {
                expect(result.current.isSuccess).toBe(true);
            });

            expect(result.current.data).toEqual(mockSchedulerResponse);
            expect(mockClient.getScheduler).toHaveBeenCalledTimes(1);
        });

        it('should handle errors', async () => {
            mockClient.getScheduler.mockRejectedValueOnce(new Error('API Error'));

            const { result } = renderHook(() => useSchedulerQuery(), {
                wrapper: createWrapper(),
            });

            await waitFor(() => {
                expect(result.current.isError).toBe(true);
            });

            expect(result.current.error?.message).toBe('API Error');
        });
    });

    describe('useSchedulerConfQuery', () => {
        it('should fetch configuration data successfully', async () => {
            const { result } = renderHook(() => useSchedulerConfQuery(), {
                wrapper: createWrapper(),
            });

            await waitFor(() => {
                expect(result.current.isSuccess).toBe(true);
            });

            expect(result.current.data).toEqual(mockConfigResponse);
            expect(mockClient.getSchedulerConf).toHaveBeenCalledTimes(1);
        });
    });

    describe('useSchedulerConfVersionQuery', () => {
        it('should fetch version data successfully', async () => {
            const { result } = renderHook(() => useSchedulerConfVersionQuery(), {
                wrapper: createWrapper(),
            });

            await waitFor(() => {
                expect(result.current.isSuccess).toBe(true);
            });

            expect(result.current.data).toEqual(mockVersionResponse);
            expect(mockClient.getSchedulerConfVersion).toHaveBeenCalledTimes(1);
        });
    });

    describe('useNodeLabelsQuery', () => {
        it('should fetch node labels successfully', async () => {
            const { result } = renderHook(() => useNodeLabelsQuery(), {
                wrapper: createWrapper(),
            });

            await waitFor(() => {
                expect(result.current.isSuccess).toBe(true);
            });

            expect(result.current.data).toEqual(mockNodeLabelsResponse);
            expect(mockClient.getNodeLabels).toHaveBeenCalledTimes(1);
        });
    });

    describe('useNodeToLabelsQuery', () => {
        it('should fetch node to labels mapping successfully', async () => {
            const { result } = renderHook(() => useNodeToLabelsQuery(), {
                wrapper: createWrapper(),
            });

            await waitFor(() => {
                expect(result.current.isSuccess).toBe(true);
            });

            expect(result.current.data).toEqual(mockNodeToLabelsResponse);
            expect(mockClient.getNodeToLabels).toHaveBeenCalledTimes(1);
        });
    });

    describe('useUpdateSchedulerConfMutation', () => {
        it('should update configuration successfully', async () => {
            const queryClient = new QueryClient({
                defaultOptions: { queries: { retry: false } },
            });

            const wrapper = ({ children }: { children: ReactNode }) => (
                <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
            );

            const { result } = renderHook(() => useUpdateSchedulerConfMutation(), { wrapper });

            const updateInfo: SchedConfUpdateInfo = {
                'update-queue': [
                    {
                        'queue-name': 'root.default',
                        params: { capacity: '60' },
                    },
                ],
            };

            result.current.mutate(updateInfo);

            await waitFor(() => {
                expect(result.current.isSuccess).toBe(true);
            });

            expect(mockClient.updateSchedulerConf).toHaveBeenCalledWith(updateInfo);
        });

        it('should invalidate queries after successful update', async () => {
            const queryClient = new QueryClient({
                defaultOptions: { queries: { retry: false } },
            });

            const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

            const wrapper = ({ children }: { children: ReactNode }) => (
                <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
            );

            const { result } = renderHook(() => useUpdateSchedulerConfMutation(), { wrapper });

            const updateInfo: SchedConfUpdateInfo = {
                'global-updates': { 'test.property': 'value' },
            };

            result.current.mutate(updateInfo);

            await waitFor(() => {
                expect(result.current.isSuccess).toBe(true);
            });

            expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: queryKeys.scheduler() });
            expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: queryKeys.schedulerConf() });
            expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: queryKeys.schedulerConfVersion() });
        });
    });

    describe('useValidateSchedulerConfMutation', () => {
        it('should validate configuration successfully', async () => {
            const { result } = renderHook(() => useValidateSchedulerConfMutation(), {
                wrapper: createWrapper(),
            });

            const updateInfo: SchedConfUpdateInfo = {
                'add-queue': [
                    {
                        'queue-name': 'root.newqueue',
                        params: { capacity: '10' },
                    },
                ],
            };

            result.current.mutate(updateInfo);

            await waitFor(() => {
                expect(result.current.isSuccess).toBe(true);
            });

            expect(mockClient.validateSchedulerConf).toHaveBeenCalledWith(updateInfo);
        });
    });

    describe('useAddNodeLabelsMutation', () => {
        it('should add node labels successfully', async () => {
            const queryClient = new QueryClient({
                defaultOptions: { queries: { retry: false } },
            });

            const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

            const wrapper = ({ children }: { children: ReactNode }) => (
                <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
            );

            const { result } = renderHook(() => useAddNodeLabelsMutation(), { wrapper });

            const labels = ['gpu', 'ssd'];
            result.current.mutate(labels);

            await waitFor(() => {
                expect(result.current.isSuccess).toBe(true);
            });

            expect(mockClient.addNodeLabels).toHaveBeenCalledWith(labels);
            expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: queryKeys.nodeLabels() });
        });
    });

    describe('useRemoveNodeLabelsMutation', () => {
        it('should remove node labels successfully', async () => {
            const queryClient = new QueryClient({
                defaultOptions: { queries: { retry: false } },
            });

            const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

            const wrapper = ({ children }: { children: ReactNode }) => (
                <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
            );

            const { result } = renderHook(() => useRemoveNodeLabelsMutation(), { wrapper });

            const labels = ['deprecated-label'];
            result.current.mutate(labels);

            await waitFor(() => {
                expect(result.current.isSuccess).toBe(true);
            });

            expect(mockClient.removeNodeLabels).toHaveBeenCalledWith(labels);
            expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: queryKeys.nodeLabels() });
            expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: queryKeys.nodeToLabels() });
        });
    });

    describe('useReplaceNodeToLabelsMutation', () => {
        it('should replace node to labels mapping successfully', async () => {
            const queryClient = new QueryClient({
                defaultOptions: { queries: { retry: false } },
            });

            const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

            const wrapper = ({ children }: { children: ReactNode }) => (
                <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
            );

            const { result } = renderHook(() => useReplaceNodeToLabelsMutation(), { wrapper });

            const mapping = {
                'node1.cluster.com:8041': ['gpu', 'highmem'],
                'node2.cluster.com:8041': ['ssd'],
            };
            result.current.mutate(mapping);

            await waitFor(() => {
                expect(result.current.isSuccess).toBe(true);
            });

            expect(mockClient.replaceNodeToLabels).toHaveBeenCalledWith(mapping);
            expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: queryKeys.nodeToLabels() });
        });
    });

    describe('useSchedulerAndConfig', () => {
        it('should fetch both scheduler and config data', async () => {
            const { result } = renderHook(() => useSchedulerAndConfig(), {
                wrapper: createWrapper(),
            });

            await waitFor(() => {
                expect(result.current.scheduler.isSuccess).toBe(true);
                expect(result.current.config.isSuccess).toBe(true);
            });

            expect(result.current.scheduler.data).toEqual(mockSchedulerResponse);
            expect(result.current.config.data).toEqual(mockConfigResponse);
            expect(result.current.isLoading).toBe(false);
            expect(result.current.isError).toBe(false);
        });

        it('should aggregate loading and error states', async () => {
            mockClient.getScheduler.mockImplementation(
                () => new Promise((resolve) => setTimeout(() => resolve(mockSchedulerResponse), 100))
            );

            const { result } = renderHook(() => useSchedulerAndConfig(), {
                wrapper: createWrapper(),
            });

            // Initially loading
            expect(result.current.isLoading).toBe(true);

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });
        });

        it('should handle partial errors', async () => {
            mockClient.getScheduler.mockRejectedValueOnce(new Error('Scheduler error'));

            const { result } = renderHook(() => useSchedulerAndConfig(), {
                wrapper: createWrapper(),
            });

            await waitFor(() => {
                expect(result.current.isError).toBe(true);
            });

            expect(result.current.error?.message).toBe('Scheduler error');
        });
    });

    describe('usePrefetchScheduler', () => {
        it('should return a prefetch function', async () => {
            const queryClient = new QueryClient({
                defaultOptions: { queries: { retry: false } },
            });

            const prefetchQuerySpy = vi.spyOn(queryClient, 'prefetchQuery');

            const wrapper = ({ children }: { children: ReactNode }) => (
                <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
            );

            const { result } = renderHook(() => usePrefetchScheduler(), { wrapper });

            // Call the prefetch function
            await result.current();

            expect(prefetchQuerySpy).toHaveBeenCalledWith({
                queryKey: queryKeys.scheduler(),
                queryFn: expect.any(Function),
            });
        });
    });
});