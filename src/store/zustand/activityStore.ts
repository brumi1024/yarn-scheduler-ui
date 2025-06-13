import { create } from 'zustand';
import type { ActivityState, ActivityLogEntry, ApiCallLogEntry } from './types';

interface ActivityStore extends ActivityState {
    // Log management actions
    addLogEntry: (entry: Omit<ActivityLogEntry, 'id' | 'timestamp'>) => void;
    addApiCallLog: (entry: Omit<ApiCallLogEntry, 'id' | 'timestamp'>) => void;
    clearActivityLogs: () => void;
    setMaxLogEntries: (maxEntries: number) => void;
    
    // Utility actions
    getRecentLogs: (count?: number) => ActivityLogEntry[];
    getLogsByType: (type: string) => ActivityLogEntry[];
    getLogsByLevel: (level: string) => ActivityLogEntry[];
}

export const useActivityStore = create<ActivityStore>()((set, get) => ({
    // Initial state
    logs: [],
    apiCalls: [],
    maxEntries: 1000,

    // Log management actions
    addLogEntry: (entry) => set((state) => {
        const newEntry: ActivityLogEntry = {
            ...entry,
            id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            timestamp: Date.now(),
        };
        
        const newLogs = [newEntry, ...state.logs];
        return {
            logs: newLogs.length > state.maxEntries ? newLogs.slice(0, state.maxEntries) : newLogs
        };
    }),

    addApiCallLog: (entry) => set((state) => {
        const newEntry: ApiCallLogEntry = {
            ...entry,
            id: `api-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            timestamp: Date.now(),
        };
        
        const newApiCalls = [newEntry, ...state.apiCalls];
        return {
            apiCalls: newApiCalls.length > state.maxEntries ? newApiCalls.slice(0, state.maxEntries) : newApiCalls
        };
    }),

    clearActivityLogs: () => set({
        logs: [],
        apiCalls: []
    }),

    setMaxLogEntries: (maxEntries) => set((state) => ({
        maxEntries,
        logs: state.logs.length > maxEntries ? state.logs.slice(0, maxEntries) : state.logs,
        apiCalls: state.apiCalls.length > maxEntries ? state.apiCalls.slice(0, maxEntries) : state.apiCalls
    })),

    // Utility actions
    getRecentLogs: (count = 10) => get().logs.slice(0, count),

    getLogsByType: (type) => get().logs.filter(log => log.type === type),

    getLogsByLevel: (level) => get().logs.filter(log => log.level === level),
}));