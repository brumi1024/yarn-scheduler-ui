import { useCallback } from 'react';
import { useSchedulerStore } from '~/store/schedulerStore';

export type UseQueueActionsResult = {
    addChildQueue: (parentPath: string, queueName: string, config: Record<string, string>) => void;
    deleteQueue: (queuePath: string) => void;
    updateQueueProperty: (queuePath: string, property: string, value: string) => void;
    canAddChildQueue: (parentPath: string) => boolean;
    canDeleteQueue: (queuePath: string) => boolean;
};

export function useQueueActions(): UseQueueActionsResult {
    const stageQueueAddition = useSchedulerStore(state => state.stageQueueAddition);
    const stageQueueRemoval = useSchedulerStore(state => state.stageQueueRemoval);
    const stageQueueChange = useSchedulerStore(state => state.stageQueueChange);
    const getQueueByPath = useSchedulerStore(state => state.getQueueByPath);

    const addChildQueue = useCallback(
        (parentPath: string, queueName: string, config: Record<string, string>) => {
            if (queueName.includes('.')) {
                throw new Error('Queue name cannot contain dots');
            }

            const parent = getQueueByPath(parentPath);
            if (!parent) {
                throw new Error('Parent queue not found');
            }

            stageQueueAddition(parentPath, queueName, config);
        },
        [stageQueueAddition, getQueueByPath]
    );

    const deleteQueue = useCallback(
        (queuePath: string) => {
            if (queuePath === 'root') {
                throw new Error('Cannot delete root queue');
            }

            const queue = getQueueByPath(queuePath);
            if (!queue) {
                throw new Error('Queue not found');
            }

            if (queue.queues?.queue && queue.queues.queue.length > 0) {
                throw new Error('Cannot delete queue with children');
            }

            stageQueueRemoval(queuePath);
        },
        [stageQueueRemoval, getQueueByPath]
    );

    const updateQueueProperty = useCallback(
        (queuePath: string, property: string, value: string) => {
            stageQueueChange(queuePath, property, value);
        },
        [stageQueueChange]
    );

    const canAddChildQueue = useCallback(
        (parentPath: string) => {
            const parent = getQueueByPath(parentPath);
            return parent !== null;
        },
        [getQueueByPath]
    );

    const canDeleteQueue = useCallback(
        (queuePath: string) => {
            if (queuePath === 'root') {
                return false;
            }

            const queue = getQueueByPath(queuePath);
            if (!queue) {
                return false;
            }

            return !queue.queues?.queue || queue.queues.queue.length === 0;
        },
        [getQueueByPath]
    );

    return {
        addChildQueue,
        deleteQueue,
        updateQueueProperty,
        canAddChildQueue,
        canDeleteQueue,
    };
}