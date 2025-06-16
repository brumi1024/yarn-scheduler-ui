// Re-export common types from Queue.ts
export type { SchedulerResponse, ConfigurationResponse, Configuration, Queue, ParsedQueue } from './Queue';

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
    queuePath: string;
    property: string;
    oldValue: string;
    newValue: string;
    timestamp: Date;
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
