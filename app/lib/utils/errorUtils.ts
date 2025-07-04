/**
 * Error handling utilities for the Scheduler Store
 */

export class SchedulerStoreError extends Error {
    constructor(
        message: string,
        public readonly code: string,
        public readonly details?: unknown
    ) {
        super(message);
        this.name = 'SchedulerStoreError';
    }
}

export function createStoreError(code: string, message: string, details?: unknown): SchedulerStoreError {
    return new SchedulerStoreError(message, code, details);
}

/**
 * Error codes for better error handling
 */
export const ERROR_CODES = {
    LOAD_INITIAL_DATA_FAILED: 'LOAD_INITIAL_DATA_FAILED',
    REFRESH_SCHEDULER_FAILED: 'REFRESH_SCHEDULER_FAILED',
    APPLY_CHANGES_FAILED: 'APPLY_CHANGES_FAILED',
    INVALID_QUEUE_PATH: 'INVALID_QUEUE_PATH',
    INVALID_PROPERTY_NAME: 'INVALID_PROPERTY_NAME',
    INVALID_PROPERTY_VALUE: 'INVALID_PROPERTY_VALUE',
    INVALID_QUEUE_NAME: 'INVALID_QUEUE_NAME',
    EMPTY_STAGED_CHANGES: 'EMPTY_STAGED_CHANGES',
    API_ERROR: 'API_ERROR',
    NETWORK_ERROR: 'NETWORK_ERROR',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
} as const;

/**
 * Extract a user-friendly error message from various error types
 */
export function extractErrorMessage(error: unknown): string {
    if (error instanceof SchedulerStoreError) {
        return error.message;
    }

    if (error instanceof Error) {
        return error.message;
    }

    if (typeof error === 'string') {
        return error;
    }

    return 'An unexpected error occurred';
}

/**
 * Type guard to check if an error is a SchedulerStoreError
 */
export function isSchedulerStoreError(error: unknown): error is SchedulerStoreError {
    return error instanceof SchedulerStoreError;
}

/**
 * Type guard to check if an error is a network error
 */
export function isNetworkError(error: unknown): boolean {
    if (error instanceof Error) {
        const message = error.message.toLowerCase();
        return (
            message.includes('network') ||
            message.includes('fetch') ||
            message.includes('timeout') ||
            message.includes('abort')
        );
    }
    return false;
}

/**
 * Create a detailed error message with context
 */
export function createDetailedErrorMessage(
    operation: string,
    error: unknown,
    context?: Record<string, unknown>
): string {
    const baseMessage = `Failed to ${operation}`;
    const errorMessage = extractErrorMessage(error);

    let message = `${baseMessage}: ${errorMessage}`;

    if (context && Object.keys(context).length > 0) {
        const contextStr = Object.entries(context)
            .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
            .join(', ');
        message += ` (${contextStr})`;
    }

    return message;
}