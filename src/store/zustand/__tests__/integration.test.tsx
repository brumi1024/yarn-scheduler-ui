import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import {
    useUIStore,
    useConfigurationStore,
    useStagedChangesStore,
    useActivityStore,
    useSelectedQueue,
    useAllQueues,
} from '../index';
import { useScheduler, useConfiguration } from '../../../hooks/useApiWithZustand';
import type { ChangeSet } from '../../../types/Configuration';

// Mock data
const mockSchedulerData = {
    scheduler: {
        schedulerInfo: {
            type: 'capacityScheduler',
            queueName: 'root',
            queuePath: 'root',
            capacity: 100,
            queues: {
                queue: [
                    {
                        queueName: 'production',
                        queuePath: 'root.production',
                        capacity: 60,
                        maxCapacity: 80,
                        state: 'RUNNING',
                        numApplications: 5,
                        resourcesUsed: { memory: 1024, vCores: 4 },
                        queues: {
                            queue: [
                                {
                                    queueName: 'prod-team1',
                                    queuePath: 'root.production.prod-team1',
                                    capacity: 30,
                                    maxCapacity: 50,
                                    state: 'RUNNING',
                                    numApplications: 2,
                                    resourcesUsed: { memory: 512, vCores: 2 },
                                    queues: null,
                                },
                            ],
                        },
                    },
                    {
                        queueName: 'development',
                        queuePath: 'root.development',
                        capacity: 40,
                        maxCapacity: 60,
                        state: 'RUNNING',
                        numApplications: 3,
                        resourcesUsed: { memory: 512, vCores: 2 },
                        queues: null,
                    },
                ],
            },
        },
    },
};

const mockConfigurationData = {
    property: [
        { name: 'yarn.scheduler.capacity.root.queues', value: 'production,development' },
        { name: 'yarn.scheduler.capacity.root.production.capacity', value: '60' },
        { name: 'yarn.scheduler.capacity.root.development.capacity', value: '40' },
    ],
};

// Mock server
const server = setupServer(
    http.get('/ws/v1/cluster/scheduler', () => {
        return HttpResponse.json(mockSchedulerData);
    }),
    http.get('/ws/v1/cluster/scheduler-conf', () => {
        return HttpResponse.json(mockConfigurationData);
    })
);

// Helper to reset all stores
const resetAllStores = () => {
    useUIStore.setState({
        selectedQueuePath: undefined,
        expandedQueues: new Set<string>(),
        viewSettings: {
            showCapacityBars: true,
            showUsageMetrics: true,
            layout: 'tree',
            zoomLevel: 1,
            panPosition: { x: 0, y: 0 },
        },
        notifications: [],
        modals: {},
    });

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

    useStagedChangesStore.setState({
        changes: [],
        applying: false,
        lastApplied: undefined,
        conflicts: [],
    });

    useActivityStore.setState({
        logs: [],
        apiCalls: [],
        maxEntries: 1000,
    });
};

describe('Store Integration Tests', () => {
    beforeEach(() => {
        server.listen({ onUnhandledRequest: 'error' });
        resetAllStores();
        vi.clearAllMocks();
    });

    afterEach(() => {
        server.resetHandlers();
        resetAllStores();
    });

    describe('Queue Selection and Data Integration', () => {
        it('should select queue and retrieve correct data from scheduler', async () => {
            // First load scheduler data
            const { result: schedulerHook } = renderHook(() => useScheduler());

            await waitFor(() => {
                expect(schedulerHook.current.loading).toBe(false);
            });

            // Now test queue selection integration
            const { result: selectedQueueHook } = renderHook(() => useSelectedQueue());

            // Initially no queue selected
            expect(selectedQueueHook.current).toBeNull();

            // Select a queue
            act(() => {
                useUIStore.getState().selectQueue('root.production');
            });

            // Should return the correct queue data
            expect(selectedQueueHook.current).toBeDefined();
            expect(selectedQueueHook.current?.queueName).toBe('production');
            expect(selectedQueueHook.current?.queuePath).toBe('root.production');
            expect(selectedQueueHook.current?.capacity).toBe(60);
        });

        it('should handle nested queue selection', async () => {
            // Load scheduler data
            const { result: schedulerHook } = renderHook(() => useScheduler());
            await waitFor(() => {
                expect(schedulerHook.current.loading).toBe(false);
            });

            const { result: selectedQueueHook } = renderHook(() => useSelectedQueue());

            // Select nested queue
            act(() => {
                useUIStore.getState().selectQueue('root.production.prod-team1');
            });

            expect(selectedQueueHook.current).toBeDefined();
            expect(selectedQueueHook.current?.queueName).toBe('prod-team1');
            expect(selectedQueueHook.current?.queuePath).toBe('root.production.prod-team1');
            expect(selectedQueueHook.current?.capacity).toBe(30);
        });

        it('should get all queues in flat structure', async () => {
            // Load scheduler data
            const { result: schedulerHook } = renderHook(() => useScheduler());
            await waitFor(() => {
                expect(schedulerHook.current.loading).toBe(false);
            });

            const { result: allQueuesHook } = renderHook(() => useAllQueues());

            const allQueues = allQueuesHook.current;
            expect(allQueues).toHaveLength(3); // production, prod-team1, development

            const paths = allQueues.map((q) => q.path);
            expect(paths).toContain('root.production');
            expect(paths).toContain('root.production.prod-team1');
            expect(paths).toContain('root.development');
        });
    });

    describe('Change Management with Queue Selection', () => {
        it('should track changes for selected queue', async () => {
            // Load data and select queue
            const { result: schedulerHook } = renderHook(() => useScheduler());
            await waitFor(() => {
                expect(schedulerHook.current.loading).toBe(false);
            });

            act(() => {
                useUIStore.getState().selectQueue('root.production');
            });

            // Create changes for the selected queue
            const change1: ChangeSet = {
                id: 'change-1',
                queueName: 'root.production',
                property: 'capacity',
                oldValue: '60%',
                newValue: '70%',
                timestamp: Date.now(),
                type: 'update',
            };

            const change2: ChangeSet = {
                id: 'change-2',
                queueName: 'root.development',
                property: 'capacity',
                oldValue: '40%',
                newValue: '30%',
                timestamp: Date.now(),
                type: 'update',
            };

            act(() => {
                const stagedStore = useStagedChangesStore.getState();
                stagedStore.stageChange(change1);
                stagedStore.stageChange(change2);
            });

            // Get changes for the selected queue
            const stagedStore = useStagedChangesStore.getState();
            const selectedQueuePath = useUIStore.getState().selectedQueuePath;
            const changesForSelectedQueue = stagedStore.getChangesByQueue(selectedQueuePath!);

            expect(changesForSelectedQueue).toHaveLength(1);
            expect(changesForSelectedQueue[0].id).toBe('change-1');
            expect(stagedStore.hasUnsavedChanges()).toBe(true);
        });

        it('should handle queue selection change with staged changes', async () => {
            // Load data
            const { result: schedulerHook } = renderHook(() => useScheduler());
            await waitFor(() => {
                expect(schedulerHook.current.loading).toBe(false);
            });

            // Stage changes for different queues
            const change1: ChangeSet = {
                id: 'change-1',
                queueName: 'root.production',
                property: 'capacity',
                oldValue: '60%',
                newValue: '70%',
                timestamp: Date.now(),
                type: 'update',
            };

            const change2: ChangeSet = {
                id: 'change-2',
                queueName: 'root.development',
                property: 'capacity',
                oldValue: '40%',
                newValue: '30%',
                timestamp: Date.now(),
                type: 'update',
            };

            act(() => {
                const stagedStore = useStagedChangesStore.getState();
                stagedStore.stageChange(change1);
                stagedStore.stageChange(change2);
            });

            // Select production queue and check changes
            act(() => {
                useUIStore.getState().selectQueue('root.production');
            });

            let stagedStore = useStagedChangesStore.getState();
            let selectedQueuePath = useUIStore.getState().selectedQueuePath;
            let changes = stagedStore.getChangesByQueue(selectedQueuePath!);
            expect(changes).toHaveLength(1);
            expect(changes[0].property).toBe('capacity');

            // Switch to development queue
            act(() => {
                useUIStore.getState().selectQueue('root.development');
            });

            stagedStore = useStagedChangesStore.getState();
            selectedQueuePath = useUIStore.getState().selectedQueuePath;
            changes = stagedStore.getChangesByQueue(selectedQueuePath!);
            expect(changes).toHaveLength(1);
            expect(changes[0].newValue).toBe('30%');
        });
    });

    describe('Activity Logging Integration', () => {
        it('should log queue selection activities', async () => {
            // Load data
            const { result: schedulerHook } = renderHook(() => useScheduler());
            await waitFor(() => {
                expect(schedulerHook.current.loading).toBe(false);
            });

            // Manually log queue selection (simulating UI interaction)
            act(() => {
                const activityStore = useActivityStore.getState();
                activityStore.addLogEntry({
                    type: 'user_action',
                    level: 'info',
                    message: 'Queue selected',
                    details: { queuePath: 'root.production' },
                });

                useUIStore.getState().selectQueue('root.production');
            });

            const activityStore = useActivityStore.getState();
            const queueSelectionLog = activityStore.logs.find((log) => log.message === 'Queue selected');

            expect(queueSelectionLog).toBeDefined();
            expect(queueSelectionLog?.details?.queuePath).toBe('root.production');
            expect(queueSelectionLog?.type).toBe('user_action');
        });

        it('should log API calls and changes together', async () => {
            // This will automatically log API calls
            const { result: schedulerHook } = renderHook(() => useScheduler());
            const { result: configHook } = renderHook(() => useConfiguration());

            await waitFor(() => {
                expect(schedulerHook.current.loading).toBe(false);
                expect(configHook.current.loading).toBe(false);
            });

            // Stage a change and log it
            act(() => {
                const change: ChangeSet = {
                    id: 'change-1',
                    queueName: 'root.production',
                    property: 'capacity',
                    oldValue: '60%',
                    newValue: '70%',
                    timestamp: Date.now(),
                    type: 'update',
                };

                useStagedChangesStore.getState().stageChange(change);

                useActivityStore.getState().addLogEntry({
                    type: 'user_action',
                    level: 'info',
                    message: 'Capacity changed',
                    details: {
                        queuePath: 'root.production',
                        property: 'capacity',
                        oldValue: '60%',
                        newValue: '70%',
                    },
                });
            });

            const activityStore = useActivityStore.getState();

            // Should have API call logs
            expect(activityStore.apiCalls.length).toBeGreaterThan(0);
            const schedulerApiCall = activityStore.apiCalls.find((call) => call.url === '/ws/v1/cluster/scheduler');
            expect(schedulerApiCall).toBeDefined();

            // Should have user action log
            const capacityChangeLog = activityStore.logs.find((log) => log.message === 'Capacity changed');
            expect(capacityChangeLog).toBeDefined();
            expect(capacityChangeLog?.details?.newValue).toBe('70%');
        });
    });

    describe('UI State with Data Loading', () => {
        it('should handle queue expansion with loaded data', async () => {
            // Load data
            const { result: schedulerHook } = renderHook(() => useScheduler());
            await waitFor(() => {
                expect(schedulerHook.current.loading).toBe(false);
            });

            // Expand queues
            act(() => {
                const uiStore = useUIStore.getState();
                uiStore.toggleQueueExpanded('root.production');
                uiStore.toggleQueueExpanded('root.development');
            });

            const uiStore = useUIStore.getState();
            expect(uiStore.expandedQueues.has('root.production')).toBe(true);
            expect(uiStore.expandedQueues.has('root.development')).toBe(true);

            // Select an expanded queue
            act(() => {
                const store = useUIStore.getState();
                store.selectQueue('root.production');
            });

            const finalUiStore = useUIStore.getState();
            expect(finalUiStore.selectedQueuePath).toBe('root.production');

            // Should still be able to get queue data
            const { result: selectedQueueHook } = renderHook(() => useSelectedQueue());
            expect(selectedQueueHook.current?.queueName).toBe('production');
        });

        it('should handle notifications with queue operations', async () => {
            // Load data
            const { result: schedulerHook } = renderHook(() => useScheduler());
            await waitFor(() => {
                expect(schedulerHook.current.loading).toBe(false);
            });

            // Simulate successful queue update
            act(() => {
                const uiStore = useUIStore.getState();
                uiStore.selectQueue('root.production');
                uiStore.addNotification({
                    type: 'success',
                    message: 'Queue capacity updated successfully',
                    details: { queuePath: 'root.production' },
                });
            });

            const uiStore = useUIStore.getState();
            expect(uiStore.notifications).toHaveLength(1);
            expect(uiStore.notifications[0].type).toBe('success');
            expect(uiStore.notifications[0].details?.queuePath).toBe('root.production');
            expect(uiStore.selectedQueuePath).toBe('root.production');
        });
    });

    describe('Complete Workflow Integration', () => {
        it('should handle complete queue editing workflow', async () => {
            // 1. Load data
            const { result: schedulerHook } = renderHook(() => useScheduler());
            await waitFor(() => {
                expect(schedulerHook.current.loading).toBe(false);
            });

            // 2. Select queue
            act(() => {
                useUIStore.getState().selectQueue('root.production');
            });

            // 3. Open property editor
            act(() => {
                useUIStore.getState().openPropertyEditor('root.production', 'edit');
            });

            // 4. Stage changes
            const change: ChangeSet = {
                id: 'edit-capacity',
                queueName: 'root.production',
                property: 'capacity',
                oldValue: '60%',
                newValue: '70%',
                timestamp: Date.now(),
                type: 'update',
            };

            act(() => {
                useStagedChangesStore.getState().stageChange(change);
            });

            // 5. Log the change
            act(() => {
                useActivityStore.getState().addLogEntry({
                    type: 'user_action',
                    level: 'info',
                    message: 'Queue property modified',
                    details: {
                        queuePath: 'root.production',
                        property: 'capacity',
                    },
                });
            });

            // 6. Verify complete state
            const uiStore = useUIStore.getState();
            const stagedStore = useStagedChangesStore.getState();
            const activityStore = useActivityStore.getState();
            const { result: selectedQueueHook } = renderHook(() => useSelectedQueue());

            // Check UI state
            expect(uiStore.selectedQueuePath).toBe('root.production');
            expect(uiStore.modals.propertyEditor?.open).toBe(true);
            expect(uiStore.modals.propertyEditor?.mode).toBe('edit');

            // Check staged changes
            expect(stagedStore.hasUnsavedChanges()).toBe(true);
            expect(stagedStore.changes).toHaveLength(1);
            expect(stagedStore.changes[0].newValue).toBe('70%');

            // Check selected queue data
            expect(selectedQueueHook.current?.queueName).toBe('production');
            expect(selectedQueueHook.current?.capacity).toBe(60); // Original value from API

            // Check activity logging
            expect(activityStore.logs.length).toBeGreaterThan(0);
            const modificationLog = activityStore.logs.find((log) => log.message === 'Queue property modified');
            expect(modificationLog).toBeDefined();

            // 7. Apply changes (simulate)
            act(() => {
                stagedStore.applyChangesStart();
                stagedStore.applyChangesSuccess();

                uiStore.closePropertyEditor();
                uiStore.addNotification({
                    type: 'success',
                    message: 'Changes applied successfully',
                });
            });

            // Final state verification
            expect(useStagedChangesStore.getState().hasUnsavedChanges()).toBe(false);
            expect(useUIStore.getState().modals.propertyEditor).toBeUndefined();
            expect(useUIStore.getState().notifications).toHaveLength(1);
        });
    });

    describe('Error Handling Integration', () => {
        it('should handle API errors with proper state management', async () => {
            // Mock API error
            server.use(
                http.get('/ws/v1/cluster/scheduler', () => {
                    return new HttpResponse(null, { status: 500 });
                })
            );

            const { result: schedulerHook } = renderHook(() => useScheduler());

            await waitFor(() => {
                expect(schedulerHook.current.loading).toBe(false);
            });

            // Should have error state
            expect(schedulerHook.current.error).toBeInstanceOf(Error);
            expect(schedulerHook.current.data).toBeNull();

            // UI should handle missing data gracefully
            const { result: selectedQueueHook } = renderHook(() => useSelectedQueue());
            const { result: allQueuesHook } = renderHook(() => useAllQueues());

            act(() => {
                useUIStore.getState().selectQueue('root.production');
            });

            expect(selectedQueueHook.current).toBeNull(); // No data to select from
            expect(allQueuesHook.current).toHaveLength(0); // No queues available

            // Should still be able to stage changes (optimistic updates)
            const change: ChangeSet = {
                id: 'change-1',
                queueName: 'root.production',
                property: 'capacity',
                oldValue: '60%',
                newValue: '70%',
                timestamp: Date.now(),
                type: 'update',
            };

            act(() => {
                useStagedChangesStore.getState().stageChange(change);
            });

            expect(useStagedChangesStore.getState().hasUnsavedChanges()).toBe(true);
        });
    });
});
