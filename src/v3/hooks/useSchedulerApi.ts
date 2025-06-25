import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../../api/ApiService';
import { useYarnSchedulerStore } from '../store/yarnSchedulerStore';
import { formatChangesForAPI } from '../store/utils/apiFormatter';
import type { SchedulerResponse, ConfigurationResponse } from '../store/schemas/apiSchemas';
import type { NodeLabelsResponse, NodesResponse } from '../../types/NodeLabel';
import type { NodeInfo } from '../store/types';

/**
 * Hook to fetch scheduler data and update the store
 */
export function useSchedulerData() {
    const store = useYarnSchedulerStore();

    return useQuery({
        queryKey: ['scheduler-v3'],
        queryFn: async () => {
            const data = await apiService.getScheduler();
            
            // Load the data into the store
            await store.loadInitialData({
                configEndpoint: () => apiService.getConfiguration(),
                metricsEndpoint: () => Promise.resolve(data),
            });

            return data;
        },
        staleTime: 30000, // 30 seconds
    });
}

/**
 * Hook to fetch configuration data
 */
export function useSchedulerConfig() {
    return useQuery({
        queryKey: ['scheduler-config-v3'],
        queryFn: () => apiService.getConfiguration(),
        staleTime: 30000, // 30 seconds
    });
}

/**
 * Hook to update configuration with staged changes
 */
export function useUpdateConfig() {
    const store = useYarnSchedulerStore();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            const changes = formatChangesForAPI(store.propertyChanges);
            return apiService.updateConfiguration(changes);
        },
        onSuccess: () => {
            // Invalidate and refetch scheduler data
            queryClient.invalidateQueries({ queryKey: ['scheduler-v3'] });
            queryClient.invalidateQueries({ queryKey: ['scheduler-config-v3'] });
            
            // Commit changes in the store
            store.commitChanges();
        },
    });
}

/**
 * Hook to fetch node labels
 */
export function useNodeLabels() {
    return useQuery({
        queryKey: ['node-labels-v3'],
        queryFn: () => apiService.getNodeLabels(),
        staleTime: 60000, // 1 minute
    });
}

/**
 * Hook to fetch nodes and update the store
 */
export function useNodes() {
    const store = useYarnSchedulerStore();

    return useQuery({
        queryKey: ['nodes-v3'],
        queryFn: async () => {
            const data = await apiService.getNodes();
            
            // Transform the nodes data for the store
            const nodesMap = new Map<string, NodeInfo>();
            
            if (data.nodes?.node) {
                data.nodes.node.forEach((node) => {
                    nodesMap.set(node.id, {
                        id: node.id,
                        rack: node.rack,
                        state: node.state,
                        labels: new Set(node.nodeLabels || []),
                    });
                });
            }
            
            // Update the store with transformed nodes
            store.setNodes(nodesMap);
            
            return data;
        },
        staleTime: 60000, // 1 minute
    });
}