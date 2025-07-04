import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
    createSchedulerStore,
    traverseQueueTree,
} from './schedulerStore';
import { buildMutationRequest } from '../lib/utils/mutationBuilder';
import type { YarnApiClient } from '../lib/api/YarnApiClient';
import type {
    QueueInfo,
    StagedChange,
    SchedulerInfo,
    ConfigInfo,
    NodeLabelsInfo,
    VersionResponse,
} from '../lib/types';

// Mock data for tests
const mockSchedulerResponse: SchedulerInfo = {
  scheduler: {
    schedulerInfo: {
      queueType: 'parent',
      capacity: 100,
      usedCapacity: 50,
      maxCapacity: 100,
      queueName: 'root',
      queuePath: 'root',
      queues: {
        queue: [
          {
            queueName: 'default',
            capacity: 10,
            usedCapacity: 0,
            maxCapacity: 100,
            absoluteCapacity: 10,
            absoluteMaxCapacity: 100,
            absoluteUsedCapacity: 0,
            numApplications: 0,
            queuePath: 'root.default',
            queues: { queue: [] },
            resourcesUsed: {
              memory: 0,
              vCores: 0,
            },
            state: 'RUNNING',
          },
          {
            queueName: 'production',
            capacity: 60,
            usedCapacity: 0,
            maxCapacity: 100,
            absoluteCapacity: 60,
            absoluteMaxCapacity: 100,
            absoluteUsedCapacity: 0,
            numApplications: 0,
            queuePath: 'root.production',
            queues: {
              queue: [
                {
                  queueName: 'batch',
                  capacity: 50,
                  usedCapacity: 0,
                  maxCapacity: 100,
                  absoluteCapacity: 30,
                  absoluteMaxCapacity: 60,
                  absoluteUsedCapacity: 0,
                  numApplications: 0,
                  queuePath: 'root.production.batch',
                  queues: { queue: [] },
                  resourcesUsed: {
                    memory: 0,
                    vCores: 0,
                  },
                  state: 'RUNNING',
                },
                {
                  queueName: 'interactive',
                  capacity: 50,
                  usedCapacity: 0,
                  maxCapacity: 100,
                  absoluteCapacity: 30,
                  absoluteMaxCapacity: 60,
                  absoluteUsedCapacity: 0,
                  numApplications: 0,
                  queuePath: 'root.production.interactive',
                  queues: { queue: [] },
                  resourcesUsed: {
                    memory: 0,
                    vCores: 0,
                  },
                  state: 'RUNNING',
                },
              ],
            },
            state: 'RUNNING',
          },
          {
            queueName: 'development',
            capacity: 30,
            usedCapacity: 0,
            maxCapacity: 100,
            absoluteCapacity: 30,
            absoluteMaxCapacity: 100,
            absoluteUsedCapacity: 0,
            numApplications: 0,
            queuePath: 'root.development',
            queues: { queue: [] },
            resourcesUsed: {
              memory: 0,
              vCores: 0,
            },
            state: 'RUNNING',
          },
        ],
      },
    },
  },
};

const mockConfigResponse: ConfigInfo = {
  property: [
    {
      name: 'yarn.scheduler.capacity.root.queues',
      value: 'default,production,development',
    },
    {
      name: 'yarn.scheduler.capacity.root.capacity',
      value: '100',
    },
    {
      name: 'yarn.scheduler.capacity.root.default.capacity',
      value: '10',
    },
    {
      name: 'yarn.scheduler.capacity.root.default.maximum-capacity',
      value: '100',
    },
    {
      name: 'yarn.scheduler.capacity.root.production.capacity',
      value: '60',
    },
    {
      name: 'yarn.scheduler.capacity.root.production.maximum-capacity',
      value: '100',
    },
    {
      name: 'yarn.scheduler.capacity.root.production.queues',
      value: 'batch,interactive',
    },
    {
      name: 'yarn.scheduler.capacity.root.production.batch.capacity',
      value: '50',
    },
    {
      name: 'yarn.scheduler.capacity.root.production.batch.maximum-capacity',
      value: '100',
    },
    {
      name: 'yarn.scheduler.capacity.root.production.interactive.capacity',
      value: '50',
    },
    {
      name: 'yarn.scheduler.capacity.root.production.interactive.maximum-capacity',
      value: '100',
    },
    {
      name: 'yarn.scheduler.capacity.root.development.capacity',
      value: '30',
    },
    {
      name: 'yarn.scheduler.capacity.root.development.maximum-capacity',
      value: '100',
    },
    {
      name: 'yarn.scheduler.capacity.maximum-applications',
      value: '10000',
    },
    {
      name: 'yarn.scheduler.capacity.maximum-am-resource-percent',
      value: '0.1',
    },
    {
      name: 'yarn.scheduler.capacity.resource-calculator',
      value: 'org.apache.hadoop.yarn.util.resource.DefaultResourceCalculator',
    },
    {
      name: 'yarn.scheduler.capacity.root.default.user-limit-factor',
      value: '1',
    },
    {
      name: 'yarn.scheduler.capacity.root.default.minimum-user-limit-percent',
      value: '100',
    },
    {
      name: 'yarn.scheduler.capacity.root.default.state',
      value: 'RUNNING',
    },
  ],
};

const mockNodeLabelsResponse: NodeLabelsInfo = {
  nodeLabelsInfo: {
    nodeLabelInfo: [
      { name: 'gpu', exclusivity: true },
      { name: 'ssd', exclusivity: false },
      { name: 'high-memory', exclusivity: true },
    ],
  },
};

const mockNodesResponse = {
  nodes: {
    node: [
      {
        id: 'node1.example.com:8041',
        rack: '/default-rack',
        state: 'RUNNING',
        nodeHTTPAddress: 'node1.example.com:8042',
        version: '3.4.0',
      },
    ],
  },
};

const mockNodeToLabelsResponse = {
  nodeToLabelsInfo: {
    nodeToLabels: [
      {
        nodeId: 'node1.example.com:8041',
        nodeLabels: ['gpu', 'high-memory'],
      },
    ],
  },
};

const mockVersionResponse: VersionResponse = {
  versionID: 1234567890,
};

// Mock the YARN API client
vi.mock('~/lib/api/YarnApiClient');

// Create mock API client
const createMockApiClient = () => ({
    getScheduler: vi.fn(),
    getSchedulerConf: vi.fn(),
    getNodeLabels: vi.fn(),
    getNodes: vi.fn(),
    getNodeToLabels: vi.fn(),
    getSchedulerConfVersion: vi.fn(),
    updateSchedulerConf: vi.fn(),
});

// Helper to create store with mock API client
const createTestStore = () => {
    const mockApiClient = createMockApiClient();
    return createSchedulerStore(mockApiClient as unknown as YarnApiClient);
};

// Helper function to set up store with data
async function setupStoreWithData(store: ReturnType<typeof createSchedulerStore>) {
    const mockApiClient = store.getState().apiClient as ReturnType<typeof createMockApiClient>;

    mockApiClient.getScheduler.mockResolvedValue(mockSchedulerResponse);
    mockApiClient.getSchedulerConf.mockResolvedValue(mockConfigResponse);
    mockApiClient.getNodeLabels.mockResolvedValue(mockNodeLabelsResponse);
    mockApiClient.getNodes.mockResolvedValue(mockNodesResponse);
    mockApiClient.getNodeToLabels.mockResolvedValue(mockNodeToLabelsResponse);
    mockApiClient.getSchedulerConfVersion.mockResolvedValue(mockVersionResponse);

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
            const mockApiClient = createMockApiClient();
            const store = createSchedulerStore(mockApiClient as unknown as YarnApiClient);
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
            const store = createTestStore();
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
            const store = createTestStore();
            const state = store.getState();

            expect(typeof state.getQueuePropertyValue).toBe('function');
            expect(typeof state.getGlobalPropertyValue).toBe('function');
            expect(typeof state.getLabelChangesForQueue).toBe('function');
        });
    });

    describe('loadInitialData', () => {
        it('should load all data sources in parallel', async () => {
            const store = createTestStore();
            const mockApiClient = store.getState().apiClient as ReturnType<typeof createMockApiClient>;

            mockApiClient.getScheduler.mockResolvedValue(mockSchedulerResponse);
            mockApiClient.getSchedulerConf.mockResolvedValue(mockConfigResponse);
            mockApiClient.getNodeLabels.mockResolvedValue(mockNodeLabelsResponse);
            mockApiClient.getNodes.mockResolvedValue(mockNodesResponse);
            mockApiClient.getNodeToLabels.mockResolvedValue(mockNodeToLabelsResponse);
            mockApiClient.getSchedulerConfVersion.mockResolvedValue(mockVersionResponse);

            await store.getState().loadInitialData();

            expect(mockApiClient.getScheduler).toHaveBeenCalledTimes(1);
            expect(mockApiClient.getSchedulerConf).toHaveBeenCalledTimes(1);
            expect(mockApiClient.getNodeLabels).toHaveBeenCalledTimes(1);
            expect(mockApiClient.getSchedulerConfVersion).toHaveBeenCalledTimes(1);

            expect(store.getState().schedulerData).toEqual(mockSchedulerResponse.scheduler.schedulerInfo);
            expect(store.getState().configData.size).toBe(19);
            expect(store.getState().configData.get('yarn.scheduler.capacity.root.default.capacity')).toBe('10');
            expect(store.getState().nodeLabels).toHaveLength(3);
            expect(store.getState().configVersion).toBe(1234567890);
        });

        it('should set loading state during data fetch', async () => {
            const store = createTestStore();
            const mockApiClient = store.getState().apiClient as ReturnType<typeof createMockApiClient>;

            // Create promises that we can control
            let resolveScheduler: (value: any) => void;
            const schedulerPromise = new Promise((resolve) => {
                resolveScheduler = resolve;
            });

            mockApiClient.getScheduler.mockReturnValue(schedulerPromise);
            mockApiClient.getSchedulerConf.mockReturnValue(Promise.resolve(mockConfigResponse));
            mockApiClient.getNodeLabels.mockReturnValue(Promise.resolve(mockNodeLabelsResponse));
            mockApiClient.getSchedulerConfVersion.mockReturnValue(Promise.resolve(mockVersionResponse));

            // Start the load without awaiting
            const loadPromise = store.getState().loadInitialData();

            // Check loading state immediately
            expect(store.getState().isLoading).toBe(true);

            // Resolve the scheduler promise
            resolveScheduler!(mockSchedulerResponse);

            // Wait for the promise to settle
            await loadPromise.catch(() => {}); // Catch any errors to prevent unhandled rejection

            expect(store.getState().isLoading).toBe(false);
        });

        it('should handle API errors gracefully', async () => {
            const store = createTestStore();
            const mockApiClient = store.getState().apiClient as ReturnType<typeof createMockApiClient>;

            mockApiClient.getScheduler.mockRejectedValue(new Error('Network error'));

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
            const store = createTestStore();
            const mockApiClient = store.getState().apiClient as ReturnType<typeof createMockApiClient>;

            mockApiClient.getScheduler.mockRejectedValue(new Error('HTTP 403: Forbidden'));

            // Call loadInitialData and expect it to throw
            let error: unknown;
            try {
                await store.getState().loadInitialData();
            } catch (e) {
                error = e;
            }

            expect(error).toBeDefined();

            expect(store.getState().error).toBe('Failed to load initial data: HTTP 403: Forbidden');
            expect(store.getState().isLoading).toBe(false);
        });
    });

    describe('refreshSchedulerData', () => {
        it('should only refresh scheduler data, not config', async () => {
            const store = createTestStore();
            const mockApiClient = store.getState().apiClient as ReturnType<typeof createMockApiClient>;

            // First load initial data
            await setupStoreWithData(store);

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

            mockApiClient.getScheduler.mockResolvedValue(updatedSchedulerResponse);

            await store.getState().refreshSchedulerData();

            expect(mockApiClient.getScheduler).toHaveBeenCalledTimes(1);

            expect(store.getState().schedulerData?.usedCapacity).toBe(60);
            // Config data should remain unchanged
            expect(store.getState().configData.size).toBe(19);
        });
    });

    describe('staging changes', () => {
        describe('stageQueueChange', () => {
            it('should stage a queue property change', () => {
                const store = createTestStore();

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
                const store = createTestStore();

                store.getState().stageQueueChange('root.default', 'capacity', '60');
                store.getState().stageQueueChange('root.default', 'capacity', '70');

                expect(store.getState().stagedChanges).toHaveLength(1);
                expect(store.getState().stagedChanges[0].newValue).toBe('70');
            });
        });

        describe('stageGlobalChange', () => {
            it('should stage a global property change', () => {
                const store = createTestStore();

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
                const store = createTestStore();

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
                const store = createTestStore();

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
                const store = createTestStore();

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
                const store = createTestStore();

                store.getState().stageQueueChange('root.default', 'capacity', '60');

                const changeId = store.getState().stagedChanges[0].id;

                store.getState().revertChange(changeId);

                expect(store.getState().stagedChanges).toHaveLength(0);
            });

            it('should not affect other staged changes', () => {
                const store = createTestStore();

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
                const store = createTestStore();

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
            const store = createTestStore();
            const mockApiClient = store.getState().apiClient as ReturnType<typeof createMockApiClient>;

            // Stage some changes
            store.getState().stageQueueChange('root.default', 'capacity', '60');
            store.getState().stageGlobalChange('maximum-applications', '15000');

            // Mock successful mutation response
            mockApiClient.updateSchedulerConf.mockResolvedValue(undefined);

            // Mock reload calls
            mockApiClient.getScheduler.mockResolvedValue(mockSchedulerResponse);
            mockApiClient.getSchedulerConf.mockResolvedValue(mockConfigResponse);
            mockApiClient.getNodeLabels.mockResolvedValue(mockNodeLabelsResponse);
            mockApiClient.getNodes.mockResolvedValue(mockNodesResponse);
            mockApiClient.getNodeToLabels.mockResolvedValue(mockNodeToLabelsResponse);
            mockApiClient.getSchedulerConfVersion.mockResolvedValue({ versionID: 1234567891 });

            await store.getState().applyChanges();

            // Check mutation request was sent
            expect(mockApiClient.updateSchedulerConf).toHaveBeenCalledTimes(1);
            expect(mockApiClient.updateSchedulerConf).toHaveBeenCalledWith(expect.objectContaining({
                'update-queue': expect.any(Array),
                'global-updates': expect.any(Object),
            }));

            // Check staged changes were cleared
            expect(store.getState().stagedChanges).toHaveLength(0);
            // Version should be incremented from initial load
            expect(store.getState().configVersion).toBe(1234567891);
        });

        it('should handle mutation failures without clearing changes', async () => {
            const store = createTestStore();
            const mockApiClient = store.getState().apiClient as ReturnType<typeof createMockApiClient>;

            store.getState().stageQueueChange('root.default', 'capacity', '60');

            mockApiClient.updateSchedulerConf.mockRejectedValue(new Error('HTTP 400: Invalid configuration'));

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
            expect(store.getState().error).toBe('HTTP 400: Invalid configuration');
        });
    });

    describe('computed values', () => {
        describe('getQueuePropertyValue', () => {
            it('should return configured value with staged flag false', async () => {
                const store = createTestStore();
                await setupStoreWithData(store);

                const displayValue = store.getState().getQueuePropertyValue('root.default', 'capacity');
                expect(displayValue).toEqual({
                    value: '10',
                    isStaged: false,
                });
            });

            it('should return staged value with staged flag true', async () => {
                const store = createTestStore();
                await setupStoreWithData(store);

                store.getState().stageQueueChange('root.default', 'capacity', '60');

                const displayValue = store.getState().getQueuePropertyValue('root.default', 'capacity');
                expect(displayValue).toEqual({
                    value: '60',
                    isStaged: true,
                });
            });
        });

        describe('getGlobalPropertyValue', () => {
            it('should return configured value with staged flag false', async () => {
                const store = createTestStore();
                await setupStoreWithData(store);

                const displayValue = store.getState().getGlobalPropertyValue('maximum-applications');
                expect(displayValue).toEqual({
                    value: '10000',
                    isStaged: false,
                });
            });

            it('should return staged value with staged flag true', async () => {
                const store = createTestStore();
                await setupStoreWithData(store);

                store.getState().stageGlobalChange('maximum-applications', '15000');

                const displayValue = store.getState().getGlobalPropertyValue('maximum-applications');
                expect(displayValue).toEqual({
                    value: '15000',
                    isStaged: true,
                });
            });
        });

        describe('getGlobalDisplayValue', () => {
            it('should return empty value with staged flag false for unconfigured global property', async () => {
                const store = createTestStore();
                await setupStoreWithData(store);

                const displayValue = store.getState().getGlobalPropertyValue('non-existent-property');
                expect(displayValue).toEqual({
                    value: '',
                    isStaged: false,
                });
            });

            it('should return configured global value with staged flag false', async () => {
                const store = createTestStore();
                await setupStoreWithData(store);

                // The mockConfigResponse already includes 'yarn.scheduler.capacity.maximum-applications': '10000'
                const displayValue = store.getState().getGlobalPropertyValue('maximum-applications');
                expect(displayValue).toEqual({
                    value: '10000',
                    isStaged: false,
                });
            });

            it('should return staged global value with staged flag true', async () => {
                const store = createTestStore();
                await setupStoreWithData(store);

                // Stage a global change
                store.getState().stageGlobalChange('maximum-applications', '15000');

                const displayValue = store.getState().getGlobalPropertyValue('maximum-applications');
                expect(displayValue).toEqual({
                    value: '15000',
                    isStaged: true,
                });
            });

            it('should prioritize staged value over configured value', async () => {
                const store = createTestStore();
                await setupStoreWithData(store);

                // mockConfigResponse already has 'yarn.scheduler.capacity.maximum-applications': '10000'
                // Stage a different value
                store.getState().stageGlobalChange('maximum-applications', '20000');

                const displayValue = store.getState().getGlobalPropertyValue('maximum-applications');
                expect(displayValue).toEqual({
                    value: '20000',
                    isStaged: true,
                });
            });

            it('should handle multiple global properties independently', async () => {
                const store = createTestStore();
                await setupStoreWithData(store);

                // mockConfigResponse has 'yarn.scheduler.capacity.maximum-applications': '10000'
                // Stage a change for a different property
                store.getState().stageGlobalChange('legacy-queue-mode.enabled', 'false');

                const maxAppsValue = store.getState().getGlobalPropertyValue('maximum-applications');
                const legacyModeValue = store.getState().getGlobalPropertyValue('legacy-queue-mode.enabled');

                expect(maxAppsValue).toEqual({
                    value: '10000',
                    isStaged: false,
                });
                expect(legacyModeValue).toEqual({
                    value: 'false',
                    isStaged: true,
                });
            });
        });

        describe('getLabelChangesForQueue', () => {
            it('should return label-specific changes for a queue', () => {
                const store = createTestStore();

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

        describe('getQueueByPath', () => {
            it('should find queue by path in tree', async () => {
                const store = createTestStore();
                await setupStoreWithData(store);

                const rootQueue = store.getState().getQueueByPath('root');
                expect(rootQueue).toBeDefined();
                expect(rootQueue?.queueName).toBe('root');

                const defaultQueue = store.getState().getQueueByPath('root.default');
                expect(defaultQueue).toBeDefined();
                expect(defaultQueue?.queueName).toBe('default');

                const nonExistent = store.getState().getQueueByPath('root.nonexistent');
                expect(nonExistent).toBeNull();
            });

            it('should return null when no scheduler data', () => {
                const store = createTestStore();

                const queue = store.getState().getQueueByPath('root');
                expect(queue).toBeNull();
            });
        });

        describe('getChildQueues', () => {
            it('should return child queues for parent', async () => {
                const store = createTestStore();
                await setupStoreWithData(store);

                const rootChildren = store.getState().getChildQueues('root');
                expect(rootChildren).toHaveLength(3); // default, production, development
                expect(rootChildren.map(q => q.queueName)).toContain('default');
                expect(rootChildren.map(q => q.queueName)).toContain('production');
                expect(rootChildren.map(q => q.queueName)).toContain('development');

                const productionChildren = store.getState().getChildQueues('root.production');
                expect(productionChildren).toHaveLength(2); // batch and interactive
            });

            it('should return empty array for leaf queues', async () => {
                const store = createTestStore();
                await setupStoreWithData(store);

                const leafChildren = store.getState().getChildQueues('root.default');
                expect(leafChildren).toHaveLength(0);
            });

            it('should return empty array for non-existent queue', async () => {
                const store = createTestStore();
                await setupStoreWithData(store);

                const children = store.getState().getChildQueues('root.nonexistent');
                expect(children).toHaveLength(0);
            });
        });

        describe('hasUnsavedChanges', () => {
            it('should return false when no staged changes', () => {
                const store = createTestStore();

                expect(store.getState().hasUnsavedChanges()).toBe(false);
            });

            it('should return true when staged changes exist', () => {
                const store = createTestStore();

                store.getState().stageQueueChange('root.default', 'capacity', '60');

                expect(store.getState().hasUnsavedChanges()).toBe(true);
            });

            it('should return false after clearing changes', () => {
                const store = createTestStore();

                store.getState().stageQueueChange('root.default', 'capacity', '60');
                store.getState().clearAllChanges();

                expect(store.getState().hasUnsavedChanges()).toBe(false);
            });
        });

        describe('getChangesForQueue', () => {
            it('should return all changes for specific queue', () => {
                const store = createTestStore();

                store.getState().stageQueueChange('root.default', 'capacity', '60');
                store.getState().stageQueueChange('root.default', 'maximum-capacity', '90');
                store.getState().stageQueueChange('root.production', 'capacity', '40');

                const defaultChanges = store.getState().getChangesForQueue('root.default');
                expect(defaultChanges).toHaveLength(2);
                expect(defaultChanges.every(c => c.queuePath === 'root.default')).toBe(true);

                const productionChanges = store.getState().getChangesForQueue('root.production');
                expect(productionChanges).toHaveLength(1);
                expect(productionChanges[0].queuePath).toBe('root.production');
            });

            it('should return empty array for queue with no changes', () => {
                const store = createTestStore();

                const changes = store.getState().getChangesForQueue('root.batch');
                expect(changes).toHaveLength(0);
            });
        });

        describe('getStagedChangeById', () => {
            it('should find staged change by id', () => {
                const store = createTestStore();

                store.getState().stageQueueChange('root.default', 'capacity', '60');
                const changeId = store.getState().stagedChanges[0].id;

                const change = store.getState().getStagedChangeById(changeId);
                expect(change).toBeDefined();
                expect(change?.queuePath).toBe('root.default');
                expect(change?.property).toBe('capacity');
            });

            it('should return undefined for non-existent id', () => {
                const store = createTestStore();

                store.getState().stageQueueChange('root.default', 'capacity', '60');

                const change = store.getState().getStagedChangeById('non-existent-id');
                expect(change).toBeUndefined();
            });
        });
    });

    describe('node label selection', () => {
        it('should set selected node label', () => {
            const store = createTestStore();

            store.getState().selectNodeLabel('gpu');

            expect(store.getState().selectedNodeLabel).toBe('gpu');
        });

        it('should clear selected node label', () => {
            const store = createTestStore();

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
                queueType: 'parent',
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
                            queueType: 'leaf',
                            capacity: 50,
                            usedCapacity: 80,
                            maxCapacity: 100,
                            absoluteCapacity: 50,
                            absoluteMaxCapacity: 100,
                            absoluteUsedCapacity: 40,
                            numApplications: 3,
                            numActiveApplications: 2,
                            numPendingApplications: 1,
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

    describe('queue selection', () => {
        it('should select a queue by path', async () => {
            const store = createTestStore();
            await setupStoreWithData(store);

            // Initially no queue is selected
            expect(store.getState().selectedQueuePath).toBeNull();

            // Select a queue
            store.getState().selectQueue('root.default');
            expect(store.getState().selectedQueuePath).toBe('root.default');

            // Select a different queue
            store.getState().selectQueue('root.production');
            expect(store.getState().selectedQueuePath).toBe('root.production');
        });

        it('should clear selection when null is passed', async () => {
            const store = createTestStore();
            await setupStoreWithData(store);

            // Select a queue first
            store.getState().selectQueue('root.default');
            expect(store.getState().selectedQueuePath).toBe('root.default');

            // Clear selection
            store.getState().selectQueue(null);
            expect(store.getState().selectedQueuePath).toBeNull();
        });

        it('should validate queue path exists before selecting', async () => {
            const store = createTestStore();
            await setupStoreWithData(store);

            // Try to select a non-existent queue
            store.getState().selectQueue('root.nonexistent');

            // Should not select invalid queue
            expect(store.getState().selectedQueuePath).toBeNull();
        });
    });
});