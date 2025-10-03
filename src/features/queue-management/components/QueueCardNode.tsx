import React, { useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

import {
  Card,
  CardContent,
  CardHeader,
  CardDescription,
  CardTitle,
  CardAction,
} from '~/components/ui/card';
import { Checkbox } from '~/components/ui/checkbox';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '~/components/ui/context-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';
import { Plus, Trash2, Edit, Play, Pause, AlertCircle, AlertTriangle } from 'lucide-react';
import type { QueueCardData } from '../hooks/useQueueTreeData';
import { useQueueActions } from '../hooks/useQueueActions';
import { useSchedulerStore } from '~/stores/schedulerStore';
import { cn } from '~/utils/cn';
import { AddQueueDialog } from './dialogs/AddQueueDialog';
import { DeleteQueueDialog } from './dialogs/DeleteQueueDialog';
import { QueueCapacityProgress } from './QueueCapacityProgress';
import { QueueStatusBadges } from './QueueStatusBadges';
import { QueueResourceStats } from './QueueResourceStats';
import { QUEUE_STATES } from '~/types';
import { Badge } from '~/components/ui/badge';

// Simple capacity parsing for display purposes
const parseCapacityValue = (input: string) => {
  const trimmed = input.trim();

  if (trimmed.endsWith('w')) {
    return { mode: 'weight' as const, value: trimmed };
  }

  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    return { mode: 'absolute' as const, value: trimmed };
  }

  return { mode: 'percentage' as const, value: trimmed };
};

export const QueueCardNode: React.FC<NodeProps> = ({ data }) => {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Cast data to QueueCardData type
  const queueData = data as QueueCardData;

  const {
    comparisonQueues,
    selectedQueuePath,
    selectQueue,
    setPropertyPanelOpen,
    toggleComparisonQueue,
    selectedNodeLabelFilter,
    getQueueLabelCapacity,
  } = useSchedulerStore();

  const { canAddChildQueue, canDeleteQueue, updateQueueProperty } = useQueueActions();

  const {
    queuePath,
    queueName,
    capacity,
    maxCapacity,
    state,
    usedCapacity,
    numApplications,
    resourcesUsed,
    stagedStatus,
    capacityConfig,
    maxCapacityConfig,
    stagedState,
    autoCreationStatus,
    validationErrors,
    isAffectedByErrors,
    errorSource,
  } = queueData;

  const isSelectedForComparison = comparisonQueues.includes(queuePath);
  const isSelectedQueue = selectedQueuePath === queuePath;

  // Get label-specific capacity information
  const labelCapacityInfo = getQueueLabelCapacity(queuePath, selectedNodeLabelFilter);
  const isAccessible = labelCapacityInfo?.canUseLabel ?? true; // For DEFAULT label
  const isRoot = queuePath === 'root';
  const shouldGrayOut = !isRoot && !isAccessible && selectedNodeLabelFilter !== '';

  const formatCapacityDisplay = (configValue: string): string => {
    const parsed = parseCapacityValue(configValue);
    // Only add % for percentage mode, weight already has 'w', absolute has brackets
    if (parsed.mode === 'percentage') {
      return `${configValue}%`;
    }
    return configValue;
  };

  // Use label-specific capacity if a label is selected, otherwise use default
  const displayCapacity = labelCapacityInfo?.isLabelSpecific
    ? labelCapacityInfo.capacity
    : capacityConfig;
  const displayMaxCapacity = labelCapacityInfo?.isLabelSpecific
    ? labelCapacityInfo.maxCapacity
    : maxCapacityConfig;

  const capacityMode = parseCapacityValue(displayCapacity).mode;
  const canAdd = canAddChildQueue(queuePath);
  const canDelete = canDeleteQueue(queuePath);
  const isRunning = state === QUEUE_STATES.RUNNING;

  const handleClick = (event: React.MouseEvent) => {
    event.stopPropagation();

    // Don't allow clicking on newly added queues that haven't been applied yet
    if (stagedStatus === 'new') {
      return;
    }

    // Set selected queue and open property panel
    selectQueue(queuePath);
    setPropertyPanelOpen(true);
  };

  const handleComparisonToggle = () => {
    toggleComparisonQueue(queuePath);
  };

  const handleToggleState = () => {
    const newState = isRunning ? QUEUE_STATES.STOPPED : QUEUE_STATES.RUNNING;
    updateQueueProperty(queuePath, 'state', newState);
  };

  const cardContent = (
    <Card
      className={cn(
        'relative w-[400px] h-[300px] transition-all duration-200 flex flex-col',
        // Enhanced background and border for better contrast
        'bg-gray-50 dark:bg-gray-900 border-gray-300 dark:border-gray-700',
        // Shadow for depth - stronger in light mode
        'shadow-lg hover:shadow-xl dark:shadow-md dark:hover:shadow-lg',
        // Cursor styling - not clickable for new queues
        stagedStatus === 'new' ? 'cursor-not-allowed opacity-75' : 'cursor-pointer',
        // Border styling based on status
        stagedStatus === 'new' && 'ring-2 ring-queue-new',
        stagedStatus === 'deleted' && 'ring-2 ring-queue-deleted',
        stagedStatus === 'modified' && 'ring-2 ring-queue-modified',
        !stagedStatus && isSelectedQueue && 'ring-2 ring-primary',
        // Validation error styling
        validationErrors &&
          validationErrors.some((e) => e.severity === 'error') &&
          'ring-2 ring-destructive',
        isAffectedByErrors && !validationErrors && 'ring-2 ring-amber-500',
        // Background styling for states
        isSelectedQueue && 'bg-blue-200 dark:bg-gray-800',
        isSelectedForComparison && !isSelectedQueue && 'bg-gray-200 dark:bg-gray-700',
        // Gray out inaccessible queues when filtered by label
        shouldGrayOut && 'opacity-50 grayscale',
      )}
      onClick={handleClick}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-base truncate">{queueName}</CardTitle>
            <CardDescription>{queuePath}</CardDescription>

            <CardDescription>
              <QueueStatusBadges
                capacityMode={capacityMode}
                state={state}
                stagedState={stagedState}
                stagedStatus={stagedStatus}
                autoCreationStatus={autoCreationStatus}
                labelInfo={
                  labelCapacityInfo
                    ? {
                        isLabelSpecific: labelCapacityInfo.isLabelSpecific,
                        label: labelCapacityInfo.label,
                      }
                    : undefined
                }
              />
            </CardDescription>
          </div>

          {/* Validation error indicators */}
          {(validationErrors || isAffectedByErrors) && (
            <div className="flex items-center gap-2 ml-2">
              {validationErrors && validationErrors.length > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Badge variant="destructive" className="h-6 px-2">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        {validationErrors.filter((e) => e.severity === 'error').length}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="font-semibold mb-1">Validation Errors</p>
                      <ul className="text-sm space-y-1">
                        {validationErrors
                          .filter((e) => e.severity === 'error')
                          .map((error, idx) => (
                            <li key={idx}>• {error.message}</li>
                          ))}
                      </ul>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              {isAffectedByErrors && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Badge
                        variant="outline"
                        className="h-6 px-2 border-amber-500 text-amber-600 dark:text-amber-400"
                      >
                        <AlertTriangle className="h-3 w-3" />
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="font-semibold mb-1">Affected by Child Queue Changes</p>
                      <p className="text-sm">
                        This queue is affected by validation errors from{' '}
                        {errorSource ? `queue "${errorSource}"` : 'child queues'}.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          )}
        </div>

        <CardAction>
          <Checkbox
            checked={isSelectedForComparison}
            onCheckedChange={handleComparisonToggle}
            onClick={(e) => e.stopPropagation()}
            className="h-5 w-5 border-2"
            disabled={false}
          />
        </CardAction>
      </CardHeader>

      <CardContent>
        {/* Capacity info */}
        <div className="mb-3">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold">{formatCapacityDisplay(displayCapacity)}</span>
            <span className="text-sm text-muted-foreground">capacity</span>
          </div>
          <div className="text-xs text-muted-foreground">
            Maximum capacity: {formatCapacityDisplay(displayMaxCapacity)}
          </div>
        </div>

        {/* Show why queue is inaccessible */}
        {shouldGrayOut && (
          <div className="text-xs text-muted-foreground mb-2">
            {labelCapacityInfo?.hasAccess && parseFloat(labelCapacityInfo.capacity) === 0
              ? `No capacity allocated for partition: ${selectedNodeLabelFilter}`
              : `No access to partition: ${selectedNodeLabelFilter}`}
          </div>
        )}

        <QueueCapacityProgress
          capacity={capacity}
          maxCapacity={maxCapacity}
          usedCapacity={usedCapacity}
        />

        {/* Divider */}
        <div className="border-t border-border my-3" />

        <QueueResourceStats numApplications={numApplications} resourcesUsed={resourcesUsed} />
      </CardContent>

      <Handle
        type="target"
        position={Position.Left}
        className="!bg-transparent !border-none !w-0.5 h-full !left-[-1px] !top-1/2 !-translate-y-1/2"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-transparent !border-none !w-0.5 h-full !right-[-1px] !top-1/2 !-translate-y-1/2"
      />
    </Card>
  );

  return (
    <>
      <ContextMenu
        onOpenChange={(open) => {
          // Deselect queue when context menu closes
          if (!open && isSelectedQueue) {
            selectQueue(null);
          }
        }}
      >
        <ContextMenuTrigger asChild>
          {stagedStatus === 'new' ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>{cardContent}</TooltipTrigger>
                <TooltipContent>
                  <p>This queue must be applied before it can be edited</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            cardContent
          )}
        </ContextMenuTrigger>

        <ContextMenuContent className="w-48">
          <ContextMenuItem
            onClick={(e) => {
              e.stopPropagation();
              handleClick(e);
            }}
            disabled={stagedStatus === 'new'}
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit Properties
          </ContextMenuItem>

          <ContextMenuItem
            onClick={(e) => {
              e.stopPropagation();
              handleToggleState();
            }}
          >
            {isRunning ? (
              <>
                <Pause className="mr-2 h-4 w-4" />
                Stop Queue
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Start Queue
              </>
            )}
          </ContextMenuItem>

          {canAdd && (
            <ContextMenuItem
              onClick={(e) => {
                e.stopPropagation();
                setAddDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Child Queue
            </ContextMenuItem>
          )}

          {canDelete && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteDialogOpen(true);
                }}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Queue
              </ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>

      <AddQueueDialog
        open={addDialogOpen}
        parentQueuePath={queuePath}
        onClose={() => setAddDialogOpen(false)}
      />

      <DeleteQueueDialog
        open={deleteDialogOpen}
        queuePath={queuePath}
        onClose={() => setDeleteDialogOpen(false)}
      />
    </>
  );
};
