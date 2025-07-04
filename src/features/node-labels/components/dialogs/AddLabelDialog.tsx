import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Switch } from '~/components/ui/switch';
import { Button } from '~/components/ui/button';
import { Alert, AlertDescription } from '~/components/ui/alert';
import { validateLabelName } from '~/features/node-labels/utils/labelValidation';

interface AddLabelDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (name: string, exclusivity: boolean) => void;
  existingLabels: string[];
  isLoading?: boolean;
}

export const AddLabelDialog: React.FC<AddLabelDialogProps> = ({
  open,
  onClose,
  onConfirm,
  existingLabels,
  isLoading = false,
}) => {
  const [name, setName] = useState('');
  const [exclusivity, setExclusivity] = useState(false);
  const [error, setError] = useState('');

  const handleConfirm = () => {
    const validation = validateLabelName(name, existingLabels);

    if (!validation.valid) {
      setError(validation.error || 'Invalid label name');
      return;
    }

    onConfirm(name.trim(), exclusivity);
    handleClose();
  };

  const handleClose = () => {
    setName('');
    setExclusivity(false);
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Node Label</DialogTitle>
          <DialogDescription>Create a new node label for resource allocation</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="label-name">Label Name</Label>
            <Input
              id="label-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              placeholder="e.g., gpu, highmem, ssd"
              className={error ? 'border-destructive' : ''}
              autoFocus
            />
            <p className={`text-sm ${error ? 'text-destructive' : 'text-muted-foreground'}`}>
              {error || 'Use letters, numbers, hyphens, and underscores only'}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Switch id="exclusive" checked={exclusivity} onCheckedChange={setExclusivity} />
            <Label htmlFor="exclusive">Exclusive Label</Label>
          </div>

          <Alert>
            <AlertDescription>
              <strong>Exclusive labels:</strong> Only containers specifically requesting this label
              can run on nodes with this label.
              <br />
              <strong>Non-exclusive labels:</strong> Any container can run on these nodes.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading}>
            Add Label
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
