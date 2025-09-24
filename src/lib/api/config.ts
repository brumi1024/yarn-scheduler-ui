/**
 * API configuration
 */

type MockMode = 'static' | 'cluster' | 'off';

const normalizeUrl = (url: string | undefined | null): string | null => {
  if (!url) {
    return null;
  }

  const trimmed = url.trim();

  const protocolNormalized = trimmed.replace(
    /^([a-z]+):?\/\/?/i,
    (_, proto: string) => `${proto}://`,
  );
  const withProtocol = /^[a-z]+:\/\//i.test(protocolNormalized)
    ? protocolNormalized
    : `http://${protocolNormalized}`;

  return withProtocol.endsWith('/') ? withProtocol.slice(0, -1) : withProtocol;
};

const resolveBaseUrl = () => {
  const envBase = import.meta.env.VITE_YARN_API_URL;
  if (envBase) {
    return normalizeUrl(envBase) ?? envBase;
  }

  if (typeof window !== 'undefined') {
    // For development
    if (window.location.hostname === 'localhost' && window.location.port === '3000') {
      return 'http://localhost:8088/ws/v1/cluster';
    }
    // For production
    return `${window.location.origin}/ws/v1/cluster`;
  }

  // Fallback for non-browser environments (e.g., SSR) when no env config is provided
  return 'http://localhost:8088/ws/v1/cluster';
};

const resolveMockMode = (): MockMode => {
  const raw = (import.meta.env.VITE_API_MOCK_MODE as string | undefined)?.toLowerCase();

  if (raw === 'off' || raw === 'cluster' || raw === 'static') {
    return raw;
  }

  return import.meta.env.DEV ? 'static' : 'off';
};

const mockMode = resolveMockMode();
const defaultBaseUrl = resolveBaseUrl();

const baseUrl = (() => {
  if (mockMode === 'cluster') {
    const clusterUrl = normalizeUrl(import.meta.env.VITE_MOCK_CLUSTER_URL);
    if (clusterUrl) {
      return clusterUrl;
    }
  }

  return defaultBaseUrl;
})();

export const API_CONFIG = {
  baseUrl,
  mockMode,
  // Username for YARN simple authentication mode
  userName: import.meta.env.VITE_YARN_USER_NAME || 'yarn',
};
