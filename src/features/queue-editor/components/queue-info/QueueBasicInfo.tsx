import React from 'react';
import { Box, Typography, Chip, Grid, Card, CardContent } from '@mui/material';
import type { ParsedQueue } from '../../../../types/Queue';
import { getStateColor } from './utils';

interface QueueBasicInfoProps {
    queue: ParsedQueue;
}

export const QueueBasicInfo: React.FC<QueueBasicInfoProps> = ({ queue }) => {
    return (
        <Card sx={{ mb: 1.5, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)' }}>
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="subtitle2" component="h3">
                        {queue.name}
                    </Typography>
                    <Chip
                        label={queue.state}
                        color={getStateColor(queue.state)}
                        size="small"
                        sx={{ height: 20, fontSize: '0.75rem' }}
                    />
                </Box>
                <Grid container spacing={1}>
                    <Grid item xs={12}>
                        <Typography variant="caption" color="text.secondary">
                            Path
                        </Typography>
                        <Typography
                            variant="body2"
                            fontWeight="medium"
                            sx={{ wordBreak: 'break-all', fontSize: '0.75rem' }}
                        >
                            {queue.path}
                        </Typography>
                    </Grid>
                </Grid>
            </CardContent>
        </Card>
    );
};
