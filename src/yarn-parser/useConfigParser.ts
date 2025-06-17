/**
 * useConfigParser Hook
 * 
 * React Query hook for asynchronous configuration parsing using Web Workers.
 * Provides loading states, error handling, and caching for parsed configurations.
 */

import { useQuery } from '@tanstack/react-query';
import { parserService } from './parser.service';
import type { ConfigurationResponse } from '../types/Configuration';

export const useConfigParser = (configData: ConfigurationResponse | null | undefined) => {
    return useQuery({
        queryKey: ['config-parser', configData],
        queryFn: async () => {
            if (!configData || !configData.property) {
                throw new Error('No configuration data to parse.');
            }

            // Convert property array to configuration object for ConfigParser
            const configuration: Record<string, string> = {};
            configData.property.forEach((prop) => {
                configuration[prop.name] = prop.value;
            });

            // Call the service which uses the Web Worker
            return parserService.parseConfiguration(configuration);
        },
        // This query should only run when configData is available
        enabled: !!configData,
        // The parsed data is static for a given input, so it can be cached indefinitely
        staleTime: Infinity,
        gcTime: Infinity, // Updated from cacheTime (deprecated) to gcTime
        // Retry on failure since parsing might fail due to worker issues
        retry: 1,
        retryDelay: 1000,
    });
};