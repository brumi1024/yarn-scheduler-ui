import type {
    SchedulerResponse,
    ConfigurationResponse,
    ConfigurationUpdateRequest,
    ConfigurationUpdateResponse,
} from '../types/Configuration';
import type {
    NodeLabelsResponse,
    NodeToLabelsResponse,
    LabelsToNodesResponse,
    NodesResponse,
    AddNodeLabelsRequest,
    ReplaceNodeLabelsRequest,
} from '../types/NodeLabel';

export interface ApiError {
    code: string;
    message: string;
    status?: number;
}

export class ApiService {
    private baseUrl: string;
    private timeout: number;

    constructor(baseUrl: string = '/ws/v1/cluster', timeout: number = 10000) {
        this.baseUrl = baseUrl;
        this.timeout = timeout;
    }

    private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                ...options,
                signal: controller.signal,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers,
                },
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            clearTimeout(timeoutId);

            if (error instanceof Error) {
                if (error.name === 'AbortError' || error.message.includes('aborted')) {
                    throw new Error(`Request timeout after ${this.timeout}ms`);
                }
                throw error;
            }

            throw new Error('Unknown error occurred');
        }
    }

    // Scheduler endpoints
    async getScheduler(): Promise<SchedulerResponse> {
        return this.request<SchedulerResponse>('/scheduler');
    }

    async getConfiguration(): Promise<ConfigurationResponse> {
        return this.request<ConfigurationResponse>('/scheduler-conf');
    }

    async updateConfiguration(changes: ConfigurationUpdateRequest): Promise<ConfigurationUpdateResponse> {
        return this.request<ConfigurationUpdateResponse>('/scheduler-conf', {
            method: 'PUT',
            body: JSON.stringify(changes),
        });
    }

    // Node management endpoints
    async getNodes(): Promise<NodesResponse> {
        return this.request<NodesResponse>('/nodes');
    }

    // Node labels endpoints
    async getNodeLabels(): Promise<NodeLabelsResponse> {
        return this.request<NodeLabelsResponse>('/get-node-labels');
    }

    async getNodeToLabels(): Promise<NodeToLabelsResponse> {
        return this.request<NodeToLabelsResponse>('/nodes/get-node-to-labels');
    }

    async getLabelsToNodes(): Promise<LabelsToNodesResponse> {
        return this.request<LabelsToNodesResponse>('/nodes/get-labels-to-nodes');
    }

    async addNodeLabels(request: AddNodeLabelsRequest): Promise<void> {
        await this.request<void>('/add-node-labels', {
            method: 'POST',
            body: JSON.stringify(request),
        });
    }

    async replaceNodeLabels(request: ReplaceNodeLabelsRequest): Promise<void> {
        await this.request<void>('/nodes/replace-node-to-labels', {
            method: 'POST',
            body: JSON.stringify(request),
        });
    }

    async removeNodeLabels(labelNames: string[]): Promise<void> {
        const queryParams = labelNames.map((name) => `nodeLabels=${encodeURIComponent(name)}`).join('&');
        await this.request<void>(`/remove-node-labels?${queryParams}`, {
            method: 'POST',
        });
    }

    // Health check
    async healthCheck(): Promise<{ status: 'ok' | 'error'; timestamp: number }> {
        try {
            await this.getScheduler();
            return { status: 'ok', timestamp: Date.now() };
        } catch (error) {
            return { status: 'error', timestamp: Date.now() };
        }
    }
}

// Default instance
export const apiService = new ApiService();
