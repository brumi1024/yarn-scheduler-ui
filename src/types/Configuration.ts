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

export type ChangeType = 'PROPERTY_UPDATE' | 'ADD_QUEUE' | 'DELETE_QUEUE';

export interface ChangeSet {
    id: string;
    type: ChangeType;
    queuePath: string; // Parent path for ADD_QUEUE, target path for DELETE_QUEUE
    property: string; // Queue name for ADD/DELETE operations
    oldValue: unknown; // Full queue definition for DELETE (undo support)
    newValue: unknown; // New queue properties for ADD
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
