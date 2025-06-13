import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { useScheduler, useConfiguration, useApiMutation } from './useApi';

// Mock server
const server = setupServer(
    http.get('/ws/v1/cluster/scheduler', () => {
        return HttpResponse.json({
            scheduler: {
                schedulerInfo: {
                    type: 'capacityScheduler',
                    capacity: 100,
                    usedCapacity: 25,
                    maxCapacity: 100,
                    queueName: 'root',
                    queues: {
                        queue: [
                            { queueName: 'default', capacity: 30 },
                            { queueName: 'production', capacity: 70 },
                        ],
                    },
                },
            },
        });
    }),

    http.get('/ws/v1/cluster/scheduler-conf', () => {
        return HttpResponse.json({
            property: [{ name: 'yarn.scheduler.capacity.root.queues', value: 'default,production' }],
        });
    })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('useApi hooks', () => {
    describe('useScheduler', () => {
        it('should fetch scheduler data successfully', async () => {
            const { result } = renderHook(() => useScheduler());

            // Initially loading
            expect(result.current.loading).toBe(true);
            expect(result.current.data).toBeNull();
            expect(result.current.error).toBeNull();

            // Wait for data to load
            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.data).toBeDefined();
            expect(result.current.data?.scheduler.schedulerInfo.type).toBe('capacityScheduler');
            expect(result.current.data?.scheduler.schedulerInfo.queues?.queue).toHaveLength(2);
            expect(result.current.error).toBeNull();
        });

        it('should handle errors gracefully', async () => {
            server.use(
                http.get('/ws/v1/cluster/scheduler', () => {
                    return new HttpResponse(null, { status: 500 });
                })
            );

            const { result } = renderHook(() => useScheduler());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.data).toBeNull();
            expect(result.current.error).toBeDefined();
            expect(result.current.error?.message).toContain('HTTP 500');
        });

        it('should provide refetch functionality', async () => {
            const { result } = renderHook(() => useScheduler());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.data).toBeDefined();

            // Test refetch
            await result.current.refetch();
            expect(result.current.data).toBeDefined();
        });
    });

    describe('useConfiguration', () => {
        it('should fetch configuration data successfully', async () => {
            const { result } = renderHook(() => useConfiguration());

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.data).toBeDefined();
            expect(result.current.data?.property).toHaveLength(1);
            expect(result.current.error).toBeNull();
        });
    });

    describe('useApiMutation', () => {
        it('should handle mutations successfully', async () => {
            const { result } = renderHook(() => useApiMutation<string, string>());

            expect(result.current.loading).toBe(false);
            expect(result.current.error).toBeNull();

            const mockFn = async (param: string) => `processed: ${param}`;
            const mutationResult = await result.current.mutate(mockFn, 'test');

            expect(mutationResult).toBe('processed: test');
            expect(result.current.loading).toBe(false);
            expect(result.current.error).toBeNull();
        });

        it('should handle mutation errors', async () => {
            const { result } = renderHook(() => useApiMutation<string, string>());

            const mockFn = async () => {
                throw new Error('Mutation failed');
            };

            await expect(result.current.mutate(mockFn, 'test')).rejects.toThrow('Mutation failed');

            // Wait for the component to update
            await waitFor(() => {
                expect(result.current.loading).toBe(false);
                expect(result.current.error?.message).toBe('Mutation failed');
            });
        });
    });
});
