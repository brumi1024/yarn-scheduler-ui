/**
 * Error handling utilities for the Scheduler Store
 */

export class SchedulerStoreError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'SchedulerStoreError';
  }
}
