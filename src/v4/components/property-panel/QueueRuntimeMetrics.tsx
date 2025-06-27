import React from 'react';
import { Typography, Grid, Card, CardContent } from '@mui/material';
import type { QueueInfo } from '../../types';
import { formatMemory } from '../../utils/formatUtils';

interface QueueRuntimeMetricsProps {
    queue: QueueInfo;
}

export const QueueRuntimeMetrics: React.FC<QueueRuntimeMetricsProps> = ({ queue }) => {
    const resourcesUsed = queue.resourcesUsed || { memory: 0, vCores: 0 };
    
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
                                {queue.numApplications || 0}
                            </Typography>
                        </Grid>
                        <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">
                                Active
                            </Typography>
                            <Typography variant="body2" fontWeight="medium">
                                {queue.numActiveApplications || 0}
                            </Typography>
                        </Grid>
                        <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">
                                Pending
                            </Typography>
                            <Typography variant="body2" fontWeight="medium">
                                {queue.numPendingApplications || 0}
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
                                {resourcesUsed.memory
                                    ? formatMemory(resourcesUsed.memory)
                                    : '0 MB'}
                            </Typography>
                        </Grid>
                        <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">
                                vCores
                            </Typography>
                            <Typography variant="body2" fontWeight="medium" sx={{ fontSize: '0.75rem' }}>
                                {resourcesUsed.vCores || 0}
                            </Typography>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>
        </>
    );
};