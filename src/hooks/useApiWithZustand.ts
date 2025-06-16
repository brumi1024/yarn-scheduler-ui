import { useEffect, useCallback, useState } from 'react';
import { apiService } from '../api/ApiService';
import { useDataStore, useActivityStore } from '../store';

// Hook for scheduler data with Zustand integration
export function useScheduler() {
    const { scheduler, loading, errors, loadAllData } = useDataStore();
    const addLogEntry = useActivityStore((state) => state.addLogEntry);
    const addApiCallLog = useActivityStore((state) => state.addApiCallLog);

    const fetchData = useCallback(async () => {
        try {
            await loadAllData();
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
                duration: 0,
            });
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Unknown error');
            addLogEntry({
                type: 'error',
                level: 'error',
                message: 'Failed to load scheduler data',
                details: { error: error.message },
            });
        }
    }, [loadAllData, addLogEntry, addApiCallLog]);

    useEffect(() => {
        if (scheduler === null && !errors.scheduler) {
            fetchData();
        }
    }, [scheduler, errors.scheduler, fetchData]);

    return {
        data: scheduler,
        loading: loading.scheduler,
        error: errors.scheduler,
        refetch: fetchData,
    };
}

// Hook for configuration data with Zustand integration
export function useConfiguration() {
    const { configuration, loading, errors, loadAllData } = useDataStore();
    const addLogEntry = useActivityStore((state) => state.addLogEntry);
    const addApiCallLog = useActivityStore((state) => state.addApiCallLog);

    const fetchData = useCallback(async () => {
        try {
            await loadAllData();
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
                duration: 0,
            });
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Unknown error');
            addLogEntry({
                type: 'error',
                level: 'error',
                message: 'Failed to load configuration data',
                details: { error: error.message },
            });
        }
    }, [loadAllData, addLogEntry, addApiCallLog]);

    useEffect(() => {
        if (configuration === null && !errors.configuration) {
            fetchData();
        }
    }, [configuration, errors.configuration, fetchData]);

    return {
        data: configuration,
        loading: loading.configuration,
        error: errors.configuration,
        refetch: fetchData,
    };
}

// Hook for node labels with Zustand integration
export function useNodeLabels() {
    const { nodeLabels, loading, errors, loadAllData } = useDataStore();
    const addLogEntry = useActivityStore((state) => state.addLogEntry);
    const addApiCallLog = useActivityStore((state) => state.addApiCallLog);

    const fetchData = useCallback(async () => {
        try {
            await loadAllData();
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
                duration: 0,
            });
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Unknown error');
            addLogEntry({
                type: 'error',
                level: 'error',
                message: 'Failed to load node labels',
                details: { error: error.message },
            });
        }
    }, [loadAllData, addLogEntry, addApiCallLog]);

    useEffect(() => {
        if (nodeLabels === null && !errors.nodeLabels) {
            fetchData();
        }
    }, [nodeLabels, errors.nodeLabels, fetchData]);

    return {
        data: nodeLabels,
        loading: loading.nodeLabels,
        error: errors.nodeLabels,
        refetch: fetchData,
    };
}

// Hook for nodes with Zustand integration
export function useNodes() {
    const { nodes, loading, errors, loadAllData } = useDataStore();
    const addLogEntry = useActivityStore((state) => state.addLogEntry);
    const addApiCallLog = useActivityStore((state) => state.addApiCallLog);

    const fetchData = useCallback(async () => {
        try {
            await loadAllData();
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
                duration: 0,
            });
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Unknown error');
            addLogEntry({
                type: 'error',
                level: 'error',
                message: 'Failed to load node data',
                details: { error: error.message },
            });
        }
    }, [loadAllData, addLogEntry, addApiCallLog]);

    useEffect(() => {
        if (nodes === null && !errors.nodes) {
            fetchData();
        }
    }, [nodes, errors.nodes, fetchData]);

    return {
        data: nodes,
        loading: loading.nodes,
        error: errors.nodes,
        refetch: fetchData,
    };
}

// Hook for health checking
export function useHealthCheck() {
    const addLogEntry = useActivityStore((state) => state.addLogEntry);
    const [status, setStatus] = useState<'ok' | 'error' | 'checking'>('checking');
    const [lastCheck, setLastCheck] = useState<number>(0);

    const checkHealth = useCallback(async () => {
        setStatus('checking');
        try {
            const result = await apiService.healthCheck();
            setStatus(result.status);
            setLastCheck(result.timestamp);

            if (result.status === 'error') {
                addLogEntry({
                    type: 'system_event',
                    level: 'warn',
                    message: 'Health check failed',
                    details: { timestamp: result.timestamp },
                });
            }
        } catch (error) {
            setStatus('error');
            setLastCheck(Date.now());
            addLogEntry({
                type: 'error',
                level: 'error',
                message: 'Health check error',
                details: { error: error instanceof Error ? error.message : 'Unknown error' },
            });
        }
    }, [addLogEntry]);

    useEffect(() => {
        checkHealth();
        const interval = setInterval(checkHealth, 30000);
        return () => clearInterval(interval);
    }, [checkHealth]);

    return { status, lastCheck, checkHealth };
}

// Generic mutation hook with activity logging
export function useApiMutation<T, P = void>() {
    const addLogEntry = useActivityStore((state) => state.addLogEntry);
    const addApiCallLog = useActivityStore((state) => state.addApiCallLog);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const mutate = useCallback(
        async (
            fn: (params: P) => Promise<T>,
            params: P,
            options?: {
                description?: string;
                method?: string;
                url?: string;
            }
        ): Promise<T | null> => {
            try {
                setLoading(true);
                setError(null);

                const result = await fn(params);

                if (options?.description) {
                    addLogEntry({
                        type: 'user_action',
                        level: 'info',
                        message: options.description,
                        details: { success: true },
                    });
                }

                if (options?.method && options?.url) {
                    addApiCallLog({
                        method: options.method,
                        url: options.url,
                        status: 200,
                        duration: 0,
                    });
                }

                return result;
            } catch (err) {
                const error = err instanceof Error ? err : new Error('Unknown error');
                setError(error);

                if (options?.description) {
                    addLogEntry({
                        type: 'error',
                        level: 'error',
                        message: `Failed: ${options.description}`,
                        details: { error: error.message },
                    });
                }

                throw error;
            } finally {
                setLoading(false);
            }
        },
        [addLogEntry, addApiCallLog]
    );

    return { mutate, loading, error };
}
