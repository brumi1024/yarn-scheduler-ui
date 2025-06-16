import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../api/ApiService';
import { useActivityStore } from '../store';
import type { ConfigurationUpdateRequest } from '../types/Configuration';

// Query for Scheduler data
export const useSchedulerQuery = () => {
    const addLogEntry = useActivityStore((state) => state.addLogEntry);
    const addApiCallLog = useActivityStore((state) => state.addApiCallLog);

    return useQuery({
        queryKey: ['scheduler'],
        queryFn: async () => {
            const startTime = Date.now();
            try {
                const result = await apiService.getScheduler();
                const duration = Date.now() - startTime;

                addLogEntry({
                    type: 'api_call',
                    level: 'info',
                    message: 'Successfully loaded scheduler data',
                    details: { timestamp: Date.now() },
                });
                addApiCallLog({
                    method: 'GET',
                    url: '/ws/v1/cluster/scheduler',
                    status: 200,
                    duration,
                });

                return result;
            } catch (error) {
                const duration = Date.now() - startTime;
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';

                addLogEntry({
                    type: 'error',
                    level: 'error',
                    message: 'Failed to load scheduler data',
                    details: { error: errorMessage },
                });
                addApiCallLog({
                    method: 'GET',
                    url: '/ws/v1/cluster/scheduler',
                    status: 0,
                    duration,
                    error: errorMessage,
                });

                throw error;
            }
        },
    });
};

// Query for Configuration data
export const useConfigurationQuery = () => {
    const addLogEntry = useActivityStore((state) => state.addLogEntry);
    const addApiCallLog = useActivityStore((state) => state.addApiCallLog);

    return useQuery({
        queryKey: ['configuration'],
        queryFn: async () => {
            const startTime = Date.now();
            try {
                const result = await apiService.getConfiguration();
                const duration = Date.now() - startTime;

                addLogEntry({
                    type: 'api_call',
                    level: 'info',
                    message: 'Successfully loaded configuration data',
                    details: { timestamp: Date.now() },
                });
                addApiCallLog({
                    method: 'GET',
                    url: '/ws/v1/cluster/scheduler-conf',
                    status: 200,
                    duration,
                });

                return result;
            } catch (error) {
                const duration = Date.now() - startTime;
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';

                addLogEntry({
                    type: 'error',
                    level: 'error',
                    message: 'Failed to load configuration data',
                    details: { error: errorMessage },
                });
                addApiCallLog({
                    method: 'GET',
                    url: '/ws/v1/cluster/scheduler-conf',
                    status: 0,
                    duration,
                    error: errorMessage,
                });

                throw error;
            }
        },
    });
};

// Query for Node Labels
export const useNodeLabelsQuery = () => {
    const addLogEntry = useActivityStore((state) => state.addLogEntry);
    const addApiCallLog = useActivityStore((state) => state.addApiCallLog);

    return useQuery({
        queryKey: ['nodeLabels'],
        queryFn: async () => {
            const startTime = Date.now();
            try {
                const result = await apiService.getNodeLabels();
                const duration = Date.now() - startTime;

                addLogEntry({
                    type: 'api_call',
                    level: 'info',
                    message: 'Successfully loaded node labels',
                    details: { timestamp: Date.now() },
                });
                addApiCallLog({
                    method: 'GET',
                    url: '/ws/v1/cluster/get-node-labels',
                    status: 200,
                    duration,
                });

                return result;
            } catch (error) {
                const duration = Date.now() - startTime;
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';

                addLogEntry({
                    type: 'error',
                    level: 'error',
                    message: 'Failed to load node labels',
                    details: { error: errorMessage },
                });
                addApiCallLog({
                    method: 'GET',
                    url: '/ws/v1/cluster/get-node-labels',
                    status: 0,
                    duration,
                    error: errorMessage,
                });

                throw error;
            }
        },
    });
};

// Query for Nodes
export const useNodesQuery = () => {
    const addLogEntry = useActivityStore((state) => state.addLogEntry);
    const addApiCallLog = useActivityStore((state) => state.addApiCallLog);

    return useQuery({
        queryKey: ['nodes'],
        queryFn: async () => {
            const startTime = Date.now();
            try {
                const result = await apiService.getNodes();
                const duration = Date.now() - startTime;

                addLogEntry({
                    type: 'api_call',
                    level: 'info',
                    message: 'Successfully loaded node data',
                    details: { timestamp: Date.now() },
                });
                addApiCallLog({
                    method: 'GET',
                    url: '/ws/v1/cluster/nodes',
                    status: 200,
                    duration,
                });

                return result;
            } catch (error) {
                const duration = Date.now() - startTime;
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';

                addLogEntry({
                    type: 'error',
                    level: 'error',
                    message: 'Failed to load node data',
                    details: { error: errorMessage },
                });
                addApiCallLog({
                    method: 'GET',
                    url: '/ws/v1/cluster/nodes',
                    status: 0,
                    duration,
                    error: errorMessage,
                });

                throw error;
            }
        },
    });
};

// Mutation for updating the configuration
export const useUpdateConfigurationMutation = () => {
    const queryClient = useQueryClient();
    const addLogEntry = useActivityStore((state) => state.addLogEntry);
    const addApiCallLog = useActivityStore((state) => state.addApiCallLog);

    return useMutation({
        mutationFn: async (changes: ConfigurationUpdateRequest) => {
            const startTime = Date.now();
            try {
                const result = await apiService.updateConfiguration(changes);
                const duration = Date.now() - startTime;

                addLogEntry({
                    type: 'user_action',
                    level: 'info',
                    message: 'Successfully updated configuration',
                    details: { success: true },
                });
                addApiCallLog({
                    method: 'PUT',
                    url: '/ws/v1/cluster/scheduler-conf',
                    status: 200,
                    duration,
                });

                return result;
            } catch (error) {
                const duration = Date.now() - startTime;
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';

                addLogEntry({
                    type: 'error',
                    level: 'error',
                    message: 'Failed to update configuration',
                    details: { error: errorMessage },
                });
                addApiCallLog({
                    method: 'PUT',
                    url: '/ws/v1/cluster/scheduler-conf',
                    status: 0,
                    duration,
                    error: errorMessage,
                });

                throw error;
            }
        },
        onSuccess: () => {
            // Invalidate and refetch all relevant queries after a successful mutation
            queryClient.invalidateQueries({ queryKey: ['scheduler'] });
            queryClient.invalidateQueries({ queryKey: ['configuration'] });
        },
    });
};