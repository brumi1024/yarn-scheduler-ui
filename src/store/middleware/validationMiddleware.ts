import type { Middleware } from '../types';

export const validationMiddleware: Middleware = (store) => (next) => (action) => {
    // Validate staged changes before applying
    if (action.type === 'STAGE_CHANGE') {
        const { payload } = action;

        // Basic validation
        if (!payload.id || !payload.type || !payload.description) {
            console.warn('Invalid change staged - missing required fields:', payload);

            // Add validation error to activity log
            store.dispatch({
                type: 'ADD_LOG_ENTRY',
                payload: {
                    type: 'validation',
                    level: 'warn',
                    message: 'Attempted to stage invalid change',
                    details: { change: payload },
                },
            });

            // Add conflict for this change
            store.dispatch({
                type: 'ADD_CONFLICT',
                payload: {
                    changeId: payload.id,
                    type: 'validation',
                    message: 'Change is missing required fields',
                    severity: 'error',
                    suggestions: ['Ensure all required fields are provided'],
                },
            });
        }

        // Validate queue-specific changes
        if (payload.type === 'update-queue' && payload.queueName) {
            const state = store.getState();

            // Check if queue exists
            if (state.configuration.scheduler) {
                const queueExists = findQueueByPath(
                    state.configuration.scheduler.scheduler.schedulerInfo.queues?.queue || [],
                    payload.queueName
                );

                if (!queueExists) {
                    store.dispatch({
                        type: 'ADD_CONFLICT',
                        payload: {
                            changeId: payload.id,
                            type: 'validation',
                            message: `Queue '${payload.queueName}' does not exist`,
                            severity: 'error',
                            suggestions: ['Create the queue first', 'Check the queue path'],
                        },
                    });
                }
            }
        }

        // Validate capacity changes
        if (payload.property === 'capacity' && payload.newValue) {
            const capacityValue = parseFloat(payload.newValue);

            if (isNaN(capacityValue) || capacityValue < 0 || capacityValue > 100) {
                store.dispatch({
                    type: 'ADD_CONFLICT',
                    payload: {
                        changeId: payload.id,
                        type: 'validation',
                        message: 'Capacity must be a number between 0 and 100',
                        severity: 'error',
                        suggestions: ['Enter a valid percentage value (0-100)'],
                    },
                });
            }
        }
    }

    // Log all changes for audit trail
    if (action.type === 'STAGE_CHANGE' || action.type === 'UNSTAGE_CHANGE' || action.type === 'APPLY_CHANGES_SUCCESS') {
        store.dispatch({
            type: 'ADD_LOG_ENTRY',
            payload: {
                type: 'user_action',
                level: 'info',
                message: `Change management: ${action.type}`,
                details: { action },
            },
        });
    }

    return next(action);
};

// Helper function to find queue by path
function findQueueByPath(queues: any[], path: string): any {
    for (const queue of queues) {
        if (queue.queueName === path || path.endsWith(`.${queue.queueName}`)) {
            return queue;
        }

        if (queue.queues?.queue) {
            const found = findQueueByPath(queue.queues.queue, path);
            if (found) {
                return found;
            }
        }
    }

    return null;
}
