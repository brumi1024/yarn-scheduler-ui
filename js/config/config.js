/**
 * @file Global configuration constants for the YARN Scheduler UI.
 */

const CONFIG = {
  USER_NAME: "yarn", // Default user for API calls
  USE_MOCKS: true, // Set to false to use live API, true for mock data
  API_BASE_URL: window.location.origin || '', // Base URL for API calls
  API_ENDPOINTS: {
    SCHEDULER_CONF: "/ws/v1/cluster/scheduler-conf",
    SCHEDULER_INFO: "/ws/v1/cluster/scheduler",
    // CLUSTER_INFO: "/ws/v1/cluster/info", // If needed later
  },
  TIMEOUTS: {
    ARROW_RENDER: 150, // Delay for arrow rendering after UI updates
    API_RETRY: 5000,   // Timeout for API retries
    NOTIFICATION_DURATION: {
      SUCCESS: 5000,
      INFO: 5000,
      WARNING: 6000,
      ERROR: 8000,
    }
  },
  MOCK_DATA_BASE_PATH: "./mock", // Path to mock data files
};

const CAPACITY_MODES = {
  VECTOR: "vector", // Note: YARN itself often just calls this "absolute"
  WEIGHT: "weight",
  ABSOLUTE: "absolute",
  PERCENTAGE: "percentage",
};

// Operation constants for pending changes
const OPERATION_TYPES = {
  ADD: "ADD",
  DELETE: "DELETE",
  UPDATE: "UPDATE",
};

// Placeholder for queue paths in metadata
const Q_PATH_PLACEHOLDER = '<queue_path>';

// Default partition identifier
const DEFAULT_PARTITION = "";