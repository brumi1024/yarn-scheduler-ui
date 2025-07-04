import React from 'react';
import { Badge } from '~/components/ui/badge';
import { 
    Sparkles, 
    RefreshCw, 
    Percent, 
    Weight, 
    Box, 
    Play, 
    Square, 
    ArrowDownToLine,
    ArrowRight,
    PlusCircle,
    Edit,
    MinusCircle
} from 'lucide-react';
import { cn } from '~/utils/cn';
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip';
import { QUEUE_STATES } from '~/types';

interface QueueStatusBadgesProps {
    capacityMode: 'percentage' | 'weight' | 'absolute';
    state: string;
    stagedState?: string;
    stagedStatus?: 'new' | 'modified' | 'deleted';
    autoCreationStatus?: {
        status: 'off' | 'legacy' | 'flexible';
        isStaged?: boolean;
    };
}

export const QueueStatusBadges: React.FC<QueueStatusBadgesProps> = ({
    capacityMode,
    state,
    stagedState,
    stagedStatus,
    autoCreationStatus,
}) => {
    const getCapacityModeBadgeClass = () => {
        switch (capacityMode) {
            case 'weight':
                return 'bg-purple-500 hover:bg-purple-600 text-white';
            case 'absolute':
                return 'bg-orange-500 hover:bg-orange-600 text-white';
            default:
                return 'bg-blue-500 hover:bg-blue-600 text-white';
        }
    };

    const getStateVariant = (): "default" | "secondary" | "destructive" | "outline" | "success" | "warning" => {
        if (state === QUEUE_STATES.RUNNING) return 'success';
        if (state === QUEUE_STATES.STOPPED) return 'destructive';
        if (state === QUEUE_STATES.DRAINING) return 'warning';
        return 'secondary';
    };

    const getCapacityModeIcon = () => {
        switch (capacityMode) {
            case 'weight':
                return <Weight className="w-3.5 h-3.5" />;
            case 'absolute':
                return <Box className="w-3.5 h-3.5" />;
            default:
                return <Percent className="w-3.5 h-3.5" />;
        }
    };

    const getStateIcon = (currentState: string) => {
        if (currentState === QUEUE_STATES.RUNNING) return <Play className="w-3.5 h-3.5" />;
        if (currentState === QUEUE_STATES.STOPPED) return <Square className="w-3.5 h-3.5" />;
        if (currentState === QUEUE_STATES.DRAINING) return <ArrowDownToLine className="w-3.5 h-3.5" />;
        return null;
    };

    const getModificationIcon = () => {
        if (stagedStatus === 'new') return <PlusCircle className="w-3.5 h-3.5" />;
        if (stagedStatus === 'modified') return <Edit className="w-3.5 h-3.5" />;
        if (stagedStatus === 'deleted') return <MinusCircle className="w-3.5 h-3.5" />;
        return null;
    };

    return (
        <div className="flex items-center gap-1 mb-3">
            {/* Capacity Mode */}
            <Tooltip>
                <TooltipTrigger asChild>
                    <Badge 
                        variant="secondary" 
                        className={cn("p-1", getCapacityModeBadgeClass())}
                    >
                        {getCapacityModeIcon()}
                    </Badge>
                </TooltipTrigger>
                <TooltipContent>
                    {capacityMode === 'weight' ? 'Weight-based capacity' : 
                     capacityMode === 'absolute' ? 'Absolute capacity' : 'Percentage capacity'}
                </TooltipContent>
            </Tooltip>

            {/* Queue State */}
            <Tooltip>
                <TooltipTrigger asChild>
                    <Badge 
                        variant={getStateVariant()}
                        className="p-1"
                    >
                        {getStateIcon(state)}
                    </Badge>
                </TooltipTrigger>
                <TooltipContent>
                    Queue is {state.toLowerCase()}
                </TooltipContent>
            </Tooltip>

            {/* Staged State (if different) */}
            {stagedState && stagedState !== state && (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Badge 
                            variant="outline" 
                            className="p-1 text-queue-modified border-queue-modified/30 flex items-center gap-0.5"
                        >
                            <ArrowRight className="w-3 h-3" />
                            {getStateIcon(stagedState)}
                        </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                        Will change to {stagedState.toLowerCase()}
                    </TooltipContent>
                </Tooltip>
            )}

            {/* Auto-Creation Status */}
            {autoCreationStatus && autoCreationStatus.status !== 'off' && (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Badge 
                            variant="outline" 
                            className={cn(
                                "p-1 flex items-center gap-0.5",
                                autoCreationStatus.status === 'flexible' 
                                    ? 'text-queue-running border-queue-running/30' 
                                    : 'text-queue-modified border-queue-modified/30'
                            )}
                        >
                            {autoCreationStatus.status === 'flexible' ? (
                                <Sparkles className="w-3.5 h-3.5" />
                            ) : (
                                <RefreshCw className="w-3.5 h-3.5" />
                            )}
                            {autoCreationStatus.isStaged && <ArrowRight className="w-3 h-3" />}
                        </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                        {autoCreationStatus.status === 'flexible' ? 'Flexible auto-queue creation' : 'Legacy auto-queue creation'}
                        {autoCreationStatus.isStaged && ' (staged)'}
                    </TooltipContent>
                </Tooltip>
            )}

            {/* Modification Status */}
            {stagedStatus && (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Badge 
                            variant="outline"
                            className={cn(
                                "p-1",
                                stagedStatus === 'new' ? 'text-queue-new border-queue-new/30' :
                                stagedStatus === 'modified' ? 'text-queue-modified border-queue-modified/30' :
                                'text-queue-deleted border-queue-deleted/30'
                            )}
                        >
                            {getModificationIcon()}
                        </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                        Queue {stagedStatus === 'new' ? 'will be created' : 
                               stagedStatus === 'modified' ? 'has modifications' : 
                               'will be deleted'}
                    </TooltipContent>
                </Tooltip>
            )}
        </div>
    );
};