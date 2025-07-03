import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse, delay } from 'msw';
import { YarnApiClient } from './YarnApiClient';
import { serverHandlers } from './mocks/server-handlers';
import type {
    SchedulerResponse,
    SchedulerConfResponse,
    SchedConfUpdateInfo,
    YarnErrorResponse,
    NodeLabelsResponse,
    NodeToLabelsResponse,
    VersionResponse,
} from '~/types';

// Mock data for tests
const mockSchedulerResponse: SchedulerResponse = {
    scheduler: {
        schedulerInfo: {
            type: 'capacityScheduler',
            capacity: 100,
            usedCapacity: 45.5,
            maxCapacity: 100,
            queueName: 'root',
            queues: {
                queue: [
                    {
                        type: 'capacitySchedulerLeafQueueInfo',
                        capacity: 50,
                        usedCapacity: 80,
                        maxCapacity: 100,
                        absoluteCapacity: 50,
                        absoluteMaxCapacity: 100,
                        absoluteUsedCapacity: 40,
                        numApplications: 5,
                        queueName: 'default',
                        queuePath: 'root.default',
                        state: 'RUNNING',
                    },
                    {
                        type: 'capacityScheduler',
                        capacity: 50,
                        usedCapacity: 31,
                        maxCapacity: 100,
                        absoluteCapacity: 50,
                        absoluteMaxCapacity: 100,
                        absoluteUsedCapacity: 15.5,
                        numApplications: 3,
                        queueName: 'production',
                        queuePath: 'root.production',
                        state: 'RUNNING',
                        queues: {
                            queue: [
                                {
                                    type: 'capacitySchedulerLeafQueueInfo',
                                    capacity: 60,
                                    usedCapacity: 50,
                                    maxCapacity: 100,
                                    absoluteCapacity: 30,
                                    absoluteMaxCapacity: 50,
                                    absoluteUsedCapacity: 15,
                                    numApplications: 2,
                                    queueName: 'batch',
                                    queuePath: 'root.production.batch',
                                    state: 'RUNNING',
                                },
                                {
                                    type: 'capacitySchedulerLeafQueueInfo',
                                    capacity: 40,
                                    usedCapacity: 1.25,
                                    maxCapacity: 100,
                                    absoluteCapacity: 20,
                                    absoluteMaxCapacity: 50,
                                    absoluteUsedCapacity: 0.5,
                                    numApplications: 1,
                                    queueName: 'interactive',
                                    queuePath: 'root.production.interactive',
                                    state: 'RUNNING',
                                },
                            ],
                        },
                    },
                ],
            },
        },
    },
};

const mockConfigResponse: SchedulerConfResponse = {
    property: [
        { name: 'yarn.scheduler.capacity.root.queues', value: 'default,production' },
        { name: 'yarn.scheduler.capacity.root.default.capacity', value: '50' },
        { name: 'yarn.scheduler.capacity.root.default.maximum-capacity', value: '100' },
        { name: 'yarn.scheduler.capacity.root.production.capacity', value: '50' },
        { name: 'yarn.scheduler.capacity.root.production.maximum-capacity', value: '100' },
        { name: 'yarn.scheduler.capacity.root.production.queues', value: 'batch,interactive' },
        { name: 'yarn.scheduler.capacity.root.production.batch.capacity', value: '60' },
        { name: 'yarn.scheduler.capacity.root.production.interactive.capacity', value: '40' },
    ],
};

const mockNodeLabelsResponse: NodeLabelsResponse = {
    nodeLabelsInfo: {
        nodeLabelInfo: [
            { name: 'gpu', exclusivity: true },
            { name: 'ssd', exclusivity: false },
        ],
    },
};

const mockVersionResponse: VersionResponse = {
    versionID: 1234567890,
};

// Mock server setup using centralized handlers
const server = setupServer(...serverHandlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('YarnApiClient', () => {
    describe('constructor and configuration', () => {
        it('should create instance with default configuration', () => {
            const client = new YarnApiClient('/ws/v1/cluster');
            expect(client).toBeDefined();
        });

        it('should create instance with custom configuration', () => {
            const client = new YarnApiClient('/ws/v1/cluster', {
                timeout: 5000,
                headers: { 'X-Custom': 'header' },
            });
            expect(client).toBeDefined();
        });

        it('should handle authentication headers', () => {
            const client = new YarnApiClient('/ws/v1/cluster', {
                headers: {
                    Authorization: 'Bearer token123',
                },
            });
            expect(client).toBeDefined();
        });

        it('should handle baseUrl with trailing slash', () => {
            const client1 = new YarnApiClient('/ws/v1/cluster/');
            const client2 = new YarnApiClient('/ws/v1/cluster');

            expect(client1).toBeDefined();
            expect(client2).toBeDefined();
        });
    });

    describe('getScheduler', () => {
        it('should fetch scheduler data successfully', async () => {
            const client = new YarnApiClient('/ws/v1/cluster');
            const response = await client.getScheduler();

            expect(response.scheduler.schedulerInfo.type).toBe('capacityScheduler');
            expect(response.scheduler.schedulerInfo.queueName).toBe('root');
            expect(response.scheduler.schedulerInfo.queues.queue).toBeDefined();
            expect(Array.isArray(response.scheduler.schedulerInfo.queues.queue)).toBe(true);
        });

        it('should handle nested queue structure', async () => {
            const client = new YarnApiClient('/ws/v1/cluster');
            const response = await client.getScheduler();

            const queues = response.scheduler.schedulerInfo.queues.queue;
            expect(queues.length).toBeGreaterThan(0);
            
            // Find a parent queue that has children
            const parentQueue = queues.find(q => q.queues?.queue);
            if (parentQueue) {
                expect(parentQueue.queues?.queue).toBeDefined();
                expect(Array.isArray(parentQueue.queues?.queue)).toBe(true);
            }
        });

        it('should include custom headers in request', async () => {
            const customHeaders = { 'X-Custom-Header': 'test-value' };
            let capturedHeaders: Headers | undefined;

            server.use(
                http.get('*/ws/v1/cluster/scheduler', ({ request }) => {
                    capturedHeaders = request.headers;
                    return HttpResponse.json(mockSchedulerResponse);
                })
            );

            const client = new YarnApiClient('/ws/v1/cluster', {
                headers: customHeaders,
            });
            await client.getScheduler();

            expect(capturedHeaders?.get('X-Custom-Header')).toBe('test-value');
            expect(capturedHeaders?.get('Accept')).toBe('application/json');
        });
    });

    describe('getSchedulerConf', () => {
        it('should fetch configuration data successfully', async () => {
            const client = new YarnApiClient('/ws/v1/cluster');
            const response = await client.getSchedulerConf();

            expect(response.property).toBeDefined();
            expect(Array.isArray(response.property)).toBe(true);
            expect(response.property.length).toBeGreaterThan(0);
            
            // Check that all properties have name and value
            response.property.forEach(prop => {
                expect(prop.name).toBeDefined();
                expect(prop.value).toBeDefined();
            });
        });

        it('should handle empty configuration', async () => {
            server.use(
                http.get('*/ws/v1/cluster/scheduler-conf', () => {
                    return HttpResponse.json({ property: [] });
                })
            );

            const client = new YarnApiClient('/ws/v1/cluster');
            const response = await client.getSchedulerConf();

            expect(response.property).toEqual([]);
        });
    });

    describe('updateSchedulerConf', () => {
        it('should update configuration successfully', async () => {
            server.use(
                http.put('*/ws/v1/cluster/scheduler-conf', () => {
                    return new HttpResponse(null, { status: 200 });
                })
            );

            const client = new YarnApiClient('/ws/v1/cluster');
            const updateRequest: SchedConfUpdateInfo = {
                'update-queue': [
                    {
                        'queue-name': 'root.default',
                        params: {
                            capacity: '60',
                            'maximum-capacity': '100',
                        },
                    },
                ],
            };

            await expect(client.updateSchedulerConf(updateRequest)).resolves.not.toThrow();
        });

        it('should send correct content type header', async () => {
            let capturedHeaders: Headers | undefined;

            server.use(
                http.put('*/ws/v1/cluster/scheduler-conf', ({ request }) => {
                    capturedHeaders = request.headers;
                    return new HttpResponse(null, { status: 200 });
                })
            );

            const client = new YarnApiClient('/ws/v1/cluster');
            await client.updateSchedulerConf({ 'global-updates': { 'test.property': 'value' } });

            expect(capturedHeaders?.get('Content-Type')).toBe('application/json');
        });

        it('should handle complex mutation requests', async () => {
            let capturedBody: SchedConfUpdateInfo | undefined;

            server.use(
                http.put('*/ws/v1/cluster/scheduler-conf', async ({ request }) => {
                    capturedBody = await request.json();
                    return new HttpResponse(null, { status: 200 });
                })
            );

            const client = new YarnApiClient('/ws/v1/cluster');
            const complexUpdate: SchedConfUpdateInfo = {
                'add-queue': [
                    {
                        'queue-name': 'root.test',
                        params: {
                            capacity: '10',
                            'maximum-capacity': '50',
                        },
                    },
                ],
                'update-queue': [
                    {
                        'queue-name': 'root.default',
                        params: {
                            capacity: '45',
                        },
                    },
                ],
                'remove-queue': ['root.production.interactive'],
                'global-updates': {
                    'yarn.scheduler.capacity.resource-calculator':
                        'org.apache.hadoop.yarn.util.resource.DominantResourceCalculator',
                },
            };

            await client.updateSchedulerConf(complexUpdate);

            expect(capturedBody).toEqual(complexUpdate);
            expect(capturedBody!['add-queue']).toHaveLength(1);
            expect(capturedBody!['update-queue']).toHaveLength(1);
            expect(capturedBody!['remove-queue']).toHaveLength(1);
            expect(capturedBody!['global-updates']).toBeDefined();
        });
    });

    describe('validateSchedulerConf', () => {
        it('should validate configuration successfully', async () => {
            server.use(
                http.post('*/ws/v1/cluster/scheduler-conf/validate', () => {
                    return new HttpResponse(null, { status: 200 });
                })
            );

            const client = new YarnApiClient('/ws/v1/cluster');
            const updateRequest: SchedConfUpdateInfo = {
                'update-queue': [
                    {
                        'queue-name': 'root.default',
                        params: { capacity: '60' },
                    },
                ],
            };

            await expect(client.validateSchedulerConf(updateRequest)).resolves.not.toThrow();
        });

        it('should pass through request body correctly', async () => {
            let capturedBody: SchedConfUpdateInfo | undefined;

            server.use(
                http.post('*/ws/v1/cluster/scheduler-conf/validate', async ({ request }) => {
                    capturedBody = await request.json();
                    return new HttpResponse(null, { status: 200 });
                })
            );

            const client = new YarnApiClient('/ws/v1/cluster');
            const validationRequest: SchedConfUpdateInfo = {
                'add-queue': [
                    {
                        'queue-name': 'root.newqueue',
                        params: {
                            capacity: '10',
                            'maximum-capacity': '50',
                        },
                    },
                ],
            };

            await client.validateSchedulerConf(validationRequest);
            expect(capturedBody).toEqual(validationRequest);
        });
    });

    describe('getSchedulerConfVersion', () => {
        it('should fetch configuration version successfully', async () => {
            const client = new YarnApiClient('/ws/v1/cluster');
            const response = await client.getSchedulerConfVersion();

            expect(response).toEqual(mockVersionResponse);
            expect(response.versionID).toBe(1234567890);
        });

        it('should handle version endpoint errors', async () => {
            server.use(
                http.get('*/ws/v1/cluster/scheduler-conf/version', () => {
                    return new HttpResponse(null, { status: 404 });
                })
            );

            const client = new YarnApiClient('/ws/v1/cluster');
            await expect(client.getSchedulerConfVersion()).rejects.toThrow('HTTP 404');
        });
    });

    describe('node label endpoints', () => {
        describe('getNodeLabels', () => {
            it('should fetch node labels successfully', async () => {
                const client = new YarnApiClient('/ws/v1/cluster');
                const response = await client.getNodeLabels();

                expect(response.nodeLabelsInfo).toBeDefined();
                expect(response.nodeLabelsInfo?.nodeLabelInfo).toBeDefined();
                expect(Array.isArray(response.nodeLabelsInfo?.nodeLabelInfo)).toBe(true);
                
                if (response.nodeLabelsInfo?.nodeLabelInfo && response.nodeLabelsInfo.nodeLabelInfo.length > 0) {
                    const firstLabel = response.nodeLabelsInfo.nodeLabelInfo[0];
                    expect(firstLabel.name).toBeDefined();
                    expect(typeof firstLabel.exclusivity).toBe('boolean');
                }
            });

            it('should handle empty node labels', async () => {
                server.use(
                    http.get('*/ws/v1/cluster/get-node-labels', () => {
                        return HttpResponse.json({ nodeLabelsInfo: {} });
                    })
                );

                const client = new YarnApiClient('/ws/v1/cluster');
                const response = await client.getNodeLabels();

                expect(response.nodeLabelsInfo).toBeDefined();
                expect(response.nodeLabelsInfo?.nodeLabelInfo).toBeUndefined();
            });
        });

        describe('addNodeLabels', () => {
            it('should add node labels successfully', async () => {
                server.use(
                    http.post('*/ws/v1/cluster/add-node-labels', () => {
                        return new HttpResponse(null, { status: 200 });
                    })
                );

                const client = new YarnApiClient('/ws/v1/cluster');
                await expect(client.addNodeLabels(['gpu', 'ssd', 'nvme'])).resolves.not.toThrow();
            });

            it('should send labels in correct format', async () => {
                let capturedBody: { nodeLabels: string[] } | undefined;

                server.use(
                    http.post('*/ws/v1/cluster/add-node-labels', async ({ request }) => {
                        capturedBody = await request.json();
                        return new HttpResponse(null, { status: 200 });
                    })
                );

                const client = new YarnApiClient('/ws/v1/cluster');
                await client.addNodeLabels(['label1', 'label2']);

                expect(capturedBody).toEqual({
                    nodeLabels: ['label1', 'label2'],
                });
            });
        });

        describe('removeNodeLabels', () => {
            it('should remove node labels successfully', async () => {
                server.use(
                    http.post('*/ws/v1/cluster/remove-node-labels', () => {
                        return new HttpResponse(null, { status: 200 });
                    })
                );

                const client = new YarnApiClient('/ws/v1/cluster');
                await expect(client.removeNodeLabels(['deprecated-label'])).resolves.not.toThrow();
            });

            it('should handle removal of non-existent labels', async () => {
                const errorResponse: YarnErrorResponse = {
                    RemoteException: {
                        exception: 'IOException',
                        javaClassName: 'java.io.IOException',
                        message: "Node label 'non-existent' not found",
                    },
                };

                server.use(
                    http.post('*/ws/v1/cluster/remove-node-labels', () => {
                        return HttpResponse.json(errorResponse, { status: 400 });
                    })
                );

                const client = new YarnApiClient('/ws/v1/cluster');
                await expect(client.removeNodeLabels(['non-existent'])).rejects.toThrow(
                    "Node label 'non-existent' not found"
                );
            });
        });

        describe('getNodeToLabels', () => {
            it('should fetch node to label mappings', async () => {
                const mockMappings: NodeToLabelsResponse = {
                    nodeToLabels: {
                        nodeToLabels: [
                            { nodeId: 'node1.cluster.com:8041', labels: ['gpu', 'ssd'] },
                            { nodeId: 'node2.cluster.com:8041', labels: ['ssd'] },
                        ],
                    },
                };

                server.use(
                    http.get('*/ws/v1/cluster/get-node-to-labels', () => {
                        return HttpResponse.json(mockMappings);
                    })
                );

                const client = new YarnApiClient('/ws/v1/cluster');
                const response = await client.getNodeToLabels();

                expect(response.nodeToLabels?.nodeToLabels).toHaveLength(2);
                expect(response.nodeToLabels?.nodeToLabels?.[0].labels).toContain('gpu');
            });
        });

        describe('replaceNodeToLabels', () => {
            it('should replace node labels successfully', async () => {
                server.use(
                    http.post('*/ws/v1/cluster/replace-node-to-labels', () => {
                        return new HttpResponse(null, { status: 200 });
                    })
                );

                const client = new YarnApiClient('/ws/v1/cluster');
                const mapping = {
                    'node1.cluster.com:8041': ['gpu', 'highmem'],
                    'node2.cluster.com:8041': ['ssd'],
                };

                await expect(client.replaceNodeToLabels(mapping)).resolves.not.toThrow();
            });

            it('should send mapping in correct format', async () => {
                let capturedBody: { nodeToLabels: Record<string, string[]> } | undefined;

                server.use(
                    http.post('*/ws/v1/cluster/replace-node-to-labels', async ({ request }) => {
                        capturedBody = await request.json();
                        return new HttpResponse(null, { status: 200 });
                    })
                );

                const client = new YarnApiClient('/ws/v1/cluster');
                const mapping = {
                    node1: ['label1'],
                    node2: ['label2', 'label3'],
                };

                await client.replaceNodeToLabels(mapping);

                expect(capturedBody).toEqual({
                    nodeToLabels: mapping,
                });
            });
        });
    });

    describe('error handling', () => {
        it('should handle HTTP 500 errors', async () => {
            server.use(
                http.get('*/ws/v1/cluster/scheduler', () => {
                    return new HttpResponse(null, {
                        status: 500,
                        statusText: 'Internal Server Error',
                    });
                })
            );

            const client = new YarnApiClient('/ws/v1/cluster');
            await expect(client.getScheduler()).rejects.toThrow('HTTP 500: Internal Server Error');
        });

        it('should handle YARN RemoteException errors', async () => {
            const errorResponse: YarnErrorResponse = {
                RemoteException: {
                    exception: 'AccessControlException',
                    javaClassName: 'org.apache.hadoop.security.AccessControlException',
                    message: 'User does not have admin privileges',
                },
            };

            server.use(
                http.put('*/ws/v1/cluster/scheduler-conf', () => {
                    return HttpResponse.json(errorResponse, { status: 403 });
                })
            );

            const client = new YarnApiClient('/ws/v1/cluster');
            await expect(client.updateSchedulerConf({ 'global-updates': { test: 'value' } })).rejects.toThrow(
                'User does not have admin privileges'
            );
        });

        it('should handle network errors', async () => {
            server.use(
                http.get('*/ws/v1/cluster/scheduler', () => {
                    throw new Error('Network error');
                })
            );

            const client = new YarnApiClient('/ws/v1/cluster');
            await expect(client.getScheduler()).rejects.toThrow();
        });

        it('should handle request timeout', async () => {
            server.use(
                http.get('*/ws/v1/cluster/scheduler', async () => {
                    await delay(100);
                    return HttpResponse.json(mockSchedulerResponse);
                })
            );

            const client = new YarnApiClient('/ws/v1/cluster', { timeout: 50 });
            await expect(client.getScheduler()).rejects.toThrow('aborted');
        });

        it('should handle malformed JSON response', async () => {
            server.use(
                http.get('*/ws/v1/cluster/scheduler', () => {
                    return new HttpResponse('Invalid JSON {', {
                        status: 200,
                        headers: { 'Content-Type': 'application/json' },
                    });
                })
            );

            const client = new YarnApiClient('/ws/v1/cluster');
            await expect(client.getScheduler()).rejects.toThrow();
        });
    });

    describe('edge cases and special scenarios', () => {
        it('should handle empty response body for successful mutations', async () => {
            server.use(
                http.put('*/ws/v1/cluster/scheduler-conf', () => {
                    return new HttpResponse('', { status: 200 });
                })
            );

            const client = new YarnApiClient('/ws/v1/cluster');
            await expect(client.updateSchedulerConf({ 'global-updates': { test: 'value' } })).resolves.not.toThrow();
        });

        it('should preserve queue paths with special characters', async () => {
            const specialQueueResponse: SchedulerResponse = {
                scheduler: {
                    schedulerInfo: {
                        ...mockSchedulerResponse.scheduler.schedulerInfo,
                        queues: {
                            queue: [
                                {
                                    type: 'capacitySchedulerLeafQueueInfo',
                                    capacity: 100,
                                    usedCapacity: 0,
                                    maxCapacity: 100,
                                    absoluteCapacity: 100,
                                    absoluteMaxCapacity: 100,
                                    absoluteUsedCapacity: 0,
                                    numApplications: 0,
                                    queueName: 'queue-with-dash',
                                    queuePath: 'root.queue-with-dash',
                                    state: 'RUNNING',
                                },
                            ],
                        },
                    },
                },
            };

            server.use(
                http.get('*/ws/v1/cluster/scheduler', () => {
                    return HttpResponse.json(specialQueueResponse);
                })
            );

            const client = new YarnApiClient('/ws/v1/cluster');
            const response = await client.getScheduler();

            expect(response.scheduler.schedulerInfo.queues.queue[0].queueName).toBe('queue-with-dash');
        });

        it('should handle concurrent requests', async () => {
            const client = new YarnApiClient('/ws/v1/cluster');

            const promises = [
                client.getScheduler(),
                client.getSchedulerConf(),
                client.getNodeLabels(),
                client.getSchedulerConfVersion(),
            ];

            const results = await Promise.all(promises);

            expect(results).toHaveLength(4);
            expect(results[0]).toHaveProperty('scheduler');
            expect(results[1]).toHaveProperty('property');
            expect(results[2]).toHaveProperty('nodeLabelsInfo');
            expect(results[3]).toHaveProperty('versionID');
        });

        it('should handle partial failure in concurrent requests', async () => {
            server.use(
                http.get('*/ws/v1/cluster/scheduler-conf', () => {
                    return new HttpResponse(null, { status: 500 });
                })
            );

            const client = new YarnApiClient('/ws/v1/cluster');

            const results = await Promise.allSettled([
                client.getScheduler(),
                client.getSchedulerConf(),
                client.getNodeLabels(),
            ]);

            expect(results[0].status).toBe('fulfilled');
            expect(results[1].status).toBe('rejected');
            expect(results[2].status).toBe('fulfilled');
        });
    });
});