import React from 'react';
import { RefreshCw, Tag } from 'lucide-react';
import { useSchedulerStore } from '~/stores/schedulerStore';
import { Button } from '~/components/ui/button';
import { Alert, AlertDescription } from '~/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Skeleton } from '~/components/ui/skeleton';
import { NodeLabelsPanel } from './NodeLabelsPanel';
import { NodesPanel } from './NodesPanel';

export const NodeLabels: React.FC = () => {
    const {
        isLoading,
        error,
        nodeLabels,
        selectedNodeLabel,
        refreshSchedulerData
    } = useSchedulerStore();
    
    const handleRefresh = async () => {
        try {
            await refreshSchedulerData();
        } catch (err) {
            console.error('Failed to refresh node labels data:', err);
        }
    };

    if (isLoading && nodeLabels.length === 0) {
        return (
            <div className="flex h-96 items-center justify-center">
                <div className="flex items-center space-x-2">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <span className="text-muted-foreground">Loading node labels...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col">
            {/* Header */}
            <div className="mb-6">
                <div className="mb-1 flex items-center justify-between">
                    <div className="flex items-center">
                        <Tag className="mr-2 h-5 w-5 text-primary" />
                        <h1 className="text-2xl font-semibold">Node Labels Management</h1>
                    </div>
                    
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefresh}
                        disabled={isLoading}
                        className="gap-2"
                    >
                        <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>

                <p className="text-sm text-muted-foreground">
                    Manage node labels for the YARN cluster. Each node can be assigned to node labels 
                    which help with resource allocation and application placement.
                </p>
            </div>

            {/* Error Display */}
            {error && (
                <Alert variant="destructive" className="mb-4">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* Main Content */}
            <div className="min-h-0 flex-grow">
                <div className="grid h-full gap-6 md:grid-cols-[400px_1fr]">
                    {/* Labels Panel */}
                    <Card className="h-full overflow-hidden">
                        <CardHeader>
                            <CardTitle>Available Labels</CardTitle>
                            <p className="text-sm text-muted-foreground">
                                Select labels to configure queue capacity for each label
                            </p>
                        </CardHeader>
                        <CardContent className="h-[calc(100%-5rem)] overflow-auto">
                            <NodeLabelsPanel />
                        </CardContent>
                    </Card>

                    {/* Nodes Panel */}
                    <Card className="h-full overflow-hidden">
                        <CardHeader>
                            <div className="flex items-center">
                                <CardTitle>Node Label Configuration</CardTitle>
                                {selectedNodeLabel && (
                                    <span className="ml-2 inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                                        {selectedNodeLabel}
                                    </span>
                                )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Assign nodes to labels for resource allocation
                            </p>
                        </CardHeader>
                        <CardContent className="h-[calc(100%-5rem)] overflow-auto">
                            <NodesPanel selectedLabel={selectedNodeLabel} />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};