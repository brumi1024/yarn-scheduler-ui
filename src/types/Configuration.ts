export interface ConfigurationProperty {
    name: string;
    value: string;
    source?: string;
}

// Re-export from Queue.ts to avoid circular import
export type { SchedulerResponse } from './Queue';

export interface ConfigurationResponse {
    property: ConfigurationProperty[];
}

export interface ConfigurationVersion {
    versionId: number;
}

export interface QueueUpdateRequest {
    'queue-name': string;
    params: Record<string, string>;
}

export interface ConfigurationUpdateRequest {
    'add-queue'?: Array<QueueUpdateRequest>;
    'update-queue'?: Array<QueueUpdateRequest>;
    'remove-queue'?: string[];
    'global-updates'?: Record<string, string>;
}

export interface ConfigurationUpdateResponse {
    response: string;
}

export interface ChangeSet {
    id: string;
    timestamp: Date;
    type: 'add-queue' | 'update-queue' | 'remove-queue' | 'global-update';
    queueName?: string;
    property?: string;
    oldValue?: string;
    newValue?: string;
    description: string;
}

// Parsed configuration for internal use
export interface ParsedConfiguration {
    queues: Map<string, Record<string, string>>;
    globalSettings: Map<string, string>;
    version?: number;
}

export interface ValidationError {
    code: string;
    message: string;
    property?: string;
    queueName?: string;
    severity: 'error' | 'warning';
}

export interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
    warnings: ValidationError[];
}
