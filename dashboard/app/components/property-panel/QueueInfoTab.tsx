import React from 'react';
import { 
    HardDrive, 
    Cpu, 
    AppWindow, 
    Shield, 
    Calendar, 
    Info 
} from 'lucide-react';
import { cn } from '~/lib/utils';
import { Badge } from '~/components/ui/badge';
import { Progress } from '~/components/ui/progress';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '~/components/ui/accordion';
import type { QueueInfo } from '~/lib/types';
import { formatMemory } from '~/lib/utils/formatUtils';

interface QueueInfoTabProps {
    queue: QueueInfo;
}

export const QueueInfoTab: React.FC<QueueInfoTabProps> = ({ queue }) => {
    const getUsageColor = (percentage: number): string => {
        if (percentage >= 90) return 'bg-destructive';
        if (percentage >= 75) return 'bg-orange-500';
        if (percentage >= 50) return 'bg-yellow-500';
        if (percentage > 0) return 'bg-green-500';
        return 'bg-green-600';
    };

    const formatPercentage = (value: number | undefined) => {
        return value ? `${value.toFixed(2)}%` : 'N/A';
    };

    return (
        <div className="p-4 space-y-2">
            <Accordion type="single" collapsible defaultValue="resources">
                {/* Resource Usage Section */}
                <AccordionItem value="resources" className="border rounded-lg">
                    <AccordionTrigger className="px-4 py-3 hover:no-underline">
                        <div className="flex items-center gap-2">
                            <HardDrive className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium">Resource Utilization</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-3">
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-muted-foreground">Memory</span>
                                <span className="text-xs font-medium">
                                    {queue.resourcesUsed ? formatMemory(queue.resourcesUsed.memory) : '0 MB'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-muted-foreground">vCores</span>
                                <span className="text-xs font-medium">{queue.resourcesUsed?.vCores || 0}</span>
                            </div>
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-xs text-muted-foreground">Capacity Usage</span>
                                    <span className="text-xs font-medium">{queue.usedCapacity.toFixed(1)}%</span>
                                </div>
                                <Progress 
                                    value={Math.min(queue.usedCapacity, 100)}
                                    className={cn("h-1", `[&>div]:${getUsageColor(queue.usedCapacity)}`)}
                                />
                            </div>
                        </div>
                    </AccordionContent>
                </AccordionItem>

                {/* Application Statistics */}
                <AccordionItem value="applications" className="border rounded-lg mt-2">
                    <AccordionTrigger className="px-4 py-3 hover:no-underline">
                        <div className="flex items-center gap-2">
                            <AppWindow className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium">Application Statistics</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-3">
                        <div className="grid grid-cols-3 gap-4">
                            <div className="text-center">
                                <p className="text-sm font-bold text-primary">{queue.numApplications}</p>
                                <p className="text-xs text-muted-foreground">Total Apps</p>
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-bold text-green-600">{queue.numActiveApplications || 0}</p>
                                <p className="text-xs text-muted-foreground">Active</p>
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-bold text-yellow-600">{queue.numPendingApplications || 0}</p>
                                <p className="text-xs text-muted-foreground">Pending</p>
                            </div>
                        </div>
                    </AccordionContent>
                </AccordionItem>

                {/* Capacity Details */}
                <AccordionItem value="capacity" className="border rounded-lg mt-2">
                    <AccordionTrigger className="px-4 py-3 hover:no-underline">
                        <div className="flex items-center gap-2">
                            <Cpu className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium">Capacity Configuration</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-3">
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-muted-foreground">Capacity</span>
                                <span className="text-xs font-medium">{formatPercentage(queue.capacity)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-muted-foreground">Max Capacity</span>
                                <span className="text-xs font-medium">{formatPercentage(queue.maxCapacity)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-muted-foreground">Used Capacity</span>
                                <span className={cn(
                                    "text-xs font-medium",
                                    queue.usedCapacity > 80 && "text-destructive"
                                )}>
                                    {formatPercentage(queue.usedCapacity)}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-muted-foreground">Absolute Capacity</span>
                                <span className="text-xs font-medium">{formatPercentage(queue.absoluteCapacity)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-muted-foreground">Absolute Max Capacity</span>
                                <span className="text-xs font-medium">{formatPercentage(queue.absoluteMaxCapacity)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-muted-foreground">Absolute Used Capacity</span>
                                <span className={cn(
                                    "text-xs font-medium",
                                    queue.absoluteUsedCapacity && queue.absoluteUsedCapacity > 80 && "text-destructive"
                                )}>
                                    {formatPercentage(queue.absoluteUsedCapacity)}
                                </span>
                            </div>
                        </div>
                    </AccordionContent>
                </AccordionItem>

                {/* Queue Configuration */}
                <AccordionItem value="configuration" className="border rounded-lg mt-2">
                    <AccordionTrigger className="px-4 py-3 hover:no-underline">
                        <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium">Queue Configuration</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-3">
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-muted-foreground">Queue Type</span>
                                <Badge variant="outline" className="text-xs">
                                    {queue.type || 'Capacity Scheduler'}
                                </Badge>
                            </div>
                            
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-muted-foreground">Queue State</span>
                                <Badge 
                                    variant={queue.state === 'RUNNING' ? 'success' : 'destructive'}
                                    className="text-xs"
                                >
                                    {queue.state}
                                </Badge>
                            </div>

                            {queue.autoCreationEligibility && (
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-muted-foreground">Auto Creation</span>
                                    <Badge variant="outline" className="text-xs">
                                        {queue.autoCreationEligibility}
                                    </Badge>
                                </div>
                            )}

                            <div className="flex justify-between">
                                <span className="text-xs text-muted-foreground">Queue Path</span>
                                <span className="text-xs font-medium break-all text-right max-w-[60%]">
                                    {queue.queuePath}
                                </span>
                            </div>
                        </div>
                    </AccordionContent>
                </AccordionItem>

                {/* Additional Information */}
                <AccordionItem value="additional" className="border rounded-lg mt-2">
                    <AccordionTrigger className="px-4 py-3 hover:no-underline">
                        <div className="flex items-center gap-2">
                            <Info className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium">Additional Information</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-3">
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-xs text-muted-foreground">Queue Name</span>
                                <span className="text-xs font-medium">{queue.queueName}</span>
                            </div>

                            {queue.queues?.queue && queue.queues.queue.length > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-xs text-muted-foreground">Child Queues</span>
                                    <span className="text-xs font-medium">{queue.queues.queue.length}</span>
                                </div>
                            )}

                            <div className="flex justify-between">
                                <span className="text-xs text-muted-foreground">Is Leaf Queue</span>
                                <span className="text-xs font-medium">
                                    {!queue.queues?.queue || queue.queues.queue.length === 0 ? 'Yes' : 'No'}
                                </span>
                            </div>
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </div>
    );
};