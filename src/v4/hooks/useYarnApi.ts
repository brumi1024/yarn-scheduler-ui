/**
 * React Query hooks for YARN API
 * Provides typed hooks for all YARN Scheduler endpoints with automatic
 * caching, retries, and state management
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { YarnApiClient } from '../api/YarnApiClient';
import type {
    SchedulerResponse,
    SchedulerConfResponse,
    SchedConfUpdateInfo,
    NodeLabelsResponse,
    NodeToLabelsResponse,
    VersionResponse,
} from '../types';

// Query keys for cache management
export const queryKeys = {
    all: ['yarn'] as const,
    scheduler: () => [...queryKeys.all, 'scheduler'] as const,
    schedulerConf: () => [...queryKeys.all, 'scheduler-conf'] as const,
    schedulerConfVersion: () => [...queryKeys.all, 'scheduler-conf', 'version'] as const,
    nodeLabels: () => [...queryKeys.all, 'node-labels'] as const,
    nodeToLabels: () => [...queryKeys.all, 'node-to-labels'] as const,
};

// Create a singleton API client instance
// In a real app, this would be provided via context or dependency injection
let apiClient: YarnApiClient;

export const initializeYarnApi = (baseUrl: string, config?: Parameters<typeof YarnApiClient>[1]): void => {
    apiClient = new YarnApiClient(baseUrl, config);
};

// Ensure API client is initialized
const getApiClient = (): YarnApiClient => {
    if (!apiClient) {
        throw new Error('YarnApiClient not initialized. Call initializeYarnApi first.');
    }
    return apiClient;
};

/**
 * Hook to fetch scheduler data (queue hierarchy with live metrics)
 */
export const useSchedulerQuery = (options?: UseQueryOptions<SchedulerResponse>) => {
    return useQuery({
        queryKey: queryKeys.scheduler(),
        queryFn: () => getApiClient().getScheduler(),
        ...options,
    });
};

/**
 * Hook to fetch scheduler configuration
 */
export const useSchedulerConfQuery = (options?: UseQueryOptions<SchedulerConfResponse>) => {
    return useQuery({
        queryKey: queryKeys.schedulerConf(),
        queryFn: () => getApiClient().getSchedulerConf(),
        ...options,
    });
};

/**
 * Hook to fetch scheduler configuration version
 */
export const useSchedulerConfVersionQuery = (options?: UseQueryOptions<VersionResponse>) => {
    return useQuery({
        queryKey: queryKeys.schedulerConfVersion(),
        queryFn: () => getApiClient().getSchedulerConfVersion(),
        ...options,
    });
};

/**
 * Hook to fetch node labels
 */
export const useNodeLabelsQuery = (options?: UseQueryOptions<NodeLabelsResponse>) => {
    return useQuery({
        queryKey: queryKeys.nodeLabels(),
        queryFn: () => getApiClient().getNodeLabels(),
        ...options,
    });
};

/**
 * Hook to fetch node to label mappings
 */
export const useNodeToLabelsQuery = (options?: UseQueryOptions<NodeToLabelsResponse>) => {
    return useQuery({
        queryKey: queryKeys.nodeToLabels(),
        queryFn: () => getApiClient().getNodeToLabels(),
        ...options,
    });
};

/**
 * Mutation hook to update scheduler configuration
 */
export const useUpdateSchedulerConfMutation = (
    options?: UseMutationOptions<void, Error, SchedConfUpdateInfo>
) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (updateInfo: SchedConfUpdateInfo) => getApiClient().updateSchedulerConf(updateInfo),
        onSuccess: () => {
            // Invalidate related queries to trigger refetch
            queryClient.invalidateQueries({ queryKey: queryKeys.scheduler() });
            queryClient.invalidateQueries({ queryKey: queryKeys.schedulerConf() });
            queryClient.invalidateQueries({ queryKey: queryKeys.schedulerConfVersion() });
        },
        ...options,
    });
};

/**
 * Mutation hook to validate scheduler configuration
 */
export const useValidateSchedulerConfMutation = (
    options?: UseMutationOptions<void, Error, SchedConfUpdateInfo>
) => {
    return useMutation({
        mutationFn: (updateInfo: SchedConfUpdateInfo) => getApiClient().validateSchedulerConf(updateInfo),
        // Validation doesn't need to invalidate queries
        ...options,
    });
};

/**
 * Mutation hook to add node labels
 */
export const useAddNodeLabelsMutation = (
    options?: UseMutationOptions<void, Error, string[]>
) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (labels: string[]) => getApiClient().addNodeLabels(labels),
        onSuccess: () => {
            // Invalidate node labels query
            queryClient.invalidateQueries({ queryKey: queryKeys.nodeLabels() });
        },
        ...options,
    });
};

/**
 * Mutation hook to remove node labels
 */
export const useRemoveNodeLabelsMutation = (
    options?: UseMutationOptions<void, Error, string[]>
) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (labels: string[]) => getApiClient().removeNodeLabels(labels),
        onSuccess: () => {
            // Invalidate node labels queries
            queryClient.invalidateQueries({ queryKey: queryKeys.nodeLabels() });
            queryClient.invalidateQueries({ queryKey: queryKeys.nodeToLabels() });
        },
        ...options,
    });
};

/**
 * Mutation hook to replace node to label mappings
 */
export const useReplaceNodeToLabelsMutation = (
    options?: UseMutationOptions<void, Error, Record<string, string[]>>
) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (nodeToLabels: Record<string, string[]>) => 
            getApiClient().replaceNodeToLabels(nodeToLabels),
        onSuccess: () => {
            // Invalidate node to labels query
            queryClient.invalidateQueries({ queryKey: queryKeys.nodeToLabels() });
        },
        ...options,
    });
};

/**
 * Combined hook to fetch both scheduler and configuration data
 * Useful for initial page load
 */
export const useSchedulerAndConfig = () => {
    const schedulerQuery = useSchedulerQuery();
    const configQuery = useSchedulerConfQuery();

    return {
        scheduler: schedulerQuery,
        config: configQuery,
        isLoading: schedulerQuery.isLoading || configQuery.isLoading,
        isError: schedulerQuery.isError || configQuery.isError,
        error: schedulerQuery.error || configQuery.error,
    };
};

/**
 * Hook to prefetch scheduler data
 * Useful for preloading data before navigation
 */
export const usePrefetchScheduler = () => {
    const queryClient = useQueryClient();

    return () => {
        return queryClient.prefetchQuery({
            queryKey: queryKeys.scheduler(),
            queryFn: () => getApiClient().getScheduler(),
        });
    };
};