import { useCallback } from 'react';
import { useSchedulerStore } from '../../../store/schedulerStore';

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
            // Validate queue name doesn't contain dots
            if (queueName.includes('.')) {
                throw new Error('Queue name cannot contain dots');
            }

            // Validate parent exists
            const parent = getQueueByPath(parentPath);
            if (!parent) {
                throw new Error('Parent queue not found');
            }

            // Add the queue
            stageQueueAddition(parentPath, queueName, config);
        },
        [stageQueueAddition, getQueueByPath]
    );

    const deleteQueue = useCallback(
        (queuePath: string) => {
            // Cannot delete root queue
            if (queuePath === 'root') {
                throw new Error('Cannot delete root queue');
            }

            // Check if queue exists
            const queue = getQueueByPath(queuePath);
            if (!queue) {
                throw new Error('Queue not found');
            }

            // Check if queue has children
            if (queue.children && queue.children.length > 0) {
                throw new Error('Cannot delete queue with children');
            }

            // Delete the queue
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
            // Cannot delete root
            if (queuePath === 'root') {
                return false;
            }

            const queue = getQueueByPath(queuePath);
            if (!queue) {
                return false;
            }

            // Cannot delete if has children
            return !queue.children || queue.children.length === 0;
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