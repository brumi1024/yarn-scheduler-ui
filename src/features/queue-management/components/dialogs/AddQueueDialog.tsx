import { useCallback, useState } from 'react';
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
import {
  Field,
  FieldControl,
  FieldDescription,
  FieldLabel,
  FieldMessage,
} from '~/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { Plus } from 'lucide-react';
import { useQueueActions } from '../../hooks/useQueueActions';
import { CapacityAdjustPopover, type CapacityAdjustmentMap } from '../CapacityAdjustPopover';

const addQueueSchema = z.object({
  queueName: z
    .string()
    .min(1, 'Queue name is required')
    .max(50, 'Queue name must be 50 characters or less')
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'Queue name can only contain letters, numbers, underscores, and hyphens',
    )
    .refine((name) => !name.includes('.'), {
      message: 'Queue name cannot contain dots',
    }),
  capacity: z.string().min(1, 'Capacity is required'),
  maxCapacity: z.string().min(1, 'Max capacity is required'),
  state: z.enum(['RUNNING', 'STOPPED']),
});

type AddQueueFormData = z.infer<typeof addQueueSchema>;

interface AddQueueDialogProps {
  open: boolean;
  parentQueuePath: string;
  onClose: () => void;
}

export function AddQueueDialog({ open, parentQueuePath, onClose }: AddQueueDialogProps) {
  const { addChildQueue, updateQueueProperty } = useQueueActions();
  const parentQueueName = parentQueuePath.split('.').pop() || parentQueuePath;

  const [siblingAdjustments, setSiblingAdjustments] = useState<CapacityAdjustmentMap>({});

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
      capacity: '10',
      maxCapacity: '100',
      state: 'RUNNING',
    },
    mode: 'onChange',
  });

  const handleClose = () => {
    reset();
    setSiblingAdjustments({});
    onClose();
  };

  const queueNameValue = watch('queueName');
  const capacityValue = watch('capacity');
  const maxCapacityValue = watch('maxCapacity');

  const handleActiveQueueChange = useCallback(
    (changes: { capacity?: string; maxCapacity?: string }) => {
      if (changes.capacity !== undefined) {
        setValue('capacity', changes.capacity, {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: true,
        });
      }

      if (changes.maxCapacity !== undefined) {
        setValue('maxCapacity', changes.maxCapacity, {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: true,
        });
      }
    },
    [setValue],
  );

  const onSubmit = (data: AddQueueFormData) => {
    try {
      // Add the queue using our hook
      addChildQueue(parentQueuePath, data.queueName, {
        capacity: data.capacity,
        'maximum-capacity': data.maxCapacity,
        state: data.state,
      });

      Object.entries(siblingAdjustments).forEach(([queuePath, change]) => {
        if (change.capacity !== undefined) {
          updateQueueProperty(queuePath, 'capacity', change.capacity);
        }

        if (change.maxCapacity !== undefined) {
          updateQueueProperty(queuePath, 'maximum-capacity', change.maxCapacity);
        }
      });

      handleClose();
    } catch (error) {
      // Error handling is done by the hook
      console.error('Failed to add queue:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent onClick={(e) => e.stopPropagation()}>
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
          <Field>
            <FieldLabel htmlFor="queueName">
              Queue Name <span className="text-red-500">*</span>
            </FieldLabel>
            <FieldControl>
              <Input
                {...register('queueName')}
                id="queueName"
                placeholder="e.g., production, development"
                autoFocus
                aria-invalid={Boolean(errors.queueName)}
              />
            </FieldControl>
            {errors.queueName && <FieldMessage>{errors.queueName.message}</FieldMessage>}
          </Field>

          {/* Capacity */}
          <Field>
            <FieldLabel htmlFor="capacity">
              Capacity <span className="text-red-500">*</span>
            </FieldLabel>
            <FieldControl>
              <Input
                {...register('capacity')}
                id="capacity"
                type="text"
                placeholder="e.g., 50, 10w, [memory=1024,vcores=1]"
                aria-invalid={Boolean(errors.capacity)}
              />
            </FieldControl>
            {errors.capacity ? (
              <FieldMessage>{errors.capacity.message}</FieldMessage>
            ) : (
              <FieldDescription>
                Percentage (50), weight (10w), or absolute ([memory=1024,vcores=1])
              </FieldDescription>
            )}
          </Field>

          {/* Max Capacity */}
          <Field>
            <FieldLabel htmlFor="maxCapacity">
              Max Capacity <span className="text-red-500">*</span>
            </FieldLabel>
            <FieldControl>
              <Input
                {...register('maxCapacity')}
                id="maxCapacity"
                type="text"
                placeholder="e.g., 100, 20w, [memory=2048,vcores=2]"
                aria-invalid={Boolean(errors.maxCapacity)}
              />
            </FieldControl>
            {errors.maxCapacity ? (
              <FieldMessage>{errors.maxCapacity.message}</FieldMessage>
            ) : (
              <FieldDescription>
                Maximum capacity this queue can grow to (percentage or absolute format)
              </FieldDescription>
            )}
          </Field>
          <div className="flex justify-end">
            <CapacityAdjustPopover
              parentQueuePath={parentQueuePath}
              activeQueueName={queueNameValue}
              capacityValue={capacityValue}
              maxCapacityValue={maxCapacityValue}
              adjustments={siblingAdjustments}
              onAdjustmentsChange={setSiblingAdjustments}
              onActiveQueueChange={handleActiveQueueChange}
            />
          </div>

          {/* State */}
          <Field>
            <FieldLabel htmlFor="state">State</FieldLabel>
            <Select
              value={watch('state')}
              onValueChange={(value) => setValue('state', value as 'RUNNING' | 'STOPPED')}
            >
              <FieldControl>
                <SelectTrigger id="state">
                  <SelectValue />
                </SelectTrigger>
              </FieldControl>
              <SelectContent>
                <SelectItem value="RUNNING">Running</SelectItem>
                <SelectItem value="STOPPED">Stopped</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!isValid}>
              <Plus className="mr-2 h-4 w-4" />
              Add Queue
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
