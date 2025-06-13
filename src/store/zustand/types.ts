import type { SchedulerResponse, ConfigurationResponse, ChangeSet } from '../../types/Configuration';
import type { NodeLabelsResponse, NodesResponse } from '../../types/NodeLabel';

// Re-export types used by stores
export type { ChangeSet } from '../../types/Configuration';

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
