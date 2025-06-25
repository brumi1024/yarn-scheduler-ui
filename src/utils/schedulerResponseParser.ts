import type { SchedulerResponse } from '../types/Configuration';
import type { Queue } from '../types/Queue';

/**
 * Parses the scheduler response and extracts the queue hierarchy
 */
export function parseSchedulerResponse(response: SchedulerResponse): Queue {
    if (!response?.scheduler?.schedulerInfo) {
        throw new Error('Invalid scheduler response: missing schedulerInfo');
    }

    return response.scheduler.schedulerInfo;
}
