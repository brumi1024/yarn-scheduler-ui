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
import { Plus, Trash2, Edit, Play, Pause } from 'lucide-react';
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

export const QueueCardNode = ({ data }: NodeProps) => {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const {
    comparisonQueues,
    selectedQueuePath,
    selectQueue,
    setPropertyPanelOpen,
    toggleComparisonQueue,
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
  } = data as QueueCardData;

  const isSelectedForComparison = comparisonQueues.includes(queuePath);
  const isSelectedQueue = selectedQueuePath === queuePath;

  const formatCapacityDisplay = (configValue: string): string => {
    const parsed = parseCapacityValue(configValue);
    // Only add % for percentage mode, weight already has 'w', absolute has brackets
    if (parsed.mode === 'percentage') {
      return `${configValue}%`;
    }
    return configValue;
  };

  const capacityMode = parseCapacityValue(capacityConfig).mode;
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
        // Cursor styling - not clickable for new queues
        stagedStatus === 'new' ? 'cursor-not-allowed opacity-75' : 'cursor-pointer hover:shadow-md',
        // Border styling based on status
        stagedStatus === 'new' && 'ring-2 ring-queue-new',
        stagedStatus === 'deleted' && 'ring-2 ring-queue-deleted',
        stagedStatus === 'modified' && 'ring-2 ring-queue-modified',
        !stagedStatus && isSelectedQueue && 'ring-2 ring-primary',
        // Background styling
        isSelectedQueue && 'bg-accent',
        isSelectedForComparison && !isSelectedQueue && 'bg-muted',
      )}
      onClick={handleClick}
    >
      <CardHeader>
        <CardTitle className="text-base truncate">{queueName}</CardTitle>
        <CardDescription>{queuePath}</CardDescription>

        <CardDescription>
          <QueueStatusBadges
            capacityMode={capacityMode}
            state={state}
            stagedState={stagedState}
            stagedStatus={stagedStatus}
            autoCreationStatus={autoCreationStatus}
          />
        </CardDescription>

        <CardAction>
          <div
            className={cn(
              'rounded-md p-0.5 transition-colors',
              isSelectedForComparison && 'bg-blue-100 dark:bg-blue-900',
            )}
          >
            <Checkbox
              checked={isSelectedForComparison}
              onCheckedChange={handleComparisonToggle}
              onClick={(e) => e.stopPropagation()}
              className="h-4 w-4"
              disabled={false}
            />
          </div>
        </CardAction>
      </CardHeader>

      <CardContent>
        {/* Capacity info */}
        <div className="mb-3">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold">{formatCapacityDisplay(capacityConfig)}</span>
            <span className="text-sm text-muted-foreground">capacity</span>
          </div>
          <div className="text-xs text-muted-foreground">
            Maximum capacity: {formatCapacityDisplay(maxCapacityConfig)}
          </div>
        </div>

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
            onClick={() => {
              handleClick(new MouseEvent('click') as any);
            }}
            disabled={stagedStatus === 'new'}
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit Properties
          </ContextMenuItem>

          <ContextMenuItem
            onClick={() => {
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
              onClick={() => {
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
                onClick={() => {
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
