import React from 'react';
import { Box, Typography, LinearProgress, Divider, Grid, Card, CardContent } from '@mui/material';
import type { QueueInfo } from '../../types';
import { useSchedulerStore } from '../../store/schedulerStore';
import { getCapacityPercentage, getUsageColor } from './utils';

interface QueueCapacityMetricsProps {
    queue: QueueInfo;
}

export const QueueCapacityMetrics: React.FC<QueueCapacityMetricsProps> = ({ queue }) => {
    const { getQueueDisplayValue } = useSchedulerStore();
    
    // Configuration values from store
    const { value: configCapacityStr } = getQueueDisplayValue(queue.queuePath, 'capacity');
    const { value: configMaxCapacityStr } = getQueueDisplayValue(queue.queuePath, 'maximum-capacity');
    
    const configCapacity = parseFloat(configCapacityStr) || 0;
    const configMaxCapacity = parseFloat(configMaxCapacityStr) || 100;
    
    // Runtime values from QueueInfo
    const usedCapacity = queue.usedCapacity || 0;
    const absoluteCapacity = queue.absoluteCapacity || 0;
    const absoluteUsedCapacity = queue.absoluteUsedCapacity || 0;

    return (
        <Card sx={{ mb: 1.5, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)' }}>
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="subtitle2" component="h3" sx={{ mb: 1.5 }}>
                    Capacity Metrics
                </Typography>

                <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                            Configured Capacity
                        </Typography>
                        <Typography variant="caption">
                            {configCapacity}% (max: {configMaxCapacity}%)
                        </Typography>
                    </Box>
                    <LinearProgress
                        variant="determinate"
                        value={getCapacityPercentage(configCapacity, configMaxCapacity)}
                        color={getUsageColor(getCapacityPercentage(configCapacity, configMaxCapacity))}
                        sx={{ height: 6, borderRadius: 3 }}
                    />
                </Box>

                <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                            Used Capacity
                        </Typography>
                        <Typography variant="caption">
                            {usedCapacity.toFixed(1)}% of {configCapacity}%
                        </Typography>
                    </Box>
                    <LinearProgress
                        variant="determinate"
                        value={getCapacityPercentage(usedCapacity, configCapacity)}
                        color={getUsageColor(getCapacityPercentage(usedCapacity, configCapacity))}
                        sx={{ height: 6, borderRadius: 3 }}
                    />
                </Box>

                <Divider sx={{ my: 1.5 }} />

                <Typography variant="caption" sx={{ mb: 1, fontWeight: 'medium', display: 'block' }}>
                    Cluster-wide Capacity
                </Typography>
                <Grid container spacing={1}>
                    <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">
                            Absolute Capacity
                        </Typography>
                        <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                            {absoluteCapacity.toFixed(1)}%
                        </Typography>
                    </Grid>
                    <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">
                            Absolute Used
                        </Typography>
                        <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                            {absoluteUsedCapacity.toFixed(1)}%
                        </Typography>
                    </Grid>
                </Grid>
            </CardContent>
        </Card>
    );
};