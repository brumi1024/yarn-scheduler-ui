import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Save,
  RotateCcw,
  GitBranch,
  Info,
  Settings,
  Edit,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useSchedulerStore } from '~/stores/schedulerStore';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '~/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { QueueOverview } from './QueueOverview';
import { QueueInfoTab } from './QueueInfoTab';
import { PropertyEditorTab } from './PropertyEditorTab';
import { UnsavedChangesDialog } from './dialogs/UnsavedChangesDialog';
import type { PropertyEditorTabHandle } from './PropertyEditorTab';
import { toast } from 'sonner';

export const PropertyPanel: React.FC = () => {
  const {
    selectedQueuePath,
    isPropertyPanelOpen,
    setPropertyPanelOpen,
    getQueueByPath,
    selectQueue,
  } = useSchedulerStore();

  const [tabValue, setTabValue] = useState('overview');
  const [hasChanges, setHasChanges] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingClose, setPendingClose] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, unknown>>({});
  const [showErrorDetails, setShowErrorDetails] = useState(false);

  const propertyEditorRef = useRef<PropertyEditorTabHandle>(null);

  const selectedQueue = selectedQueuePath ? getQueueByPath(selectedQueuePath) : null;

  // Reset tab to overview when panel opens
  useEffect(() => {
    if (isPropertyPanelOpen) {
      setTabValue('overview');
    }
  }, [isPropertyPanelOpen]);

  const handleClose = (force = false) => {
    if (!force && isFormDirty && tabValue === 'settings') {
      setShowUnsavedDialog(true);
      setPendingClose(true);
    } else {
      setPropertyPanelOpen(false);
      selectQueue(null); // Deselect queue when panel closes
      setPendingClose(false);
    }
  };

  const handleSubmit = async () => {
    if (propertyEditorRef.current) {
      // Check if form is valid before submitting
      if (!propertyEditorRef.current.isValid()) {
        // Get the validation errors and update state
        const errors = propertyEditorRef.current.getErrors();
        setValidationErrors(errors);
        setShowErrorDetails(true); // Automatically expand to show details

        toast.error('Please fix validation errors before staging changes');
        return;
      }

      if (isFormDirty) {
        await propertyEditorRef.current.submit();
        // The submit function will show its own toast
      } else if (hasChanges) {
        // If there are already staged changes but no new changes, show info
        toast.info('Changes are already staged. Use the bottom drawer to apply all changes.');
      }
    }
  };

  const handleReset = () => {
    if (propertyEditorRef.current) {
      propertyEditorRef.current.reset();
    }
  };

  const handleHasChangesChange = (newHasChanges: boolean) => {
    setHasChanges(newHasChanges);
  };

  const handleFormDirtyChange = (newIsFormDirty: boolean) => {
    setIsFormDirty(newIsFormDirty);
  };

  const handleIsSubmittingChange = (newIsSubmitting: boolean) => {
    setIsSubmitting(newIsSubmitting);
  };

  const handleErrorsChange = (errors: Record<string, unknown>) => {
    setValidationErrors(errors);
  };

  const handleSaveAndClose = async () => {
    // Check if form is valid
    if (propertyEditorRef.current && !propertyEditorRef.current.isValid()) {
      toast.error('Please fix validation errors before saving');
      return; // Don't close the dialog or panel
    }

    await handleSubmit();
    if (pendingClose) {
      handleClose(true);
    }
    setShowUnsavedDialog(false);
  };

  const handleDiscardAndClose = () => {
    handleReset();
    handleClose(true);
    setShowUnsavedDialog(false);
  };

  // Reset hasChanges and form dirty state when panel opens/closes or queue changes
  useEffect(() => {
    if (!isPropertyPanelOpen || !selectedQueuePath) {
      setHasChanges(false);
      setIsFormDirty(false);
      setValidationErrors({});
      setShowErrorDetails(false);
    }
  }, [isPropertyPanelOpen, selectedQueuePath]);

  if (!selectedQueue || !isPropertyPanelOpen) {
    return null;
  }

  return (
    <>
      <Sheet open={isPropertyPanelOpen} onOpenChange={handleClose}>
        <SheetContent
          side="right"
          className="sm:max-w-[420px]"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="flex flex-col h-full relative overflow-hidden">
            <SheetHeader>
              <div className="flex items-center justify-between">
                <SheetTitle className="text-base font-semibold">
                  Queue: {selectedQueue.queueName}
                </SheetTitle>
              </div>
              {/* Status bar */}
              <div className="mt-2 border-b">
                <div className="flex items-center gap-2 pb-2">
                  <span className="text-xs text-muted-foreground">{selectedQueue.queuePath}</span>
                  <div className="flex-1" />
                  {Object.keys(validationErrors).length > 0 && (
                    <Badge
                      variant="destructive"
                      className="text-xs cursor-pointer"
                      onClick={() => setShowErrorDetails(!showErrorDetails)}
                    >
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {Object.keys(validationErrors).length} Error
                      {Object.keys(validationErrors).length > 1 ? 's' : ''}
                      {showErrorDetails ? (
                        <ChevronUp className="h-3 w-3 ml-1" />
                      ) : (
                        <ChevronDown className="h-3 w-3 ml-1" />
                      )}
                    </Badge>
                  )}
                  {isFormDirty && (
                    <Badge variant="outline" className="text-xs">
                      <Edit className="h-3 w-3 mr-1" />
                      Unsaved
                    </Badge>
                  )}
                  {!isFormDirty && hasChanges && (
                    <Badge variant="default" className="text-xs">
                      <Edit className="h-3 w-3 mr-1" />
                      Staged
                    </Badge>
                  )}
                </div>

                {/* Expandable error details */}
                {showErrorDetails && Object.keys(validationErrors).length > 0 && (
                  <div className="pb-2 px-2 space-y-1">
                    <div className="text-xs font-medium text-destructive">Validation Errors:</div>
                    {Object.entries(validationErrors).map(([field, error]) => (
                      <div key={field} className="text-xs text-muted-foreground pl-2">
                        • <span className="font-medium">{field}:</span>{' '}
                        {typeof error === 'object' && error && 'message' in error
                          ? (error as { message: string }).message
                          : String(error)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </SheetHeader>

            <Tabs value={tabValue} onValueChange={setTabValue} className="flex-1 overflow-hidden">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">
                  <GitBranch className="h-4 w-4 mr-2" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="info">
                  <Info className="h-4 w-4 mr-2" />
                  Info
                </TabsTrigger>
                <TabsTrigger value="settings">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="h-full overflow-auto">
                <QueueOverview queue={selectedQueue} />
              </TabsContent>
              <TabsContent value="info" className="h-full overflow-auto">
                <QueueInfoTab queue={selectedQueue} />
              </TabsContent>
              <TabsContent value="settings" className="h-full overflow-auto pb-20">
                <PropertyEditorTab
                  ref={propertyEditorRef}
                  queue={selectedQueue}
                  onHasChangesChange={handleHasChangesChange}
                  onIsSubmittingChange={handleIsSubmittingChange}
                  onFormDirtyChange={handleFormDirtyChange}
                  onErrorsChange={handleErrorsChange}
                />
              </TabsContent>
            </Tabs>

            {/* Fixed Apply/Reset buttons - show on Settings tab */}
            {tabValue === 'settings' && (
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-background border-t flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={handleReset}
                  disabled={isSubmitting || (!hasChanges && !isFormDirty)}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
                <Button
                  variant="default"
                  onClick={handleSubmit}
                  disabled={isSubmitting || (!hasChanges && !isFormDirty)}
                >
                  {isSubmitting ? (
                    <>
                      <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-background border-t-transparent" />
                      Staging...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {isFormDirty ? 'Stage Changes' : 'No Changes'}
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <UnsavedChangesDialog
        open={showUnsavedDialog}
        onOpenChange={setShowUnsavedDialog}
        onSave={handleSaveAndClose}
        onDiscard={handleDiscardAndClose}
        isSaving={isSubmitting}
      />
    </>
  );
};
