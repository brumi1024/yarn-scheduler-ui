import React from 'react';
import { Plus, Edit2, Minus, Trash2 } from 'lucide-react';
import { cn } from '~/lib/utils';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader } from '~/components/ui/card';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '~/components/ui/tooltip';
import type { StagedChange } from '~/types';

interface DiffViewProps {
    change: StagedChange;
    onRevert: () => void;
    timestamp: string;
}

const getChangeTypeIcon = (type: StagedChange['type']) => {
    switch (type) {
        case 'add':
            return <Plus className="h-3 w-3" />;
        case 'update':
            return <Edit2 className="h-3 w-3" />;
        case 'remove':
            return <Minus className="h-3 w-3" />;
        default:
            return <Edit2 className="h-3 w-3" />;
    }
};

const getChangeTypeVariant = (type: StagedChange['type']): "default" | "secondary" | "destructive" | "outline" | "success" => {
    switch (type) {
        case 'add':
            return 'success';
        case 'update':
            return 'default';
        case 'remove':
            return 'destructive';
        default:
            return 'default';
    }
};

const formatPropertyName = (property: string | undefined): string => {
    if (!property) return 'Queue operation';
    
    // Handle node label properties with better formatting
    if (property.includes('accessible-node-labels.') && property.split('.').length === 3) {
        const parts = property.split('.');
        const label = parts[1];
        const labelProperty = parts[2];
        return `${labelProperty} (label: ${label})`;
    }
    
    return property;
};

const DiffValue: React.FC<{ 
    value: string | undefined; 
    type: 'old' | 'new'; 
    changeType: StagedChange['type'] 
}> = ({ value, type, changeType }) => {
    if (!value && value !== '') return null;
    
    const isOld = type === 'old';
    const isNew = type === 'new';
    
    const prefix = changeType === 'add' ? '+ ' : changeType === 'remove' ? '- ' : isOld ? '- ' : '+ ';
    
    return (
        <div className={cn(
            "px-3 py-1.5 rounded-md border font-mono text-xs flex items-center gap-2",
            "bg-muted/50",
            changeType === 'add' && isNew && "border-green-500 dark:border-green-700",
            changeType === 'remove' && isOld && "border-destructive",
            changeType === 'update' && isOld && "border-destructive",
            changeType === 'update' && isNew && "border-green-500 dark:border-green-700",
            (changeType === 'remove' || (changeType === 'update' && isOld)) && "line-through opacity-70"
        )}>
            <span className={cn(
                "font-semibold",
                isOld ? "text-destructive" : "text-green-600 dark:text-green-400"
            )}>
                {prefix}
            </span>
            <span className="break-all">{value || '(empty)'}</span>
        </div>
    );
};

export const DiffView: React.FC<DiffViewProps> = ({ change, onRevert, timestamp }) => {
    return (
        <Card>
            <CardHeader className="p-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1">
                        <Badge variant={getChangeTypeVariant(change.type)} className="text-xs h-5">
                            {getChangeTypeIcon(change.type)}
                            {change.type.toUpperCase()}
                        </Badge>
                        <span className="font-medium text-sm">
                            {formatPropertyName(change.property)}
                        </span>
                        <span className="text-xs text-muted-foreground ml-auto">
                            {timestamp}
                        </span>
                    </div>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={onRevert}
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Revert this change</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </CardHeader>
            
            <CardContent className="p-3 pt-0 space-y-2">
                {change.type === 'update' && (
                    <>
                        <DiffValue 
                            value={change.oldValue} 
                            type="old" 
                            changeType={change.type} 
                        />
                        <DiffValue 
                            value={change.newValue} 
                            type="new" 
                            changeType={change.type} 
                        />
                    </>
                )}
                
                {change.type === 'add' && change.newValue && (
                    <DiffValue 
                        value={change.newValue} 
                        type="new" 
                        changeType={change.type} 
                    />
                )}
                
                {change.type === 'remove' && change.oldValue && (
                    <DiffValue 
                        value={change.oldValue} 
                        type="old" 
                        changeType={change.type} 
                    />
                )}
                
                {change.type === 'remove' && !change.oldValue && (
                    <p className="text-sm text-destructive italic">
                        Queue will be removed
                    </p>
                )}
            </CardContent>
        </Card>
    );
};