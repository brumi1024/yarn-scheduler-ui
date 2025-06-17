import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Box,
    Typography,
    Alert,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useUIStore, useChangesStore } from '../../../store';
import { nanoid } from 'nanoid';

const addQueueSchema = z.object({
    queueName: z.string()
        .min(1, 'Queue name is required')
        .regex(/^[a-zA-Z0-9_-]+$/, 'Queue name can only contain letters, numbers, underscores, and hyphens')
        .max(50, 'Queue name must be 50 characters or less'),
    capacity: z.number()
        .min(0, 'Capacity must be at least 0')
        .max(100, 'Capacity cannot exceed 100'),
    maxCapacity: z.number()
        .min(0, 'Max capacity must be at least 0')
        .max(100, 'Max capacity cannot exceed 100'),
    state: z.enum(['RUNNING', 'STOPPED']),
});

type AddQueueFormData = z.infer<typeof addQueueSchema>;

export function AddQueueModal() {
    const { modals, closeAddQueueModal } = useUIStore();
    const { stageChange } = useChangesStore();
    
    const isOpen = modals.addQueueModal?.open || false;
    const parentQueuePath = modals.addQueueModal?.parentQueuePath || '';
    const parentQueueName = parentQueuePath.split('.').pop() || parentQueuePath;

    const {
        register,
        handleSubmit,
        watch,
        reset,
        formState: { errors, isValid }
    } = useForm<AddQueueFormData>({
        resolver: zodResolver(addQueueSchema),
        defaultValues: {
            queueName: '',
            capacity: 10,
            maxCapacity: 100,
            state: 'RUNNING',
        },
        mode: 'onChange',
    });

    const capacity = watch('capacity');
    const maxCapacity = watch('maxCapacity');

    // Custom validation: capacity should not exceed maxCapacity
    const hasCapacityError = capacity > maxCapacity;

    const handleClose = () => {
        reset();
        closeAddQueueModal();
    };

    const onSubmit = (data: AddQueueFormData) => {
        const newQueuePath = `${parentQueuePath}.${data.queueName}`;
        
        // Create staged change for adding the queue
        stageChange({
            id: nanoid(),
            type: 'ADD_QUEUE',
            queuePath: parentQueuePath,
            property: newQueuePath,
            oldValue: null,
            newValue: {
                capacity: data.capacity,
                maxCapacity: data.maxCapacity,
                state: data.state,
            },
            timestamp: new Date(),
        });

        handleClose();
    };

    return (
        <Dialog
            open={isOpen}
            onClose={handleClose}
            maxWidth="sm"
            fullWidth
            aria-labelledby="add-queue-dialog-title"
        >
            <DialogTitle id="add-queue-dialog-title">
                <Box display="flex" alignItems="center" gap={1}>
                    <AddIcon color="primary" />
                    <Typography variant="h6" component="span">
                        Add Child Queue
                    </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Creating new queue under: <strong>{parentQueueName}</strong>
                </Typography>
            </DialogTitle>

            <form onSubmit={handleSubmit(onSubmit)}>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        {/* Queue Name */}
                        <TextField
                            {...register('queueName')}
                            label="Queue Name"
                            fullWidth
                            required
                            error={!!errors.queueName}
                            helperText={errors.queueName?.message}
                            placeholder="e.g., production, development"
                            autoFocus
                        />

                        {/* Capacity */}
                        <TextField
                            {...register('capacity', { valueAsNumber: true })}
                            label="Capacity (%)"
                            type="number"
                            fullWidth
                            required
                            error={!!errors.capacity || hasCapacityError}
                            helperText={
                                errors.capacity?.message || 
                                (hasCapacityError ? 'Capacity cannot exceed max capacity' : 'Percentage of parent queue capacity')
                            }
                            inputProps={{ min: 0, max: 100, step: 1 }}
                        />

                        {/* Max Capacity */}
                        <TextField
                            {...register('maxCapacity', { valueAsNumber: true })}
                            label="Max Capacity (%)"
                            type="number"
                            fullWidth
                            required
                            error={!!errors.maxCapacity || hasCapacityError}
                            helperText={
                                errors.maxCapacity?.message || 
                                'Maximum capacity this queue can grow to'
                            }
                            inputProps={{ min: 0, max: 100, step: 1 }}
                        />

                        {/* State */}
                        <FormControl fullWidth>
                            <InputLabel>State</InputLabel>
                            <Select
                                {...register('state')}
                                label="State"
                                defaultValue="RUNNING"
                            >
                                <MenuItem value="RUNNING">Running</MenuItem>
                                <MenuItem value="STOPPED">Stopped</MenuItem>
                            </Select>
                        </FormControl>

                        {/* Capacity validation warning */}
                        {hasCapacityError && (
                            <Alert severity="warning" sx={{ mt: 1 }}>
                                Capacity ({capacity}%) cannot exceed max capacity ({maxCapacity}%)
                            </Alert>
                        )}
                    </Box>
                </DialogContent>

                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={handleClose} color="inherit">
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        variant="contained"
                        startIcon={<AddIcon />}
                        disabled={!isValid || hasCapacityError}
                    >
                        Add Queue
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}