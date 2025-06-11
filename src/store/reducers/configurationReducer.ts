import { produce } from 'immer';
import type { ConfigurationState, ConfigurationAction } from '../types';

const initialState: ConfigurationState = {
  scheduler: null,
  configuration: null,
  nodeLabels: null,
  nodes: null,
  loading: {
    scheduler: false,
    configuration: false,
    nodeLabels: false,
    nodes: false,
  },
  errors: {
    scheduler: null,
    configuration: null,
    nodeLabels: null,
    nodes: null,
  },
  lastUpdated: {},
};

export function configurationReducer(
  state: ConfigurationState = initialState,
  action: ConfigurationAction
): ConfigurationState {
  return produce(state, (draft) => {
    switch (action.type) {
      case 'LOAD_SCHEDULER_START':
        draft.loading.scheduler = true;
        draft.errors.scheduler = null;
        break;

      case 'LOAD_SCHEDULER_SUCCESS':
        draft.loading.scheduler = false;
        draft.scheduler = action.payload;
        if (!draft.lastUpdated) draft.lastUpdated = {};
        draft.lastUpdated.scheduler = Date.now();
        break;

      case 'LOAD_SCHEDULER_ERROR':
        draft.loading.scheduler = false;
        draft.errors.scheduler = action.payload;
        break;

      case 'LOAD_CONFIGURATION_START':
        draft.loading.configuration = true;
        draft.errors.configuration = null;
        break;

      case 'LOAD_CONFIGURATION_SUCCESS':
        draft.loading.configuration = false;
        draft.configuration = action.payload;
        if (!draft.lastUpdated) draft.lastUpdated = {};
        draft.lastUpdated.configuration = Date.now();
        break;

      case 'LOAD_CONFIGURATION_ERROR':
        draft.loading.configuration = false;
        draft.errors.configuration = action.payload;
        break;

      case 'LOAD_NODE_LABELS_START':
        draft.loading.nodeLabels = true;
        draft.errors.nodeLabels = null;
        break;

      case 'LOAD_NODE_LABELS_SUCCESS':
        draft.loading.nodeLabels = false;
        draft.nodeLabels = action.payload;
        if (!draft.lastUpdated) draft.lastUpdated = {};
        draft.lastUpdated.nodeLabels = Date.now();
        break;

      case 'LOAD_NODE_LABELS_ERROR':
        draft.loading.nodeLabels = false;
        draft.errors.nodeLabels = action.payload;
        break;

      case 'LOAD_NODES_START':
        draft.loading.nodes = true;
        draft.errors.nodes = null;
        break;

      case 'LOAD_NODES_SUCCESS':
        draft.loading.nodes = false;
        draft.nodes = action.payload;
        if (!draft.lastUpdated) draft.lastUpdated = {};
        draft.lastUpdated.nodes = Date.now();
        break;

      case 'LOAD_NODES_ERROR':
        draft.loading.nodes = false;
        draft.errors.nodes = action.payload;
        break;

      case 'REFRESH_ALL_DATA':
        // Reset all loading states to trigger refetch
        draft.loading = {
          scheduler: true,
          configuration: true,
          nodeLabels: true,
          nodes: true,
        };
        draft.errors = {
          scheduler: null,
          configuration: null,
          nodeLabels: null,
          nodes: null,
        };
        break;

      default:
        break;
    }
  });
}