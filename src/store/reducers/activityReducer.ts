import { produce } from 'immer';
import type { ActivityState, ActivityAction } from '../types';

const initialState: ActivityState = {
  logs: [],
  apiCalls: [],
  maxEntries: 1000,
};

export function activityReducer(
  state: ActivityState = initialState,
  action: ActivityAction
): ActivityState {
  return produce(state, (draft) => {
    switch (action.type) {
      case 'ADD_LOG_ENTRY':
        const logEntry = {
          ...action.payload,
          id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
        };
        
        draft.logs.unshift(logEntry);
        
        // Keep only the most recent entries
        if (draft.logs.length > draft.maxEntries) {
          draft.logs = draft.logs.slice(0, draft.maxEntries);
        }
        break;

      case 'ADD_API_CALL_LOG':
        const apiCallEntry = {
          ...action.payload,
          id: `api-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
        };
        
        draft.apiCalls.unshift(apiCallEntry);
        
        // Keep only the most recent entries
        if (draft.apiCalls.length > draft.maxEntries) {
          draft.apiCalls = draft.apiCalls.slice(0, draft.maxEntries);
        }
        break;

      case 'CLEAR_ACTIVITY_LOGS':
        draft.logs = [];
        draft.apiCalls = [];
        break;

      case 'SET_MAX_LOG_ENTRIES':
        draft.maxEntries = action.payload;
        
        // Trim existing logs if necessary
        if (draft.logs.length > draft.maxEntries) {
          draft.logs = draft.logs.slice(0, draft.maxEntries);
        }
        if (draft.apiCalls.length > draft.maxEntries) {
          draft.apiCalls = draft.apiCalls.slice(0, draft.maxEntries);
        }
        break;

      default:
        break;
    }
  });
}