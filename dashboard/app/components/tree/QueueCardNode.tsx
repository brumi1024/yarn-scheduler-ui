import React, { useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useNavigate } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle, CardAction } from '~/components/ui/card';
import { Checkbox } from '~/components/ui/checkbox';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from '~/components/ui/context-menu';
import {
    Plus,
    Trash2,
    Edit,
    Play,
    Pause,
} from 'lucide-react';
import type { QueueCardData } from './hooks/useQueueTreeData';
import { useQueueActions } from './hooks/useQueueActions';
import { useSchedulerStore } from '~/store/schedulerStore';
import { cn } from '~/lib/utils';
import { AddQueueDialog } from './dialogs/AddQueueDialog';
import { DeleteQueueDialog } from './dialogs/DeleteQueueDialog';
import { QueueCapacityProgress } from './QueueCapacityProgress';
import { QueueStatusBadges } from './QueueStatusBadges';
import { QueueResourceStats } from './QueueResourceStats';

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
    const navigate = useNavigate();
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    const comparisonQueues = useSchedulerStore(state => state.comparisonQueues);
    const selectedQueuePath = useSchedulerStore(state => state.selectedQueuePath);
    const toggleComparisonQueue = useSchedulerStore(state => state.toggleComparisonQueue);

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
    const isRunning = state === 'RUNNING';

    const handleClick = (event: React.MouseEvent) => {
        event.stopPropagation();
        
        // Navigate to the queue route with property panel open
        const encodedQueuePath = encodeURIComponent(queuePath);
        navigate(`/queue/${encodedQueuePath}?panel=true`);
    };

    const handleComparisonToggle = () => {
        toggleComparisonQueue(queuePath);
    };

    const handleToggleState = () => {
        const newState = isRunning ? 'STOPPED' : 'RUNNING';
        updateQueueProperty(queuePath, 'state', newState);
    };

    return (
        <>
            <ContextMenu>
                <ContextMenuTrigger asChild>
                    <Card
                        className={cn(
                            "relative w-[360px] h-[260px] cursor-pointer transition-all duration-200 hover:shadow-md",
                            // Border styling based on status
                            stagedStatus === 'new' && "ring-2 ring-queue-new",
                            stagedStatus === 'deleted' && "ring-2 ring-queue-deleted",
                            stagedStatus === 'modified' && "ring-2 ring-queue-modified",
                            !stagedStatus && isSelectedQueue && "ring-2 ring-primary",
                            // Background styling
                            isSelectedQueue && "bg-primary/5",
                            isSelectedForComparison && !isSelectedQueue && "bg-muted/50"
                        )}
                        onClick={handleClick}
                    >
                        <CardHeader>
                            <CardTitle className="text-base truncate">
                                {queueName}
                            </CardTitle>
                            
                            <CardAction>
                                <div className={cn(
                                    "rounded-md p-0.5 transition-colors",
                                    isSelectedForComparison && "bg-blue-100 dark:bg-blue-900"
                                )}>
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

                        <CardContent className="!pt-1">
                            <QueueStatusBadges
                                capacityMode={capacityMode}
                                state={state}
                                stagedState={stagedState}
                                stagedStatus={stagedStatus}
                                autoCreationStatus={autoCreationStatus}
                            />

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

                            <QueueResourceStats
                                numApplications={numApplications}
                                resourcesUsed={resourcesUsed}
                            />
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
                </ContextMenuTrigger>

                <ContextMenuContent className="w-48">
                    <ContextMenuItem onClick={() => {
                        handleClick(new MouseEvent('click') as any);
                    }}>
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
                        <ContextMenuItem onClick={() => {
                            setAddDialogOpen(true);
                        }}>
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