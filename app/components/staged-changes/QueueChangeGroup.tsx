import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Folder, GitBranch } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '../ui/collapsible';
import type { StagedChange } from '../../lib/types';
import { DiffView } from './DiffView';

interface QueueChangeGroupProps {
    queuePath: string;
    changes: StagedChange[];
    onRevert: (change: StagedChange) => void;
}

export const QueueChangeGroup: React.FC<QueueChangeGroupProps> = ({
    queuePath,
    changes,
    onRevert,
}) => {
    const [isOpen, setIsOpen] = useState(true);
    
    // Calculate change summary
    const summary = changes.reduce(
        (acc, change) => {
            acc[change.type]++;
            return acc;
        },
        { add: 0, update: 0, remove: 0 }
    );
    
    return (
        <div className="border rounded-lg overflow-hidden bg-card">
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                <CollapsibleTrigger asChild>
                    <Button
                        variant="ghost"
                        className="w-full p-4 justify-between hover:bg-muted/50"
                    >
                        <div className="flex items-center gap-3">
                            {queuePath === 'global' ? (
                                <Folder className="h-4 w-4" />
                            ) : (
                                <GitBranch className="h-4 w-4" />
                            )}
                            <span className="font-medium">
                                {queuePath === 'global' ? 'Global Settings' : queuePath}
                            </span>
                            
                            {/* Change summary badges */}
                            <div className="flex gap-1">
                                {summary.add > 0 && (
                                    <Badge variant="outline" className="h-5 text-xs border-green-500 text-green-700">
                                        +{summary.add}
                                    </Badge>
                                )}
                                {summary.update > 0 && (
                                    <Badge variant="outline" className="h-5 text-xs border-blue-500 text-blue-700">
                                        ~{summary.update}
                                    </Badge>
                                )}
                                {summary.remove > 0 && (
                                    <Badge variant="outline" className="h-5 text-xs border-red-500 text-red-700">
                                        -{summary.remove}
                                    </Badge>
                                )}
                            </div>
                            
                            <span className="text-sm text-muted-foreground">
                                {changes.length} change{changes.length !== 1 ? 's' : ''}
                            </span>
                        </div>
                        
                        {isOpen ? (
                            <ChevronUp className="h-4 w-4" />
                        ) : (
                            <ChevronDown className="h-4 w-4" />
                        )}
                    </Button>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                    <div className="px-4 pb-4 space-y-2">
                        {changes.map((change) => (
                            <DiffView
                                key={change.id}
                                change={change}
                                onRevert={() => onRevert(change)}
                                timestamp={new Date(change.timestamp).toLocaleTimeString()}
                            />
                        ))}
                    </div>
                </CollapsibleContent>
            </Collapsible>
        </div>
    );
};