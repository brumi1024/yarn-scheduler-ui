import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UIState, NotificationState } from './types';

interface UIStore extends UIState {
    // Selection actions
    selectQueue: (queuePath?: string) => void;

    // Queue expansion actions
    toggleQueueExpanded: (queuePath: string) => void;
    setExpandedQueues: (queuePaths: string[]) => void;

    // View settings actions
    updateViewSettings: (settings: Partial<UIState['viewSettings']>) => void;

    // Modal actions
    openPropertyEditor: (queuePath?: string, mode?: 'create' | 'edit') => void;
    closePropertyEditor: () => void;
    openConfirmDialog: (title: string, message: string, onConfirm: () => void) => void;
    closeConfirmDialog: () => void;

    // Notification actions
    addNotification: (notification: Omit<NotificationState, 'id' | 'timestamp'>) => void;
    removeNotification: (id: string) => void;
    clearNotifications: () => void;
}

export const useUIStore = create<UIStore>()(
    persist(
        (set, get) => ({
            // Initial state
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

            // Actions
            selectQueue: (queuePath) => {
                set({ selectedQueuePath: queuePath });
            },

            toggleQueueExpanded: (queuePath) =>
                set((state) => {
                    const newExpanded = new Set(state.expandedQueues);
                    if (newExpanded.has(queuePath)) {
                        newExpanded.delete(queuePath);
                    } else {
                        newExpanded.add(queuePath);
                    }
                    return { expandedQueues: newExpanded };
                }),

            setExpandedQueues: (queuePaths) => set({ expandedQueues: new Set(queuePaths) }),

            updateViewSettings: (settings) =>
                set((state) => ({
                    viewSettings: { ...state.viewSettings, ...settings },
                })),

            openPropertyEditor: (queuePath, mode = 'edit') =>
                set({
                    modals: {
                        ...get().modals,
                        propertyEditor: {
                            open: true,
                            queuePath,
                            mode,
                        },
                    },
                }),

            closePropertyEditor: () =>
                set((state) => ({
                    modals: {
                        ...state.modals,
                        propertyEditor: undefined,
                    },
                })),

            openConfirmDialog: (title, message, onConfirm) =>
                set({
                    modals: {
                        ...get().modals,
                        confirmDialog: {
                            open: true,
                            title,
                            message,
                            onConfirm,
                        },
                    },
                }),

            closeConfirmDialog: () =>
                set((state) => ({
                    modals: {
                        ...state.modals,
                        confirmDialog: undefined,
                    },
                })),

            addNotification: (notification) =>
                set((state) => {
                    const newNotification: NotificationState = {
                        ...notification,
                        id: `notification-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                        timestamp: Date.now(),
                    };
                    return { notifications: [...state.notifications, newNotification] };
                }),

            removeNotification: (id) =>
                set((state) => ({
                    notifications: state.notifications.filter((n) => n.id !== id),
                })),

            clearNotifications: () => set({ notifications: [] }),
        }),
        {
            name: 'yarn-ui-store',
            partialize: (state) => ({
                expandedQueues: Array.from(state.expandedQueues),
                viewSettings: {
                    showCapacityBars: state.viewSettings.showCapacityBars,
                    showUsageMetrics: state.viewSettings.showUsageMetrics,
                    layout: state.viewSettings.layout,
                },
            }),
            onRehydrateStorage: () => (state) => {
                if (state && Array.isArray(state.expandedQueues)) {
                    state.expandedQueues = new Set(state.expandedQueues as string[]);
                }
            },
        }
    )
);
