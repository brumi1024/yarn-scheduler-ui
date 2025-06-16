import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useUIStore } from '../uiStore';
import type { NotificationState } from '../types';

// Mock localStorage for persist middleware
const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
};

Object.defineProperty(global, 'localStorage', {
    value: localStorageMock,
    writable: true,
});

// Mock Math.random and Date.now for predictable IDs and timestamps
const mockMath = Object.create(global.Math);
mockMath.random = vi.fn(() => 0.123456789);
global.Math = mockMath;

const mockDateNow = vi.fn(() => 1672531200000); // 2023-01-01 00:00:00 UTC
vi.spyOn(Date, 'now').mockImplementation(mockDateNow);

describe('uiStore', () => {
    beforeEach(() => {
        // Reset store state
        useUIStore.setState({
            selectedQueuePath: undefined,
            hoveredQueuePath: null,
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

        // Reset mocks
        vi.clearAllMocks();
        mockDateNow.mockReturnValue(1672531200000);
        mockMath.random.mockReturnValue(0.123456789);
        localStorageMock.getItem.mockReturnValue(null);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('initial state', () => {
        it('should have correct initial state', () => {
            const state = useUIStore.getState();

            expect(state.selectedQueuePath).toBeUndefined();
            expect(state.hoveredQueuePath).toBeNull();
            expect(state.expandedQueues).toEqual(new Set());
            expect(state.viewSettings).toEqual({
                showCapacityBars: true,
                showUsageMetrics: true,
                layout: 'tree',
                zoomLevel: 1,
                panPosition: { x: 0, y: 0 },
            });
            expect(state.notifications).toEqual([]);
            expect(state.modals).toEqual({});
        });
    });

    describe('queue selection', () => {
        it('should select a queue', () => {
            const { selectQueue } = useUIStore.getState();

            selectQueue('root.queue1');

            const state = useUIStore.getState();
            expect(state.selectedQueuePath).toBe('root.queue1');
        });

        it('should clear queue selection', () => {
            const { selectQueue } = useUIStore.getState();

            // First select a queue
            selectQueue('root.queue1');
            expect(useUIStore.getState().selectedQueuePath).toBe('root.queue1');

            // Then clear selection
            selectQueue(undefined);
            expect(useUIStore.getState().selectedQueuePath).toBeUndefined();
        });

        it('should set hovered queue', () => {
            const { setHoveredQueue } = useUIStore.getState();

            setHoveredQueue('root.queue2');

            const state = useUIStore.getState();
            expect(state.hoveredQueuePath).toBe('root.queue2');
        });

        it('should clear hovered queue', () => {
            const { setHoveredQueue } = useUIStore.getState();

            // First set a hovered queue
            setHoveredQueue('root.queue2');
            expect(useUIStore.getState().hoveredQueuePath).toBe('root.queue2');

            // Then clear hover
            setHoveredQueue(null);
            expect(useUIStore.getState().hoveredQueuePath).toBeNull();
        });
    });

    describe('queue expansion', () => {
        it('should toggle queue expansion (expand)', () => {
            const { toggleQueueExpanded } = useUIStore.getState();

            toggleQueueExpanded('root.queue1');

            const state = useUIStore.getState();
            expect(state.expandedQueues.has('root.queue1')).toBe(true);
        });

        it('should toggle queue expansion (collapse)', () => {
            const { toggleQueueExpanded } = useUIStore.getState();

            // First expand
            toggleQueueExpanded('root.queue1');
            expect(useUIStore.getState().expandedQueues.has('root.queue1')).toBe(true);

            // Then collapse
            toggleQueueExpanded('root.queue1');
            expect(useUIStore.getState().expandedQueues.has('root.queue1')).toBe(false);
        });

        it('should handle multiple expanded queues', () => {
            const { toggleQueueExpanded } = useUIStore.getState();

            toggleQueueExpanded('root.queue1');
            toggleQueueExpanded('root.queue2');
            toggleQueueExpanded('root.queue3');

            const state = useUIStore.getState();
            expect(state.expandedQueues.has('root.queue1')).toBe(true);
            expect(state.expandedQueues.has('root.queue2')).toBe(true);
            expect(state.expandedQueues.has('root.queue3')).toBe(true);
            expect(state.expandedQueues.size).toBe(3);
        });

        it('should set expanded queues from array', () => {
            const { setExpandedQueues } = useUIStore.getState();

            setExpandedQueues(['root.queue1', 'root.queue2', 'root.queue3']);

            const state = useUIStore.getState();
            expect(state.expandedQueues).toEqual(new Set(['root.queue1', 'root.queue2', 'root.queue3']));
        });

        it('should replace existing expanded queues when setting new ones', () => {
            const { toggleQueueExpanded, setExpandedQueues } = useUIStore.getState();

            // First expand some queues manually
            toggleQueueExpanded('root.oldQueue1');
            toggleQueueExpanded('root.oldQueue2');

            // Then set a different set of expanded queues
            setExpandedQueues(['root.newQueue1', 'root.newQueue2']);

            const state = useUIStore.getState();
            expect(state.expandedQueues).toEqual(new Set(['root.newQueue1', 'root.newQueue2']));
            expect(state.expandedQueues.has('root.oldQueue1')).toBe(false);
            expect(state.expandedQueues.has('root.oldQueue2')).toBe(false);
        });
    });

    describe('view settings', () => {
        it('should update individual view settings', () => {
            const { updateViewSettings } = useUIStore.getState();

            updateViewSettings({ showCapacityBars: false });

            const state = useUIStore.getState();
            expect(state.viewSettings.showCapacityBars).toBe(false);
            expect(state.viewSettings.showUsageMetrics).toBe(true); // Should remain unchanged
        });

        it('should update multiple view settings', () => {
            const { updateViewSettings } = useUIStore.getState();

            updateViewSettings({
                showCapacityBars: false,
                showUsageMetrics: false,
                zoomLevel: 1.5,
            });

            const state = useUIStore.getState();
            expect(state.viewSettings.showCapacityBars).toBe(false);
            expect(state.viewSettings.showUsageMetrics).toBe(false);
            expect(state.viewSettings.zoomLevel).toBe(1.5);
            expect(state.viewSettings.layout).toBe('tree'); // Should remain unchanged
        });

        it('should update pan position', () => {
            const { updateViewSettings } = useUIStore.getState();

            updateViewSettings({
                panPosition: { x: 100, y: 200 },
            });

            const state = useUIStore.getState();
            expect(state.viewSettings.panPosition).toEqual({ x: 100, y: 200 });
        });
    });

    describe('property editor modal', () => {
        it('should open property editor in edit mode by default', () => {
            const { openPropertyEditor } = useUIStore.getState();

            openPropertyEditor('root.queue1');

            const state = useUIStore.getState();
            expect(state.modals.propertyEditor).toEqual({
                open: true,
                queuePath: 'root.queue1',
                mode: 'edit',
            });
        });

        it('should open property editor in create mode', () => {
            const { openPropertyEditor } = useUIStore.getState();

            openPropertyEditor('root.newQueue', 'create');

            const state = useUIStore.getState();
            expect(state.modals.propertyEditor).toEqual({
                open: true,
                queuePath: 'root.newQueue',
                mode: 'create',
            });
        });

        it('should open property editor without queue path', () => {
            const { openPropertyEditor } = useUIStore.getState();

            openPropertyEditor();

            const state = useUIStore.getState();
            expect(state.modals.propertyEditor).toEqual({
                open: true,
                queuePath: undefined,
                mode: 'edit',
            });
        });

        it('should close property editor', () => {
            const { openPropertyEditor, closePropertyEditor } = useUIStore.getState();

            // First open the editor
            openPropertyEditor('root.queue1');
            expect(useUIStore.getState().modals.propertyEditor?.open).toBe(true);

            // Then close it
            closePropertyEditor();
            expect(useUIStore.getState().modals.propertyEditor).toBeUndefined();
        });

        it('should preserve other modals when closing property editor', () => {
            const { openPropertyEditor, openConfirmDialog, closePropertyEditor } = useUIStore.getState();

            // Open both modals
            openPropertyEditor('root.queue1');
            openConfirmDialog('Confirm', 'Are you sure?', vi.fn());

            // Close property editor
            closePropertyEditor();

            const state = useUIStore.getState();
            expect(state.modals.propertyEditor).toBeUndefined();
            expect(state.modals.confirmDialog?.open).toBe(true);
        });
    });

    describe('confirm dialog modal', () => {
        it('should open confirm dialog', () => {
            const { openConfirmDialog } = useUIStore.getState();
            const onConfirm = vi.fn();

            openConfirmDialog('Delete Queue', 'Are you sure you want to delete this queue?', onConfirm);

            const state = useUIStore.getState();
            expect(state.modals.confirmDialog).toEqual({
                open: true,
                title: 'Delete Queue',
                message: 'Are you sure you want to delete this queue?',
                onConfirm,
            });
        });

        it('should close confirm dialog', () => {
            const { openConfirmDialog, closeConfirmDialog } = useUIStore.getState();

            // First open the dialog
            openConfirmDialog('Test', 'Test message', vi.fn());
            expect(useUIStore.getState().modals.confirmDialog?.open).toBe(true);

            // Then close it
            closeConfirmDialog();
            expect(useUIStore.getState().modals.confirmDialog).toBeUndefined();
        });

        it('should preserve other modals when closing confirm dialog', () => {
            const { openPropertyEditor, openConfirmDialog, closeConfirmDialog } = useUIStore.getState();

            // Open both modals
            openPropertyEditor('root.queue1');
            openConfirmDialog('Confirm', 'Are you sure?', vi.fn());

            // Close confirm dialog
            closeConfirmDialog();

            const state = useUIStore.getState();
            expect(state.modals.confirmDialog).toBeUndefined();
            expect(state.modals.propertyEditor?.open).toBe(true);
        });
    });

    describe('notifications', () => {
        it('should add a notification with generated id and timestamp', () => {
            const { addNotification } = useUIStore.getState();

            const notification = {
                type: 'success' as const,
                title: 'Success',
                message: 'Operation completed successfully',
                autoHide: true,
                duration: 5000,
            };

            addNotification(notification);

            const state = useUIStore.getState();
            expect(state.notifications).toHaveLength(1);

            const addedNotification = state.notifications[0];
            expect(addedNotification).toEqual({
                ...notification,
                id: expect.stringMatching(/^notification-\d+-\w+$/),
                timestamp: 1672531200000,
            });
        });

        it('should add multiple notifications', () => {
            const { addNotification } = useUIStore.getState();

            addNotification({
                type: 'info',
                title: 'Info',
                message: 'First notification',
            });

            mockDateNow.mockReturnValue(1672531260000);
            mockMath.random.mockReturnValue(0.987654321);

            addNotification({
                type: 'error',
                title: 'Error',
                message: 'Second notification',
            });

            const state = useUIStore.getState();
            expect(state.notifications).toHaveLength(2);
            expect(state.notifications[0].message).toBe('First notification');
            expect(state.notifications[1].message).toBe('Second notification');
        });

        it('should handle notifications without optional properties', () => {
            const { addNotification } = useUIStore.getState();

            addNotification({
                type: 'warning',
                title: 'Warning',
                message: 'Simple warning',
            });

            const state = useUIStore.getState();
            const notification = state.notifications[0];

            expect(notification.autoHide).toBeUndefined();
            expect(notification.duration).toBeUndefined();
            expect(notification.type).toBe('warning');
        });

        it('should remove notification by id', () => {
            const { addNotification, removeNotification } = useUIStore.getState();

            // Add multiple notifications
            addNotification({
                type: 'info',
                title: 'Info 1',
                message: 'First notification',
            });

            mockDateNow.mockReturnValue(1672531260000);
            mockMath.random.mockReturnValue(0.987654321);

            addNotification({
                type: 'info',
                title: 'Info 2',
                message: 'Second notification',
            });

            // Get the first notification's ID
            const firstNotificationId = useUIStore.getState().notifications[0].id;

            // Remove the first notification
            removeNotification(firstNotificationId);

            const state = useUIStore.getState();
            expect(state.notifications).toHaveLength(1);
            expect(state.notifications[0].message).toBe('Second notification');
        });

        it('should do nothing when removing non-existent notification', () => {
            const { addNotification, removeNotification } = useUIStore.getState();

            addNotification({
                type: 'info',
                title: 'Info',
                message: 'Test notification',
            });

            removeNotification('non-existent-id');

            const state = useUIStore.getState();
            expect(state.notifications).toHaveLength(1);
        });

        it('should clear all notifications', () => {
            const { addNotification, clearNotifications } = useUIStore.getState();

            // Add multiple notifications
            addNotification({
                type: 'info',
                title: 'Info 1',
                message: 'First notification',
            });

            addNotification({
                type: 'info',
                title: 'Info 2',
                message: 'Second notification',
            });

            // Verify notifications were added
            expect(useUIStore.getState().notifications).toHaveLength(2);

            // Clear notifications
            clearNotifications();

            const state = useUIStore.getState();
            expect(state.notifications).toEqual([]);
        });
    });

    // Note: Persistence tests are skipped as they test third-party middleware behavior
});
