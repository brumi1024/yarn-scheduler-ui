import React, { useCallback } from 'react';
import { Box, Alert, CircularProgress } from '@mui/material';
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    ReactFlowProvider,
    useReactFlow,
    type OnNodesChange,
    type OnEdgesChange,
    type OnNodeClick,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useQueueDataProcessor, type QueueNodeData } from '../hooks/useQueueDataProcessor';
import { QueueInfoPanel } from './QueueInfoPanel';
import { AddQueueModal } from './AddQueueModal';
import { useUIStore } from '../../../store';
import { useQueueConfiguration } from '../hooks/useQueueConfiguration';
import QueueCardNode from './QueueCardNode';
import CustomFlowEdge from './CustomFlowEdge';
import type { ParsedQueue } from '../../../types/Queue';

export interface QueueVisualizationContainerProps {
    className?: string;
}

// Node and edge types for React Flow
const nodeTypes = { queueCard: QueueCardNode };
const edgeTypes = { customFlow: CustomFlowEdge };

// Inner Flow component that has access to React Flow instance
const FlowInner: React.FC = () => {
    // Use the new hook that integrates with our new state management
    const { nodes, edges, isLoading, error } = useQueueDataProcessor();
    const uiStore = useUIStore();
    const { fitView } = useReactFlow();

    // Apply selection state to nodes based on UI store
    const finalNodes = React.useMemo(
        () =>
            nodes.map((node) => ({
                ...node,
                selected: node.id === uiStore?.selectedQueuePath,
            })),
        [nodes, uiStore?.selectedQueuePath]
    );

    // Auto-fit view when data loads
    React.useEffect(() => {
        if (finalNodes.length > 0 && !isLoading) {
            setTimeout(() => {
                fitView({ padding: 0.1, includeHiddenNodes: false });
            }, 100);
        }
    }, [finalNodes.length, isLoading, fitView]);

    // Handle node changes (for React Flow's internal state management)
    const onNodesChange: OnNodesChange = useCallback(() => {
        // We don't need to do anything here since the hook manages the data
        // React Flow needs this for its internal operations (drag, select, etc.)
    }, []);

    // Handle edge changes (for React Flow's internal state management)
    const onEdgesChange: OnEdgesChange = useCallback(() => {
        // We don't need to do anything here since the hook manages the data
    }, []);

    // Handle node clicks
    const onNodeClick: OnNodeClick = useCallback(
        (_, node) => {
            uiStore?.selectQueue(node.id);
        },
        [uiStore]
    );

    // Handle loading state
    if (isLoading) {
        return (
            <Box
                sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'background.default',
                    zIndex: 1000,
                }}
            >
                <CircularProgress />
            </Box>
        );
    }

    // Handle error state
    if (error) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error">Failed to load scheduler data: {error}</Alert>
            </Box>
        );
    }

    return (
        <ReactFlow
            nodes={finalNodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={true}
            selectNodesOnDrag={false}
            minZoom={0.1}
            maxZoom={2}
            defaultViewport={{ x: 0, y: 0, zoom: 1 }}
            fitView
            fitViewOptions={{ padding: 0.1, includeHiddenNodes: false }}
        >
            <Background />
            <Controls />
            <MiniMap
                nodeColor={(node) => {
                    if (node.selected) return '#1976d2';
                    // Highlight nodes with staged changes
                    if (node.data?.stagedStatus === 'modified') return '#ff9800';
                    return '#e0e0e0';
                }}
                nodeStrokeWidth={2}
                zoomable
                pannable
            />
        </ReactFlow>
    );
};

// Helper function to find queue in hierarchy
function findQueueByPath(queues: ParsedQueue[], path: string): ParsedQueue | null {
    for (const queue of queues) {
        if (queue.path === path) {
            return queue;
        }
        if (queue.children) {
            const found = findQueueByPath(queue.children, path);
            if (found) return found;
        }
    }
    return null;
}

export const QueueVisualizationContainer: React.FC<QueueVisualizationContainerProps> = ({ className }) => {
    const uiStore = useUIStore();

    // Use the new hook
    const { queues } = useQueueConfiguration();
    const selectedQueueData = React.useMemo(
        () => (uiStore?.selectedQueuePath ? findQueueByPath(queues, uiStore.selectedQueuePath) : null),
        [queues, uiStore?.selectedQueuePath]
    );

    // Queue actions
    const handleDeleteQueue = useCallback((queuePath: string) => {
        // TODO: Implement queue deletion with new state
        console.log('Delete queue:', queuePath);
    }, []);

    const handleToggleQueueState = useCallback((queuePath: string, newState: 'RUNNING' | 'STOPPED') => {
        // TODO: Implement state toggle with new state
        console.log('Toggle queue state:', queuePath, newState);
    }, []);

    const handleQueueSelect = useCallback(
        (queue: ParsedQueue) => {
            uiStore?.selectQueue(queue.path);
        },
        [uiStore]
    );

    return (
        <Box
            sx={{ position: 'relative', width: '100%', height: '100%', bgcolor: 'background.default' }}
            className={className}
        >
            <ReactFlowProvider>
                <FlowInner />
            </ReactFlowProvider>

            {/* Queue Info Panel */}
            <QueueInfoPanel
                queue={selectedQueueData}
                open={!!selectedQueueData}
                onClose={() => uiStore?.selectQueue(null)}
                onDelete={handleDeleteQueue}
                onToggleState={handleToggleQueueState}
                onQueueSelect={handleQueueSelect}
            />

            {/* Add Queue Modal */}
            <AddQueueModal />
        </Box>
    );
};
