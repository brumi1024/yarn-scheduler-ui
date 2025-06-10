import { produce } from 'immer';
import type { UIState, UIAction } from '../types';

const initialState: UIState = {
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
};

export function uiReducer(
  state: UIState = initialState,
  action: UIAction
): UIState {
  return produce(state, (draft) => {
    switch (action.type) {
      case 'SELECT_QUEUE':
        draft.selectedQueuePath = action.payload;
        break;

      case 'TOGGLE_QUEUE_EXPANDED':
        if (draft.expandedQueues.has(action.payload)) {
          draft.expandedQueues.delete(action.payload);
        } else {
          draft.expandedQueues.add(action.payload);
        }
        break;

      case 'SET_EXPANDED_QUEUES':
        draft.expandedQueues = new Set(action.payload);
        break;

      case 'UPDATE_VIEW_SETTINGS':
        Object.assign(draft.viewSettings, action.payload);
        break;

      case 'OPEN_PROPERTY_EDITOR':
        draft.modals.propertyEditor = {
          open: true,
          queuePath: action.payload.queuePath,
          mode: action.payload.mode,
        };
        break;

      case 'CLOSE_PROPERTY_EDITOR':
        draft.modals.propertyEditor = {
          open: false,
          queuePath: undefined,
          mode: 'edit',
        };
        break;

      case 'OPEN_CONFIRM_DIALOG':
        draft.modals.confirmDialog = {
          open: true,
          title: action.payload.title,
          message: action.payload.message,
          onConfirm: action.payload.onConfirm,
        };
        break;

      case 'CLOSE_CONFIRM_DIALOG':
        draft.modals.confirmDialog = {
          open: false,
          title: '',
          message: '',
          onConfirm: () => {},
        };
        break;

      case 'ADD_NOTIFICATION':
        const notification = {
          ...action.payload,
          id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
        };
        draft.notifications.push(notification);
        
        // Auto-remove notification if autoHide is true
        if (notification.autoHide !== false) {
          const duration = notification.duration || 5000;
          setTimeout(() => {
            // This will be handled by the notification component
          }, duration);
        }
        break;

      case 'REMOVE_NOTIFICATION':
        draft.notifications = draft.notifications.filter(
          notification => notification.id !== action.payload
        );
        break;

      case 'CLEAR_NOTIFICATIONS':
        draft.notifications = [];
        break;

      default:
        break;
    }
  });
}