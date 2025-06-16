import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useActivityStore } from '../activityStore';
import type { ActivityLogEntry, ApiCallLogEntry } from '../types';

// Mock Math.random for predictable IDs
const mockMath = Object.create(global.Math);
mockMath.random = vi.fn(() => 0.123456789);
global.Math = mockMath;

// Mock Date.now for predictable timestamps
const mockDateNow = vi.fn(() => 1672531200000); // 2023-01-01 00:00:00 UTC
vi.spyOn(Date, 'now').mockImplementation(mockDateNow);

describe('activityStore', () => {
    beforeEach(() => {
        // Reset store state
        useActivityStore.setState({
            logs: [],
            apiCalls: [],
            maxEntries: 1000,
        });

        // Reset mocks
        vi.clearAllMocks();
        mockDateNow.mockReturnValue(1672531200000);
        mockMath.random.mockReturnValue(0.123456789);
    });

    describe('initial state', () => {
        it('should have correct initial state', () => {
            const state = useActivityStore.getState();

            expect(state.logs).toEqual([]);
            expect(state.apiCalls).toEqual([]);
            expect(state.maxEntries).toBe(1000);
        });
    });

    describe('addLogEntry', () => {
        it('should add a log entry with generated id and timestamp', () => {
            const { addLogEntry } = useActivityStore.getState();

            const logEntry = {
                type: 'user_action' as const,
                level: 'info' as const,
                message: 'User clicked button',
                details: { buttonId: 'submit' },
            };

            addLogEntry(logEntry);

            const state = useActivityStore.getState();
            expect(state.logs).toHaveLength(1);

            const addedLog = state.logs[0];
            expect(addedLog).toEqual({
                ...logEntry,
                id: expect.stringMatching(/^log-\d+-\w+$/),
                timestamp: 1672531200000,
            });
        });

        it('should add multiple log entries in chronological order (newest first)', () => {
            const { addLogEntry } = useActivityStore.getState();

            // Add first entry
            addLogEntry({
                type: 'user_action',
                level: 'info',
                message: 'First action',
            });

            // Advance time and add second entry
            mockDateNow.mockReturnValue(1672531260000); // +1 minute
            mockMath.random.mockReturnValue(0.987654321);

            addLogEntry({
                type: 'system_event',
                level: 'debug',
                message: 'Second action',
            });

            const state = useActivityStore.getState();
            expect(state.logs).toHaveLength(2);

            // Newest entry should be first
            expect(state.logs[0].message).toBe('Second action');
            expect(state.logs[0].timestamp).toBe(1672531260000);
            expect(state.logs[1].message).toBe('First action');
            expect(state.logs[1].timestamp).toBe(1672531200000);
        });

        it('should respect maxEntries limit', () => {
            // Set a small max entries limit
            useActivityStore.setState({ maxEntries: 2 });

            const { addLogEntry } = useActivityStore.getState();

            // Add 3 entries
            addLogEntry({
                type: 'user_action',
                level: 'info',
                message: 'Entry 1',
            });

            mockDateNow.mockReturnValue(1672531260000);
            addLogEntry({
                type: 'user_action',
                level: 'info',
                message: 'Entry 2',
            });

            mockDateNow.mockReturnValue(1672531320000);
            addLogEntry({
                type: 'user_action',
                level: 'info',
                message: 'Entry 3',
            });

            const state = useActivityStore.getState();
            expect(state.logs).toHaveLength(2);

            // Should keep the newest 2 entries
            expect(state.logs[0].message).toBe('Entry 3');
            expect(state.logs[1].message).toBe('Entry 2');
        });

        it('should handle entries without optional fields', () => {
            const { addLogEntry } = useActivityStore.getState();

            addLogEntry({
                type: 'error',
                level: 'error',
                message: 'Simple error message',
            });

            const state = useActivityStore.getState();
            const addedLog = state.logs[0];

            expect(addedLog.details).toBeUndefined();
            expect(addedLog.userId).toBeUndefined();
            expect(addedLog.type).toBe('error');
            expect(addedLog.level).toBe('error');
            expect(addedLog.message).toBe('Simple error message');
        });
    });

    describe('addApiCallLog', () => {
        it('should add an API call log entry with generated id and timestamp', () => {
            const { addApiCallLog } = useActivityStore.getState();

            const apiEntry = {
                method: 'GET',
                url: '/api/scheduler',
                status: 200,
                duration: 150,
                response: { data: 'response' },
            };

            addApiCallLog(apiEntry);

            const state = useActivityStore.getState();
            expect(state.apiCalls).toHaveLength(1);

            const addedCall = state.apiCalls[0];
            expect(addedCall).toEqual({
                ...apiEntry,
                id: expect.stringMatching(/^api-\d+-\w+$/),
                timestamp: 1672531200000,
            });
        });

        it('should add multiple API call entries in chronological order', () => {
            const { addApiCallLog } = useActivityStore.getState();

            addApiCallLog({
                method: 'GET',
                url: '/api/scheduler',
                status: 200,
            });

            mockDateNow.mockReturnValue(1672531260000);
            mockMath.random.mockReturnValue(0.987654321);

            addApiCallLog({
                method: 'POST',
                url: '/api/configuration',
                status: 201,
            });

            const state = useActivityStore.getState();
            expect(state.apiCalls).toHaveLength(2);

            // Newest entry should be first
            expect(state.apiCalls[0].method).toBe('POST');
            expect(state.apiCalls[0].timestamp).toBe(1672531260000);
            expect(state.apiCalls[1].method).toBe('GET');
            expect(state.apiCalls[1].timestamp).toBe(1672531200000);
        });

        it('should respect maxEntries limit for API calls', () => {
            useActivityStore.setState({ maxEntries: 2 });

            const { addApiCallLog } = useActivityStore.getState();

            addApiCallLog({ method: 'GET', url: '/api/call1' });

            mockDateNow.mockReturnValue(1672531260000);
            addApiCallLog({ method: 'GET', url: '/api/call2' });

            mockDateNow.mockReturnValue(1672531320000);
            addApiCallLog({ method: 'GET', url: '/api/call3' });

            const state = useActivityStore.getState();
            expect(state.apiCalls).toHaveLength(2);

            expect(state.apiCalls[0].url).toBe('/api/call3');
            expect(state.apiCalls[1].url).toBe('/api/call2');
        });

        it('should handle API calls with errors', () => {
            const { addApiCallLog } = useActivityStore.getState();

            addApiCallLog({
                method: 'POST',
                url: '/api/update',
                status: 500,
                error: 'Internal Server Error',
                duration: 3000,
            });

            const state = useActivityStore.getState();
            const addedCall = state.apiCalls[0];

            expect(addedCall.error).toBe('Internal Server Error');
            expect(addedCall.status).toBe(500);
        });
    });

    describe('clearActivityLogs', () => {
        it('should clear all logs and API calls', () => {
            const { addLogEntry, addApiCallLog, clearActivityLogs } = useActivityStore.getState();

            // Add some entries
            addLogEntry({
                type: 'user_action',
                level: 'info',
                message: 'Test log',
            });

            addApiCallLog({
                method: 'GET',
                url: '/api/test',
            });

            // Verify entries were added
            let state = useActivityStore.getState();
            expect(state.logs).toHaveLength(1);
            expect(state.apiCalls).toHaveLength(1);

            // Clear logs
            clearActivityLogs();

            // Verify entries were cleared
            state = useActivityStore.getState();
            expect(state.logs).toEqual([]);
            expect(state.apiCalls).toEqual([]);
        });

        it('should not affect maxEntries setting', () => {
            useActivityStore.setState({ maxEntries: 500 });

            const { clearActivityLogs } = useActivityStore.getState();
            clearActivityLogs();

            const state = useActivityStore.getState();
            expect(state.maxEntries).toBe(500);
        });
    });

    describe('setMaxLogEntries', () => {
        it('should update maxEntries setting', () => {
            const { setMaxLogEntries } = useActivityStore.getState();

            setMaxLogEntries(500);

            const state = useActivityStore.getState();
            expect(state.maxEntries).toBe(500);
        });

        it('should trim existing logs when reducing maxEntries', () => {
            const { addLogEntry, setMaxLogEntries } = useActivityStore.getState();

            // Add 5 log entries
            for (let i = 1; i <= 5; i++) {
                mockDateNow.mockReturnValue(1672531200000 + i * 60000);
                addLogEntry({
                    type: 'user_action',
                    level: 'info',
                    message: `Log ${i}`,
                });
            }

            // Verify all 5 entries were added
            let state = useActivityStore.getState();
            expect(state.logs).toHaveLength(5);

            // Reduce maxEntries to 3
            setMaxLogEntries(3);

            // Should trim to newest 3 entries
            state = useActivityStore.getState();
            expect(state.logs).toHaveLength(3);
            expect(state.logs[0].message).toBe('Log 5'); // Newest
            expect(state.logs[1].message).toBe('Log 4');
            expect(state.logs[2].message).toBe('Log 3');
        });

        it('should trim existing API calls when reducing maxEntries', () => {
            const { addApiCallLog, setMaxLogEntries } = useActivityStore.getState();

            // Add 4 API call entries
            for (let i = 1; i <= 4; i++) {
                mockDateNow.mockReturnValue(1672531200000 + i * 60000);
                addApiCallLog({
                    method: 'GET',
                    url: `/api/call${i}`,
                });
            }

            let state = useActivityStore.getState();
            expect(state.apiCalls).toHaveLength(4);

            // Reduce maxEntries to 2
            setMaxLogEntries(2);

            state = useActivityStore.getState();
            expect(state.apiCalls).toHaveLength(2);
            expect(state.apiCalls[0].url).toBe('/api/call4'); // Newest
            expect(state.apiCalls[1].url).toBe('/api/call3');
        });

        it('should not affect logs/calls when increasing maxEntries', () => {
            const { addLogEntry, setMaxLogEntries } = useActivityStore.getState();

            // Add 2 entries with maxEntries = 1000
            addLogEntry({
                type: 'user_action',
                level: 'info',
                message: 'Log 1',
            });

            mockDateNow.mockReturnValue(1672531260000);
            addLogEntry({
                type: 'user_action',
                level: 'info',
                message: 'Log 2',
            });

            // Increase maxEntries
            setMaxLogEntries(2000);

            const state = useActivityStore.getState();
            expect(state.logs).toHaveLength(2);
            expect(state.maxEntries).toBe(2000);
        });
    });

    describe('getRecentLogs', () => {
        it('should return the most recent logs with default count', () => {
            const { addLogEntry, getRecentLogs } = useActivityStore.getState();

            // Add 15 log entries
            for (let i = 1; i <= 15; i++) {
                mockDateNow.mockReturnValue(1672531200000 + i * 60000);
                addLogEntry({
                    type: 'user_action',
                    level: 'info',
                    message: `Log ${i}`,
                });
            }

            const recentLogs = getRecentLogs();

            expect(recentLogs).toHaveLength(10); // Default count
            expect(recentLogs[0].message).toBe('Log 15'); // Newest first
            expect(recentLogs[9].message).toBe('Log 6');
        });

        it('should return specified number of recent logs', () => {
            const { addLogEntry, getRecentLogs } = useActivityStore.getState();

            for (let i = 1; i <= 10; i++) {
                mockDateNow.mockReturnValue(1672531200000 + i * 60000);
                addLogEntry({
                    type: 'user_action',
                    level: 'info',
                    message: `Log ${i}`,
                });
            }

            const recentLogs = getRecentLogs(5);

            expect(recentLogs).toHaveLength(5);
            expect(recentLogs[0].message).toBe('Log 10');
            expect(recentLogs[4].message).toBe('Log 6');
        });

        it('should return all logs if count exceeds available logs', () => {
            const { addLogEntry, getRecentLogs } = useActivityStore.getState();

            addLogEntry({
                type: 'user_action',
                level: 'info',
                message: 'Only log',
            });

            const recentLogs = getRecentLogs(10);

            expect(recentLogs).toHaveLength(1);
            expect(recentLogs[0].message).toBe('Only log');
        });
    });

    describe('getLogsByType', () => {
        it('should return logs filtered by type', () => {
            const { addLogEntry, getLogsByType } = useActivityStore.getState();

            addLogEntry({
                type: 'user_action',
                level: 'info',
                message: 'User action 1',
            });

            mockDateNow.mockReturnValue(1672531260000);
            addLogEntry({
                type: 'system_event',
                level: 'debug',
                message: 'System event 1',
            });

            mockDateNow.mockReturnValue(1672531320000);
            addLogEntry({
                type: 'user_action',
                level: 'info',
                message: 'User action 2',
            });

            const userActionLogs = getLogsByType('user_action');
            const systemEventLogs = getLogsByType('system_event');
            const errorLogs = getLogsByType('error');

            expect(userActionLogs).toHaveLength(2);
            expect(userActionLogs[0].message).toBe('User action 2');
            expect(userActionLogs[1].message).toBe('User action 1');

            expect(systemEventLogs).toHaveLength(1);
            expect(systemEventLogs[0].message).toBe('System event 1');

            expect(errorLogs).toHaveLength(0);
        });
    });

    describe('getLogsByLevel', () => {
        it('should return logs filtered by level', () => {
            const { addLogEntry, getLogsByLevel } = useActivityStore.getState();

            addLogEntry({
                type: 'user_action',
                level: 'info',
                message: 'Info message 1',
            });

            mockDateNow.mockReturnValue(1672531260000);
            addLogEntry({
                type: 'error',
                level: 'error',
                message: 'Error message 1',
            });

            mockDateNow.mockReturnValue(1672531320000);
            addLogEntry({
                type: 'user_action',
                level: 'info',
                message: 'Info message 2',
            });

            const infoLogs = getLogsByLevel('info');
            const errorLogs = getLogsByLevel('error');
            const debugLogs = getLogsByLevel('debug');

            expect(infoLogs).toHaveLength(2);
            expect(infoLogs[0].message).toBe('Info message 2');
            expect(infoLogs[1].message).toBe('Info message 1');

            expect(errorLogs).toHaveLength(1);
            expect(errorLogs[0].message).toBe('Error message 1');

            expect(debugLogs).toHaveLength(0);
        });
    });
});
