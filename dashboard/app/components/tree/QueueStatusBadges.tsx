import React from 'react';
import { Badge } from '~/components/ui/badge';
import { Sparkles, RefreshCw } from 'lucide-react';
import { cn } from '~/lib/utils';

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
        if (state === 'RUNNING') return 'success';
        if (state === 'STOPPED') return 'destructive';
        if (state === 'DRAINING') return 'warning';
        return 'secondary';
    };

    return (
        <div className="flex items-center gap-1.5 mb-3 flex-wrap">
            {/* Capacity Mode */}
            <Badge 
                variant="secondary" 
                className={cn("text-xs px-2 py-0", getCapacityModeBadgeClass())}
            >
                {capacityMode === 'weight' ? 'WEIGHT' : capacityMode === 'absolute' ? 'ABSOLUTE' : 'PERCENT'}
            </Badge>

            {/* Queue State */}
            <Badge 
                variant={getStateVariant()}
                className="text-xs px-2 py-0"
            >
                {state}
            </Badge>

            {/* Staged State (if different) */}
            {stagedState && stagedState !== state && (
                <Badge 
                    variant="outline" 
                    className="text-xs px-2 py-0 text-queue-modified border-queue-modified/30"
                >
                    →{stagedState}
                </Badge>
            )}

            {/* Auto-Creation Status */}
            {autoCreationStatus && autoCreationStatus.status !== 'off' && (
                <Badge 
                    variant="outline" 
                    className={cn(
                        "text-xs px-2 py-0 flex items-center gap-1",
                        autoCreationStatus.status === 'flexible' 
                            ? 'text-queue-running border-queue-running/30' 
                            : 'text-queue-modified border-queue-modified/30'
                    )}
                >
                    {autoCreationStatus.status === 'flexible' ? (
                        <Sparkles className="w-3 h-3" />
                    ) : (
                        <RefreshCw className="w-3 h-3" />
                    )}
                    {autoCreationStatus.status === 'flexible' ? 'Flexible' : 'Legacy'}
                    {autoCreationStatus.isStaged && ' →'}
                </Badge>
            )}

            {/* Modification Status */}
            {stagedStatus && (
                <Badge 
                    variant="outline"
                    className={cn(
                        "text-xs px-2 py-0",
                        stagedStatus === 'new' ? 'text-queue-new border-queue-new/30' :
                        stagedStatus === 'modified' ? 'text-queue-modified border-queue-modified/30' :
                        'text-queue-deleted border-queue-deleted/30'
                    )}
                >
                    {stagedStatus.toUpperCase()}
                </Badge>
            )}
        </div>
    );
};