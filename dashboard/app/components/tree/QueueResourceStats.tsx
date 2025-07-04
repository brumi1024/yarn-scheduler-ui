import React from 'react';
import { formatMemory } from '~/lib/utils/formatUtils';
import { cn } from '~/lib/utils';

interface QueueResourceStatsProps {
    numApplications: number;
    resourcesUsed?: {
        memory?: number;
        vCores?: number;
    };
    className?: string;
}

export const QueueResourceStats: React.FC<QueueResourceStatsProps> = ({
    numApplications,
    resourcesUsed,
    className
}) => {
    return (
        <div className={cn("text-xs text-muted-foreground text-center", className)}>
            <span>Apps: {numApplications}</span>
            <span className="mx-2">•</span>
            <span>
                Memory: {resourcesUsed?.memory ? formatMemory(resourcesUsed.memory) : '0 MB'}
            </span>
            <span className="mx-2">•</span>
            <span>
                vCores: {resourcesUsed?.vCores || 0}
            </span>
        </div>
    );
};