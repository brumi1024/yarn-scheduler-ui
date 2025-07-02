/**
 * React Query configuration for YARN Scheduler UI
 */

import { QueryClient } from '@tanstack/react-query';

/**
 * Create a QueryClient with configuration that matches our previous
 * YarnApiClient retry behavior
 */
export const createQueryClient = (): QueryClient => {
    return new QueryClient({
        defaultOptions: {
            queries: {
                // Retry configuration matching our previous implementation
                retry: 3,
                retryDelay: (attemptIndex) => {
                    // Exponential backoff: 1s, 2s, 4s, etc., max 30s
                    return Math.min(1000 * Math.pow(2, attemptIndex), 30000);
                },

                // Don't retry on 4xx errors (client errors)
                retryOnMount: true,
                retry: (failureCount, error): boolean => {
                    if (error instanceof Error) {
                        // Don't retry on 4xx errors
                        if (error.message.includes('HTTP 4')) {
                            return false;
                        }
                    }
                    return failureCount < 3;
                },

                // Cache configuration
                staleTime: 5 * 60 * 1000, // Data is fresh for 5 minutes
                cacheTime: 10 * 60 * 1000, // Keep in cache for 10 minutes

                // Refetch configuration
                refetchOnWindowFocus: true,
                refetchOnReconnect: true,
                refetchOnMount: true,

                // Network mode
                networkMode: 'online', // Pause queries when offline
            },
            mutations: {
                // Mutations typically should not retry automatically
                retry: 0,

                // Network mode
                networkMode: 'online',
            },
        },
    });
};

// Export a default instance
export const queryClient = createQueryClient();