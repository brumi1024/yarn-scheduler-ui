import type { RootState } from './types';

// Configuration Selectors
export const selectScheduler = (state: RootState) => state.configuration.scheduler;
export const selectConfiguration = (state: RootState) => state.configuration.configuration;
export const selectNodeLabels = (state: RootState) => state.configuration.nodeLabels;
export const selectNodes = (state: RootState) => state.configuration.nodes;

export const selectConfigurationLoading = (state: RootState) => state.configuration.loading;
export const selectConfigurationErrors = (state: RootState) => state.configuration.errors;
export const selectLastUpdated = (state: RootState) => state.configuration.lastUpdated;

// Derived selectors
export const selectAllQueues = (state: RootState) => {
    const scheduler = selectScheduler(state);
    if (!scheduler?.scheduler.schedulerInfo.queues?.queue) {
        return [];
    }

    return flattenQueues(scheduler.scheduler.schedulerInfo.queues.queue);
};

export const selectQueueByPath = (state: RootState, path: string) => {
    const allQueues = selectAllQueues(state);
    return allQueues.find((queue) => getQueuePath(queue) === path);
};

export const selectRootQueues = (state: RootState) => {
    const scheduler = selectScheduler(state);
    return scheduler?.scheduler.schedulerInfo.queues?.queue || [];
};

// Staged Changes Selectors
export const selectStagedChanges = (state: RootState) => state.stagedChanges.changes;
export const selectChangesApplying = (state: RootState) => state.stagedChanges.applying;
export const selectConflicts = (state: RootState) => state.stagedChanges.conflicts;
export const selectLastApplied = (state: RootState) => state.stagedChanges.lastApplied;

export const selectHasUnsavedChanges = (state: RootState) => state.stagedChanges.changes.length > 0;

export const selectChangesByQueue = (state: RootState, queuePath: string) =>
    state.stagedChanges.changes.filter((change) => change.queueName === queuePath);

export const selectConflictsByChange = (state: RootState, changeId: string) =>
    state.stagedChanges.conflicts.filter((conflict) => conflict.changeId === changeId);

// UI Selectors
export const selectSelectedQueuePath = (state: RootState) => state.ui.selectedQueuePath;
export const selectExpandedQueues = (state: RootState) => state.ui.expandedQueues;
export const selectViewSettings = (state: RootState) => state.ui.viewSettings;
export const selectNotifications = (state: RootState) => state.ui.notifications;
export const selectModals = (state: RootState) => state.ui.modals;

export const selectSelectedQueue = (state: RootState) => {
    const selectedPath = selectSelectedQueuePath(state);
    if (!selectedPath) {
        return null;
    }
    return selectQueueByPath(state, selectedPath);
};

export const selectIsQueueExpanded = (state: RootState, queuePath: string) => state.ui.expandedQueues.has(queuePath);

// Activity Selectors
export const selectActivityLogs = (state: RootState) => state.activity.logs;
export const selectApiCallLogs = (state: RootState) => state.activity.apiCalls;
export const selectMaxLogEntries = (state: RootState) => state.activity.maxEntries;

export const selectRecentLogs = (state: RootState, count: number = 10) => state.activity.logs.slice(0, count);

export const selectLogsByType = (state: RootState, type: string) =>
    state.activity.logs.filter((log) => log.type === type);

export const selectLogsByLevel = (state: RootState, level: string) =>
    state.activity.logs.filter((log) => log.level === level);

// Helper functions
function flattenQueues(queues: any[], parentPath = ''): any[] {
    const result: any[] = [];

    for (const queue of queues) {
        const queuePath = parentPath ? `${parentPath}.${queue.queueName}` : queue.queueName;
        const queueWithPath = { ...queue, path: queuePath };

        result.push(queueWithPath);

        if (queue.queues?.queue) {
            result.push(...flattenQueues(queue.queues.queue, queuePath));
        }
    }

    return result;
}

function getQueuePath(queue: any, parentPath = ''): string {
    // Use the path property if it exists (from flattenQueues), otherwise fallback to queueName
    return queue.path || (parentPath ? `${parentPath}.${queue.queueName}` : queue.queueName);
}

// Memoized selectors (basic memoization)
const memoizeOne = <Args extends unknown[], Return>(fn: (...args: Args) => Return): ((...args: Args) => Return) => {
    let lastArgs: Args | undefined;
    let lastResult: Return;

    return (...args: Args): Return => {
        if (!lastArgs || !argsEqual(lastArgs, args)) {
            lastArgs = args;
            lastResult = fn(...args);
        }
        return lastResult;
    };
};

function argsEqual<T extends unknown[]>(a: T, b: T): boolean {
    if (a.length !== b.length) {
        return false;
    }

    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) {
            return false;
        }
    }

    return true;
}

export const selectAllQueuesMemoized = memoizeOne(selectAllQueues);
export const selectRootQueuesMemoized = memoizeOne(selectRootQueues);
