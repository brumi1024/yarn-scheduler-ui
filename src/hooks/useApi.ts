import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../api/ApiService';
import type { SchedulerResponse, ConfigurationResponse } from '../types/Configuration';
import type { NodeLabelsResponse, NodesResponse } from '../types/NodeLabel';

export interface UseApiState<T> {
    data: T | null;
    loading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
}

export function useScheduler(): UseApiState<SchedulerResponse> {
    const [data, setData] = useState<SchedulerResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const result = await apiService.getScheduler();
            setData(result);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Unknown error'));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return { data, loading, error, refetch: fetchData };
}

export function useConfiguration(): UseApiState<ConfigurationResponse> {
    const [data, setData] = useState<ConfigurationResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const result = await apiService.getConfiguration();
            setData(result);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Unknown error'));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return { data, loading, error, refetch: fetchData };
}

export function useNodeLabels(): UseApiState<NodeLabelsResponse> {
    const [data, setData] = useState<NodeLabelsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const result = await apiService.getNodeLabels();
            setData(result);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Unknown error'));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return { data, loading, error, refetch: fetchData };
}

export function useNodes(): UseApiState<NodesResponse> {
    const [data, setData] = useState<NodesResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const result = await apiService.getNodes();
            setData(result);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Unknown error'));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return { data, loading, error, refetch: fetchData };
}

// Generic mutation hook for POST/PUT operations
export function useApiMutation<T, P = void>() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const mutate = useCallback(async (fn: (params: P) => Promise<T>, params: P): Promise<T | null> => {
        try {
            setLoading(true);
            setError(null);
            const result = await fn(params);
            return result;
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Unknown error');
            setError(error);
            throw error;
        } finally {
            setLoading(false);
        }
    }, []);

    return { mutate, loading, error };
}

// Health check hook
export function useHealthCheck() {
    const [status, setStatus] = useState<'ok' | 'error' | 'checking'>('checking');
    const [lastCheck, setLastCheck] = useState<number>(0);

    const checkHealth = useCallback(async () => {
        setStatus('checking');
        try {
            const result = await apiService.healthCheck();
            setStatus(result.status);
            setLastCheck(result.timestamp);
        } catch {
            setStatus('error');
            setLastCheck(Date.now());
        }
    }, []);

    useEffect(() => {
        checkHealth();

        // Check health every 30 seconds
        const interval = setInterval(checkHealth, 30000);
        return () => clearInterval(interval);
    }, [checkHealth]);

    return { status, lastCheck, checkHealth };
}
