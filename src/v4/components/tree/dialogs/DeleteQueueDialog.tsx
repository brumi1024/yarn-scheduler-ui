import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    Alert,
} from '@mui/material';
import { Delete as DeleteIcon, Warning as WarningIcon } from '@mui/icons-material';
import { useQueueActions } from '../hooks/useQueueActions';

interface DeleteQueueDialogProps {
    open: boolean;
    queuePath: string;
    onClose: () => void;
}

export function DeleteQueueDialog({ open, queuePath, onClose }: DeleteQueueDialogProps) {
    const { deleteQueue, canDeleteQueue } = useQueueActions();
    const queueName = queuePath.split('.').pop() || queuePath;
    
    const canDelete = canDeleteQueue(queuePath);
    const isRoot = queuePath === 'root';

    const handleDelete = () => {
        try {
            deleteQueue(queuePath);
            onClose();
        } catch (error) {
            console.error('Failed to delete queue:', error);
        }
    };

    return (
        <Dialog 
            open={open} 
            onClose={onClose} 
            maxWidth="sm" 
            fullWidth 
            aria-labelledby="delete-queue-dialog-title"
        >
            <DialogTitle id="delete-queue-dialog-title">
                <Box display="flex" alignItems="center" gap={1}>
                    <DeleteIcon color="error" />
                    <Typography variant="h6" component="span">
                        Delete Queue
                    </Typography>
                </Box>
            </DialogTitle>

            <DialogContent>
                {isRoot ? (
                    <Alert severity="error" icon={<WarningIcon />}>
                        The root queue cannot be deleted.
                    </Alert>
                ) : !canDelete ? (
                    <Alert severity="warning" icon={<WarningIcon />}>
                        This queue has child queues and cannot be deleted. 
                        Please delete all child queues first.
                    </Alert>
                ) : (
                    <>
                        <Typography gutterBottom>
                            Are you sure you want to delete the queue <strong>{queueName}</strong>?
                        </Typography>
                        <Alert severity="warning" sx={{ mt: 2 }}>
                            This action cannot be undone. The queue and all its configurations will be removed.
                        </Alert>
                    </>
                )}
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={onClose} color="inherit">
                    Cancel
                </Button>
                {canDelete && !isRoot && (
                    <Button
                        onClick={handleDelete}
                        variant="contained"
                        color="error"
                        startIcon={<DeleteIcon />}
                    >
                        Delete Queue
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
}