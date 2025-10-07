import React from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { Input } from '~/components/ui/input';
import { Field, FieldControl, FieldDescription, FieldLabel } from '~/components/ui/field';
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover';
import { useSchedulerStore } from '~/stores/schedulerStore';
import type { SchedulerStore } from '~/stores/schedulerStore';
import { cn } from '~/utils/cn';

export type CapacityAdjustment = {
  capacity?: string;
  maxCapacity?: string;
};

export type CapacityAdjustmentMap = Record<string, CapacityAdjustment>;

interface CapacityAdjustPopoverProps {
  parentQueuePath?: string;
  activeQueuePath?: string;
  activeQueueName?: string;
  capacityValue?: string;
  maxCapacityValue?: string;
  triggerVariant?: 'inline' | 'default';
  disabled?: boolean;
  adjustments?: CapacityAdjustmentMap;
  onAdjustmentsChange?: (next: CapacityAdjustmentMap) => void;
  onApply?: (changes: CapacityAdjustmentMap) => Promise<void> | void;
  onActiveQueueChange?: (changes: CapacityAdjustment) => void;
  isApplying?: boolean;
}

interface SiblingSummary {
  queueName: string;
  queuePath: string;
  capacity: string;
  maxCapacity: string;
  hasStagedChange: boolean;
  isStagedNew: boolean;
}

interface DraftRow {
  queuePath: string;
  queueName: string;
  capacity: string;
  maxCapacity: string;
  baseCapacity: string;
  baseMaxCapacity: string;
  isActiveQueue: boolean;
  isNewQueue: boolean;
  hasStagedChange: boolean;
  isStagedNew: boolean;
}

const sanitizeValue = (value?: string) => (value ?? '').trim();

export const CapacityAdjustPopover: React.FC<CapacityAdjustPopoverProps> = ({
  parentQueuePath,
  activeQueuePath,
  activeQueueName,
  capacityValue,
  maxCapacityValue,
  triggerVariant = 'default',
  disabled,
  adjustments,
  onAdjustmentsChange,
  onApply,
  onActiveQueueChange,
  isApplying,
}) => {
  const [open, setOpen] = React.useState(false);
  const [draftRows, setDraftRows] = React.useState<DraftRow[]>([]);
  const [internalApplying, setInternalApplying] = React.useState(false);
  const wasOpenRef = React.useRef(false);

  const siblingSelector = React.useMemo(
    () => (state: SchedulerStore) => (parentQueuePath ? state.getChildQueues(parentQueuePath) : []),
    [parentQueuePath],
  );

  const siblingQueues = useSchedulerStore(siblingSelector);
  const getQueuePropertyValue = useSchedulerStore((state) => state.getQueuePropertyValue);
  const stagedChanges = useSchedulerStore((state) => state.stagedChanges);

  const parentQueueName = React.useMemo(() => {
    if (!parentQueuePath) {
      return null;
    }

    const parts = parentQueuePath.split('.');
    return parts[parts.length - 1] || parentQueuePath;
  }, [parentQueuePath]);

  const siblingSummaries = React.useMemo<SiblingSummary[]>(() => {
    return siblingQueues.map((queue) => {
      const capacity = getQueuePropertyValue(queue.queuePath, 'capacity');
      const maxCapacity = getQueuePropertyValue(queue.queuePath, 'maximum-capacity');

      return {
        queueName: queue.queueName,
        queuePath: queue.queuePath,
        capacity: sanitizeValue(capacity.value),
        maxCapacity: sanitizeValue(maxCapacity.value),
        hasStagedChange: capacity.isStaged || maxCapacity.isStaged,
        isStagedNew: false,
      };
    });
  }, [siblingQueues, getQueuePropertyValue]);

  const stagedSiblingSummaries = React.useMemo<SiblingSummary[]>(() => {
    if (!parentQueuePath) {
      return [];
    }

    const summaries: SiblingSummary[] = [];
    const seen = new Set<string>();

    stagedChanges.forEach((change) => {
      if (change.type !== 'add') {
        return;
      }

      const queuePath = change.queuePath;
      if (!queuePath) {
        return;
      }

      const parentPathFromQueue = queuePath.split('.').slice(0, -1).join('.');
      if (parentPathFromQueue !== parentQueuePath) {
        return;
      }

      if (seen.has(queuePath)) {
        return;
      }

      seen.add(queuePath);

      const queueName = queuePath.split('.').pop() || queuePath;
      const capacity = getQueuePropertyValue(queuePath, 'capacity');
      const maxCapacity = getQueuePropertyValue(queuePath, 'maximum-capacity');

      summaries.push({
        queueName,
        queuePath,
        capacity: sanitizeValue(capacity.value),
        maxCapacity: sanitizeValue(maxCapacity.value),
        hasStagedChange: true,
        isStagedNew: true,
      });
    });

    return summaries;
  }, [stagedChanges, parentQueuePath, getQueuePropertyValue]);

  const combinedSiblingSummaries = React.useMemo<SiblingSummary[]>(() => {
    if (stagedSiblingSummaries.length === 0) {
      return siblingSummaries;
    }

    const existingMap = new Map<string, SiblingSummary>();
    siblingSummaries.forEach((summary) => existingMap.set(summary.queuePath, summary));

    stagedSiblingSummaries.forEach((summary) => {
      existingMap.set(summary.queuePath, summary);
    });

    // Preserve original order: existing siblings first, then staged additions not already present
    const merged: SiblingSummary[] = [...siblingSummaries];

    stagedSiblingSummaries.forEach((summary) => {
      if (!merged.some((existing) => existing.queuePath === summary.queuePath)) {
        merged.push(summary);
      }
    });

    return merged;
  }, [siblingSummaries, stagedSiblingSummaries]);

  const hasActiveQueueSummary = React.useMemo(() => {
    if (!activeQueuePath) {
      return false;
    }

    return combinedSiblingSummaries.some((summary) => summary.queuePath === activeQueuePath);
  }, [activeQueuePath, combinedSiblingSummaries]);

  const baseRows = React.useMemo<DraftRow[]>(() => {
    const rows: DraftRow[] = combinedSiblingSummaries.map((summary) => {
      const isActive = summary.queuePath === activeQueuePath;
      const baseCapacity = isActive
        ? sanitizeValue(capacityValue) || summary.capacity
        : summary.capacity;
      const baseMaxCapacity = isActive
        ? sanitizeValue(maxCapacityValue) || summary.maxCapacity
        : summary.maxCapacity;

      return {
        queueName: isActive && activeQueueName ? activeQueueName : summary.queueName,
        queuePath: summary.queuePath,
        capacity: baseCapacity,
        maxCapacity: baseMaxCapacity,
        baseCapacity,
        baseMaxCapacity,
        isActiveQueue: isActive,
        isNewQueue: false,
        hasStagedChange: summary.hasStagedChange,
        isStagedNew: summary.isStagedNew,
      };
    });

    if (!hasActiveQueueSummary) {
      rows.push({
        queueName: sanitizeValue(activeQueueName) || 'New Queue',
        queuePath: activeQueuePath ?? 'pending',
        capacity: sanitizeValue(capacityValue),
        maxCapacity: sanitizeValue(maxCapacityValue),
        baseCapacity: sanitizeValue(capacityValue),
        baseMaxCapacity: sanitizeValue(maxCapacityValue),
        isActiveQueue: true,
        isNewQueue: true,
        hasStagedChange: false,
        isStagedNew: false,
      });
    }

    return rows.sort((a, b) => {
      if (a.isActiveQueue === b.isActiveQueue) {
        return 0;
      }
      return a.isActiveQueue ? -1 : 1;
    });
  }, [
    combinedSiblingSummaries,
    activeQueuePath,
    activeQueueName,
    capacityValue,
    maxCapacityValue,
    hasActiveQueueSummary,
  ]);

  const buildDraftRows = React.useCallback(() => {
    return baseRows.map((row) => {
      const adjustment = adjustments?.[row.queuePath];
      const hasCapacityOverride = adjustment?.capacity !== undefined;
      const hasMaxOverride = adjustment?.maxCapacity !== undefined;

      return {
        ...row,
        capacity: hasCapacityOverride ? sanitizeValue(adjustment?.capacity) : row.capacity,
        maxCapacity: hasMaxOverride ? sanitizeValue(adjustment?.maxCapacity) : row.maxCapacity,
      };
    });
  }, [baseRows, adjustments]);

  React.useEffect(() => {
    if (open && !wasOpenRef.current) {
      setDraftRows(buildDraftRows());
    }

    wasOpenRef.current = open;
  }, [open, buildDraftRows]);

  const applying = isApplying ?? internalApplying;

  const handleRowChange = React.useCallback(
    (queuePath: string, field: 'capacity' | 'maxCapacity', value: string) => {
      let activeChange: CapacityAdjustment | null = null;

      setDraftRows((prev) =>
        prev.map((row) => {
          if (row.queuePath !== queuePath) {
            return row;
          }

          const nextRow = { ...row, [field]: value };

          if (nextRow.isActiveQueue) {
            activeChange = {
              ...(field === 'capacity' ? { capacity: value } : { maxCapacity: value }),
            };
          }

          return nextRow;
        }),
      );

      if (activeChange && onActiveQueueChange) {
        onActiveQueueChange(activeChange);
      }
    },
    [onActiveQueueChange],
  );

  const handleReset = React.useCallback(() => {
    const resetRows = baseRows.map((row) => ({
      ...row,
      capacity: row.baseCapacity,
      maxCapacity: row.baseMaxCapacity,
    }));

    setDraftRows(resetRows);

    const activeRow = resetRows.find((row) => row.isActiveQueue);
    if (activeRow && onActiveQueueChange) {
      onActiveQueueChange({
        capacity: activeRow.capacity,
        maxCapacity: activeRow.maxCapacity,
      });
    }

    onAdjustmentsChange?.({});
  }, [baseRows, onActiveQueueChange, onAdjustmentsChange]);

  const siblingDiff = React.useMemo(() => {
    const diff: CapacityAdjustmentMap = {};

    draftRows.forEach((row) => {
      if (row.isActiveQueue) {
        return;
      }

      const capacityChanged = sanitizeValue(row.capacity) !== sanitizeValue(row.baseCapacity);
      const maxCapacityChanged =
        sanitizeValue(row.maxCapacity) !== sanitizeValue(row.baseMaxCapacity);

      if (capacityChanged || maxCapacityChanged) {
        diff[row.queuePath] = {};

        if (capacityChanged) {
          diff[row.queuePath].capacity = sanitizeValue(row.capacity);
        }

        if (maxCapacityChanged) {
          diff[row.queuePath].maxCapacity = sanitizeValue(row.maxCapacity);
        }
      }
    });

    return diff;
  }, [draftRows]);

  const normalizedAdjustments = React.useMemo(() => {
    if (!adjustments) {
      return {} as CapacityAdjustmentMap;
    }

    const map: CapacityAdjustmentMap = {};

    Object.entries(adjustments).forEach(([path, change]) => {
      const normalized: CapacityAdjustment = {};

      if (change.capacity !== undefined) {
        normalized.capacity = sanitizeValue(change.capacity);
      }

      if (change.maxCapacity !== undefined) {
        normalized.maxCapacity = sanitizeValue(change.maxCapacity);
      }

      if (normalized.capacity !== undefined || normalized.maxCapacity !== undefined) {
        map[path] = normalized;
      }
    });

    return map;
  }, [adjustments]);

  const siblingChangeCount = Object.keys(siblingDiff).length;

  const activeQueueChange = React.useMemo(() => {
    const activeRow = draftRows.find(
      (row) => row.isActiveQueue && row.queuePath && row.queuePath !== 'pending',
    );

    if (!activeRow) {
      return null;
    }

    const capacityChanged =
      sanitizeValue(activeRow.capacity) !== sanitizeValue(activeRow.baseCapacity);
    const maxCapacityChanged =
      sanitizeValue(activeRow.maxCapacity) !== sanitizeValue(activeRow.baseMaxCapacity);

    if (!capacityChanged && !maxCapacityChanged) {
      return null;
    }

    const change: CapacityAdjustment = {};

    if (capacityChanged) {
      change.capacity = sanitizeValue(activeRow.capacity);
    }

    if (maxCapacityChanged) {
      change.maxCapacity = sanitizeValue(activeRow.maxCapacity);
    }

    return {
      queuePath: activeRow.queuePath,
      change,
    };
  }, [draftRows]);

  const hasNewSiblingChanges = React.useMemo(() => {
    if (siblingChangeCount === 0) {
      return false;
    }

    const diffKeys = Object.keys(siblingDiff);
    const adjustmentKeys = Object.keys(normalizedAdjustments);

    if (diffKeys.length !== adjustmentKeys.length) {
      return true;
    }

    return diffKeys.some((key) => {
      const diffEntry = siblingDiff[key];
      const adjustmentEntry = normalizedAdjustments[key];

      if (!adjustmentEntry) {
        return true;
      }

      if (diffEntry.capacity !== sanitizeValue(adjustmentEntry.capacity)) {
        return true;
      }

      if (diffEntry.maxCapacity !== sanitizeValue(adjustmentEntry.maxCapacity)) {
        return true;
      }

      return false;
    });
  }, [normalizedAdjustments, siblingDiff, siblingChangeCount]);

  const hasNewChanges = hasNewSiblingChanges || Boolean(activeQueueChange);
  const hasAnyChanges = siblingChangeCount > 0 || Boolean(activeQueueChange);

  const handleApply = React.useCallback(async () => {
    onAdjustmentsChange?.(siblingDiff);

    const changesToApply: CapacityAdjustmentMap = { ...siblingDiff };

    if (activeQueueChange) {
      changesToApply[activeQueueChange.queuePath] = {
        ...(changesToApply[activeQueueChange.queuePath] || {}),
        ...activeQueueChange.change,
      };
    }

    if (Object.keys(changesToApply).length === 0) {
      setOpen(false);
      return;
    }

    if (!hasNewChanges) {
      setOpen(false);
      return;
    }

    if (!onApply) {
      setOpen(false);
      return;
    }

    try {
      setInternalApplying(true);
      await onApply(changesToApply);
      setOpen(false);
    } finally {
      setInternalApplying(false);
    }
  }, [activeQueueChange, hasNewChanges, onAdjustmentsChange, onApply, siblingDiff]);

  if (!parentQueuePath) {
    return null;
  }

  const triggerProps =
    triggerVariant === 'inline'
      ? {
          variant: 'ghost' as const,
          size: 'sm' as const,
          className: 'h-7 px-2 text-xs text-muted-foreground hover:text-foreground',
        }
      : {
          variant: 'outline' as const,
          size: 'sm' as const,
          className: 'text-xs font-medium border-primary/40 text-primary hover:bg-primary/10',
        };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button {...triggerProps} type="button" disabled={disabled || applying}>
          {applying ? (
            <>
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              Applying…
            </>
          ) : (
            'Adjust siblings'
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[420px]" align="end" sideOffset={8}>
        <div className="space-y-3">
          <div className="space-y-1">
            <p className="text-sm font-medium">Sibling capacities</p>
            <p className="text-xs text-muted-foreground">
              Plan adjustments for queues under {parentQueueName} without leaving this editor.
            </p>
          </div>

          <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
            {draftRows.length === 0 && (
              <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                No sibling queues found for this parent.
              </div>
            )}

            {draftRows.map((row) => (
              <div
                key={row.queuePath}
                className={cn(
                  'rounded-md border p-3 text-xs ring-offset-background transition',
                  row.isActiveQueue && 'border-primary/60 bg-primary/5',
                  row.hasStagedChange && !row.isActiveQueue && 'border-amber-500/70 bg-amber-50/60',
                  row.isStagedNew && !row.isActiveQueue && 'border-dashed',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{row.queueName}</span>
                      {row.isActiveQueue && (
                        <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                          This queue
                        </Badge>
                      )}
                      {row.hasStagedChange && !row.isActiveQueue && (
                        <Badge variant="outline" className="h-4 px-1 text-[10px]">
                          Staged
                        </Badge>
                      )}
                      {row.isStagedNew && !row.isActiveQueue && (
                        <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                          New
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground break-all text-[11px]">{row.queuePath}</p>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <Field
                    id={`${row.queuePath}-capacity`}
                    name={`${row.queuePath}-capacity`}
                    className="space-y-1"
                  >
                    <FieldLabel className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Capacity
                    </FieldLabel>
                    <FieldControl>
                      <Input
                        value={row.capacity}
                        onChange={(event) =>
                          handleRowChange(row.queuePath, 'capacity', event.target.value)
                        }
                        className="h-8 text-sm"
                        disabled={applying}
                      />
                    </FieldControl>
                    <FieldDescription className="text-[11px] text-muted-foreground">
                      Base: {row.baseCapacity ? `${row.baseCapacity}` : '—'}
                    </FieldDescription>
                  </Field>
                  <Field
                    id={`${row.queuePath}-max-capacity`}
                    name={`${row.queuePath}-max-capacity`}
                    className="space-y-1"
                  >
                    <FieldLabel className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Max capacity
                    </FieldLabel>
                    <FieldControl>
                      <Input
                        value={row.maxCapacity}
                        onChange={(event) =>
                          handleRowChange(row.queuePath, 'maxCapacity', event.target.value)
                        }
                        className="h-8 text-sm"
                        disabled={applying}
                      />
                    </FieldControl>
                    <FieldDescription className="text-[11px] text-muted-foreground">
                      Base: {row.baseMaxCapacity ? `${row.baseMaxCapacity}` : '—'}
                    </FieldDescription>
                  </Field>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs"
              disabled={!hasAnyChanges || applying}
              onClick={handleReset}
            >
              Reset
            </Button>
            <Button
              type="button"
              size="sm"
              className="text-xs"
              disabled={!hasNewChanges || applying}
              onClick={handleApply}
            >
              {applying ? (
                <>
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  Applying…
                </>
              ) : (
                'Apply adjustments'
              )}
            </Button>
          </div>

          <p className="text-[11px] text-muted-foreground">
            Adjustments here are staged alongside your current changes so you can apply them
            together.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
};
