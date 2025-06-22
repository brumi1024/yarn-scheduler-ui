import React from 'react';
import { Typography, Grid, Card, CardContent, CircularProgress, Alert } from '@mui/material';
import { useQueueMetrics } from '../../hooks/useQueueMetrics';
import { formatBytes } from './utils';

interface QueueRuntimeMetricsProps {
    queuePath: string;
}

export const QueueRuntimeMetrics: React.FC<QueueRuntimeMetricsProps> = ({ queuePath }) => {
    const { getMetricsForQueue, isLoading, error } = useQueueMetrics();
    const metrics = getMetricsForQueue(queuePath);

    if (isLoading) {
        return (
            <Card sx={{ mb: 1.5, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)' }}>
                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 }, textAlign: 'center' }}>
                    <CircularProgress size={20} />
                    <Typography variant="caption" sx={{ ml: 1 }}>
                        Loading metrics...
                    </Typography>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card sx={{ mb: 1.5, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)' }}>
                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Alert severity="warning" sx={{ fontSize: '0.75rem' }}>
                        Unable to load runtime metrics
                    </Alert>
                </CardContent>
            </Card>
        );
    }

    return (
        <>
            {/* Applications */}
            <Card sx={{ mb: 1.5, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)' }}>
                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Typography variant="subtitle2" component="h3" sx={{ mb: 1 }}>
                        Runtime Status
                    </Typography>
                    <Grid container spacing={1}>
                        <Grid item xs={12}>
                            <Typography variant="caption" color="text.secondary">
                                Applications
                            </Typography>
                            <Typography variant="body2" fontWeight="medium">
                                {metrics?.numApplications || 0}
                            </Typography>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            {/* Resource Usage */}
            <Card sx={{ mb: 1.5, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)' }}>
                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Typography variant="subtitle2" component="h3" sx={{ mb: 1.5 }}>
                        Resource Usage
                    </Typography>
                    <Grid container spacing={1}>
                        <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">
                                Memory
                            </Typography>
                            <Typography variant="body2" fontWeight="medium" sx={{ fontSize: '0.75rem' }}>
                                {metrics?.resourcesUsed?.memory
                                    ? formatBytes(metrics.resourcesUsed.memory * 1024 * 1024)
                                    : '0 B'}
                            </Typography>
                        </Grid>
                        <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">
                                vCores
                            </Typography>
                            <Typography variant="body2" fontWeight="medium" sx={{ fontSize: '0.75rem' }}>
                                {metrics?.resourcesUsed?.vCores || 0}
                            </Typography>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>
        </>
    );
};
