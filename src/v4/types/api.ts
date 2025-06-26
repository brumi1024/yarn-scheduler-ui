/**
 * API-specific types for YARN REST API responses and requests
 */

import type { SchedulerInfo } from './scheduler';
import type { ConfigProperty } from './config';
import type { SchedConfUpdateInfo } from './config';

// Response types that match the actual YARN API

export interface SchedulerResponse {
    scheduler: {
        schedulerInfo: SchedulerInfo;
    };
}

export interface SchedulerConfResponse {
    property: ConfigProperty[];
}

export interface YarnErrorResponse {
    RemoteException?: {
        exception: string;
        javaClassName: string;
        message: string;
    };
}

export interface VersionResponse {
    versionID: number;
}

export interface NodeLabelsResponse {
    nodeLabelsInfo?: {
        nodeLabelInfo?: Array<{
            name: string;
            exclusivity?: boolean;
            partitionName?: string;
        }>;
    };
}

export interface NodeToLabelsResponse {
    nodeToLabels?: {
        nodeToLabels?: Array<{
            nodeId: string;
            labels: string[];
        }>;
    };
}

export interface HealthCheckResponse {
    status: 'ok' | 'error';
    message?: string;
    timestamp: number;
}

// API client configuration
export interface ApiClientConfig {
    timeout?: number;
    headers?: Record<string, string>;
    retryAttempts?: number;
    retryDelay?: number;
    requestInterceptor?: (request: Request) => Request | Promise<Request>;
    responseInterceptor?: (response: Response) => Response | Promise<Response>;
}
