import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useActivityStore } from '../activityStore';
import type { ActivityLogEntry, ApiCallLogEntry } from '../types';

// Helper to get a fresh store instance for each test
const createStore = () => {
    // Reset to initial state
    useActivityStore.setState({
        logs: [],
        apiCalls: [],
        maxEntries: 1000,
    });
    return useActivityStore;
};

// Mock timestamp for consistent testing
const mockTimestamp = 1609459200000; // 2021-01-01 00:00:00

describe('ActivityStore', () => {
    beforeEach(() => {
        createStore();
        vi.spyOn(Date, 'now').mockReturnValue(mockTimestamp);
        vi.spyOn(Math, 'random').mockReturnValue(0.123456789);
    });

    describe('Log Entry Management', () => {
        it('should add a log entry with generated ID and timestamp', () => {
            const store = useActivityStore.getState();

            store.addLogEntry({
                type: 'user_action',
                level: 'info',
                message: 'Queue selected',
                details: { queuePath: 'root.production' },
            });

            const state = useActivityStore.getState();
            expect(state.logs).toHaveLength(1);

            const logEntry = state.logs[0];
            expect(logEntry.type).toBe('user_action');
            expect(logEntry.level).toBe('info');
            expect(logEntry.message).toBe('Queue selected');
            expect(logEntry.details).toEqual({ queuePath: 'root.production' });
            expect(logEntry.id).toMatch(/^log-1609459200000-[a-z0-9]+$/);
            expect(logEntry.timestamp).toBe(mockTimestamp);
        });

        it('should add multiple log entries in chronological order (newest first)', () => {
            const store = useActivityStore.getState();

            // Mock different timestamps
            vi.spyOn(Date, 'now').mockReturnValueOnce(1000).mockReturnValueOnce(2000).mockReturnValueOnce(3000);

            store.addLogEntry({ type: 'system_event', level: 'info', message: 'First log' });
            store.addLogEntry({ type: 'user_action', level: 'info', message: 'Second log' });
            store.addLogEntry({ type: 'error', level: 'error', message: 'Third log' });

            const state = useActivityStore.getState();
            expect(state.logs).toHaveLength(3);
            expect(state.logs[0].message).toBe('Third log'); // Newest first
            expect(state.logs[1].message).toBe('Second log');
            expect(state.logs[2].message).toBe('First log');
        });

        it('should respect max entries limit for logs', () => {
            const store = useActivityStore.getState();

            // Set a small limit
            store.setMaxLogEntries(2);

            store.addLogEntry({ type: 'info', level: 'info', message: 'Log 1' });
            store.addLogEntry({ type: 'info', level: 'info', message: 'Log 2' });
            store.addLogEntry({ type: 'info', level: 'info', message: 'Log 3' });

            const state = useActivityStore.getState();
            expect(state.logs).toHaveLength(2);
            expect(state.logs[0].message).toBe('Log 3'); // Newest
            expect(state.logs[1].message).toBe('Log 2'); // Second newest
        });

        it('should add different types of log entries', () => {
            const store = useActivityStore.getState();

            store.addLogEntry({
                type: 'user_action',
                level: 'info',
                message: 'User clicked queue',
                details: { action: 'click', target: 'queue' },
            });

            store.addLogEntry({
                type: 'system_event',
                level: 'warn',
                message: 'Low memory warning',
                details: { memoryUsage: '85%' },
            });

            store.addLogEntry({
                type: 'error',
                level: 'error',
                message: 'API call failed',
                details: { endpoint: '/scheduler', status: 500 },
            });

            const state = useActivityStore.getState();
            expect(state.logs).toHaveLength(3);

            const userAction = state.logs.find((log) => log.type === 'user_action');
            const systemEvent = state.logs.find((log) => log.type === 'system_event');
            const error = state.logs.find((log) => log.type === 'error');

            expect(userAction?.level).toBe('info');
            expect(systemEvent?.level).toBe('warn');
            expect(error?.level).toBe('error');
        });
    });

    describe('API Call Log Management', () => {
        it('should add an API call log with generated ID and timestamp', () => {
            const store = useActivityStore.getState();

            store.addApiCallLog({
                method: 'GET',
                url: '/ws/v1/cluster/scheduler',
                status: 200,
                duration: 150,
            });

            const state = useActivityStore.getState();
            expect(state.apiCalls).toHaveLength(1);

            const apiCall = state.apiCalls[0];
            expect(apiCall.method).toBe('GET');
            expect(apiCall.url).toBe('/ws/v1/cluster/scheduler');
            expect(apiCall.status).toBe(200);
            expect(apiCall.duration).toBe(150);
            expect(apiCall.id).toMatch(/^api-1609459200000-[a-z0-9]+$/);
            expect(apiCall.timestamp).toBe(mockTimestamp);
        });

        it('should add multiple API call logs in chronological order (newest first)', () => {
            const store = useActivityStore.getState();

            vi.spyOn(Date, 'now').mockReturnValueOnce(1000).mockReturnValueOnce(2000);

            store.addApiCallLog({ method: 'GET', url: '/scheduler' });
            store.addApiCallLog({ method: 'POST', url: '/scheduler-conf' });

            const state = useActivityStore.getState();
            expect(state.apiCalls).toHaveLength(2);
            expect(state.apiCalls[0].method).toBe('POST'); // Newest first
            expect(state.apiCalls[1].method).toBe('GET');
        });

        it('should respect max entries limit for API calls', () => {
            const store = useActivityStore.getState();

            store.setMaxLogEntries(2);

            store.addApiCallLog({ method: 'GET', url: '/scheduler' });
            store.addApiCallLog({ method: 'POST', url: '/scheduler-conf' });
            store.addApiCallLog({ method: 'PUT', url: '/scheduler-conf' });

            const state = useActivityStore.getState();
            expect(state.apiCalls).toHaveLength(2);
            expect(state.apiCalls[0].method).toBe('PUT'); // Newest
            expect(state.apiCalls[1].method).toBe('POST'); // Second newest
        });

        it('should handle API calls with various properties', () => {
            const store = useActivityStore.getState();

            store.addApiCallLog({
                method: 'GET',
                url: '/ws/v1/cluster/scheduler',
                status: 200,
                duration: 150,
                requestBody: undefined,
                responseSize: 2048,
            });

            store.addApiCallLog({
                method: 'POST',
                url: '/ws/v1/cluster/scheduler-conf',
                status: 500,
                duration: 5000,
                requestBody: { property: [{ name: 'test', value: 'value' }] },
                errorMessage: 'Internal server error',
            });

            const state = useActivityStore.getState();
            expect(state.apiCalls).toHaveLength(2);

            const successCall = state.apiCalls.find((call) => call.status === 200);
            const errorCall = state.apiCalls.find((call) => call.status === 500);

            expect(successCall?.responseSize).toBe(2048);
            expect(errorCall?.errorMessage).toBe('Internal server error');
            expect(errorCall?.requestBody).toEqual({ property: [{ name: 'test', value: 'value' }] });
        });
    });

    describe('Log Management Operations', () => {
        it('should clear all activity logs', () => {
            const store = useActivityStore.getState();

            store.addLogEntry({ type: 'info', level: 'info', message: 'Test log' });
            store.addApiCallLog({ method: 'GET', url: '/test' });

            expect(useActivityStore.getState().logs).toHaveLength(1);
            expect(useActivityStore.getState().apiCalls).toHaveLength(1);

            store.clearActivityLogs();

            const state = useActivityStore.getState();
            expect(state.logs).toHaveLength(0);
            expect(state.apiCalls).toHaveLength(0);
        });

        it('should update max entries and trim existing logs', () => {
            const store = useActivityStore.getState();

            // Add 5 logs
            for (let i = 1; i <= 5; i++) {
                store.addLogEntry({ type: 'info', level: 'info', message: `Log ${i}` });
                store.addApiCallLog({ method: 'GET', url: `/test-${i}` });
            }

            expect(useActivityStore.getState().logs).toHaveLength(5);
            expect(useActivityStore.getState().apiCalls).toHaveLength(5);

            // Set max to 3
            store.setMaxLogEntries(3);

            const state = useActivityStore.getState();
            expect(state.maxEntries).toBe(3);
            expect(state.logs).toHaveLength(3);
            expect(state.apiCalls).toHaveLength(3);

            // Should keep the 3 most recent entries
            expect(state.logs[0].message).toBe('Log 5');
            expect(state.logs[1].message).toBe('Log 4');
            expect(state.logs[2].message).toBe('Log 3');
        });
    });

    describe('Utility Functions', () => {
        beforeEach(() => {
            const store = useActivityStore.getState();

            // Add test data with different types and levels
            store.addLogEntry({ type: 'user_action', level: 'info', message: 'User action 1' });
            store.addLogEntry({ type: 'system_event', level: 'info', message: 'System event 1' });
            store.addLogEntry({ type: 'error', level: 'error', message: 'Error 1' });
            store.addLogEntry({ type: 'user_action', level: 'debug', message: 'User action 2' });
            store.addLogEntry({ type: 'system_event', level: 'warn', message: 'System event 2' });
        });

        it('should get recent logs with default count', () => {
            const store = useActivityStore.getState();

            const recentLogs = store.getRecentLogs();

            expect(recentLogs).toHaveLength(5); // All logs since we have less than 10
            expect(recentLogs[0].message).toBe('System event 2'); // Newest first
        });

        it('should get recent logs with specified count', () => {
            const store = useActivityStore.getState();

            const recentLogs = store.getRecentLogs(3);

            expect(recentLogs).toHaveLength(3);
            expect(recentLogs[0].message).toBe('System event 2');
            expect(recentLogs[1].message).toBe('User action 2');
            expect(recentLogs[2].message).toBe('Error 1');
        });

        it('should get logs by type', () => {
            const store = useActivityStore.getState();

            const userActionLogs = store.getLogsByType('user_action');
            const systemEventLogs = store.getLogsByType('system_event');
            const errorLogs = store.getLogsByType('error');
            const nonExistentLogs = store.getLogsByType('non_existent');

            expect(userActionLogs).toHaveLength(2);
            expect(systemEventLogs).toHaveLength(2);
            expect(errorLogs).toHaveLength(1);
            expect(nonExistentLogs).toHaveLength(0);

            expect(userActionLogs.every((log) => log.type === 'user_action')).toBe(true);
            expect(systemEventLogs.every((log) => log.type === 'system_event')).toBe(true);
        });

        it('should get logs by level', () => {
            const store = useActivityStore.getState();

            const infoLogs = store.getLogsByLevel('info');
            const errorLogs = store.getLogsByLevel('error');
            const warnLogs = store.getLogsByLevel('warn');
            const debugLogs = store.getLogsByLevel('debug');

            expect(infoLogs).toHaveLength(2);
            expect(errorLogs).toHaveLength(1);
            expect(warnLogs).toHaveLength(1);
            expect(debugLogs).toHaveLength(1);

            expect(infoLogs.every((log) => log.level === 'info')).toBe(true);
            expect(errorLogs.every((log) => log.level === 'error')).toBe(true);
        });
    });

    describe('ID Generation', () => {
        it('should generate unique IDs for log entries', () => {
            const store = useActivityStore.getState();

            // Mock different random values
            vi.spyOn(Math, 'random').mockReturnValueOnce(0.123).mockReturnValueOnce(0.456).mockReturnValueOnce(0.789);

            store.addLogEntry({ type: 'info', level: 'info', message: 'Log 1' });
            store.addLogEntry({ type: 'info', level: 'info', message: 'Log 2' });
            store.addLogEntry({ type: 'info', level: 'info', message: 'Log 3' });

            const state = useActivityStore.getState();
            const ids = state.logs.map((log) => log.id);

            expect(new Set(ids).size).toBe(3); // All IDs should be unique
        });

        it('should generate unique IDs for API call entries', () => {
            const store = useActivityStore.getState();

            vi.spyOn(Math, 'random').mockReturnValueOnce(0.111).mockReturnValueOnce(0.222);

            store.addApiCallLog({ method: 'GET', url: '/test1' });
            store.addApiCallLog({ method: 'POST', url: '/test2' });

            const state = useActivityStore.getState();
            const ids = state.apiCalls.map((call) => call.id);

            expect(new Set(ids).size).toBe(2);
            expect(ids[0]).toMatch(/^api-/);
            expect(ids[1]).toMatch(/^api-/);
            expect(ids[0]).not.toBe(ids[1]);
        });
    });

    describe('Edge Cases', () => {
        it('should handle zero max entries', () => {
            const store = useActivityStore.getState();

            store.setMaxLogEntries(0);
            store.addLogEntry({ type: 'info', level: 'info', message: 'Test' });
            store.addApiCallLog({ method: 'GET', url: '/test' });

            const state = useActivityStore.getState();
            expect(state.logs).toHaveLength(0);
            expect(state.apiCalls).toHaveLength(0);
        });

        it('should handle negative max entries', () => {
            const store = useActivityStore.getState();

            store.setMaxLogEntries(-5);
            store.addLogEntry({ type: 'info', level: 'info', message: 'Test' });

            const state = useActivityStore.getState();
            expect(state.logs).toHaveLength(0);
        });

        it('should handle empty details object', () => {
            const store = useActivityStore.getState();

            store.addLogEntry({
                type: 'info',
                level: 'info',
                message: 'Test with empty details',
                details: {},
            });

            const state = useActivityStore.getState();
            expect(state.logs[0].details).toEqual({});
        });
    });
});
