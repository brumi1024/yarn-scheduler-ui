/**
 * YARN REST API Client (Simplified for React Query)
 * Provides basic fetch methods for Apache Hadoop YARN's Capacity Scheduler APIs
 * All retry logic, caching, and state management is handled by React Query
 */

import type {
  ApiClientConfig,
  SchedulerResponse,
  SchedulerConfResponse,
  SchedConfUpdateInfo,
  YarnErrorResponse,
  NodeLabelsResponse,
  NodeToLabelsResponse,
  NodesResponse,
  VersionResponse,
  YarnConfigResponse,
} from '../../types';

export class YarnApiClient {
  private readonly baseUrl: string;
  private readonly defaultHeaders: Record<string, string>;
  private readonly timeout: number;
  private readonly userName: string;
  private securityMode: 'simple' | 'kerberos' | null = null;
  private initPromise: Promise<void> | null = null;

  constructor(baseUrl: string, config: ApiClientConfig = {}) {
    // Remove trailing slash if present
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    this.timeout = config.timeout || 30000;
    this.userName = config.userName || 'yarn';
    this.defaultHeaders = {
      Accept: 'application/json',
      ...config.headers,
    };

    // Initialize security mode detection
    this.initPromise = this.detectSecurityMode()
      .catch((error) => {
        console.error('Failed to detect YARN security mode:', error);
        // Don't rethrow - allow requests to proceed without auth detection
      })
      .finally(() => {
        // Clear the promise after detection completes
        this.initPromise = null;
      });
  }

  /**
   * Get the root URL (origin) from the base URL
   */
  private get rootUrl(): string {
    if (/^https?:\/\//i.test(this.baseUrl)) {
      return new URL(this.baseUrl).origin;
    }

    if (typeof window !== 'undefined') {
      return window.location.origin;
    }

    // Fallback for non-browser environments (tests/SSR)
    return 'http://localhost:8088';
  }

  /**
   * GET /scheduler - Fetch queue hierarchy with live metrics
   */
  async getScheduler(): Promise<SchedulerResponse> {
    return this.request<SchedulerResponse>('GET', '/scheduler');
  }

  /**
   * GET /scheduler-conf - Fetch current configuration properties
   */
  async getSchedulerConf(): Promise<SchedulerConfResponse> {
    return this.request<SchedulerConfResponse>('GET', '/scheduler-conf');
  }

  /**
   * PUT /scheduler-conf - Update configuration
   */
  async updateSchedulerConf(updateInfo: SchedConfUpdateInfo): Promise<void> {
    await this.request('PUT', '/scheduler-conf', {
      body: JSON.stringify(updateInfo),
      headers: {
        'Content-Type': 'application/json',
      },
      expectJson: false,
    });
  }

  /**
   * POST /scheduler-conf/validate - Validate configuration changes
   */
  async validateSchedulerConf(updateInfo: SchedConfUpdateInfo): Promise<void> {
    await this.request('POST', '/scheduler-conf/validate', {
      body: JSON.stringify(updateInfo),
      headers: {
        'Content-Type': 'application/json',
      },
      expectJson: false,
    });
  }

  /**
   * GET /scheduler-conf/version - Get configuration version
   */
  async getSchedulerConfVersion(): Promise<VersionResponse> {
    return this.request<VersionResponse>('GET', '/scheduler-conf/version');
  }

  /**
   * GET /ws/v1/cluster/get-node-labels - List all node labels
   */
  async getNodeLabels(): Promise<NodeLabelsResponse> {
    return this.request<NodeLabelsResponse>('GET', '/get-node-labels');
  }

  /**
   * POST /ws/v1/cluster/add-node-labels - Add new node labels
   */
  async addNodeLabels(labels: { name: string; exclusivity: boolean }[]): Promise<void> {
    await this.request('POST', '/add-node-labels', {
      body: JSON.stringify({
        nodeLabelsInfo: {
          nodeLabelInfo: labels.map((label) => ({
            name: label.name,
            exclusivity: label.exclusivity,
          })),
        },
      }),
      headers: {
        'Content-Type': 'application/json',
      },
      expectJson: false,
    });
  }

  /**
   * POST /ws/v1/cluster/remove-node-labels - Remove node labels
   */
  async removeNodeLabels(labels: string[]): Promise<void> {
    await this.request('POST', '/remove-node-labels', {
      body: JSON.stringify({ nodeLabels: labels }),
      headers: {
        'Content-Type': 'application/json',
      },
      expectJson: false,
    });
  }

  /**
   * GET /ws/v1/cluster/get-node-to-labels - Get node to label mappings
   */
  async getNodeToLabels(): Promise<NodeToLabelsResponse> {
    return this.request<NodeToLabelsResponse>('GET', '/get-node-to-labels');
  }

  /**
   * GET /ws/v1/cluster/nodes - Get cluster nodes information
   */
  async getNodes(): Promise<NodesResponse> {
    return this.request<NodesResponse>('GET', '/nodes');
  }

  /**
   * POST /ws/v1/cluster/replace-node-to-labels - Replace node label assignments
   */
  async replaceNodeToLabels(nodeToLabels: { nodeId: string; labels: string[] }[]): Promise<void> {
    await this.request('POST', '/replace-node-to-labels', {
      body: JSON.stringify({
        nodeToLabels: {
          nodeLabels: nodeToLabels,
        },
      }),
      headers: {
        'Content-Type': 'application/json',
      },
      expectJson: false,
    });
  }

  /**
   * GET /conf?name=<config> - Fetch YARN configuration value
   * Note: This endpoint is at the root level, not under /ws/v1/cluster
   */
  async getConfiguration(name: string): Promise<string> {
    const url = `${this.rootUrl}/conf?name=${encodeURIComponent(name)}`;
    const response = await this.request<YarnConfigResponse>('GET', url, {
      skipAuth: true,
      absoluteUrl: true,
    });
    return response.property.value;
  }

  /**
   * Detect YARN security mode by checking hadoop.security.authentication
   */
  private async detectSecurityMode(): Promise<void> {
    try {
      const authMode = await this.getConfiguration('hadoop.security.authentication');
      this.securityMode = authMode.toLowerCase() === 'simple' ? 'simple' : 'kerberos';
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      if (
        /user\s+not\s+authenticated/i.test(message) ||
        /unable to obtain user name/i.test(message)
      ) {
        this.securityMode = 'simple';
        return;
      }

      // Fallback to simple mode when detection fails (common in dev proxies)
      this.securityMode = 'simple';

      // Surface unexpected errors for visibility
      console.warn('Proceeding with simple auth mode due to detection failure:', message);
    }
  }

  /**
   * Simple request method - React Query handles retries and error states
   */
  private async request<T = void>(
    method: string,
    path: string,
    options: RequestInit & { skipAuth?: boolean; absoluteUrl?: boolean; expectJson?: boolean } = {},
  ): Promise<T> {
    // Wait for security mode detection to complete (if still in progress)
    if (this.initPromise) {
      await this.initPromise;
    }

    // Build URL - use path as-is if absolute, otherwise append to baseUrl
    const { skipAuth, absoluteUrl, expectJson = true, ...fetchOptions } = options;
    let url = absoluteUrl ? path : `${this.baseUrl}${path}`;

    // Add user.name parameter for simple auth mode (unless skipAuth is true)
    if (!skipAuth && this.securityMode === 'simple' && this.userName) {
      const separator = url.includes('?') ? '&' : '?';
      url += `${separator}user.name=${encodeURIComponent(this.userName)}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method,
        signal: controller.signal,
        credentials: 'include', // Include cookies for cross-origin requests
        ...fetchOptions,
        headers: {
          ...this.defaultHeaders,
          ...fetchOptions.headers,
        },
      });

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      // Handle empty responses
      if (response.status === 204 || response.headers.get('content-length') === '0') {
        return undefined as T;
      }

      const contentType = response.headers.get('content-type') || '';
      if (!expectJson) {
        return undefined as T;
      }

      if (contentType.includes('application/json')) {
        try {
          return await response.json();
        } catch (parseError) {
          throw parseError instanceof Error
            ? parseError
            : new Error('Failed to parse JSON response from YARN API.');
        }
      }

      // Return empty for successful non-JSON responses
      return undefined as T;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Handle error responses from YARN API
   */
  private async handleErrorResponse(response: Response): Promise<never> {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

    try {
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        const errorData: YarnErrorResponse = await response.json();
        if (errorData.RemoteException) {
          errorMessage = errorData.RemoteException.message;
        }
      }
    } catch {
      // Use the default error message if parsing fails
    }

    throw new Error(errorMessage);
  }
}
