import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '~/components/ui/dialog';
import { Button } from '~/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface UnsavedChangesDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: () => void;
    onDiscard: () => void;
    isSaving?: boolean;
}

export const UnsavedChangesDialog: React.FC<UnsavedChangesDialogProps> = ({
    open,
    onOpenChange,
    onSave,
    onDiscard,
    isSaving = false,
}) => {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-yellow-600" />
                        Unsaved Changes
                    </DialogTitle>
                    <DialogDescription>
                        You have unsaved changes. Would you like to save them before closing?
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        variant="outline"
                        onClick={onDiscard}
                        disabled={isSaving}
                    >
                        Discard Changes
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isSaving}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={onSave}
                        disabled={isSaving}
                    >
                        {isSaving ? (
                            <>
                                <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-background border-t-transparent" />
                                Saving...
                            </>
                        ) : (
                            'Save Changes'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};