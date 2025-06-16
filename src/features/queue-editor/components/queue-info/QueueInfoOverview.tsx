import React from 'react';
import { Box, Typography, Chip, LinearProgress, Divider, Grid, Card, CardContent, Button } from '@mui/material';
import { Delete as DeleteIcon, PlayArrow as PlayIcon, Stop as StopIcon } from '@mui/icons-material';
import type { Queue } from '../../../../types/Queue';

interface QueueInfoOverviewProps {
    queue: Queue;
    onQueueSelect: (queue: Queue) => void;
    onDelete: () => void;
    onToggleState: () => void;
}

const getStateColor = (state: string): 'success' | 'error' | 'default' => {
    switch (state) {
        case 'RUNNING':
            return 'success';
        case 'STOPPED':
            return 'error';
        default:
            return 'default';
    }
};

const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getCapacityPercentage = (used: number, max: number): number => (max > 0 ? (used / max) * 100 : 0);
const getUsageColor = (percentage: number): 'primary' | 'warning' | 'error' => {
    if (percentage >= 90) return 'error';
    if (percentage >= 75) return 'warning';
    return 'primary';
};

export const QueueInfoOverview: React.FC<QueueInfoOverviewProps> = ({
    queue,
    onQueueSelect,
    onDelete,
    onToggleState,
}) => {
    const liveCapacityData = {
        capacity: queue.capacity || 0,
        usedCapacity: queue.usedCapacity || 0,
        maxCapacity: queue.maxCapacity || 100,
        absoluteCapacity: queue.absoluteCapacity || 0,
        absoluteUsedCapacity: queue.absoluteUsedCapacity || 0,
        absoluteMaxCapacity: queue.absoluteMaxCapacity || 100,
    };
    const childQueues = (queue as any).children || queue.queues?.queue;

    return (
        <Box sx={{ p: 1.5 }}>
            {/* Basic Info */}
            <Card sx={{ mb: 1.5, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)' }}>
                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="subtitle2" component="h3">
                            {queue.queueName}
                        </Typography>
                        <Chip
                            label={queue.state}
                            color={getStateColor(queue.state)}
                            size="small"
                            sx={{ height: 20, fontSize: '0.75rem' }}
                        />
                    </Box>
                    <Grid container spacing={1}>
                        <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">
                                Applications
                            </Typography>
                            <Typography variant="body2" fontWeight="medium">
                                {queue.numApplications}
                            </Typography>
                        </Grid>
                        <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">
                                Path
                            </Typography>
                            <Typography
                                variant="body2"
                                fontWeight="medium"
                                sx={{ wordBreak: 'break-all', fontSize: '0.75rem' }}
                            >
                                {(queue as any).queuePath || queue.queueName}
                            </Typography>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            {/* Capacity Metrics */}
            <Card sx={{ mb: 1.5, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)' }}>
                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Typography variant="subtitle2" component="h3" sx={{ mb: 1.5 }}>
                        Capacity Metrics
                    </Typography>
                    <Box sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="caption" color="text.secondary">
                                Capacity
                            </Typography>
                            <Typography variant="caption">
                                {liveCapacityData.capacity}% (max: {liveCapacityData.maxCapacity}%)
                            </Typography>
                        </Box>
                        <LinearProgress
                            variant="determinate"
                            value={getCapacityPercentage(liveCapacityData.capacity, liveCapacityData.maxCapacity)}
                            color={getUsageColor(
                                getCapacityPercentage(liveCapacityData.capacity, liveCapacityData.maxCapacity)
                            )}
                            sx={{ height: 6, borderRadius: 3 }}
                        />
                    </Box>
                    <Box sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="caption" color="text.secondary">
                                Used Capacity
                            </Typography>
                            <Typography variant="caption">
                                {liveCapacityData.usedCapacity}% of {liveCapacityData.capacity}%
                            </Typography>
                        </Box>
                        <LinearProgress
                            variant="determinate"
                            value={getCapacityPercentage(liveCapacityData.usedCapacity, liveCapacityData.capacity)}
                            color={getUsageColor(
                                getCapacityPercentage(liveCapacityData.usedCapacity, liveCapacityData.capacity)
                            )}
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
                                {liveCapacityData.absoluteCapacity}%
                            </Typography>
                        </Grid>
                        <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">
                                Absolute Used
                            </Typography>
                            <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                                {liveCapacityData.absoluteUsedCapacity}%
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
                                {formatBytes(queue.resourcesUsed.memory * 1024 * 1024)}
                            </Typography>
                        </Grid>
                        <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">
                                vCores
                            </Typography>
                            <Typography variant="body2" fontWeight="medium" sx={{ fontSize: '0.75rem' }}>
                                {queue.resourcesUsed.vCores}
                            </Typography>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            {/* Child Queues */}
            {childQueues && childQueues.length > 0 && (
                <Card sx={{ mb: 1.5, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)' }}>
                    <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                        <Typography variant="subtitle2" component="h3" sx={{ mb: 1.5 }}>
                            Child Queues ({childQueues.length})
                        </Typography>
                        {childQueues.map((child: any, index: number) => (
                            <Box
                                key={child.queueName}
                                onClick={() => onQueueSelect(child)}
                                sx={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    py: 0.75,
                                    px: 1,
                                    mx: -1,
                                    borderBottom: index < childQueues.length - 1 ? 1 : 0,
                                    borderColor: 'divider',
                                    borderRadius: 1,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease-in-out',
                                    '&:hover': { bgcolor: 'action.hover', transform: 'translateX(2px)' },
                                }}
                            >
                                <Box>
                                    <Typography variant="body2" fontWeight="medium" sx={{ fontSize: '0.8rem' }}>
                                        {child.queueName}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                        {child.capacity}% capacity, {child.numApplications} apps
                                    </Typography>
                                </Box>
                                <Chip
                                    label={child.state}
                                    color={getStateColor(child.state)}
                                    size="small"
                                    sx={{ height: 18, fontSize: '0.7rem' }}
                                />
                            </Box>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* Quick Actions */}
            <Card sx={{ mt: 1.5, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)' }}>
                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Typography variant="subtitle2" component="h3" sx={{ mb: 1.5 }}>
                        Quick Actions
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Button
                            variant="outlined"
                            size="small"
                            onClick={onToggleState}
                            startIcon={
                                queue.state === 'RUNNING' ? (
                                    <StopIcon fontSize="small" />
                                ) : (
                                    <PlayIcon fontSize="small" />
                                )
                            }
                            color="primary"
                            fullWidth
                            sx={{ py: 0.75, fontSize: '0.75rem' }}
                        >
                            {queue.state === 'RUNNING' ? 'Stop Queue' : 'Start Queue'}
                        </Button>
                        <Button
                            variant="outlined"
                            size="small"
                            onClick={onDelete}
                            startIcon={<DeleteIcon fontSize="small" />}
                            color="error"
                            fullWidth
                            sx={{ py: 0.75, fontSize: '0.75rem' }}
                        >
                            Delete Queue
                        </Button>
                    </Box>
                </CardContent>
            </Card>
        </Box>
    );
};
