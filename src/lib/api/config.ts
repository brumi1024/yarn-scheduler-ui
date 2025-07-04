/**
 * API configuration
 */

export const API_CONFIG = {
  // Default API base URL - can be overridden by environment variable
  baseUrl: import.meta.env.VITE_YARN_API_URL || 'http://localhost:8088/ws/v1/cluster',
  timeout: 30000,
};
