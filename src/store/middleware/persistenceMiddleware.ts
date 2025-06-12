import type { Middleware } from '../types';

const STORAGE_KEY = 'yarn-scheduler-ui-state';

// UI state properties to persist
// const PERSISTENT_UI_KEYS = [
//   'viewSettings',
//   'expandedQueues',
// ] as const;

export const persistenceMiddleware: Middleware = (store) => (next) => (action) => {
  const result = next(action);
  
  // Only persist UI state changes
  if (action.type.startsWith('UI_') || action.type.includes('QUEUE') || action.type.includes('VIEW')) {
    try {
      const state = store.getState();
      const persistentState = {
        ui: {
          viewSettings: state.ui.viewSettings,
          expandedQueues: Array.from(state.ui.expandedQueues), // Convert Set to Array for JSON
        },
      };
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persistentState));
    } catch (error) {
      console.warn('Failed to persist state to localStorage:', error);
    }
  }
  
  return result;
};

export function loadPersistedState() {
  try {
    const persistedState = localStorage.getItem(STORAGE_KEY);
    if (persistedState) {
      const parsed = JSON.parse(persistedState);
      
      // Convert Array back to Set for expandedQueues
      if (parsed.ui?.expandedQueues) {
        parsed.ui.expandedQueues = new Set(parsed.ui.expandedQueues);
      }
      
      return parsed;
    }
  } catch (error) {
    console.warn('Failed to load persisted state from localStorage:', error);
  }
  
  return null;
}