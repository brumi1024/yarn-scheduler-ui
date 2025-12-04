/**
 * API-specific types for YARN REST API responses and requests
 */

import type { SchedulerInfo } from './scheduler';
import type { ConfigProperty } from './config';

// Response types that match the actual YARN API

export type SchedulerResponse = {
  scheduler: {
    schedulerInfo: SchedulerInfo;
  };
};

export type SchedulerConfResponse = {
  property: ConfigProperty[];
};

export type SchedulerIssueResponse = {
  schedulerIssue: string;
  file: string;
  fileName: string;
  contentType: string;
  content: string;
};

export type YarnErrorResponse = {
  RemoteException?: {
    exception: string;
    javaClassName: string;
    message: string;
  };
};

export type VersionResponse = {
  versionId: number;
};

export type NodeLabelInfoItem = {
  name: string;
  exclusivity?: boolean | 'true' | 'false';
  partitionName?: string;
  activeNMs?: number;
  partitionInfo?: unknown;
};

export type NodeLabelsResponse = {
  nodeLabelInfo?: NodeLabelInfoItem | NodeLabelInfoItem[];
};

export type NodeToLabelsMapEntry = {
  key: string;
  value?: {
    nodeLabelInfo?:
      | NodeLabelInfoItem
      | NodeLabelInfoItem[]
      | {
          nodeLabelInfo?: NodeLabelInfoItem | NodeLabelInfoItem[];
        };
  };
};

export type NodeToLabelsResponse = {
  nodeToLabels?: {
    entry?: NodeToLabelsMapEntry | NodeToLabelsMapEntry[];
  };
};

export type YarnConfigResponse = {
  property: {
    value: string;
  };
};

// API client configuration
export type ApiClientConfig = {
  timeout?: number;
  headers?: Record<string, string>;
  retryAttempts?: number;
  retryDelay?: number;
  userName?: string;
  detectSecurityMode?: boolean;
  requestInterceptor?: (request: Request) => Request | Promise<Request>;
  responseInterceptor?: (response: Response) => Response | Promise<Response>;
};
