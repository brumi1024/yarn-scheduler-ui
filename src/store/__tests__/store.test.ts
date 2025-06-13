import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createStore } from '../store';
import { actions } from '../actions';
import type { Store } from '../types';

describe('Store', () => {
    let store: Store;

    beforeEach(() => {
        store = createStore();
    });

    describe('createStore', () => {
        it('should create a store with initial state', () => {
            const state = store.getState();
            expect(state).toBeDefined();
            expect(state.configuration).toBeDefined();
            expect(state.stagedChanges).toBeDefined();
            expect(state.ui).toBeDefined();
            expect(state.activity).toBeDefined();
        });

        it('should merge custom initial state', () => {
            const customStore = createStore({
                ui: {
                    selectedQueuePath: 'test.queue',
                    expandedQueues: new Set(['test']),
                    viewSettings: {
                        showCapacityBars: false,
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
                },
            });

            const state = customStore.getState();
            expect(state.ui.selectedQueuePath).toBe('test.queue');
            expect(state.ui.expandedQueues.has('test')).toBe(true);
            expect(state.ui.viewSettings.showCapacityBars).toBe(false);
        });
    });

    describe('dispatch', () => {
        it('should dispatch configuration actions', () => {
            const mockSchedulerData = {
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

            store.dispatch(actions.configuration.loadSchedulerStart());
            let state = store.getState();
            expect(state.configuration.loading.scheduler).toBe(true);

            store.dispatch(actions.configuration.loadSchedulerSuccess(mockSchedulerData));
            state = store.getState();
            expect(state.configuration.loading.scheduler).toBe(false);
            expect(state.configuration.scheduler).toEqual(mockSchedulerData);
        });

        it('should dispatch staged changes actions', () => {
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

            store.dispatch(actions.stagedChanges.stageChange(change));
            const state = store.getState();
            expect(state.stagedChanges.changes).toHaveLength(1);
            expect(state.stagedChanges.changes[0]).toEqual(change);
        });

        it('should dispatch UI actions', () => {
            store.dispatch(actions.ui.selectQueue('test.queue'));
            let state = store.getState();
            expect(state.ui.selectedQueuePath).toBe('test.queue');

            store.dispatch(actions.ui.toggleQueueExpanded('test'));
            state = store.getState();
            expect(state.ui.expandedQueues.has('test')).toBe(true);
        });

        it('should dispatch activity actions', () => {
            const logEntry = {
                type: 'user_action' as const,
                level: 'info' as const,
                message: 'Queue selected',
                details: { queuePath: 'test.queue' },
            };

            store.dispatch(actions.activity.addLogEntry(logEntry));
            const state = store.getState();
            expect(state.activity.logs).toHaveLength(1);
            expect(state.activity.logs[0].message).toBe('Queue selected');
        });
    });

    describe('subscribe', () => {
        it('should notify listeners when state changes', () => {
            const listener = vi.fn();
            const unsubscribe = store.subscribe(listener);

            store.dispatch(actions.ui.selectQueue('test.queue'));
            expect(listener).toHaveBeenCalledTimes(1);

            unsubscribe();
            store.dispatch(actions.ui.selectQueue('another.queue'));
            expect(listener).toHaveBeenCalledTimes(1);
        });

        it('should support multiple listeners', () => {
            const listener1 = vi.fn();
            const listener2 = vi.fn();

            store.subscribe(listener1);
            store.subscribe(listener2);

            store.dispatch(actions.ui.selectQueue('test.queue'));

            expect(listener1).toHaveBeenCalledTimes(1);
            expect(listener2).toHaveBeenCalledTimes(1);
        });
    });

    describe('middleware', () => {
        it('should apply middleware to dispatched actions', () => {
            const initialState = store.getState();

            store.dispatch(actions.ui.selectQueue('test.queue'));

            const newState = store.getState();
            expect(newState.ui.selectedQueuePath).toBe('test.queue');
            expect(newState).not.toBe(initialState); // State should be immutable
        });
    });
});
