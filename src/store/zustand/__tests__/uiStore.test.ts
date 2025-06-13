import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from '../uiStore';

// Helper to get a fresh store instance for each test
const createStore = () => {
    const store = useUIStore.getState();
    // Reset to initial state
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
    return useUIStore;
};

describe('UIStore', () => {
    beforeEach(() => {
        createStore();
    });

    describe('Queue Selection', () => {
        it('should select a queue', () => {
            const store = useUIStore.getState();

            store.selectQueue('root.production');

            expect(useUIStore.getState().selectedQueuePath).toBe('root.production');
        });

        it('should clear selection when undefined is passed', () => {
            const store = useUIStore.getState();

            // First select a queue
            store.selectQueue('root.production');
            expect(useUIStore.getState().selectedQueuePath).toBe('root.production');

            // Then clear it
            store.selectQueue(undefined);
            expect(useUIStore.getState().selectedQueuePath).toBeUndefined();
        });

        it('should clear selection when no parameter is passed', () => {
            const store = useUIStore.getState();

            // First select a queue
            store.selectQueue('root.production');
            expect(useUIStore.getState().selectedQueuePath).toBe('root.production');

            // Then clear it
            store.selectQueue();
            expect(useUIStore.getState().selectedQueuePath).toBeUndefined();
        });
    });

    describe('Queue Expansion', () => {
        it('should toggle queue expansion', () => {
            const store = useUIStore.getState();
            const queuePath = 'root.production';

            // Initially empty
            expect(useUIStore.getState().expandedQueues.has(queuePath)).toBe(false);

            // Expand queue
            store.toggleQueueExpanded(queuePath);
            expect(useUIStore.getState().expandedQueues.has(queuePath)).toBe(true);

            // Collapse queue
            store.toggleQueueExpanded(queuePath);
            expect(useUIStore.getState().expandedQueues.has(queuePath)).toBe(false);
        });

        it('should handle multiple expanded queues', () => {
            const store = useUIStore.getState();
            const queue1 = 'root.production';
            const queue2 = 'root.development';

            store.toggleQueueExpanded(queue1);
            store.toggleQueueExpanded(queue2);

            const expandedQueues = useUIStore.getState().expandedQueues;
            expect(expandedQueues.has(queue1)).toBe(true);
            expect(expandedQueues.has(queue2)).toBe(true);
            expect(expandedQueues.size).toBe(2);
        });

        it('should set expanded queues from array', () => {
            const store = useUIStore.getState();
            const queuePaths = ['root.production', 'root.development', 'root.testing'];

            store.setExpandedQueues(queuePaths);

            const expandedQueues = useUIStore.getState().expandedQueues;
            expect(expandedQueues.size).toBe(3);
            queuePaths.forEach((path) => {
                expect(expandedQueues.has(path)).toBe(true);
            });
        });

        it('should replace existing expanded queues when setting new ones', () => {
            const store = useUIStore.getState();

            // Set initial expanded queues
            store.setExpandedQueues(['root.production', 'root.development']);
            expect(useUIStore.getState().expandedQueues.size).toBe(2);

            // Replace with new set
            store.setExpandedQueues(['root.testing']);
            const expandedQueues = useUIStore.getState().expandedQueues;
            expect(expandedQueues.size).toBe(1);
            expect(expandedQueues.has('root.testing')).toBe(true);
            expect(expandedQueues.has('root.production')).toBe(false);
            expect(expandedQueues.has('root.development')).toBe(false);
        });
    });

    describe('View Settings', () => {
        it('should update view settings partially', () => {
            const store = useUIStore.getState();

            store.updateViewSettings({ showCapacityBars: false });

            const viewSettings = useUIStore.getState().viewSettings;
            expect(viewSettings.showCapacityBars).toBe(false);
            expect(viewSettings.showUsageMetrics).toBe(true); // Should remain unchanged
            expect(viewSettings.layout).toBe('tree'); // Should remain unchanged
        });

        it('should update multiple view settings at once', () => {
            const store = useUIStore.getState();

            store.updateViewSettings({
                showCapacityBars: false,
                showUsageMetrics: false,
                zoomLevel: 1.5,
            });

            const viewSettings = useUIStore.getState().viewSettings;
            expect(viewSettings.showCapacityBars).toBe(false);
            expect(viewSettings.showUsageMetrics).toBe(false);
            expect(viewSettings.zoomLevel).toBe(1.5);
            expect(viewSettings.layout).toBe('tree'); // Should remain unchanged
        });

        it('should update pan position', () => {
            const store = useUIStore.getState();

            store.updateViewSettings({ panPosition: { x: 100, y: 200 } });

            const viewSettings = useUIStore.getState().viewSettings;
            expect(viewSettings.panPosition).toEqual({ x: 100, y: 200 });
        });
    });

    describe('Property Editor Modal', () => {
        it('should open property editor in edit mode', () => {
            const store = useUIStore.getState();

            store.openPropertyEditor('root.production', 'edit');

            const modal = useUIStore.getState().modals.propertyEditor;
            expect(modal).toBeDefined();
            expect(modal?.open).toBe(true);
            expect(modal?.queuePath).toBe('root.production');
            expect(modal?.mode).toBe('edit');
        });

        it('should open property editor in create mode', () => {
            const store = useUIStore.getState();

            store.openPropertyEditor('root.production', 'create');

            const modal = useUIStore.getState().modals.propertyEditor;
            expect(modal).toBeDefined();
            expect(modal?.open).toBe(true);
            expect(modal?.queuePath).toBe('root.production');
            expect(modal?.mode).toBe('create');
        });

        it('should default to edit mode when mode is not specified', () => {
            const store = useUIStore.getState();

            store.openPropertyEditor('root.production');

            const modal = useUIStore.getState().modals.propertyEditor;
            expect(modal?.mode).toBe('edit');
        });

        it('should close property editor', () => {
            const store = useUIStore.getState();

            // First open it
            store.openPropertyEditor('root.production', 'edit');
            expect(useUIStore.getState().modals.propertyEditor).toBeDefined();

            // Then close it
            store.closePropertyEditor();
            expect(useUIStore.getState().modals.propertyEditor).toBeUndefined();
        });
    });

    describe('Confirm Dialog Modal', () => {
        it('should open confirm dialog', () => {
            const store = useUIStore.getState();
            const onConfirm = () => {};

            store.openConfirmDialog('Delete Queue', 'Are you sure?', onConfirm);

            const modal = useUIStore.getState().modals.confirmDialog;
            expect(modal).toBeDefined();
            expect(modal?.open).toBe(true);
            expect(modal?.title).toBe('Delete Queue');
            expect(modal?.message).toBe('Are you sure?');
            expect(modal?.onConfirm).toBe(onConfirm);
        });

        it('should close confirm dialog', () => {
            const store = useUIStore.getState();

            // First open it
            store.openConfirmDialog('Delete Queue', 'Are you sure?', () => {});
            expect(useUIStore.getState().modals.confirmDialog).toBeDefined();

            // Then close it
            store.closeConfirmDialog();
            expect(useUIStore.getState().modals.confirmDialog).toBeUndefined();
        });
    });

    describe('Notifications', () => {
        it('should add notification', () => {
            const store = useUIStore.getState();

            store.addNotification({
                type: 'success',
                message: 'Queue saved successfully',
            });

            const notifications = useUIStore.getState().notifications;
            expect(notifications).toHaveLength(1);
            expect(notifications[0].type).toBe('success');
            expect(notifications[0].message).toBe('Queue saved successfully');
            expect(notifications[0].id).toBeDefined();
            expect(notifications[0].timestamp).toBeDefined();
        });

        it('should add multiple notifications', () => {
            const store = useUIStore.getState();

            store.addNotification({ type: 'success', message: 'First notification' });
            store.addNotification({ type: 'error', message: 'Second notification' });

            const notifications = useUIStore.getState().notifications;
            expect(notifications).toHaveLength(2);
            expect(notifications[0].message).toBe('First notification');
            expect(notifications[1].message).toBe('Second notification');
        });

        it('should generate unique IDs for notifications', () => {
            const store = useUIStore.getState();

            store.addNotification({ type: 'info', message: 'First' });
            store.addNotification({ type: 'info', message: 'Second' });

            const notifications = useUIStore.getState().notifications;
            expect(notifications[0].id).not.toBe(notifications[1].id);
        });

        it('should remove notification by ID', () => {
            const store = useUIStore.getState();

            store.addNotification({ type: 'success', message: 'First' });
            store.addNotification({ type: 'error', message: 'Second' });

            const notifications = useUIStore.getState().notifications;
            const firstId = notifications[0].id;

            store.removeNotification(firstId);

            const updatedNotifications = useUIStore.getState().notifications;
            expect(updatedNotifications).toHaveLength(1);
            expect(updatedNotifications[0].message).toBe('Second');
        });

        it('should clear all notifications', () => {
            const store = useUIStore.getState();

            store.addNotification({ type: 'success', message: 'First' });
            store.addNotification({ type: 'error', message: 'Second' });
            expect(useUIStore.getState().notifications).toHaveLength(2);

            store.clearNotifications();
            expect(useUIStore.getState().notifications).toHaveLength(0);
        });
    });

    describe('Modal State Management', () => {
        it('should handle multiple modals simultaneously', () => {
            const store = useUIStore.getState();

            store.openPropertyEditor('root.production', 'edit');
            store.openConfirmDialog('Delete Queue', 'Are you sure?', () => {});

            const modals = useUIStore.getState().modals;
            expect(modals.propertyEditor).toBeDefined();
            expect(modals.confirmDialog).toBeDefined();
        });

        it('should close specific modal without affecting others', () => {
            const store = useUIStore.getState();

            store.openPropertyEditor('root.production', 'edit');
            store.openConfirmDialog('Delete Queue', 'Are you sure?', () => {});

            store.closePropertyEditor();

            const modals = useUIStore.getState().modals;
            expect(modals.propertyEditor).toBeUndefined();
            expect(modals.confirmDialog).toBeDefined();
        });
    });
});
