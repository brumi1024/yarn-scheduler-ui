import { describe, it, expect } from 'vitest';
import { configurationReducer } from '../reducers/configurationReducer';
import { stagedChangesReducer } from '../reducers/stagedChangesReducer';
import { uiReducer } from '../reducers/uiReducer';
import { activityReducer } from '../reducers/activityReducer';
import { actions } from '../actions';
import type { ConfigurationState, StagedChangesState, UIState, ActivityState } from '../types';

describe('Reducers', () => {
    describe('configurationReducer', () => {
        const initialState: ConfigurationState = {
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
        };

        it('should handle LOAD_SCHEDULER_START', () => {
            const action = actions.configuration.loadSchedulerStart();
            const state = configurationReducer(initialState, action);

            expect(state.loading.scheduler).toBe(true);
            expect(state.errors.scheduler).toBe(null);
        });

        it('should handle LOAD_SCHEDULER_SUCCESS', () => {
            const mockData = {
                scheduler: {
                    schedulerInfo: {
                        type: 'capacityScheduler' as const,
                        capacity: 100,
                        usedCapacity: 50,
                        maxCapacity: 100,
                        queueName: 'root',
                        queues: { queue: [] },
                    },
                },
            };

            const action = actions.configuration.loadSchedulerSuccess(mockData);
            const state = configurationReducer(initialState, action);

            expect(state.loading.scheduler).toBe(false);
            expect(state.scheduler).toEqual(mockData);
            expect(typeof state.lastUpdated.scheduler).toBe('number');
            expect(state.lastUpdated.scheduler).toBeGreaterThan(0);
        });

        it('should handle LOAD_SCHEDULER_ERROR', () => {
            const error = new Error('Failed to load');
            const action = actions.configuration.loadSchedulerError(error);
            const state = configurationReducer(initialState, action);

            expect(state.loading.scheduler).toBe(false);
            expect(state.errors.scheduler).toBe(error);
        });
    });

    describe('stagedChangesReducer', () => {
        const initialState: StagedChangesState = {
            changes: [],
            conflicts: [],
            applying: false,
            lastApplied: undefined,
        };

        it('should handle STAGE_CHANGE', () => {
            const change = {
                id: 'test-change',
                timestamp: new Date(),
                type: 'update-queue' as const,
                queueName: 'test',
                property: 'capacity',
                oldValue: '50',
                newValue: '60',
                description: 'Update capacity',
            };

            const action = actions.stagedChanges.stageChange(change);
            const state = stagedChangesReducer(initialState, action);

            expect(state.changes).toHaveLength(1);
            expect(state.changes[0]).toEqual(change);
        });

        it('should handle UNSTAGE_CHANGE', () => {
            const stateWithChange: StagedChangesState = {
                ...initialState,
                changes: [
                    {
                        id: 'test-change',
                        timestamp: new Date(),
                        type: 'update-queue',
                        queueName: 'test',
                        property: 'capacity',
                        oldValue: '50',
                        newValue: '60',
                        description: 'Update capacity',
                    },
                ],
            };

            const action = actions.stagedChanges.unstageChange('test-change');
            const state = stagedChangesReducer(stateWithChange, action);

            expect(state.changes).toHaveLength(0);
        });

        it('should handle APPLY_CHANGES_START', () => {
            const action = actions.stagedChanges.applyChangesStart();
            const state = stagedChangesReducer(initialState, action);

            expect(state.applying).toBe(true);
        });
    });

    describe('uiReducer', () => {
        const initialState: UIState = {
            selectedQueuePath: undefined,
            expandedQueues: new Set(),
            viewSettings: {
                showCapacityBars: true,
                showUsageMetrics: true,
                layout: 'tree',
                zoomLevel: 1,
                panPosition: { x: 0, y: 0 },
            },
            notifications: [],
            modals: {
                propertyEditor: { open: false, mode: 'edit' },
                confirmDialog: { open: false, title: '', message: '', onConfirm: () => {} },
            },
        };

        it('should handle SELECT_QUEUE', () => {
            const action = actions.ui.selectQueue('test.queue');
            const state = uiReducer(initialState, action);

            expect(state.selectedQueuePath).toBe('test.queue');
        });

        it('should handle TOGGLE_QUEUE_EXPANDED', () => {
            const action = actions.ui.toggleQueueExpanded('test');
            const state = uiReducer(initialState, action);

            expect(state.expandedQueues.has('test')).toBe(true);

            const toggleAction = actions.ui.toggleQueueExpanded('test');
            const toggledState = uiReducer(state, toggleAction);

            expect(toggledState.expandedQueues.has('test')).toBe(false);
        });

        it('should handle ADD_NOTIFICATION', () => {
            const notification = {
                type: 'success' as const,
                title: 'Success',
                message: 'Operation completed',
            };

            const action = actions.ui.addNotification(notification);
            const state = uiReducer(initialState, action);

            expect(state.notifications).toHaveLength(1);
            expect(state.notifications[0].title).toBe('Success');
            expect(state.notifications[0].id).toBeDefined();
        });
    });

    describe('activityReducer', () => {
        const initialState: ActivityState = {
            logs: [],
            apiCalls: [],
            maxEntries: 1000,
        };

        it('should handle ADD_LOG_ENTRY', () => {
            const logEntry = {
                type: 'user_action' as const,
                level: 'info' as const,
                message: 'Queue selected',
                details: { queuePath: 'test.queue' },
            };

            const action = actions.activity.addLogEntry(logEntry);
            const state = activityReducer(initialState, action);

            expect(state.logs).toHaveLength(1);
            expect(state.logs[0].message).toBe('Queue selected');
            expect(state.logs[0].id).toBeDefined();
            expect(state.logs[0].timestamp).toBeDefined();
        });

        it('should handle ADD_API_CALL_LOG', () => {
            const apiCall = {
                method: 'GET' as const,
                url: '/api/scheduler',
                status: 200,
                duration: 150,
            };

            const action = actions.activity.addApiCallLog(apiCall);
            const state = activityReducer(initialState, action);

            expect(state.apiCalls).toHaveLength(1);
            expect(state.apiCalls[0].url).toBe('/api/scheduler');
            expect(state.apiCalls[0].id).toBeDefined();
        });

        it('should respect maxEntries limit', () => {
            const smallMaxState: ActivityState = {
                ...initialState,
                maxEntries: 2,
                logs: [
                    {
                        id: '1',
                        timestamp: Date.now() - 2000,
                        type: 'system_event',
                        level: 'info',
                        message: 'Old log 1',
                    },
                    {
                        id: '2',
                        timestamp: Date.now() - 1000,
                        type: 'system_event',
                        level: 'info',
                        message: 'Old log 2',
                    },
                ],
            };

            const newLogEntry = {
                type: 'user_action' as const,
                level: 'info' as const,
                message: 'New log entry',
            };

            const action = actions.activity.addLogEntry(newLogEntry);
            const state = activityReducer(smallMaxState, action);

            expect(state.logs).toHaveLength(2);
            expect(state.logs[0].message).toBe('New log entry');
            expect(state.logs[1].message).toBe('Old log 1');
        });
    });
});
