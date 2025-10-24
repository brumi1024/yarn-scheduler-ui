import React, { useState, useMemo } from 'react';
import { FieldSwitch } from '~/components/ui/field-switch';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog';
import { AlertCircle, AlertTriangle, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { useSchedulerStore } from '~/stores/schedulerStore';
import { validateQueue } from '~/features/validation/service';
import type { ValidationIssue } from '~/features/validation/types';
import { getMergedConfigData } from '~/features/validation/utils/configUtils';
import { cn } from '~/utils/cn';
import { SPECIAL_VALUES } from '~/types';
import type { StagedChange } from '~/types';
import { LegacyModeDocumentation } from '~/features/queue-management/components/LegacyModeDocumentation';

interface LegacyModeToggleProps {
  value: string;
  isStaged: boolean;
  onChange: (value: string) => void;
  property: {
    name: string;
    displayName: string;
    description: string;
  };
  disabled?: boolean;
}

interface ValidationPreview {
  queuePath: string;
  errors: ValidationIssue[];
}

export const LegacyModeToggle: React.FC<LegacyModeToggleProps> = ({
  value,
  isStaged,
  onChange,
  property,
  disabled = false,
}) => {
  const [showPreview, setShowPreview] = useState(false);
  const { schedulerData, configData, stagedChanges } = useSchedulerStore();

  const currentEnabled = value === 'true';

  // Calculate validation changes that would occur
  const validationPreview = useMemo(() => {
    if (!schedulerData) return { added: [], removed: [], affectedQueues: 0 };

    const previewResults: ValidationPreview[] = [];
    const simulatedLegacyMode = !currentEnabled; // What it would be after toggle

    // Create a simulated staged change for the legacy mode toggle
    const simulatedStagedChange: StagedChange = {
      id: 'simulated',
      type: 'update',
      queuePath: SPECIAL_VALUES.GLOBAL_QUEUE_PATH,
      property: property.name,
      oldValue: currentEnabled ? 'true' : 'false',
      newValue: simulatedLegacyMode ? 'true' : 'false',
      timestamp: Date.now(),
      validationErrors: [],
    };

    // Merge current staged changes with the simulated change
    const simulatedStagedChanges = [
      ...stagedChanges.filter(
        (c) => !(c.queuePath === SPECIAL_VALUES.GLOBAL_QUEUE_PATH && c.property === property.name),
      ),
      simulatedStagedChange,
    ];

    // Create merged config data with simulated changes
    const simulatedMergedData = getMergedConfigData(configData, simulatedStagedChanges);
    const currentMergedData = getMergedConfigData(configData, stagedChanges);

    // Helper to get all queues recursively
    const getAllQueues = (
      queue: import('~/types').QueueInfo,
      results: import('~/types').QueueInfo[] = [],
    ): import('~/types').QueueInfo[] => {
      results.push(queue);
      if (queue.queues?.queue) {
        queue.queues.queue.forEach((child) => getAllQueues(child, results));
      }
      return results;
    };

    const allQueues = getAllQueues(schedulerData as unknown as import('~/types').QueueInfo);

    // Validate each queue with simulated legacy mode
    allQueues.forEach((queue) => {
      const queueProperties: Record<string, string> = {};
      simulatedMergedData.forEach((value, key) => {
        if (key.startsWith(`yarn.scheduler.capacity.${queue.queuePath}.`)) {
          const propertyName = key.replace(`yarn.scheduler.capacity.${queue.queuePath}.`, '');
          queueProperties[propertyName] = value;
        }
      });

      const result = validateQueue({
        queuePath: queue.queuePath,
        properties: queueProperties,
        configData: simulatedMergedData,
        stagedChanges: [],
        schedulerData,
      });

      if (result.issues.length > 0) {
        previewResults.push({
          queuePath: queue.queuePath,
          errors: result.issues,
        });
      }
    });

    // Compare with current validation state
    const currentResults: ValidationPreview[] = [];
    allQueues.forEach((queue) => {
      const queueProperties: Record<string, string> = {};
      currentMergedData.forEach((value, key) => {
        if (key.startsWith(`yarn.scheduler.capacity.${queue.queuePath}.`)) {
          const propertyName = key.replace(`yarn.scheduler.capacity.${queue.queuePath}.`, '');
          queueProperties[propertyName] = value;
        }
      });

      const result = validateQueue({
        queuePath: queue.queuePath,
        properties: queueProperties,
        configData: currentMergedData,
        stagedChanges: [],
        schedulerData,
      });

      if (result.issues.length > 0) {
        currentResults.push({
          queuePath: queue.queuePath,
          errors: result.issues,
        });
      }
    });

    // Determine added/removed errors
    const added: ValidationPreview[] = [];
    const removed: ValidationPreview[] = [];

    previewResults.forEach((preview) => {
      const current = currentResults.find((c) => c.queuePath === preview.queuePath);
      if (!current) {
        added.push(preview);
      } else {
        const newErrors = preview.errors.filter(
          (e) => !current.errors.some((ce) => ce.rule === e.rule && ce.field === e.field),
        );
        if (newErrors.length > 0) {
          added.push({ queuePath: preview.queuePath, errors: newErrors });
        }
      }
    });

    currentResults.forEach((current) => {
      const preview = previewResults.find((p) => p.queuePath === current.queuePath);
      if (!preview) {
        removed.push(current);
      } else {
        const removedErrors = current.errors.filter(
          (e) => !preview.errors.some((pe) => pe.rule === e.rule && pe.field === e.field),
        );
        if (removedErrors.length > 0) {
          removed.push({ queuePath: current.queuePath, errors: removedErrors });
        }
      }
    });

    const affectedQueues = new Set([
      ...added.map((a) => a.queuePath),
      ...removed.map((r) => r.queuePath),
    ]).size;

    return { added, removed, affectedQueues };
  }, [currentEnabled, schedulerData, configData, stagedChanges, property.name]);

  return (
    <FieldSwitch
      id={property.name}
      label={property.displayName}
      disabled={disabled}
      labelSuffix={
        <LegacyModeDocumentation>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 hover:bg-transparent"
            type="button"
          >
            <Info className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </LegacyModeDocumentation>
      }
      description={property.description}
      addon={
        <>
          {isStaged && (
            <Badge variant="outline" className="border-warning text-warning">
              Modified
            </Badge>
          )}

          <Dialog open={showPreview} onOpenChange={setShowPreview}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                disabled={!schedulerData || disabled}
              >
                {showPreview ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                Preview
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh]">
              <DialogHeader>
                <DialogTitle>Validation Preview</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 overflow-y-auto max-h-[calc(80vh-8rem)]">
                <div>
                  <h4 className="font-medium text-sm">Validation Preview</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Changes that would occur when switching to{' '}
                    {currentEnabled ? 'Flexible' : 'Legacy'} Mode
                  </p>
                </div>

                {validationPreview.affectedQueues === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">
                    No validation changes would occur.
                  </p>
                ) : (
                  <>
                    <div className="text-sm">
                      <span className="font-medium">{validationPreview.affectedQueues}</span> queue
                      {validationPreview.affectedQueues !== 1 ? 's' : ''} would be affected
                    </div>

                    <div className="w-full rounded-md border p-3">
                      <div className="space-y-4">
                        {validationPreview.removed.length > 0 && (
                          <div>
                            <h5 className="text-xs font-medium text-green-600 dark:text-green-400 mb-2">
                              Errors that would be removed:
                            </h5>
                            <div className="space-y-2">
                              {validationPreview.removed.map((item, idx) => (
                                <div key={idx} className="space-y-1">
                                  <div className="text-xs font-medium">{item.queuePath}</div>
                                  {item.errors.map((error, errorIdx) => (
                                    <div
                                      key={errorIdx}
                                      className={cn(
                                        'flex items-start gap-2 text-xs p-2 rounded-md bg-green-50 dark:bg-green-950/20',
                                      )}
                                    >
                                      <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0 text-green-600 dark:text-green-400" />
                                      <span>{error.message}</span>
                                    </div>
                                  ))}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {validationPreview.added.length > 0 && (
                          <div>
                            <h5 className="text-xs font-medium text-destructive mb-2">
                              New errors that would appear:
                            </h5>
                            <div className="space-y-2">
                              {validationPreview.added.map((item, idx) => (
                                <div key={idx} className="space-y-1">
                                  <div className="text-xs font-medium">{item.queuePath}</div>
                                  {item.errors.map((error, errorIdx) => (
                                    <div
                                      key={errorIdx}
                                      className={cn(
                                        'flex items-start gap-2 text-xs p-2 rounded-md',
                                        error.severity === 'error'
                                          ? 'bg-destructive/10'
                                          : 'bg-amber-500/10',
                                      )}
                                    >
                                      {error.severity === 'error' ? (
                                        <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0 text-destructive" />
                                      ) : (
                                        <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                                      )}
                                      <span>{error.message}</span>
                                    </div>
                                  ))}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {currentEnabled && validationPreview.added.length > 0 && (
                      <div className="text-xs text-muted-foreground border-t pt-2">
                        <strong>Note:</strong> These errors can be temporarily staged when working
                        with multiple queues.
                      </div>
                    )}
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </>
      }
      checked={currentEnabled}
      onCheckedChange={(checked) => {
        if (disabled) {
          return;
        }
        onChange(checked ? 'true' : 'false');
      }}
    />
  );
};
