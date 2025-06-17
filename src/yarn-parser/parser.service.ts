/**
 * Parser Service - Web Worker Wrapper
 * 
 * Provides a clean, modern async/await interface for interacting with the
 * configuration parsing Web Worker. Handles worker lifecycle and message
 * communication.
 */

import type { Configuration } from '../types/Queue';
import type { ParseResult } from './ConfigParser';

interface WorkerMessage {
    config: Configuration;
}

interface WorkerSuccessResponse {
    type: 'SUCCESS';
    payload: ParseResult;
}

interface WorkerErrorResponse {
    type: 'ERROR';
    payload: { message: string };
}

type WorkerResponse = WorkerSuccessResponse | WorkerErrorResponse;

class ParserService {
    private worker: Worker | null = null;

    private getWorker(): Worker {
        if (!this.worker) {
            // The { type: 'module' } is crucial for Vite to handle the worker correctly
            this.worker = new Worker(new URL('./parser.worker.ts', import.meta.url), {
                type: 'module',
            });
        }
        return this.worker;
    }

    public parseConfiguration(config: Configuration): Promise<ParseResult> {
        return new Promise((resolve, reject) => {
            const worker = this.getWorker();

            const messageHandler = (event: MessageEvent<WorkerResponse>) => {
                // Clean up listeners to prevent memory leaks
                worker.removeEventListener('message', messageHandler);
                worker.removeEventListener('error', errorHandler);

                if (event.data.type === 'SUCCESS') {
                    resolve(event.data.payload);
                } else {
                    reject(new Error(event.data.payload.message || 'Parsing failed in worker'));
                }
            };

            const errorHandler = (event: ErrorEvent) => {
                // Clean up listeners
                worker.removeEventListener('message', messageHandler);
                worker.removeEventListener('error', errorHandler);
                reject(new Error(`Worker error: ${event.message}`));
            };

            worker.addEventListener('message', messageHandler);
            worker.addEventListener('error', errorHandler);

            // Send the configuration to the worker to start parsing
            const message: WorkerMessage = { config };
            worker.postMessage(message);
        });
    }

    public terminate() {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
    }
}

// Export a singleton instance of the service
export const parserService = new ParserService();

// Also export the class for testing purposes
export { ParserService };