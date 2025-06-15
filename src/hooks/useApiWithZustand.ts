import { useEffect, useCallback, useRef, useState } from 'react';
import { apiService } from '../api/ApiService';
import { useDataStore } from '../store/zustand';
import { useActivityStore } from '../store/activityStore';

// Hook for scheduler data with Zustand integration
export function useScheduler() {
    const { scheduler, loading, error, loadAllData } = useDataStore();
    const addLogEntry = useActivityStore((state) => state.addLogEntry);

    const fetchData = useCallback(async () => {
        try {
            await loadAllData();
            addLogEntry({
                type: 'api_call',
                level: 'info',
                message: 'Successfully loaded scheduler data',
                details: { timestamp: Date.now() },
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
    }, [loadAllData, addLogEntry]);

    return {
        data: scheduler,
        loading,
        error,
        refetch: fetchData,
    };
}

// Hook for configuration data with Zustand integration
export function useConfiguration() {
    const { configuration, loading, error, loadAllData } = useDataStore();
    const addLogEntry = useActivityStore((state) => state.addLogEntry);

    const fetchData = useCallback(async () => {
        try {
            await loadAllData();
            addLogEntry({
                type: 'api_call',
                level: 'info',
                message: 'Successfully loaded configuration data',
                details: { timestamp: Date.now() },
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
    }, [loadAllData, addLogEntry]);

    return {
        data: configuration,
        loading,
        error,
        refetch: fetchData,
    };
}

// Hook for node labels with Zustand integration
export function useNodeLabels() {
    const { nodeLabels, loading, error, loadAllData } = useDataStore();
    const addLogEntry = useActivityStore((state) => state.addLogEntry);

    const fetchData = useCallback(async () => {
        try {
            await loadAllData();
            addLogEntry({
                type: 'api_call',
                level: 'info',
                message: 'Successfully loaded node labels',
                details: { timestamp: Date.now() },
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
    }, [loadAllData, addLogEntry]);

    return {
        data: nodeLabels,
        loading,
        error,
        refetch: fetchData,
    };
}

// Hook for nodes with Zustand integration
export function useNodes() {
    const { nodes, loading, error, loadAllData } = useDataStore();
    const addLogEntry = useActivityStore((state) => state.addLogEntry);

    const fetchData = useCallback(async () => {
        try {
            await loadAllData();
            addLogEntry({
                type: 'api_call',
                level: 'info',
                message: 'Successfully loaded node data',
                details: { timestamp: Date.now() },
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
    }, [loadAllData, addLogEntry]);

    return {
        data: nodes,
        loading,
        error,
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
        [addLogEntry]
    );

    return { mutate, loading, error };
}
