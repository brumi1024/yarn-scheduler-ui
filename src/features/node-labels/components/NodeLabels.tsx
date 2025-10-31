import React from 'react';
import { AlertCircle } from 'lucide-react';
import { useSchedulerStore } from '~/stores/schedulerStore';
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Skeleton } from '~/components/ui/skeleton';
import { NodeLabelsPanel } from './NodeLabelsPanel';
import { NodesPanel } from './NodesPanel';

export const NodeLabels: React.FC = () => {
  const { isLoading, error, errorContext, applyError, nodeLabels, selectedNodeLabel } =
    useSchedulerStore();

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
      {/* Error Display */}
      {applyError && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Failed to Apply Changes</AlertTitle>
          <AlertDescription>{applyError}</AlertDescription>
        </Alert>
      )}

      {error && errorContext === 'nodeLabels' && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Node Label Operation Failed</AlertTitle>
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
