import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { ApiService } from './ApiService';

// Mock server setup
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
                },
            },
        });
    }),

    http.get('/ws/v1/cluster/scheduler-conf', () => {
        return HttpResponse.json({
            property: [{ name: 'yarn.scheduler.capacity.root.queues', value: 'default,production' }],
        });
    }),

    http.put('/ws/v1/cluster/scheduler-conf', () => {
        return HttpResponse.json({
            response: 'Configuration updated successfully',
        });
    }),

    http.get('/ws/v1/cluster/nodes', () => {
        return HttpResponse.json({
            nodes: {
                node: [
                    {
                        id: 'worker1:8041',
                        state: 'RUNNING',
                        nodeHostName: 'worker1',
                        totalResource: { memory: 8192, vCores: 4 },
                    },
                ],
            },
        });
    }),

    http.get('/ws/v1/cluster/get-node-labels', () => {
        return HttpResponse.json({
            nodeLabelsInfo: {
                nodeLabelInfo: [{ name: 'gpu', exclusivity: true }],
            },
        });
    })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('ApiService', () => {
    let apiService: ApiService;

    beforeAll(() => {
        apiService = new ApiService();
    });

    describe('scheduler endpoints', () => {
        it('should fetch scheduler information', async () => {
            const response = await apiService.getScheduler();

            expect(response).toBeDefined();
            expect(response.scheduler.schedulerInfo.type).toBe('capacityScheduler');
            expect(response.scheduler.schedulerInfo.queueName).toBe('root');
        });

        it('should fetch configuration', async () => {
            const response = await apiService.getConfiguration();

            expect(response).toBeDefined();
            expect(response.property).toHaveLength(1);
            expect(response.property[0].name).toBe('yarn.scheduler.capacity.root.queues');
        });

        it('should update configuration', async () => {
            const changes = {
                'update-queue': [
                    {
                        'queue-name': 'default',
                        params: { capacity: '50' },
                    },
                ],
            };

            const response = await apiService.updateConfiguration(changes);

            expect(response).toBeDefined();
            expect(response.response).toBe('Configuration updated successfully');
        });
    });

    describe('node endpoints', () => {
        it('should fetch nodes', async () => {
            const response = await apiService.getNodes();

            expect(response).toBeDefined();
            expect(response.nodes.node).toHaveLength(1);
            expect(response.nodes.node[0].id).toBe('worker1:8041');
        });

        it('should fetch node labels', async () => {
            const response = await apiService.getNodeLabels();

            expect(response).toBeDefined();
            expect(response.nodeLabelsInfo.nodeLabelInfo).toHaveLength(1);
            expect(response.nodeLabelsInfo.nodeLabelInfo[0].name).toBe('gpu');
        });
    });

    describe('error handling', () => {
        it('should handle HTTP errors', async () => {
            server.use(
                http.get('/ws/v1/cluster/scheduler', () => {
                    return new HttpResponse(null, { status: 500, statusText: 'Internal Server Error' });
                })
            );

            await expect(apiService.getScheduler()).rejects.toThrow('HTTP 500: Internal Server Error');
        });

        it('should handle request timeouts', async () => {
            const shortTimeoutService = new ApiService('/ws/v1/cluster', 10);

            server.use(
                http.get('/ws/v1/cluster/scheduler', async () => {
                    // Delay longer than timeout to trigger AbortController
                    await new Promise((resolve) => setTimeout(resolve, 50));
                    return HttpResponse.json({});
                })
            );

            await expect(shortTimeoutService.getScheduler()).rejects.toThrow();
        });
    });

    describe('health check', () => {
        it('should return ok status when scheduler is accessible', async () => {
            const health = await apiService.healthCheck();

            expect(health.status).toBe('ok');
            expect(health.timestamp).toBeTypeOf('number');
        });

        it('should return error status when scheduler is not accessible', async () => {
            server.use(
                http.get('/ws/v1/cluster/scheduler', () => {
                    return new HttpResponse(null, { status: 500 });
                })
            );

            const health = await apiService.healthCheck();

            expect(health.status).toBe('error');
            expect(health.timestamp).toBeTypeOf('number');
        });
    });
});
