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
      // For production
      return window.location.origin + '/ws/v1/cluster';
    })(),
  // Username for YARN simple authentication mode
  userName: import.meta.env.VITE_YARN_USER_NAME || 'yarn',
};
