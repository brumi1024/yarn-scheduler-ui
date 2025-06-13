import { describe, it, expect, beforeEach } from 'vitest';
import { useConfigurationStore } from '../configurationStore';
import type { SchedulerResponse, ConfigurationResponse } from '../../../types/Configuration';
import type { NodeLabelsResponse, NodesResponse } from '../../../types/NodeLabel';

// Helper to get a fresh store instance for each test
const createStore = () => {
    // Reset to initial state
    useConfigurationStore.setState({
        scheduler: null,
        configuration: null,
        nodeLabels: null,
        nodes: null,
        loading: {
            scheduler: false,
            configuration: false,
            nodeLabels: false,
            nodes: false,
        },
        errors: {
            scheduler: null,
            configuration: null,
            nodeLabels: null,
            nodes: null,
        },
        lastUpdated: {},
    });
    return useConfigurationStore;
};

// Mock data
const mockSchedulerData: SchedulerResponse = {
    scheduler: {
        schedulerInfo: {
            type: 'capacityScheduler',
            queueName: 'root',
            capacity: 100,
            maxCapacity: 100,
            usedCapacity: 45.5,
            queues: {
                queue: [
                    {
                        queueName: 'default',
                        queuePath: 'root.default',
                        capacity: 60,
                        maxCapacity: 100,
                        usedCapacity: 30,
                        state: 'RUNNING',
                        numApplications: 5,
                        queues: null,
                        resourcesUsed: { memory: 1024, vCores: 4 }
                    }
                ]
            }
        }
    }
};

const mockConfigurationData: ConfigurationResponse = {
    property: [
        { name: 'yarn.scheduler.capacity.root.queues', value: 'default,production' },
        { name: 'yarn.scheduler.capacity.root.default.capacity', value: '60' },
        { name: 'yarn.scheduler.capacity.root.production.capacity', value: '40' }
    ]
};

const mockNodeLabelsData: NodeLabelsResponse = {
    nodeLabelsInfo: {
        nodeLabelInfo: [
            { name: 'gpu', numActiveNMs: 2, numInactiveNMs: 0, resourceType: 'EXCLUSIVE' },
            { name: 'ssd', numActiveNMs: 3, numInactiveNMs: 1, resourceType: 'EXCLUSIVE' }
        ]
    }
};

const mockNodesData: NodesResponse = {
    nodes: {
        node: [
            {
                id: 'node1:8041',
                state: 'RUNNING',
                nodeHTTPAddress: 'node1:8042',
                nodeLabels: ['gpu'],
                usedMemoryMB: 2048,
                availMemoryMB: 6144,
                usedVirtualCores: 4,
                availableVirtualCores: 12
            },
            {
                id: 'node2:8041',
                state: 'RUNNING',
                nodeHTTPAddress: 'node2:8042',
                nodeLabels: ['ssd'],
                usedMemoryMB: 1024,
                availMemoryMB: 7168,
                usedVirtualCores: 2,
                availableVirtualCores: 14
            }
        ]
    }
};

describe('ConfigurationStore', () => {
    beforeEach(() => {
        createStore();
    });

    describe('Scheduler Data Management', () => {
        it('should set loading state when starting scheduler load', () => {
            const store = useConfigurationStore.getState();
            
            store.loadSchedulerStart();
            
            const state = useConfigurationStore.getState();
            expect(state.loading.scheduler).toBe(true);
            expect(state.errors.scheduler).toBeNull();
        });

        it('should store scheduler data on successful load', () => {
            const store = useConfigurationStore.getState();
            
            store.loadSchedulerSuccess(mockSchedulerData);
            
            const state = useConfigurationStore.getState();
            expect(state.scheduler).toEqual(mockSchedulerData);
            expect(state.loading.scheduler).toBe(false);
            expect(state.lastUpdated.scheduler).toBeTypeOf('number');
            expect(state.lastUpdated.scheduler).toBeGreaterThan(0);
        });

        it('should store error on failed load', () => {
            const store = useConfigurationStore.getState();
            const error = new Error('Failed to load scheduler data');
            
            store.loadSchedulerError(error);
            
            const state = useConfigurationStore.getState();
            expect(state.errors.scheduler).toBe(error);
            expect(state.loading.scheduler).toBe(false);
        });

        it('should clear previous error when starting new load', () => {
            const store = useConfigurationStore.getState();
            const error = new Error('Previous error');
            
            // Set an error first
            store.loadSchedulerError(error);
            expect(useConfigurationStore.getState().errors.scheduler).toBe(error);
            
            // Start new load
            store.loadSchedulerStart();
            expect(useConfigurationStore.getState().errors.scheduler).toBeNull();
        });
    });

    describe('Configuration Data Management', () => {
        it('should set loading state when starting configuration load', () => {
            const store = useConfigurationStore.getState();
            
            store.loadConfigurationStart();
            
            const state = useConfigurationStore.getState();
            expect(state.loading.configuration).toBe(true);
            expect(state.errors.configuration).toBeNull();
        });

        it('should store configuration data on successful load', () => {
            const store = useConfigurationStore.getState();
            
            store.loadConfigurationSuccess(mockConfigurationData);
            
            const state = useConfigurationStore.getState();
            expect(state.configuration).toEqual(mockConfigurationData);
            expect(state.loading.configuration).toBe(false);
            expect(state.lastUpdated.configuration).toBeTypeOf('number');
        });

        it('should store error on failed configuration load', () => {
            const store = useConfigurationStore.getState();
            const error = new Error('Failed to load configuration');
            
            store.loadConfigurationError(error);
            
            const state = useConfigurationStore.getState();
            expect(state.errors.configuration).toBe(error);
            expect(state.loading.configuration).toBe(false);
        });
    });

    describe('Node Labels Data Management', () => {
        it('should set loading state when starting node labels load', () => {
            const store = useConfigurationStore.getState();
            
            store.loadNodeLabelsStart();
            
            const state = useConfigurationStore.getState();
            expect(state.loading.nodeLabels).toBe(true);
            expect(state.errors.nodeLabels).toBeNull();
        });

        it('should store node labels data on successful load', () => {
            const store = useConfigurationStore.getState();
            
            store.loadNodeLabelsSuccess(mockNodeLabelsData);
            
            const state = useConfigurationStore.getState();
            expect(state.nodeLabels).toEqual(mockNodeLabelsData);
            expect(state.loading.nodeLabels).toBe(false);
            expect(state.lastUpdated.nodeLabels).toBeTypeOf('number');
        });

        it('should store error on failed node labels load', () => {
            const store = useConfigurationStore.getState();
            const error = new Error('Failed to load node labels');
            
            store.loadNodeLabelsError(error);
            
            const state = useConfigurationStore.getState();
            expect(state.errors.nodeLabels).toBe(error);
            expect(state.loading.nodeLabels).toBe(false);
        });
    });

    describe('Nodes Data Management', () => {
        it('should set loading state when starting nodes load', () => {
            const store = useConfigurationStore.getState();
            
            store.loadNodesStart();
            
            const state = useConfigurationStore.getState();
            expect(state.loading.nodes).toBe(true);
            expect(state.errors.nodes).toBeNull();
        });

        it('should store nodes data on successful load', () => {
            const store = useConfigurationStore.getState();
            
            store.loadNodesSuccess(mockNodesData);
            
            const state = useConfigurationStore.getState();
            expect(state.nodes).toEqual(mockNodesData);
            expect(state.loading.nodes).toBe(false);
            expect(state.lastUpdated.nodes).toBeTypeOf('number');
        });

        it('should store error on failed nodes load', () => {
            const store = useConfigurationStore.getState();
            const error = new Error('Failed to load nodes');
            
            store.loadNodesError(error);
            
            const state = useConfigurationStore.getState();
            expect(state.errors.nodes).toBe(error);
            expect(state.loading.nodes).toBe(false);
        });
    });

    describe('Multiple Data Types', () => {
        it('should handle loading multiple data types simultaneously', () => {
            const store = useConfigurationStore.getState();
            
            store.loadSchedulerStart();
            store.loadConfigurationStart();
            store.loadNodeLabelsStart();
            
            const state = useConfigurationStore.getState();
            expect(state.loading.scheduler).toBe(true);
            expect(state.loading.configuration).toBe(true);
            expect(state.loading.nodeLabels).toBe(true);
            expect(state.loading.nodes).toBe(false);
        });

        it('should handle independent success states', () => {
            const store = useConfigurationStore.getState();
            
            store.loadSchedulerStart();
            store.loadConfigurationStart();
            
            // One succeeds
            store.loadSchedulerSuccess(mockSchedulerData);
            
            const state = useConfigurationStore.getState();
            expect(state.loading.scheduler).toBe(false);
            expect(state.loading.configuration).toBe(true); // Still loading
            expect(state.scheduler).toEqual(mockSchedulerData);
            expect(state.configuration).toBeNull();
        });

        it('should handle independent error states', () => {
            const store = useConfigurationStore.getState();
            const schedulerError = new Error('Scheduler failed');
            const configError = new Error('Config failed');
            
            store.loadSchedulerError(schedulerError);
            store.loadConfigurationError(configError);
            
            const state = useConfigurationStore.getState();
            expect(state.errors.scheduler).toBe(schedulerError);
            expect(state.errors.configuration).toBe(configError);
            expect(state.errors.nodeLabels).toBeNull();
            expect(state.errors.nodes).toBeNull();
        });
    });

    describe('Utility Actions', () => {
        it('should refresh all data by clearing state', () => {
            const store = useConfigurationStore.getState();
            
            // First load some data
            store.loadSchedulerSuccess(mockSchedulerData);
            store.loadConfigurationSuccess(mockConfigurationData);
            store.loadNodeLabelsSuccess(mockNodeLabelsData);
            
            expect(useConfigurationStore.getState().scheduler).not.toBeNull();
            expect(useConfigurationStore.getState().configuration).not.toBeNull();
            expect(useConfigurationStore.getState().nodeLabels).not.toBeNull();
            
            // Refresh all
            store.refreshAllData();
            
            const state = useConfigurationStore.getState();
            expect(state.scheduler).toBeNull();
            expect(state.configuration).toBeNull();
            expect(state.nodeLabels).toBeNull();
            expect(state.nodes).toBeNull();
            expect(state.loading.scheduler).toBe(false);
            expect(state.loading.configuration).toBe(false);
            expect(state.loading.nodeLabels).toBe(false);
            expect(state.loading.nodes).toBe(false);
        });

        it('should clear all errors', () => {
            const store = useConfigurationStore.getState();
            const error1 = new Error('Error 1');
            const error2 = new Error('Error 2');
            
            // Set some errors
            store.loadSchedulerError(error1);
            store.loadConfigurationError(error2);
            
            expect(useConfigurationStore.getState().errors.scheduler).toBe(error1);
            expect(useConfigurationStore.getState().errors.configuration).toBe(error2);
            
            // Clear all errors
            store.clearErrors();
            
            const state = useConfigurationStore.getState();
            expect(state.errors.scheduler).toBeNull();
            expect(state.errors.configuration).toBeNull();
            expect(state.errors.nodeLabels).toBeNull();
            expect(state.errors.nodes).toBeNull();
        });
    });

    describe('Timestamp Management', () => {
        it('should update lastUpdated timestamps independently', async () => {
            const store = useConfigurationStore.getState();
            const beforeTime = Date.now();
            
            store.loadSchedulerSuccess(mockSchedulerData);
            const schedulerTime = useConfigurationStore.getState().lastUpdated.scheduler!;
            
            // Small delay to ensure different timestamps
            await new Promise(resolve => setTimeout(resolve, 2));
            
            store.loadConfigurationSuccess(mockConfigurationData);
            const configTime = useConfigurationStore.getState().lastUpdated.configuration!;
            
            expect(schedulerTime).toBeGreaterThanOrEqual(beforeTime);
            expect(configTime).toBeGreaterThan(schedulerTime);
        });

        it('should not update timestamp on error', () => {
            const store = useConfigurationStore.getState();
            
            store.loadSchedulerError(new Error('Failed'));
            
            const state = useConfigurationStore.getState();
            expect(state.lastUpdated.scheduler).toBeUndefined();
        });
    });

    describe('State Isolation', () => {
        it('should not affect other data types when updating one', () => {
            const store = useConfigurationStore.getState();
            
            // Load initial data
            store.loadSchedulerSuccess(mockSchedulerData);
            store.loadConfigurationSuccess(mockConfigurationData);
            
            const initialScheduler = useConfigurationStore.getState().scheduler;
            const initialConfig = useConfigurationStore.getState().configuration;
            
            // Update only node labels
            store.loadNodeLabelsStart();
            store.loadNodeLabelsSuccess(mockNodeLabelsData);
            
            const state = useConfigurationStore.getState();
            expect(state.scheduler).toBe(initialScheduler); // Unchanged
            expect(state.configuration).toBe(initialConfig); // Unchanged
            expect(state.nodeLabels).toEqual(mockNodeLabelsData); // Changed
        });
    });
});