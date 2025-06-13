import type { SchedulerResponse, ConfigurationResponse, ChangeSet } from '../types/Configuration';
import type { NodeLabelsResponse, NodesResponse } from '../types/NodeLabel';

// Re-export types used by actions
export type { ChangeSet } from '../types/Configuration';

// UI State
export interface UIState {
    selectedQueuePath?: string;
    expandedQueues: Set<string>;
    viewSettings: {
        showCapacityBars: boolean;
        showUsageMetrics: boolean;
        layout: 'tree' | 'sankey';
        zoomLevel: number;
        panPosition: { x: number; y: number };
    };
    notifications: NotificationState[];
    modals: {
        propertyEditor?: {
            open: boolean;
            queuePath?: string;
            mode: 'create' | 'edit';
        };
        confirmDialog?: {
            open: boolean;
            title: string;
            message: string;
            onConfirm: () => void;
        };
    };
}

export interface NotificationState {
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    timestamp: number;
    autoHide?: boolean;
    duration?: number;
}

// Configuration State
export interface ConfigurationState {
    scheduler: SchedulerResponse | null;
    configuration: ConfigurationResponse | null;
    nodeLabels: NodeLabelsResponse | null;
    nodes: NodesResponse | null;
    loading: {
        scheduler: boolean;
        configuration: boolean;
        nodeLabels: boolean;
        nodes: boolean;
    };
    errors: {
        scheduler: Error | null;
        configuration: Error | null;
        nodeLabels: Error | null;
        nodes: Error | null;
    };
    lastUpdated: {
        scheduler?: number;
        configuration?: number;
        nodeLabels?: number;
        nodes?: number;
    };
}

// Staged Changes State
export interface StagedChangesState {
    changes: ChangeSet[];
    applying: boolean;
    lastApplied?: number;
    conflicts: ConflictInfo[];
}

export interface ConflictInfo {
    changeId: string;
    type: 'validation' | 'conflict' | 'dependency';
    message: string;
    severity: 'error' | 'warning';
    suggestions?: string[];
}

// Activity Log State
export interface ActivityState {
    logs: ActivityLogEntry[];
    apiCalls: ApiCallLogEntry[];
    maxEntries: number;
}

export interface ActivityLogEntry {
    id: string;
    timestamp: number;
    type: 'user_action' | 'system_event' | 'api_call' | 'validation' | 'error';
    level: 'debug' | 'info' | 'warn' | 'error';
    message: string;
    details?: Record<string, unknown>;
    userId?: string;
}

export interface ApiCallLogEntry {
    id: string;
    timestamp: number;
    method: string;
    url: string;
    status?: number;
    duration?: number;
    request?: unknown;
    response?: unknown;
    error?: string;
}

// Root State
export interface RootState {
    configuration: ConfigurationState;
    stagedChanges: StagedChangesState;
    ui: UIState;
    activity: ActivityState;
}

// Action Types
export type Action = ConfigurationAction | StagedChangesAction | UIAction | ActivityAction;

// Configuration Actions
export type ConfigurationAction =
    | { type: 'LOAD_SCHEDULER_START' }
    | { type: 'LOAD_SCHEDULER_SUCCESS'; payload: SchedulerResponse }
    | { type: 'LOAD_SCHEDULER_ERROR'; payload: Error }
    | { type: 'LOAD_CONFIGURATION_START' }
    | { type: 'LOAD_CONFIGURATION_SUCCESS'; payload: ConfigurationResponse }
    | { type: 'LOAD_CONFIGURATION_ERROR'; payload: Error }
    | { type: 'LOAD_NODE_LABELS_START' }
    | { type: 'LOAD_NODE_LABELS_SUCCESS'; payload: NodeLabelsResponse }
    | { type: 'LOAD_NODE_LABELS_ERROR'; payload: Error }
    | { type: 'LOAD_NODES_START' }
    | { type: 'LOAD_NODES_SUCCESS'; payload: NodesResponse }
    | { type: 'LOAD_NODES_ERROR'; payload: Error }
    | { type: 'REFRESH_ALL_DATA' };

// Staged Changes Actions
export type StagedChangesAction =
    | { type: 'STAGE_CHANGE'; payload: ChangeSet }
    | { type: 'UNSTAGE_CHANGE'; payload: string }
    | { type: 'CLEAR_ALL_CHANGES' }
    | { type: 'APPLY_CHANGES_START' }
    | { type: 'APPLY_CHANGES_SUCCESS'; payload: { timestamp: number } }
    | { type: 'APPLY_CHANGES_ERROR'; payload: Error }
    | { type: 'ADD_CONFLICT'; payload: ConflictInfo }
    | { type: 'REMOVE_CONFLICT'; payload: string }
    | { type: 'CLEAR_CONFLICTS' };

// UI Actions
export type UIAction =
    | { type: 'SELECT_QUEUE'; payload: string | undefined }
    | { type: 'TOGGLE_QUEUE_EXPANDED'; payload: string }
    | { type: 'SET_EXPANDED_QUEUES'; payload: string[] }
    | { type: 'UPDATE_VIEW_SETTINGS'; payload: Partial<UIState['viewSettings']> }
    | { type: 'OPEN_PROPERTY_EDITOR'; payload: { queuePath?: string; mode: 'create' | 'edit' } }
    | { type: 'CLOSE_PROPERTY_EDITOR' }
    | { type: 'OPEN_CONFIRM_DIALOG'; payload: { title: string; message: string; onConfirm: () => void } }
    | { type: 'CLOSE_CONFIRM_DIALOG' }
    | { type: 'ADD_NOTIFICATION'; payload: Omit<NotificationState, 'id' | 'timestamp'> }
    | { type: 'REMOVE_NOTIFICATION'; payload: string }
    | { type: 'CLEAR_NOTIFICATIONS' };

// Activity Actions
export type ActivityAction =
    | { type: 'ADD_LOG_ENTRY'; payload: Omit<ActivityLogEntry, 'id' | 'timestamp'> }
    | { type: 'ADD_API_CALL_LOG'; payload: Omit<ApiCallLogEntry, 'id' | 'timestamp'> }
    | { type: 'CLEAR_ACTIVITY_LOGS' }
    | { type: 'SET_MAX_LOG_ENTRIES'; payload: number };

// Middleware Types
export type Middleware<S = RootState> = (store: Store<S>) => (next: Dispatch) => (action: Action) => Action;

export type Dispatch = (action: Action) => Action;

export interface Store<S = RootState> {
    getState: () => S;
    dispatch: Dispatch;
    subscribe: (listener: () => void) => () => void;
}
