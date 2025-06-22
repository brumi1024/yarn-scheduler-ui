import React from 'react';
import { Box, Button, Card, CardContent } from '@mui/material';
import { Delete as DeleteIcon, PlayArrow as PlayIcon, Stop as StopIcon } from '@mui/icons-material';
import type { ParsedQueue } from '../../../../types/Queue';

interface QueueActionsProps {
    queue: ParsedQueue;
    onQueueSelect: (queue: ParsedQueue) => void;
    onDelete: () => void;
    onToggleState: () => void;
}

export const QueueActions: React.FC<QueueActionsProps> = ({ queue, _onQueueSelect, onDelete, onToggleState }) => {
    return (
        <Card sx={{ mb: 1.5, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)' }}>
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={queue.state === 'RUNNING' ? <StopIcon /> : <PlayIcon />}
                        onClick={onToggleState}
                        sx={{ flex: '1 1 auto', minWidth: 'fit-content' }}
                    >
                        {queue.state === 'RUNNING' ? 'Stop' : 'Start'}
                    </Button>
                    <Button
                        variant="outlined"
                        size="small"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={onDelete}
                        sx={{ flex: '1 1 auto', minWidth: 'fit-content' }}
                    >
                        Delete
                    </Button>
                </Box>
            </CardContent>
        </Card>
    );
};
