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
import {
  Plus,
  Trash2,
  Edit,
  Play,
  Pause,
  AlertCircle,
  AlertTriangle,
  SlidersHorizontal,
} from 'lucide-react';
import type { QueueCardData } from '../hooks/useQueueTreeData';
import { useQueueActions } from '../hooks/useQueueActions';
import { useSchedulerStore } from '~/stores/schedulerStore';
import { cn } from '~/utils/cn';
import { AddQueueDialog } from './dialogs/AddQueueDialog';
import { DeleteQueueDialog } from './dialogs/DeleteQueueDialog';
import { QueueCapacityProgress } from './QueueCapacityProgress';
import { QueueStatusBadges } from './QueueStatusBadges';
import { QueueResourceStats } from './QueueResourceStats';
import { QUEUE_STATES, SPECIAL_VALUES } from '~/types';
import { Badge } from '~/components/ui/badge';
import { parseCapacityValue as parseCapacityValueUtil } from '~/utils/capacityUtils';
import { useCapacityEditor } from '../hooks/useCapacityEditor';

type CapacityDisplay =
  | { type: 'vector'; entries: ResourceVectorEntry[]; raw: string }
  | { type: 'percentage'; formatted: string; raw: string }
  | { type: 'weight'; formatted: string; raw: string }
  | { type: 'unknown'; raw?: string };

type ResourceVectorEntry = {
  resource: string;
  value: string;
};

const parseResourceVector = (value: string): ResourceVectorEntry[] => {
  const trimmed = value.trim();
  if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) {
    return [];
  }

  const inner = trimmed.slice(1, -1).trim();
  if (!inner) {
    return [];
  }

  return inner
    .split(',')
    .map((pair) => {
      const [resource, val] = pair.split('=');
      const resourceName = resource?.trim();
      const resourceValue = val?.trim();

      if (!resourceName || !resourceValue) {
        return null;
      }

      return {
        resource: resourceName,
        value: resourceValue,
      };
    })
    .filter((entry): entry is ResourceVectorEntry => entry !== null);
};

const getCapacityDisplay = (input?: string): CapacityDisplay => {
  if (!input) {
    return { type: 'unknown', raw: input };
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return { type: 'unknown', raw: trimmed };
  }

  const parsed = parseCapacityValueUtil(trimmed);

  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    return {
      type: 'vector',
      entries: parseResourceVector(trimmed),
      raw: trimmed,
    };
  }

  if (!parsed) {
    return { type: 'unknown', raw: trimmed };
  }

  switch (parsed.type) {
    case 'percentage': {
      const formatted = trimmed.endsWith('%') ? trimmed : `${parsed.value}%`;
      return { type: 'percentage', formatted, raw: trimmed };
    }
    case 'weight': {
      const formatted = trimmed.endsWith('w') ? trimmed : `${parsed.value}w`;
      return { type: 'weight', formatted, raw: trimmed };
    }
    case 'absolute': {
      return {
        type: 'vector',
        entries: parseResourceVector(trimmed),
        raw: trimmed,
      };
    }
    default:
      return { type: 'unknown', raw: trimmed };
  }
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
    isPropertyPanelOpen,
    setPropertyPanelInitialTab,
    toggleComparisonQueue,
    selectedNodeLabelFilter,
    getQueueLabelCapacity,
    clearQueueChanges,
  } = useSchedulerStore();

  const { canAddChildQueue, canDeleteQueue, updateQueueProperty } = useQueueActions();
  const { openCapacityEditor } = useCapacityEditor();

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
    creationMethod,
    isAutoCreatedQueue,
  } = queueData;

  const isSelectedForComparison = comparisonQueues.includes(queuePath);
  const isSelectedQueue = selectedQueuePath === queuePath;

  // Get label-specific capacity information
  const labelCapacityInfo = getQueueLabelCapacity(queuePath, selectedNodeLabelFilter);
  const isAccessible = labelCapacityInfo?.canUseLabel ?? true; // For DEFAULT label
  const isRoot = queuePath === 'root';
  const shouldGrayOut = !isRoot && !isAccessible && selectedNodeLabelFilter !== '';

  // Use label-specific capacity if a label is selected, otherwise use default
  const displayCapacity = labelCapacityInfo?.isLabelSpecific
    ? labelCapacityInfo.capacity
    : capacityConfig;
  const displayMaxCapacity = labelCapacityInfo?.isLabelSpecific
    ? labelCapacityInfo.maxCapacity
    : maxCapacityConfig;

  const parsedCapacityMode = parseCapacityValueUtil(displayCapacity);
  const capacityMode: 'percentage' | 'weight' | 'absolute' =
    parsedCapacityMode?.type ?? 'percentage';
  const parsedCapacityDisplay = getCapacityDisplay(displayCapacity);
  const parsedMaxCapacityDisplay = getCapacityDisplay(displayMaxCapacity);
  const showVectorCapacity =
    parsedCapacityDisplay.type === 'vector' || parsedMaxCapacityDisplay.type === 'vector';
  const canAdd = canAddChildQueue(queuePath);
  const canDelete = canDeleteQueue(queuePath);
  const isRunning = state === QUEUE_STATES.RUNNING;

  const openPropertyPanel = (
    event: React.MouseEvent,
    initialTab: 'overview' | 'info' | 'settings' = 'overview',
  ) => {
    event.stopPropagation();

    // Don't allow clicking on newly added queues that haven't been applied yet
    if (stagedStatus === 'new') {
      return;
    }

    const tabToOpen = isAutoCreatedQueue && initialTab === 'settings' ? 'overview' : initialTab;
    setPropertyPanelInitialTab(tabToOpen);
    // Set selected queue and open property panel
    selectQueue(queuePath);
    setPropertyPanelOpen(true);
  };

  const handleOpenCapacityEditor = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!queuePath || queuePath === SPECIAL_VALUES.ROOT_QUEUE_NAME) {
      return;
    }

    const parentPath = queuePath.split('.').slice(0, -1).join('.');
    if (!parentPath) {
      return;
    }

    openCapacityEditor({
      origin: 'context-menu',
      parentQueuePath: parentPath,
      originQueuePath: queuePath,
      originQueueName: queueName,
      capacityValue: capacityConfig,
      maxCapacityValue: maxCapacityConfig,
      queueState: state,
      markOriginAsNew: stagedStatus === 'new',
    });
  };

  const handleRemoveStagedQueue = (event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    if (queuePath) {
      clearQueueChanges(queuePath);
    }
  };

  const handleComparisonToggle = () => {
    toggleComparisonQueue(queuePath);
  };

  const handleToggleState = () => {
    const newState = isRunning ? QUEUE_STATES.STOPPED : QUEUE_STATES.RUNNING;
    updateQueueProperty(queuePath, 'state', newState);
  };

  const renderResourceEntries = (entries: ResourceVectorEntry[]) => {
    if (!entries.length) {
      return <span className="text-xs text-muted-foreground">N/A</span>;
    }

    return (
      <div className="flex flex-wrap gap-1">
        {entries.map(({ resource, value }, index) => (
          <Badge
            key={`${resource}-${value}-${index}`}
            variant="outline"
            className="px-1.5 py-0.5 text-[11px] leading-tight font-medium whitespace-normal break-all"
          >
            {resource}: {value}
          </Badge>
        ))}
      </div>
    );
  };

  const cardContent = (
    <Card
      className={cn(
        'relative w-[400px] h-[300px] transition-all duration-200 flex flex-col',
        // Enhanced background and border for better contrast
        'bg-gray-50 dark:bg-gray-900 border-gray-300 dark:border-gray-700',
        isAutoCreatedQueue &&
          'border-amber-400 dark:border-amber-500 border-2 border-dashed bg-amber-50/70 dark:bg-amber-900/30',
        // Shadow for depth - stronger in light mode
        'shadow-lg hover:shadow-xl dark:shadow-md dark:hover:shadow-lg',
        // Cursor styling - not clickable for new queues
        stagedStatus === 'new' ? 'opacity-75 cursor-default' : 'cursor-pointer',
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
      onClick={(event) => openPropertyPanel(event, 'overview')}
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
                creationMethod={creationMethod}
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
          {showVectorCapacity ? (
            <div className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  capacity
                </span>
                <div className="flex-1 min-w-[120px]">
                  {parsedCapacityDisplay.type === 'vector' ? (
                    renderResourceEntries(parsedCapacityDisplay.entries)
                  ) : (
                    <span className="text-sm font-medium">
                      {parsedCapacityDisplay.type === 'percentage' ||
                      parsedCapacityDisplay.type === 'weight'
                        ? parsedCapacityDisplay.formatted
                        : 'N/A'}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  maximum capacity
                </span>
                <div className="flex-1 min-w-[120px]">
                  {parsedMaxCapacityDisplay.type === 'vector' ? (
                    renderResourceEntries(parsedMaxCapacityDisplay.entries)
                  ) : (
                    <span className="text-sm font-medium text-muted-foreground">
                      {parsedMaxCapacityDisplay.type === 'percentage' ||
                      parsedMaxCapacityDisplay.type === 'weight'
                        ? parsedMaxCapacityDisplay.formatted
                        : 'N/A'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold">
                  {parsedCapacityDisplay.type === 'percentage' ||
                  parsedCapacityDisplay.type === 'weight'
                    ? parsedCapacityDisplay.formatted
                    : 'N/A'}
                </span>
                <span className="text-sm text-muted-foreground">capacity</span>
              </div>
              <div className="text-xs text-muted-foreground">
                Maximum capacity:{' '}
                {parsedMaxCapacityDisplay.type === 'percentage' ||
                parsedMaxCapacityDisplay.type === 'weight'
                  ? parsedMaxCapacityDisplay.formatted
                  : 'N/A'}
              </div>
            </>
          )}
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
          if (!open && isSelectedQueue && !isPropertyPanelOpen) {
            selectQueue(null);
          }
        }}
      >
        {stagedStatus === 'new' ? (
          <TooltipProvider>
            <Tooltip>
              <ContextMenuTrigger asChild>
                <TooltipTrigger asChild>{cardContent}</TooltipTrigger>
              </ContextMenuTrigger>
              <TooltipContent>
                <p>This queue must be applied before it can be edited</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <ContextMenuTrigger asChild>{cardContent}</ContextMenuTrigger>
        )}

        <ContextMenuContent className="w-48">
          <ContextMenuItem
            onClick={(e) => {
              e.stopPropagation();
              openPropertyPanel(e, 'settings');
            }}
            disabled={stagedStatus === 'new' || isAutoCreatedQueue}
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit Properties
          </ContextMenuItem>

          {queuePath !== SPECIAL_VALUES.ROOT_QUEUE_NAME && (
            <ContextMenuItem onClick={(e) => handleOpenCapacityEditor(e)}>
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Capacity Editor
            </ContextMenuItem>
          )}

          {stagedStatus === 'new' && queuePath !== SPECIAL_VALUES.ROOT_QUEUE_NAME && (
            <ContextMenuItem
              onClick={handleRemoveStagedQueue}
              className="text-red-600 focus:text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Remove Staged Queue
            </ContextMenuItem>
          )}

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

          {canAdd && stagedStatus !== 'new' && (
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

          {canDelete && stagedStatus !== 'new' && (
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
