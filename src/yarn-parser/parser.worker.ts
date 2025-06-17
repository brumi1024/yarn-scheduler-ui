/**
 * Web Worker for YARN Configuration Parsing
 * 
 * This worker performs CPU-intensive configuration parsing in the background
 * to keep the main UI thread responsive. It receives configuration data
 * via postMessage and returns parsed results or errors.
 */

import { ConfigParser, type ParseResult } from './ConfigParser';
import type { Configuration } from '../types/Queue';

// Define the message types for type safety
interface ParseMessage {
    config: Configuration;
}

interface SuccessResponse {
    type: 'SUCCESS';
    payload: ParseResult;
}

interface ErrorResponse {
    type: 'ERROR';
    payload: { message: string };
}

// Union type for responses (exported for potential external use)
export type WorkerResponse = SuccessResponse | ErrorResponse;

// Listen for messages from the main thread
self.addEventListener('message', (event: MessageEvent<ParseMessage>) => {
    const { config } = event.data;

    try {
        // Perform the CPU-intensive parsing within the worker
        const parseResult: ParseResult = ConfigParser.parse(config);

        // Send the successful result back to the main thread
        const response: SuccessResponse = {
            type: 'SUCCESS',
            payload: parseResult
        };
        self.postMessage(response);
    } catch (error) {
        // If an error occurs during parsing, send an error message back
        const errorMessage = error instanceof Error ? error.message : 'Unknown worker error';
        const response: ErrorResponse = {
            type: 'ERROR',
            payload: { message: errorMessage }
        };
        self.postMessage(response);
    }
});

// This export is necessary for TypeScript to treat this as a module
export {};