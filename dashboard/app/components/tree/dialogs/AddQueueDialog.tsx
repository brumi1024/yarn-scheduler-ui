import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '~/components/ui/dialog';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '~/components/ui/select';
import { Alert, AlertDescription } from '~/components/ui/alert';
import { Plus } from 'lucide-react';
import { useQueueActions } from '../hooks/useQueueActions';

const addQueueSchema = z.object({
    queueName: z
        .string()
        .min(1, 'Queue name is required')
        .max(50, 'Queue name must be 50 characters or less')
        .regex(/^[a-zA-Z0-9_-]+$/, 'Queue name can only contain letters, numbers, underscores, and hyphens')
        .refine((name) => !name.includes('.'), {
            message: 'Queue name cannot contain dots',
        }),
    capacity: z.number().min(0, 'Capacity must be at least 0').max(100, 'Capacity cannot exceed 100'),
    maxCapacity: z.number().min(0, 'Max capacity must be at least 0').max(100, 'Max capacity cannot exceed 100'),
    state: z.enum(['RUNNING', 'STOPPED']),
});

type AddQueueFormData = z.infer<typeof addQueueSchema>;

interface AddQueueDialogProps {
    open: boolean;
    parentQueuePath: string;
    onClose: () => void;
}

export function AddQueueDialog({ open, parentQueuePath, onClose }: AddQueueDialogProps) {
    const { addChildQueue } = useQueueActions();
    const parentQueueName = parentQueuePath.split('.').pop() || parentQueuePath;

    const {
        register,
        handleSubmit,
        watch,
        reset,
        formState: { errors, isValid },
        setValue,
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
        onClose();
    };

    const onSubmit = (data: AddQueueFormData) => {
        try {
            // Add the queue using our hook
            addChildQueue(parentQueuePath, data.queueName, {
                capacity: data.capacity.toString(),
                'maximum-capacity': data.maxCapacity.toString(),
                state: data.state,
            });

            handleClose();
        } catch (error) {
            // Error handling is done by the hook
            console.error('Failed to add queue:', error);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Plus className="h-5 w-5" />
                        Add Child Queue
                    </DialogTitle>
                    <DialogDescription>
                        Creating new queue under: <strong>{parentQueueName}</strong>
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    {/* Queue Name */}
                    <div className="space-y-2">
                        <Label htmlFor="queueName">
                            Queue Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            {...register('queueName')}
                            id="queueName"
                            placeholder="e.g., production, development"
                            autoFocus
                        />
                        {errors.queueName && (
                            <p className="text-sm text-red-500">{errors.queueName.message}</p>
                        )}
                    </div>

                    {/* Capacity */}
                    <div className="space-y-2">
                        <Label htmlFor="capacity">
                            Capacity (%) <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            {...register('capacity', { valueAsNumber: true })}
                            id="capacity"
                            type="number"
                            min={0}
                            max={100}
                            step={1}
                        />
                        {errors.capacity && (
                            <p className="text-sm text-red-500">{errors.capacity.message}</p>
                        )}
                        {!errors.capacity && hasCapacityError && (
                            <p className="text-sm text-red-500">Capacity cannot exceed max capacity</p>
                        )}
                        {!errors.capacity && !hasCapacityError && (
                            <p className="text-sm text-muted-foreground">Percentage of parent queue capacity</p>
                        )}
                    </div>

                    {/* Max Capacity */}
                    <div className="space-y-2">
                        <Label htmlFor="maxCapacity">
                            Max Capacity (%) <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            {...register('maxCapacity', { valueAsNumber: true })}
                            id="maxCapacity"
                            type="number"
                            min={0}
                            max={100}
                            step={1}
                        />
                        {errors.maxCapacity && (
                            <p className="text-sm text-red-500">{errors.maxCapacity.message}</p>
                        )}
                        {!errors.maxCapacity && (
                            <p className="text-sm text-muted-foreground">Maximum capacity this queue can grow to</p>
                        )}
                    </div>

                    {/* State */}
                    <div className="space-y-2">
                        <Label htmlFor="state">State</Label>
                        <Select
                            defaultValue="RUNNING"
                            onValueChange={(value) => setValue('state', value as 'RUNNING' | 'STOPPED')}
                        >
                            <SelectTrigger id="state">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="RUNNING">Running</SelectItem>
                                <SelectItem value="STOPPED">Stopped</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Capacity validation warning */}
                    {hasCapacityError && (
                        <Alert variant="destructive">
                            <AlertDescription>
                                Capacity ({capacity}%) cannot exceed max capacity ({maxCapacity}%)
                            </AlertDescription>
                        </Alert>
                    )}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={handleClose}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={!isValid || hasCapacityError}
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Add Queue
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}