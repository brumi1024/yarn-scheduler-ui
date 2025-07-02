import React from 'react';
import { Box } from '@mui/material';
import type { QueueInfo } from '../../types';
import { QueueBasicInfo } from './QueueBasicInfo';
import { QueueCapacityMetrics } from './QueueCapacityMetrics';
import { QueueRuntimeMetrics } from './QueueRuntimeMetrics';

interface QueueOverviewProps {
    queue: QueueInfo;
}

export const QueueOverview: React.FC<QueueOverviewProps> = ({ queue }) => {
    return (
        <Box sx={{ p: 1.5 }}>
            <QueueBasicInfo queue={queue} />
            <QueueCapacityMetrics queue={queue} />
            <QueueRuntimeMetrics queue={queue} />
        </Box>
    );
};