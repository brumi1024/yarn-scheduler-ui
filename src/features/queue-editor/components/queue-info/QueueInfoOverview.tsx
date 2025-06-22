import React from 'react';
import { Box } from '@mui/material';
import type { ParsedQueue } from '../../../../types/Queue';
import { QueueBasicInfo } from './QueueBasicInfo';
import { QueueCapacityMetrics } from './QueueCapacityMetrics';
import { QueueRuntimeMetrics } from './QueueRuntimeMetrics';
import { QueueActions } from './QueueActions';

interface QueueInfoOverviewProps {
    queue: ParsedQueue;
    onQueueSelect: (queue: ParsedQueue) => void;
    onDelete: () => void;
    onToggleState: () => void;
}

export const QueueInfoOverview: React.FC<QueueInfoOverviewProps> = ({
    queue,
    onQueueSelect,
    onDelete,
    onToggleState,
}) => {
    return (
        <Box sx={{ p: 1.5 }}>
            <QueueBasicInfo queue={queue} />
            <QueueCapacityMetrics queue={queue} />
            <QueueRuntimeMetrics queuePath={queue.path} />
            <QueueActions
                queue={queue}
                onQueueSelect={onQueueSelect}
                onDelete={onDelete}
                onToggleState={onToggleState}
            />
        </Box>
    );
};
