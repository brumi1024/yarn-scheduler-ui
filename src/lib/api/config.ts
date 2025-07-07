/**
 * API configuration
 */
export const API_CONFIG = {
  baseUrl:
    import.meta.env.VITE_YARN_API_URL ||
    (() => {
      // For development
      if (window.location.hostname === 'localhost' && window.location.port === '3000') {
        return 'http://localhost:8088/ws/v1/cluster';
      }
      // For production - always use the same host
      return window.location.origin + '/ws/v1/cluster';
    })(),
};
