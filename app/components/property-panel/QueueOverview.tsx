import React from 'react';
import { ChevronDown, Sparkles, RefreshCw } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '../ui/accordion';
import type { QueueInfo } from '../../lib/types';

interface QueueOverviewProps {
    queue: QueueInfo;
}

export const QueueOverview: React.FC<QueueOverviewProps> = ({ queue }) => {
    const isParentQueue = !!queue.queues?.queue && queue.queues.queue.length > 0;
    const capacityPercent = queue.capacity || 0;
    const usagePercent = queue.usedCapacity || 0;

    const getStateVariant = (state: string): "default" | "success" | "destructive" => {
        switch (state) {
            case 'RUNNING':
                return 'success';
            case 'STOPPED':
                return 'destructive';
            default:
                return 'default';
        }
    };

    const getUsageColor = (percent: number): string => {
        if (percent >= 90) return 'bg-destructive';
        if (percent >= 70) return 'bg-warning';
        return 'bg-primary';
    };

    const resourceStats = [
        { 
            label: 'Applications', 
            value: queue.numApplications || 0,
            icon: <Sparkles className="h-3 w-3" />,
            color: 'text-blue-500'
        },
        { 
            label: 'Memory', 
            value: queue.resourcesUsed?.memory ? `${queue.resourcesUsed.memory} MB` : '0 MB',
            icon: <RefreshCw className="h-3 w-3" />,
            color: 'text-green-500'
        },
        { 
            label: 'vCores', 
            value: queue.resourcesUsed?.vCores || 0,
            icon: <RefreshCw className="h-3 w-3" />,
            color: 'text-purple-500'
        }
    ];

    return (
        <div className="p-4 space-y-4">
            {/* Status Card */}
            <Card className="bg-muted/50">
                <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Status</span>
                        <Badge variant={getStateVariant(queue.state)}>
                            {queue.state}
                        </Badge>
                    </div>
                    
                    {/* Capacity Visualization */}
                    <div>
                        <div className="flex justify-between text-sm mb-1">
                            <span>Capacity</span>
                            <span className="font-medium">{capacityPercent}%</span>
                        </div>
                        
                        <div className="relative mb-2">
                            {/* Background bar */}
                            <Progress value={100} />
                            {/* Capacity bar */}
                            <Progress 
                                value={Math.min(capacityPercent, 100)} 
                                className="absolute top-0 left-0 right-0"
                            />
                            {/* Usage bar */}
                            <Progress 
                                value={Math.min((queue.usedCapacity / Math.max(queue.maxCapacity, 1)) * 100, 100)} 
                                className="absolute top-0 left-0 right-0"
                            />
                        </div>
                        
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{queue.usedCapacity.toFixed(1)}% used</span>
                            <span>Max: {queue.maxCapacity}%</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Resource Stats */}
            <div className="grid grid-cols-3 gap-2">
                {resourceStats.map((stat) => (
                    <Card key={stat.label} className="bg-muted/30">
                        <CardContent className="p-3">
                            <div className="flex items-center gap-1 mb-1">
                                <span className={cn("opacity-70", stat.color)}>
                                    {stat.icon}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    {stat.label}
                                </span>
                            </div>
                            <div className="text-sm font-medium">
                                {stat.value}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Queue Type & Auto-Creation Status */}
            <Card className="bg-muted/30">
                <CardContent className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Type</span>
                        <Badge variant="outline">
                            {isParentQueue ? 'Parent Queue' : 'Leaf Queue'}
                        </Badge>
                    </div>
                    
                    {queue.autoCreationEligibility && (
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Auto-Creation</span>
                            <Badge variant="outline">
                                {queue.autoCreationEligibility}
                            </Badge>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Additional Info Accordion */}
            <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="additional-info" className="border-none">
                    <AccordionTrigger className="py-2 hover:no-underline">
                        <div className="flex items-center gap-2">
                            <ChevronDown className="h-4 w-4" />
                            <span className="text-sm font-medium">Additional Information</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-2">
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Queue Path</span>
                                <span className="font-mono text-xs">{queue.queuePath}</span>
                            </div>
                            {isParentQueue && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Child Queues</span>
                                    <span>{queue.queues?.queue?.length || 0}</span>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Absolute Capacity</span>
                                <span>{queue.absoluteCapacity?.toFixed(2)}%</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Absolute Max Capacity</span>
                                <span>{queue.absoluteMaxCapacity?.toFixed(2)}%</span>
                            </div>
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </div>
    );
};