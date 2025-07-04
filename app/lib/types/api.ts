/**
 * API-specific types for YARN REST API responses and requests
 */

import type { SchedulerInfo } from './scheduler';
import type { ConfigProperty } from './config';
import type { SchedConfUpdateInfo } from './config';

// Response types that match the actual YARN API

export type SchedulerResponse = {
    scheduler: {
        schedulerInfo: SchedulerInfo;
    };
};

export type SchedulerConfResponse = {
    property: ConfigProperty[];
};

export type YarnErrorResponse = {
    RemoteException?: {
        exception: string;
        javaClassName: string;
        message: string;
    };
};

export type VersionResponse = {
    versionID: number;
};

export type NodeLabelsResponse = {
    nodeLabelsInfo?: {
        nodeLabelInfo?: Array<{
            name: string;
            exclusivity?: boolean;
            partitionName?: string;
        }>;
    };
};

export type NodeToLabelsResponse = {
    nodeToLabelsInfo?: {
        nodeToLabels?: Array<{
            nodeId: string;
            nodeLabels: string[];
        }>;
    };
};

// API client configuration
export type ApiClientConfig = {
    timeout?: number;
    headers?: Record<string, string>;
    retryAttempts?: number;
    retryDelay?: number;
    requestInterceptor?: (request: Request) => Request | Promise<Request>;
    responseInterceptor?: (response: Response) => Response | Promise<Response>;
};
