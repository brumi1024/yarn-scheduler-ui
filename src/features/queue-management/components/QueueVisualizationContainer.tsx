import React, { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  type OnNodesChange,
  type OnEdgesChange,
  type NodeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert';
import { AlertCircle, Tag } from 'lucide-react';
import { useSchedulerStore } from '~/stores/schedulerStore';
import { useQueueTreeData, type QueueCardData } from '../hooks/useQueueTreeData';
import { QueueCardNode } from './QueueCardNode';
import CustomFlowEdge from './CustomFlowEdge';
import { useTheme } from '~/components/providers/use-theme';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { CompareButton } from '~/features/queue-comparison/components/CompareButton';
import { NodeLabelSelector } from '~/components/search/NodeLabelSelector';

export interface QueueVisualizationContainerProps {
  className?: string;
}

const nodeTypes = {
  queueCard: QueueCardNode,
};

const edgeTypes = {
  sankeyFlow: CustomFlowEdge,
};

const FlowInner: React.FC = () => {
  const { selectQueue, stagedChanges, searchQuery, selectedNodeLabelFilter } = useSchedulerStore();
  const { theme } = useTheme();

  const { nodes, edges, isLoading, loadError, applyError } = useQueueTreeData();

  // Calculate validation summary
  const validationSummary = useMemo(() => {
    let errorCount = 0;
    let warningCount = 0;
    const affectedQueues = new Set<string>();

    stagedChanges.forEach((change) => {
      if (change.validationErrors) {
        change.validationErrors.forEach((error) => {
          if (error.severity === 'error') {
            errorCount++;
          } else {
            warningCount++;
          }
        });
        affectedQueues.add(change.queuePath);
      }
    });

    return { errorCount, warningCount, affectedQueueCount: affectedQueues.size };
  }, [stagedChanges]);

  const colorMode =
    theme === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : theme;

  const onNodesChange: OnNodesChange = useCallback(() => {
    // We don't allow node position changes
  }, []);

  const onEdgesChange: OnEdgesChange = useCallback(() => {
    // We don't allow edge changes
  }, []);

  const onNodeClick: NodeMouseHandler = useCallback(
    (event, node) => {
      selectQueue?.(node.id);
    },
    [selectQueue],
  );

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading queue hierarchy...</p>
        </div>
      </div>
    );
  }

  if (loadError && nodes.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Queue Data</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!nodes.length) {
    return (
      <div className="flex h-full items-center justify-center">
        <Alert className="max-w-md">
          <AlertTitle>{searchQuery ? 'No Matching Queues' : 'No Queue Data'}</AlertTitle>
          <AlertDescription>
            {searchQuery
              ? `No queues match your search for "${searchQuery}". Try a different search term.`
              : 'No queue hierarchy data is available. Please check your scheduler configuration.'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full flex flex-col">
      {applyError && (
        <div className="absolute top-4 left-1/2 z-10 flex w-full max-w-xl -translate-x-1/2 justify-center px-4">
          <Alert variant="destructive" className="w-full">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Failed to Apply Changes</AlertTitle>
            <AlertDescription>{applyError}</AlertDescription>
          </Alert>
        </div>
      )}
      {/* Header with controls */}
      <div
        className={`absolute right-4 z-10 flex items-center gap-4 ${applyError ? 'top-24' : 'top-4'}`}
      >
        <NodeLabelSelector />
      </div>

      {/* Label filter information */}
      {selectedNodeLabelFilter && (
        <div className={`absolute left-4 z-10 ${applyError ? 'top-24' : 'top-4'}`}>
          <Alert className="py-2 px-4">
            <Tag className="h-4 w-4" />
            <AlertDescription>
              <span>
                Filtering by partition: <strong>{selectedNodeLabelFilter}</strong>. Queues without
                access are shown in gray.
              </span>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Validation summary banner */}
      {validationSummary.errorCount > 0 && (
        <div
          className={`absolute left-1/2 transform -translate-x-1/2 z-10 ${applyError ? 'top-32' : 'top-16'}`}
        >
          <Alert className="flex items-center gap-3 py-2 px-4 shadow-lg border-destructive">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">
                {validationSummary.errorCount} validation error
                {validationSummary.errorCount !== 1 ? 's' : ''} in{' '}
                {validationSummary.affectedQueueCount} queue
                {validationSummary.affectedQueueCount !== 1 ? 's' : ''}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  // Find and open staged changes panel
                  const openButton = document.querySelector('[data-staged-changes-trigger]');
                  if (openButton instanceof HTMLElement) {
                    openButton.click();
                  }
                }}
              >
                View Details
              </Button>
            </div>
          </Alert>
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{
          padding: 0.2,
          includeHiddenNodes: false,
        }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        minZoom={0.1}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        colorMode={colorMode}
      >
        <Background gap={16} />
        <Controls showInteractive={false} />
        <MiniMap
          nodeColor={(node) => {
            const data = node.data as QueueCardData;

            // Use default colors during SSR
            if (typeof window === 'undefined') {
              if (data.stagedStatus === 'new') return '#22c55e';
              if (data.stagedStatus === 'deleted') return '#ef4444';
              if (data.stagedStatus === 'modified') return '#f59e0b';
              return '#94a3b8';
            }

            const rootStyles = getComputedStyle(document.documentElement);

            if (data.stagedStatus === 'new') {
              return rootStyles.getPropertyValue('--color-queue-new').trim();
            }
            if (data.stagedStatus === 'deleted') {
              return rootStyles.getPropertyValue('--color-queue-deleted').trim();
            }
            if (data.stagedStatus === 'modified') {
              return rootStyles.getPropertyValue('--color-queue-modified').trim();
            }
            return rootStyles.getPropertyValue('--color-muted-foreground').trim();
          }}
          pannable
          zoomable
        />
      </ReactFlow>
    </div>
  );
};

export const QueueVisualizationContainer: React.FC<QueueVisualizationContainerProps> = ({
  className,
}) => {
  return (
    <div className={`h-full w-full ${className || ''}`}>
      <ReactFlowProvider>
        <FlowInner />
        <CompareButton />
      </ReactFlowProvider>
    </div>
  );
};
