import { useEffect, useCallback, useRef, useState } from 'react';
import { apiService } from '../api/ApiService';
import { useConfigurationStore, useActivityStore } from '../store/zustand';

// Hook for scheduler data with Zustand integration
export function useScheduler() {
    const scheduler = useConfigurationStore((state) => state.scheduler);
    const loading = useConfigurationStore((state) => state.loading.scheduler);
    const error = useConfigurationStore((state) => state.errors.scheduler);
    const loadSchedulerStart = useConfigurationStore((state) => state.loadSchedulerStart);
    const loadSchedulerSuccess = useConfigurationStore((state) => state.loadSchedulerSuccess);
    const loadSchedulerError = useConfigurationStore((state) => state.loadSchedulerError);
    const addApiCallLog = useActivityStore((state) => state.addApiCallLog);
    const addLogEntry = useActivityStore((state) => state.addLogEntry);
    const mountedRef = useRef(true);

    const fetchData = useCallback(async () => {
        if (!mountedRef.current) return;

        loadSchedulerStart();
        addApiCallLog({
            method: 'GET',
            url: '/ws/v1/cluster/scheduler',
        });

        try {
            const result = await apiService.getScheduler();
            if (mountedRef.current) {
                loadSchedulerSuccess(result);
                addLogEntry({
                    type: 'api_call',
                    level: 'info',
                    message: 'Successfully loaded scheduler data',
                    details: { dataSize: JSON.stringify(result).length },
                });
            }
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Unknown error');
            if (mountedRef.current) {
                loadSchedulerError(error);
                addLogEntry({
                    type: 'error',
                    level: 'error',
                    message: 'Failed to load scheduler data',
                    details: { error: error.message },
                });
            }
        }
    }, [loadSchedulerStart, loadSchedulerSuccess, loadSchedulerError, addApiCallLog, addLogEntry]);

    useEffect(() => {
        mountedRef.current = true;
        fetchData();

        return () => {
            mountedRef.current = false;
        };
    }, [fetchData]);

    return {
        data: scheduler,
        loading: loading,
        error: error,
        refetch: fetchData,
    };
}

// Hook for configuration data with Zustand integration
export function useConfiguration() {
    const configuration = useConfigurationStore((state) => state.configuration);
    const loading = useConfigurationStore((state) => state.loading.configuration);
    const error = useConfigurationStore((state) => state.errors.configuration);
    const loadConfigurationStart = useConfigurationStore((state) => state.loadConfigurationStart);
    const loadConfigurationSuccess = useConfigurationStore((state) => state.loadConfigurationSuccess);
    const loadConfigurationError = useConfigurationStore((state) => state.loadConfigurationError);
    const addApiCallLog = useActivityStore((state) => state.addApiCallLog);
    const addLogEntry = useActivityStore((state) => state.addLogEntry);
    const mountedRef = useRef(true);

    const fetchData = useCallback(async () => {
        if (!mountedRef.current) return;

        loadConfigurationStart();
        addApiCallLog({
            method: 'GET',
            url: '/ws/v1/cluster/scheduler-conf',
        });

        try {
            const result = await apiService.getConfiguration();
            if (mountedRef.current) {
                loadConfigurationSuccess(result);
                addLogEntry({
                    type: 'api_call',
                    level: 'info',
                    message: 'Successfully loaded configuration data',
                    details: { propertyCount: result.property?.length || 0 },
                });
            }
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Unknown error');
            if (mountedRef.current) {
                loadConfigurationError(error);
                addLogEntry({
                    type: 'error',
                    level: 'error',
                    message: 'Failed to load configuration data',
                    details: { error: error.message },
                });
            }
        }
    }, [loadConfigurationStart, loadConfigurationSuccess, loadConfigurationError, addApiCallLog, addLogEntry]);

    useEffect(() => {
        mountedRef.current = true;
        fetchData();

        return () => {
            mountedRef.current = false;
        };
    }, [fetchData]);

    return {
        data: configuration,
        loading: loading,
        error: error,
        refetch: fetchData,
    };
}

// Hook for node labels with Zustand integration
export function useNodeLabels() {
    const store = useConfigurationStore();
    const activityStore = useActivityStore();
    const mountedRef = useRef(true);

    const fetchData = useCallback(async () => {
        if (!mountedRef.current) return;

        store.loadNodeLabelsStart();
        activityStore.addApiCallLog({
            method: 'GET',
            url: '/ws/v1/cluster/get-node-labels',
        });

        try {
            const result = await apiService.getNodeLabels();
            if (mountedRef.current) {
                store.loadNodeLabelsSuccess(result);
                activityStore.addLogEntry({
                    type: 'api_call',
                    level: 'info',
                    message: 'Successfully loaded node labels',
                    details: { labelCount: result.nodeLabelsInfo?.nodeLabelInfo?.length || 0 },
                });
            }
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Unknown error');
            if (mountedRef.current) {
                store.loadNodeLabelsError(error);
                activityStore.addLogEntry({
                    type: 'error',
                    level: 'error',
                    message: 'Failed to load node labels',
                    details: { error: error.message },
                });
            }
        }
    }, []); // Zustand stores are stable, no need for dependencies

    useEffect(() => {
        mountedRef.current = true;
        fetchData();

        return () => {
            mountedRef.current = false;
        };
    }, [fetchData]);

    return {
        data: store.nodeLabels,
        loading: store.loading.nodeLabels,
        error: store.errors.nodeLabels,
        refetch: fetchData,
    };
}

// Hook for nodes with Zustand integration
export function useNodes() {
    const store = useConfigurationStore();
    const activityStore = useActivityStore();
    const mountedRef = useRef(true);

    const fetchData = useCallback(async () => {
        if (!mountedRef.current) return;

        store.loadNodesStart();
        activityStore.addApiCallLog({
            method: 'GET',
            url: '/ws/v1/cluster/nodes',
        });

        try {
            const result = await apiService.getNodes();
            if (mountedRef.current) {
                store.loadNodesSuccess(result);
                activityStore.addLogEntry({
                    type: 'api_call',
                    level: 'info',
                    message: 'Successfully loaded node data',
                    details: { nodeCount: result.nodes?.node?.length || 0 },
                });
            }
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Unknown error');
            if (mountedRef.current) {
                store.loadNodesError(error);
                activityStore.addLogEntry({
                    type: 'error',
                    level: 'error',
                    message: 'Failed to load node data',
                    details: { error: error.message },
                });
            }
        }
    }, []); // Zustand stores are stable, no need for dependencies

    useEffect(() => {
        mountedRef.current = true;
        fetchData();

        return () => {
            mountedRef.current = false;
        };
    }, [fetchData]);

    return {
        data: store.nodes,
        loading: store.loading.nodes,
        error: store.errors.nodes,
        refetch: fetchData,
    };
}

// Hook for health checking
export function useHealthCheck() {
    const activityStore = useActivityStore();
    const [status, setStatus] = useState<'ok' | 'error' | 'checking'>('checking');
    const [lastCheck, setLastCheck] = useState<number>(0);
    const mountedRef = useRef(true);

    const checkHealth = useCallback(async () => {
        if (!mountedRef.current) return;

        setStatus('checking');
        try {
            const result = await apiService.healthCheck();
            if (mountedRef.current) {
                setStatus(result.status);
                setLastCheck(result.timestamp);

                if (result.status === 'error') {
                    activityStore.addLogEntry({
                        type: 'system_event',
                        level: 'warn',
                        message: 'Health check failed',
                        details: { timestamp: result.timestamp },
                    });
                }
            }
        } catch (error) {
            if (mountedRef.current) {
                setStatus('error');
                setLastCheck(Date.now());
                activityStore.addLogEntry({
                    type: 'error',
                    level: 'error',
                    message: 'Health check error',
                    details: { error: error instanceof Error ? error.message : 'Unknown error' },
                });
            }
        }
    }, []); // Zustand stores are stable

    useEffect(() => {
        mountedRef.current = true;
        checkHealth();

        // Check health every 30 seconds
        const interval = setInterval(checkHealth, 30000);

        return () => {
            mountedRef.current = false;
            clearInterval(interval);
        };
    }, [checkHealth]);

    return { status, lastCheck, checkHealth };
}

// Generic mutation hook with activity logging
export function useApiMutation<T, P = void>() {
    const activityStore = useActivityStore();
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

                if (options?.method && options?.url) {
                    activityStore.addApiCallLog({
                        method: options.method,
                        url: options.url,
                    });
                }

                const result = await fn(params);

                if (options?.description) {
                    activityStore.addLogEntry({
                        type: 'user_action',
                        level: 'info',
                        message: options.description,
                        details: { success: true },
                    });
                }

                return result;
            } catch (err) {
                const error = err instanceof Error ? err : new Error('Unknown error');
                setError(error);

                if (options?.description) {
                    activityStore.addLogEntry({
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
        []
    ); // Zustand stores are stable

    return { mutate, loading, error };
}
