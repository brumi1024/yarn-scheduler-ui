import type {
    ConfigurationAction,
    StagedChangesAction,
    UIAction,
    UIState,
    ActivityAction,
    ChangeSet,
    ConflictInfo,
    NotificationState,
    ActivityLogEntry,
    ApiCallLogEntry,
} from './types';
import type { SchedulerResponse, ConfigurationResponse } from '../types/Configuration';
import type { NodeLabelsResponse, NodesResponse } from '../types/NodeLabel';

// Configuration Action Creators
export const configurationActions = {
    loadSchedulerStart: (): ConfigurationAction => ({
        type: 'LOAD_SCHEDULER_START',
    }),

    loadSchedulerSuccess: (payload: SchedulerResponse): ConfigurationAction => ({
        type: 'LOAD_SCHEDULER_SUCCESS',
        payload,
    }),

    loadSchedulerError: (payload: Error): ConfigurationAction => ({
        type: 'LOAD_SCHEDULER_ERROR',
        payload,
    }),

    loadConfigurationStart: (): ConfigurationAction => ({
        type: 'LOAD_CONFIGURATION_START',
    }),

    loadConfigurationSuccess: (payload: ConfigurationResponse): ConfigurationAction => ({
        type: 'LOAD_CONFIGURATION_SUCCESS',
        payload,
    }),

    loadConfigurationError: (payload: Error): ConfigurationAction => ({
        type: 'LOAD_CONFIGURATION_ERROR',
        payload,
    }),

    loadNodeLabelsStart: (): ConfigurationAction => ({
        type: 'LOAD_NODE_LABELS_START',
    }),

    loadNodeLabelsSuccess: (payload: NodeLabelsResponse): ConfigurationAction => ({
        type: 'LOAD_NODE_LABELS_SUCCESS',
        payload,
    }),

    loadNodeLabelsError: (payload: Error): ConfigurationAction => ({
        type: 'LOAD_NODE_LABELS_ERROR',
        payload,
    }),

    loadNodesStart: (): ConfigurationAction => ({
        type: 'LOAD_NODES_START',
    }),

    loadNodesSuccess: (payload: NodesResponse): ConfigurationAction => ({
        type: 'LOAD_NODES_SUCCESS',
        payload,
    }),

    loadNodesError: (payload: Error): ConfigurationAction => ({
        type: 'LOAD_NODES_ERROR',
        payload,
    }),

    refreshAllData: (): ConfigurationAction => ({
        type: 'REFRESH_ALL_DATA',
    }),
};

// Staged Changes Action Creators
export const stagedChangesActions = {
    stageChange: (payload: ChangeSet): StagedChangesAction => ({
        type: 'STAGE_CHANGE',
        payload,
    }),

    unstageChange: (changeId: string): StagedChangesAction => ({
        type: 'UNSTAGE_CHANGE',
        payload: changeId,
    }),

    clearAllChanges: (): StagedChangesAction => ({
        type: 'CLEAR_ALL_CHANGES',
    }),

    applyChangesStart: (): StagedChangesAction => ({
        type: 'APPLY_CHANGES_START',
    }),

    applyChangesSuccess: (timestamp: number): StagedChangesAction => ({
        type: 'APPLY_CHANGES_SUCCESS',
        payload: { timestamp },
    }),

    applyChangesError: (payload: Error): StagedChangesAction => ({
        type: 'APPLY_CHANGES_ERROR',
        payload,
    }),

    addConflict: (payload: ConflictInfo): StagedChangesAction => ({
        type: 'ADD_CONFLICT',
        payload,
    }),

    removeConflict: (changeId: string): StagedChangesAction => ({
        type: 'REMOVE_CONFLICT',
        payload: changeId,
    }),

    clearConflicts: (): StagedChangesAction => ({
        type: 'CLEAR_CONFLICTS',
    }),
};

// UI Action Creators
export const uiActions = {
    selectQueue: (queuePath?: string): UIAction => ({
        type: 'SELECT_QUEUE',
        payload: queuePath,
    }),

    toggleQueueExpanded: (queuePath: string): UIAction => ({
        type: 'TOGGLE_QUEUE_EXPANDED',
        payload: queuePath,
    }),

    setExpandedQueues: (queuePaths: string[]): UIAction => ({
        type: 'SET_EXPANDED_QUEUES',
        payload: queuePaths,
    }),

    updateViewSettings: (settings: Partial<UIState['viewSettings']>): UIAction => ({
        type: 'UPDATE_VIEW_SETTINGS',
        payload: settings,
    }),

    openPropertyEditor: (queuePath?: string, mode: 'create' | 'edit' = 'edit'): UIAction => ({
        type: 'OPEN_PROPERTY_EDITOR',
        payload: { queuePath, mode },
    }),

    closePropertyEditor: (): UIAction => ({
        type: 'CLOSE_PROPERTY_EDITOR',
    }),

    openConfirmDialog: (title: string, message: string, onConfirm: () => void): UIAction => ({
        type: 'OPEN_CONFIRM_DIALOG',
        payload: { title, message, onConfirm },
    }),

    closeConfirmDialog: (): UIAction => ({
        type: 'CLOSE_CONFIRM_DIALOG',
    }),

    addNotification: (notification: Omit<NotificationState, 'id' | 'timestamp'>): UIAction => ({
        type: 'ADD_NOTIFICATION',
        payload: notification,
    }),

    removeNotification: (notificationId: string): UIAction => ({
        type: 'REMOVE_NOTIFICATION',
        payload: notificationId,
    }),

    clearNotifications: (): UIAction => ({
        type: 'CLEAR_NOTIFICATIONS',
    }),
};

// Activity Action Creators
export const activityActions = {
    addLogEntry: (entry: Omit<ActivityLogEntry, 'id' | 'timestamp'>): ActivityAction => ({
        type: 'ADD_LOG_ENTRY',
        payload: entry,
    }),

    addApiCallLog: (entry: Omit<ApiCallLogEntry, 'id' | 'timestamp'>): ActivityAction => ({
        type: 'ADD_API_CALL_LOG',
        payload: entry,
    }),

    clearActivityLogs: (): ActivityAction => ({
        type: 'CLEAR_ACTIVITY_LOGS',
    }),

    setMaxLogEntries: (maxEntries: number): ActivityAction => ({
        type: 'SET_MAX_LOG_ENTRIES',
        payload: maxEntries,
    }),
};

// Combined actions object
export const actions = {
    configuration: configurationActions,
    stagedChanges: stagedChangesActions,
    ui: uiActions,
    activity: activityActions,
};

// Helper function to create a change set
export function createChangeSet(
    type: ChangeSet['type'],
    queueName: string,
    property: string,
    newValue: string,
    oldValue?: string,
    description?: string
): ChangeSet {
    return {
        id: `change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        type,
        queueName,
        property,
        oldValue,
        newValue,
        description: description || `${type} ${property} for ${queueName}`,
    };
}
