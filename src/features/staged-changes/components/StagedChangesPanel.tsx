import React, { useState } from 'react';
import { Trash2, Check, Gauge, AlertTriangle, AlertCircle } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from '~/components/ui/drawer';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { useSchedulerStore } from '~/stores/schedulerStore';
import type { StagedChange } from '~/types';
import { QueueChangeGroup } from './QueueChangeGroup';
import { toast } from 'sonner';

interface StagedChangesPanelProps {
  open: boolean;
  onClose: () => void;
  onOpen?: () => void;
}

export function StagedChangesPanel({ open, onClose, onOpen }: StagedChangesPanelProps) {
  const [isApplying, setIsApplying] = useState(false);

  const { stagedChanges, revertChange, clearAllChanges, applyChanges } = useSchedulerStore();

  // Group changes by queue path for organized display
  const changesByQueue = React.useMemo(() => {
    return stagedChanges.reduce(
      (acc, change) => {
        const queuePath = change.queuePath;
        if (!acc[queuePath]) {
          acc[queuePath] = [];
        }
        acc[queuePath].push(change);
        return acc;
      },
      {} as Record<string, StagedChange[]>,
    );
  }, [stagedChanges]);

  // Calculate validation summary
  const validationSummary = React.useMemo(() => {
    let errorCount = 0;
    let warningCount = 0;

    stagedChanges.forEach((change) => {
      if (change.validationErrors) {
        change.validationErrors.forEach((error) => {
          if (error.severity === 'error') {
            errorCount++;
          } else {
            warningCount++;
          }
        });
      }
    });

    return { errorCount, warningCount };
  }, [stagedChanges]);

  const handleApplyChanges = async () => {
    setIsApplying(true);
    try {
      await applyChanges();
      toast.success('All changes applied successfully');
      onClose();
    } catch (error) {
      toast.error('Failed to apply changes');
      console.error('Failed to apply changes:', error);
    } finally {
      setIsApplying(false);
    }
  };

  const handleClearAll = () => {
    clearAllChanges();
    toast.info('All staged changes cleared');
  };

  const handleRevertChange = (change: StagedChange) => {
    revertChange(change.id);
    toast.info(`Reverted change: ${change.property}`);
  };

  // Show floating button when panel is closed and there are staged changes
  if (!open && stagedChanges.length > 0) {
    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
        <Button
          variant="default"
          size="lg"
          className="relative shadow-lg rounded-full px-6"
          onClick={onOpen}
        >
          <Gauge className="h-5 w-5 mr-2" />
          View Staged Changes
          <Badge variant="destructive" className="absolute -top-2 -right-2">
            {stagedChanges.length}
          </Badge>
        </Button>
      </div>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onClose}>
      <DrawerContent className="max-h-[85vh]">
        <div className="flex flex-col h-full max-h-[85vh]">
          {/* Header */}
          <DrawerHeader className="border-b pb-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <DrawerTitle>Staged Changes</DrawerTitle>
                  <Badge variant="secondary">
                    {stagedChanges.length} {stagedChanges.length === 1 ? 'change' : 'changes'}
                  </Badge>
                </div>
              </div>

              {/* Validation Summary */}
              {(validationSummary.errorCount > 0 || validationSummary.warningCount > 0) && (
                <div className="flex gap-2">
                  {validationSummary.errorCount > 0 && (
                    <div className="flex items-center gap-1.5 text-sm text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      <span>
                        {validationSummary.errorCount} validation{' '}
                        {validationSummary.errorCount === 1 ? 'error' : 'errors'}
                      </span>
                    </div>
                  )}
                  {validationSummary.warningCount > 0 && (
                    <div className="flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="h-4 w-4" />
                      <span>
                        {validationSummary.warningCount}{' '}
                        {validationSummary.warningCount === 1 ? 'warning' : 'warnings'}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </DrawerHeader>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {stagedChanges.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">No staged changes</div>
            ) : (
              <div className="space-y-4">
                {Object.entries(changesByQueue).map(([queuePath, changes]) => (
                  <QueueChangeGroup
                    key={queuePath}
                    queuePath={queuePath}
                    changes={changes}
                    onRevert={handleRevertChange}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          {stagedChanges.length > 0 && (
            <DrawerFooter className="border-t">
              <div className="flex justify-between items-center w-full">
                <Button variant="outline" onClick={handleClearAll} disabled={isApplying}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear All
                </Button>
                <Button variant="default" onClick={handleApplyChanges} disabled={isApplying}>
                  {isApplying ? (
                    <>
                      <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-background border-t-transparent" />
                      Applying...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Apply All Changes
                    </>
                  )}
                </Button>
              </div>
            </DrawerFooter>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
