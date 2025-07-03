import React, { useState } from 'react';
import { Trash2, Check, Gauge, ChevronUp, ChevronDown, GripHorizontal } from 'lucide-react';
import { cn } from '~/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '~/components/ui/sheet';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { useSchedulerStore } from '~/store/schedulerStore';
import type { StagedChange } from '~/types';
import { QueueChangeGroup } from './QueueChangeGroup';
import { toast } from 'sonner';

interface StagedChangesPanelProps {
    open: boolean;
    onClose: () => void;
    onOpen?: () => void;
}

type DrawerState = 'collapsed' | 'expanded';

export function StagedChangesPanel({ open, onClose, onOpen }: StagedChangesPanelProps) {
    const [isApplying, setIsApplying] = useState(false);
    const [drawerState, setDrawerState] = useState<DrawerState>('collapsed');
    
    const {
        stagedChanges,
        revertChange,
        clearAllChanges,
        applyChanges
    } = useSchedulerStore();

    // Group changes by queue path for organized display
    const changesByQueue = React.useMemo(() => {
        return stagedChanges.reduce((acc, change) => {
            const queuePath = change.queuePath;
            if (!acc[queuePath]) {
                acc[queuePath] = [];
            }
            acc[queuePath].push(change);
            return acc;
        }, {} as Record<string, StagedChange[]>);
    }, [stagedChanges]);

    const handleApplyChanges = async () => {
        setIsApplying(true);
        try {
            await applyChanges();
            toast.success('All changes applied successfully');
            onClose();
        } catch (error) {
            toast.error('Failed to apply changes');
            console.error('Failed to apply changes:', error);
        } finally {
            setIsApplying(false);
        }
    };

    const handleClearAll = () => {
        clearAllChanges();
        toast.info('All staged changes cleared');
    };

    const handleRevertChange = (change: StagedChange) => {
        revertChange(change.id);
        toast.info(`Reverted change: ${change.property}`);
    };

    const toggleDrawerState = () => {
        setDrawerState(prev => prev === 'collapsed' ? 'expanded' : 'collapsed');
    };

    // Show floating button when panel is closed and there are staged changes
    if (!open && stagedChanges.length > 0) {
        return (
            <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
                <Button
                    variant="default"
                    size="lg"
                    className="relative shadow-lg rounded-full px-6"
                    onClick={onOpen}
                >
                    <Gauge className="h-5 w-5 mr-2" />
                    View Staged Changes
                    <Badge 
                        variant="destructive" 
                        className="absolute -top-2 -right-2"
                    >
                        {stagedChanges.length}
                    </Badge>
                </Button>
            </div>
        );
    }

    return (
        <Sheet open={open} onOpenChange={onClose}>
            <SheetContent 
                side="bottom" 
                className={cn(
                    "transition-all duration-300 ease-in-out",
                    drawerState === 'collapsed' ? 'h-[200px]' : 'h-[60vh]'
                )}
                onOpenAutoFocus={(e) => e.preventDefault()}
            >
                {/* Drag Handle */}
                <div 
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-muted-foreground/20 rounded-full mt-2 cursor-ns-resize"
                    onClick={toggleDrawerState}
                />

                <div className="flex flex-col h-full">
                    {/* Header */}
                    <SheetHeader className="border-b">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={toggleDrawerState}
                                    className="h-8 w-8"
                                >
                                    {drawerState === 'collapsed' ? 
                                        <ChevronUp className="h-4 w-4" /> : 
                                        <ChevronDown className="h-4 w-4" />
                                    }
                                </Button>
                                <SheetTitle>
                                    Staged Changes
                                </SheetTitle>
                                <Badge variant="secondary">
                                    {stagedChanges.length} {stagedChanges.length === 1 ? 'change' : 'changes'}
                                </Badge>
                            </div>
                        </div>
                    </SheetHeader>

                    {/* Content */}
                    <div className="flex-1 overflow-auto p-4">
                        {stagedChanges.length === 0 ? (
                            <div className="text-center text-muted-foreground py-8">
                                No staged changes
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {Object.entries(changesByQueue).map(([queuePath, changes]) => (
                                    <QueueChangeGroup
                                        key={queuePath}
                                        queuePath={queuePath}
                                        changes={changes}
                                        onRevert={handleRevertChange}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    {stagedChanges.length > 0 && (
                        <SheetFooter className="border-t">
                            <div className="flex justify-between items-center w-full">
                                <Button
                                    variant="outline"
                                    onClick={handleClearAll}
                                    disabled={isApplying}
                                >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Clear All
                                </Button>
                                <Button
                                    variant="default"
                                    onClick={handleApplyChanges}
                                    disabled={isApplying}
                                >
                                    {isApplying ? (
                                        <>
                                            <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-background border-t-transparent" />
                                            Applying...
                                        </>
                                    ) : (
                                        <>
                                            <Check className="h-4 w-4 mr-2" />
                                            Apply All Changes
                                        </>
                                    )}
                                </Button>
                            </div>
                        </SheetFooter>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}