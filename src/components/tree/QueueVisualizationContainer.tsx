import React, { useCallback, useMemo } from 'react';
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
import { Box, Alert, CircularProgress } from '@mui/material';
import { useSchedulerStore } from '../../store/schedulerStore';
import { useQueueTreeData } from './hooks/useQueueTreeData';
import { QueueCardNode } from './QueueCardNode';
import CustomFlowEdge from './CustomFlowEdge';
import { PropertyPanel } from '../property-panel/PropertyPanel';

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
    const selectQueue = useSchedulerStore(state => state.selectQueue);

    const { nodes, edges, isLoading, error } = useQueueTreeData();

    const onNodesChange: OnNodesChange = useCallback(() => {

    }, []);

    const onEdgesChange: OnEdgesChange = useCallback(() => {

    }, []);

    const onNodeClick: OnNodeClick = useCallback(
        (_, node) => {
            selectQueue?.(node.id);
        },
        [selectQueue]
    );

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

    if (error) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error">Failed to load scheduler data: {error}</Alert>
            </Box>
        );
    }

    return (
        <ReactFlow
            nodes={nodes}
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
                nodeColor={() => '#e0e0e0'}
                nodeStrokeWidth={2}
                zoomable
                pannable
            />
        </ReactFlow>
    );
};

export const QueueVisualizationContainer: React.FC<QueueVisualizationContainerProps> = ({ className }) => {
    return (
        <Box
            data-testid="queue-tree-container"
            sx={{ 
                position: 'relative', 
                width: '100%', 
                height: 'calc(100vh - 140px)', // Account for header and any padding
                bgcolor: 'background.default' 
            }}
            className={className}
        >
            <ReactFlowProvider>
                <FlowInner />
                <PropertyPanel />
            </ReactFlowProvider>
        </Box>
    );
};