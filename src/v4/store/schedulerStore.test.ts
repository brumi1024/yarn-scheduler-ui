import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
    createSchedulerStore,
    traverseQueueTree,
    buildMutationRequest,
} from './schedulerStore';
import type {
    QueueInfo,
    StagedChange,
} from '../types';

import {
    mockSchedulerResponse,
    mockConfigResponse,
    mockNodeLabelsResponse,
    mockVersionResponse,
} from '../__mocks__/schedulerResponse';

// Mock the YARN API client
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Helper function to set up store with data
async function setupStoreWithData(store: ReturnType<typeof createSchedulerStore>) {
    mockFetch
        .mockResolvedValueOnce({
            ok: true,
            json: vi.fn().mockResolvedValue(mockSchedulerResponse),
        })
        .mockResolvedValueOnce({
            ok: true,
            json: vi.fn().mockResolvedValue(mockConfigResponse),
        })
        .mockResolvedValueOnce({
            ok: true,
            json: vi.fn().mockResolvedValue(mockNodeLabelsResponse),
        })
        .mockResolvedValueOnce({
            ok: true,
            json: vi.fn().mockResolvedValue(mockVersionResponse),
        });

    await store.getState().loadInitialData();
}

describe('schedulerStore', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('store initialization', () => {
        it('should create store with initial state', () => {
            const store = createSchedulerStore();
            const state = store.getState();

            expect(state.schedulerData).toBeNull();
            expect(state.configData).toEqual(new Map());
            expect(state.nodeLabels).toEqual([]);
            expect(state.stagedChanges).toEqual([]);
            expect(state.selectedNodeLabel).toBeNull();
            expect(state.configVersion).toBe(0);
            expect(state.isLoading).toBe(false);
            expect(state.error).toBeNull();
        });

        it('should have all required actions', () => {
            const store = createSchedulerStore();
            const state = store.getState();

            expect(typeof state.loadInitialData).toBe('function');
            expect(typeof state.refreshSchedulerData).toBe('function');
            expect(typeof state.stageQueueChange).toBe('function');
            expect(typeof state.stageGlobalChange).toBe('function');
            expect(typeof state.stageQueueAddition).toBe('function');
            expect(typeof state.stageQueueRemoval).toBe('function');
            expect(typeof state.stageLabelQueueChange).toBe('function');
            expect(typeof state.applyChanges).toBe('function');
            expect(typeof state.revertChange).toBe('function');
            expect(typeof state.clearAllChanges).toBe('function');
            expect(typeof state.selectNodeLabel).toBe('function');
        });

        it('should have computed value functions', () => {
            const store = createSchedulerStore();
            const state = store.getState();

            expect(typeof state.getQueueConfiguredCapacity).toBe('function');
            expect(typeof state.getQueueDisplayValue).toBe('function');
            expect(typeof state.getLabelChangesForQueue).toBe('function');
        });
    });

    describe('loadInitialData', () => {
        it('should load all data sources in parallel', async () => {
            mockFetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: vi.fn().mockResolvedValue(mockSchedulerResponse),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: vi.fn().mockResolvedValue(mockConfigResponse),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: vi.fn().mockResolvedValue(mockNodeLabelsResponse),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: vi.fn().mockResolvedValue(mockVersionResponse),
                });

            const store = createSchedulerStore();

            await store.getState().loadInitialData();

            expect(mockFetch).toHaveBeenCalledTimes(4);
            expect(mockFetch).toHaveBeenCalledWith('/ws/v1/cluster/scheduler', {
                headers: { Accept: 'application/json' },
            });
            expect(mockFetch).toHaveBeenCalledWith('/ws/v1/cluster/scheduler-conf', {
                headers: { Accept: 'application/json' },
            });
            expect(mockFetch).toHaveBeenCalledWith('/ws/v1/cluster/get-node-labels', {
                headers: { Accept: 'application/json' },
            });
            expect(mockFetch).toHaveBeenCalledWith('/ws/v1/cluster/scheduler-conf/version', {
                headers: { Accept: 'application/json' },
            });

            expect(store.getState().schedulerData).toEqual(mockSchedulerResponse.scheduler.schedulerInfo);
            expect(store.getState().configData.size).toBe(19);
            expect(store.getState().configData.get('yarn.scheduler.capacity.root.default.capacity')).toBe('10');
            expect(store.getState().nodeLabels).toHaveLength(3);
            expect(store.getState().configVersion).toBe(1234567890);
        });

        it('should set loading state during data fetch', async () => {
            const store = createSchedulerStore();

            // Create a promise that we can control
            let resolvePromise: (value: any) => void;
            const controlledPromise = new Promise((resolve) => {
                resolvePromise = resolve;
            });

            mockFetch.mockReturnValue(controlledPromise);

            // Start the load without awaiting
            const loadPromise = store.getState().loadInitialData();

            // Check loading state immediately
            expect(store.getState().isLoading).toBe(true);

            // Resolve all the promises
            resolvePromise!({
                ok: true,
                json: vi.fn().mockResolvedValue(mockSchedulerResponse),
            });
            
            // Wait for the promise to settle
            await loadPromise.catch(() => {}); // Catch any errors to prevent unhandled rejection

            expect(store.getState().isLoading).toBe(false);
        });

        it('should handle API errors gracefully', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            const store = createSchedulerStore();

            // Call loadInitialData and expect it to throw
            let error: unknown;
            try {
                await store.getState().loadInitialData();
            } catch (e) {
                error = e;
            }
            
            expect(error).toBeDefined();

            expect(store.getState().error).toBe('Failed to load initial data: Network error');
            expect(store.getState().isLoading).toBe(false);
        });

        it('should handle HTTP error responses', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 403,
                statusText: 'Forbidden',
                text: vi.fn().mockResolvedValue('Access denied'),
            });

            const store = createSchedulerStore();

            // Call loadInitialData and expect it to throw
            let error: unknown;
            try {
                await store.getState().loadInitialData();
            } catch (e) {
                error = e;
            }
            
            expect(error).toBeDefined();

            expect(store.getState().error).toBe('Failed to load initial data: Failed to load scheduler data: HTTP 403: Access denied');
            expect(store.getState().isLoading).toBe(false);
        });
    });

    describe('refreshSchedulerData', () => {
        it('should only refresh scheduler data, not config', async () => {
            const store = createSchedulerStore();

            // First load initial data
            mockFetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: vi.fn().mockResolvedValue(mockSchedulerResponse),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: vi.fn().mockResolvedValue(mockConfigResponse),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: vi.fn().mockResolvedValue(mockNodeLabelsResponse),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: vi.fn().mockResolvedValue(mockVersionResponse),
                });

            await store.getState().loadInitialData();

            vi.clearAllMocks();

            // Now refresh only scheduler data
            const updatedSchedulerResponse = {
                ...mockSchedulerResponse,
                scheduler: {
                    ...mockSchedulerResponse.scheduler,
                    schedulerInfo: {
                        ...mockSchedulerResponse.scheduler.schedulerInfo,
                        usedCapacity: 60, // Changed value
                    },
                },
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: vi.fn().mockResolvedValue(updatedSchedulerResponse),
            });

            await store.getState().refreshSchedulerData();

            expect(mockFetch).toHaveBeenCalledTimes(1);
            expect(mockFetch).toHaveBeenCalledWith('/ws/v1/cluster/scheduler', {
                headers: { Accept: 'application/json' },
            });

            expect(store.getState().schedulerData?.usedCapacity).toBe(60);
            // Config data should remain unchanged
            expect(store.getState().configData.size).toBe(19);
        });
    });

    describe('staging changes', () => {
        describe('stageQueueChange', () => {
            it('should stage a queue property change', () => {
                const store = createSchedulerStore();

                store.getState().stageQueueChange('root.default', 'capacity', '60');

                expect(store.getState().stagedChanges).toHaveLength(1);
                expect(store.getState().stagedChanges[0]).toMatchObject({
                    type: 'update',
                    queuePath: 'root.default',
                    property: 'capacity',
                    oldValue: undefined,
                    newValue: '60',
                });
                expect(store.getState().stagedChanges[0].id).toBeDefined();
            });

            it('should update existing staged change for same property', () => {
                const store = createSchedulerStore();

                store.getState().stageQueueChange('root.default', 'capacity', '60');
                store.getState().stageQueueChange('root.default', 'capacity', '70');

                expect(store.getState().stagedChanges).toHaveLength(1);
                expect(store.getState().stagedChanges[0].newValue).toBe('70');
            });
        });

        describe('stageGlobalChange', () => {
            it('should stage a global property change', () => {
                const store = createSchedulerStore();

                store.getState().stageGlobalChange('maximum-applications', '15000');

                expect(store.getState().stagedChanges).toHaveLength(1);
                expect(store.getState().stagedChanges[0]).toMatchObject({
                    type: 'update',
                    queuePath: 'global',
                    property: 'maximum-applications',
                    oldValue: undefined,
                    newValue: '15000',
                });
            });
        });

        describe('stageQueueAddition', () => {
            it('should stage queue addition with properties', () => {
                const store = createSchedulerStore();

                const queueConfig = {
                    capacity: '20',
                    'maximum-capacity': '50',
                    state: 'RUNNING',
                };

                store.getState().stageQueueAddition('root.production', 'team2', queueConfig);

                expect(store.getState().stagedChanges).toHaveLength(3); // One for each property
                
                const addChanges = store.getState().stagedChanges.filter(c => c.type === 'add');
                expect(addChanges).toHaveLength(3);
                expect(addChanges.every(c => c.queuePath === 'root.production.team2')).toBe(true);
            });
        });

        describe('stageQueueRemoval', () => {
            it('should stage queue removal', () => {
                const store = createSchedulerStore();

                store.getState().stageQueueRemoval('root.production.batch');

                expect(store.getState().stagedChanges).toHaveLength(1);
                expect(store.getState().stagedChanges[0]).toMatchObject({
                    type: 'remove',
                    queuePath: 'root.production.batch',
                    property: undefined,
                    oldValue: undefined,
                    newValue: undefined,
                });
            });
        });

        describe('stageLabelQueueChange', () => {
            it('should stage node label property change', () => {
                const store = createSchedulerStore();

                store.getState().stageLabelQueueChange('root.default', 'gpu', 'capacity', '30');

                expect(store.getState().stagedChanges).toHaveLength(1);
                expect(store.getState().stagedChanges[0]).toMatchObject({
                    type: 'update',
                    queuePath: 'root.default',
                    property: 'accessible-node-labels.gpu.capacity',
                    oldValue: undefined,
                    newValue: '30',
                });
            });
        });
    });

    describe('change management', () => {
        describe('revertChange', () => {
            it('should remove staged change by id', () => {
                const store = createSchedulerStore();

                store.getState().stageQueueChange('root.default', 'capacity', '60');

                const changeId = store.getState().stagedChanges[0].id;

                store.getState().revertChange(changeId);

                expect(store.getState().stagedChanges).toHaveLength(0);
            });

            it('should not affect other staged changes', () => {
                const store = createSchedulerStore();

                store.getState().stageQueueChange('root.default', 'capacity', '60');
                store.getState().stageQueueChange('root.production', 'capacity', '40');

                const firstChangeId = store.getState().stagedChanges[0].id;

                store.getState().revertChange(firstChangeId);

                expect(store.getState().stagedChanges).toHaveLength(1);
                expect(store.getState().stagedChanges[0].queuePath).toBe('root.production');
            });
        });

        describe('clearAllChanges', () => {
            it('should clear all staged changes', () => {
                const store = createSchedulerStore();

                store.getState().stageQueueChange('root.default', 'capacity', '60');
                store.getState().stageGlobalChange('maximum-applications', '15000');

                expect(store.getState().stagedChanges).toHaveLength(2);

                store.getState().clearAllChanges();

                expect(store.getState().stagedChanges).toHaveLength(0);
            });
        });
    });

    describe('applyChanges', () => {
        it('should send mutation request and reload data on success', async () => {
            const store = createSchedulerStore();

            // Stage some changes
            store.getState().stageQueueChange('root.default', 'capacity', '60');
            store.getState().stageGlobalChange('maximum-applications', '15000');

            // Mock successful mutation response
            mockFetch
                .mockResolvedValueOnce({
                    ok: true,
                    text: vi.fn().mockResolvedValue(''),
                })
                // Mock reload calls
                .mockResolvedValueOnce({
                    ok: true,
                    json: vi.fn().mockResolvedValue(mockSchedulerResponse),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: vi.fn().mockResolvedValue(mockConfigResponse),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: vi.fn().mockResolvedValue(mockNodeLabelsResponse),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: vi.fn().mockResolvedValue({ versionID: 1234567891 }),
                });

            await store.getState().applyChanges();

            // Check mutation request was sent
            expect(mockFetch).toHaveBeenCalledWith('/ws/v1/cluster/scheduler-conf', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: expect.stringContaining('update-queue'),
            });

            // Check staged changes were cleared
            expect(store.getState().stagedChanges).toHaveLength(0);
            // Version should be incremented from initial load
            expect(store.getState().configVersion).toBe(1234567891); // Initial was 1234567890
        });

        it('should handle mutation failures without clearing changes', async () => {
            const store = createSchedulerStore();

            store.getState().stageQueueChange('root.default', 'capacity', '60');

            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 400,
                text: vi.fn().mockResolvedValue('Invalid configuration'),
            });

            // Call applyChanges and expect it to throw
            let error: unknown;
            try {
                await store.getState().applyChanges();
            } catch (e) {
                error = e;
            }
            
            expect(error).toBeDefined();

            // Changes should not be cleared on failure
            expect(store.getState().stagedChanges).toHaveLength(1);
            expect(store.getState().error).toBe('Failed to apply changes: HTTP 400: Invalid configuration');
        });
    });

    describe('computed values', () => {
        describe('getQueueConfiguredCapacity', () => {
            it('should return configured capacity from config data', async () => {
                const store = createSchedulerStore();
                await setupStoreWithData(store);

                const capacity = store.getState().getQueueConfiguredCapacity('root.default');
                expect(capacity).toBe('10');
            });

            it('should return staged value if change is staged', async () => {
                const store = createSchedulerStore();
                await setupStoreWithData(store);

                store.getState().stageQueueChange('root.default', 'capacity', '60');

                const capacity = store.getState().getQueueConfiguredCapacity('root.default');
                expect(capacity).toBe('60');
            });

            it('should return default value for unconfigured queue', async () => {
                const store = createSchedulerStore();
                await setupStoreWithData(store);

                const capacity = store.getState().getQueueConfiguredCapacity('root.nonexistent');
                expect(capacity).toBe('0');
            });
        });

        describe('getQueueDisplayValue', () => {
            it('should return configured value with staged flag false', async () => {
                const store = createSchedulerStore();
                await setupStoreWithData(store);

                const displayValue = store.getState().getQueueDisplayValue('root.default', 'capacity');
                expect(displayValue).toEqual({
                    value: '10',
                    isStaged: false,
                });
            });

            it('should return staged value with staged flag true', async () => {
                const store = createSchedulerStore();
                await setupStoreWithData(store);

                store.getState().stageQueueChange('root.default', 'capacity', '60');

                const displayValue = store.getState().getQueueDisplayValue('root.default', 'capacity');
                expect(displayValue).toEqual({
                    value: '60',
                    isStaged: true,
                });
            });
        });

        describe('getLabelChangesForQueue', () => {
            it('should return label-specific changes for a queue', () => {
                const store = createSchedulerStore();

                store.getState().stageLabelQueueChange('root.default', 'gpu', 'capacity', '30');
                store.getState().stageLabelQueueChange('root.default', 'gpu', 'maximum-capacity', '80');
                store.getState().stageLabelQueueChange('root.default', 'ssd', 'capacity', '40');

                const gpuChanges = store.getState().getLabelChangesForQueue('root.default', 'gpu');
                expect(gpuChanges).toHaveLength(2);
                expect(gpuChanges.every(c => c.property?.includes('gpu'))).toBe(true);

                const ssdChanges = store.getState().getLabelChangesForQueue('root.default', 'ssd');
                expect(ssdChanges).toHaveLength(1);
                expect(ssdChanges[0].property).toContain('ssd');
            });
        });
    });

    describe('node label selection', () => {
        it('should set selected node label', () => {
            const store = createSchedulerStore();

            store.getState().selectNodeLabel('gpu');

            expect(store.getState().selectedNodeLabel).toBe('gpu');
        });

        it('should clear selected node label', () => {
            const store = createSchedulerStore();

            store.getState().selectNodeLabel('gpu');
            store.getState().selectNodeLabel(null);

            expect(store.getState().selectedNodeLabel).toBeNull();
        });
    });
});

describe('utility functions', () => {
    describe('traverseQueueTree', () => {
        it('should traverse queue tree and combine with config data', () => {
            const queueInfo: QueueInfo = {
                type: 'capacityScheduler',
                capacity: 100,
                usedCapacity: 45,
                maxCapacity: 100,
                absoluteCapacity: 100,
                absoluteMaxCapacity: 100,
                absoluteUsedCapacity: 45,
                numApplications: 5,
                queueName: 'root',
                queuePath: 'root',
                state: 'RUNNING',
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
                            numApplications: 3,
                            queueName: 'default',
                            queuePath: 'root.default',
                            state: 'RUNNING',
                        },
                    ],
                },
            };

            const configData = new Map([
                ['yarn.scheduler.capacity.root.capacity', '100'],
                ['yarn.scheduler.capacity.root.default.capacity', '10'],
                ['yarn.scheduler.capacity.root.default.maximum-capacity', '100'],
            ]);

            const visitedQueues: any[] = [];
            const visitor = (queue: any) => visitedQueues.push(queue);

            traverseQueueTree(queueInfo, configData, visitor);

            expect(visitedQueues).toHaveLength(2); // root and default
            expect(visitedQueues[0]).toMatchObject({
                queueName: 'root',
                queuePath: 'root',
                configured: {
                    capacity: '100',
                },
            });
            expect(visitedQueues[1]).toMatchObject({
                queueName: 'default',
                queuePath: 'root.default',
                configured: {
                    capacity: '10',
                    'maximum-capacity': '100',
                },
            });
        });
    });

    describe('buildMutationRequest', () => {
        it('should build mutation request from staged changes', () => {
            const stagedChanges: StagedChange[] = [
                {
                    id: '1',
                    type: 'update',
                    queuePath: 'root.default',
                    property: 'capacity',
                    oldValue: '50',
                    newValue: '60',
                    timestamp: Date.now(),
                },
                {
                    id: '2',
                    type: 'update',
                    queuePath: 'global',
                    property: 'maximum-applications',
                    oldValue: '10000',
                    newValue: '15000',
                    timestamp: Date.now(),
                },
                {
                    id: '3',
                    type: 'add',
                    queuePath: 'root.test',
                    property: 'capacity',
                    oldValue: undefined,
                    newValue: '20',
                    timestamp: Date.now(),
                },
                {
                    id: '4',
                    type: 'remove',
                    queuePath: 'root.old',
                    property: undefined,
                    oldValue: undefined,
                    newValue: undefined,
                    timestamp: Date.now(),
                },
            ];

            const request = buildMutationRequest(stagedChanges);

            expect(request).toMatchObject({
                'update-queue': [
                    {
                        'queue-name': 'root.default',
                        params: {
                            capacity: '60',
                        },
                    },
                ],
                'add-queue': [
                    {
                        'queue-name': 'root.test',
                        params: {
                            capacity: '20',
                        },
                    },
                ],
                'remove-queue': ['root.old'],
                'global-updates': {
                    'maximum-applications': '15000',
                },
            });
        });

        it('should group multiple changes for same queue', () => {
            const stagedChanges: StagedChange[] = [
                {
                    id: '1',
                    type: 'update',
                    queuePath: 'root.default',
                    property: 'capacity',
                    oldValue: '50',
                    newValue: '60',
                    timestamp: Date.now(),
                },
                {
                    id: '2',
                    type: 'update',
                    queuePath: 'root.default',
                    property: 'maximum-capacity',
                    oldValue: '100',
                    newValue: '90',
                    timestamp: Date.now(),
                },
            ];

            const request = buildMutationRequest(stagedChanges);

            expect(request['update-queue']).toHaveLength(1);
            expect(request['update-queue']![0]).toMatchObject({
                'queue-name': 'root.default',
                params: {
                    capacity: '60',
                    'maximum-capacity': '90',
                },
            });
        });
    });
});