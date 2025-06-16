import React, { useCallback } from 'react';
import { Box, Alert, CircularProgress } from '@mui/material';
import { 
    ReactFlow,
    Background, 
    Controls, 
    MiniMap, 
    ReactFlowProvider,
    useReactFlow,
    type Node,
    type Edge,
    type OnNodesChange,
    type OnEdgesChange,
    type OnNodeClick,
    applyNodeChanges,
    applyEdgeChanges
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useConfigurationQuery, useSchedulerQuery } from '../../../hooks/useYarnApi';
import { useQueueDataProcessor, type QueueNodeData } from '../hooks/useQueueDataProcessor';
import { QueueInfoPanel } from './QueueInfoPanel';
import { useUIStore, useSelectedQueue } from '../../../store';
import QueueCardNode from './QueueCardNode';
import CustomFlowEdge from './CustomFlowEdge';
import type { Queue } from '../../../types/Queue';

export interface QueueVisualizationContainerProps {
    className?: string;
}

// Node and edge types for React Flow
const nodeTypes = { queueCard: QueueCardNode };
const edgeTypes = { customFlow: CustomFlowEdge };

// Inner Flow component that has access to React Flow instance
const FlowInner: React.FC = () => {
    const configQuery = useConfigurationQuery();
    const schedulerQuery = useSchedulerQuery();
    const { nodes: processedNodes, edges: processedEdges, isLoading, error } = useQueueDataProcessor(configQuery, schedulerQuery);
    const uiStore = useUIStore();
    const { fitView } = useReactFlow();

    // Local state for nodes and edges (React Flow requires this pattern)
    const [nodes, setNodes] = React.useState<Node<QueueNodeData>[]>([]);
    const [edges, setEdges] = React.useState<Edge[]>([]);

    // Update nodes and edges when processed data changes
    React.useEffect(() => {
        if (processedNodes && processedEdges) {
            setNodes(processedNodes);
            setEdges(processedEdges);
            
            // Fit view when data is first loaded
            if (processedNodes.length > 0 && !isLoading) {
                setTimeout(() => {
                    fitView({ padding: 0.1, includeHiddenNodes: false });
                }, 100);
            }
        }
    }, [processedNodes, processedEdges, isLoading, fitView]);

    // Update node selection state when UI store changes
    React.useEffect(() => {
        if (uiStore?.selectedQueuePath) {
            setNodes((nds) =>
                nds.map((node) => ({
                    ...node,
                    selected: node.id === uiStore.selectedQueuePath,
                }))
            );
        } else {
            setNodes((nds) =>
                nds.map((node) => ({
                    ...node,
                    selected: false,
                }))
            );
        }
    }, [uiStore?.selectedQueuePath]);

    // Handle node changes (selection, etc.)
    const onNodesChange: OnNodesChange = useCallback((changes) => {
        setNodes((nds) => applyNodeChanges(changes, nds));
    }, []);

    // Handle edge changes
    const onEdgesChange: OnEdgesChange = useCallback((changes) => {
        setEdges((eds) => applyEdgeChanges(changes, eds));
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
                nodeColor={(node) => {
                    if (node.selected) return '#1976d2';
                    return '#e0e0e0';
                }}
                nodeStrokeWidth={2}
                zoomable
                pannable
            />
        </ReactFlow>
    );
};

export const QueueVisualizationContainer: React.FC<QueueVisualizationContainerProps> = ({ className }) => {
    const uiStore = useUIStore();
    const selectedQueueData = useSelectedQueue();

    // Queue action handlers
    const handleQueueEdit = useCallback(() => {
        if (uiStore?.selectedQueuePath) {
            uiStore?.openPropertyEditor(uiStore.selectedQueuePath, 'edit');
        }
    }, [uiStore]);

    const handleQueueDelete = useCallback(() => {
        if (uiStore?.selectedQueuePath) {
            uiStore?.openConfirmDialog(
                'Delete Queue',
                `Are you sure you want to delete queue "${uiStore.selectedQueuePath}"?`,
                () => {
                    // TODO: Implement queue deletion
                    console.log('Delete queue:', uiStore.selectedQueuePath);
                }
            );
        }
    }, [uiStore]);

    const handleQueueStateToggle = useCallback(() => {
        // TODO: Update queue state via API
        console.log('Toggle queue state:', uiStore?.selectedQueuePath);
    }, [uiStore]);

    const handleQueueSelect = useCallback(
        (queue: Queue) => {
            // Get the queue path from the queue object
            const queuePath = (queue as any).queuePath || (queue as any).id || queue.queueName;
            uiStore?.selectQueue(queuePath);
        },
        [uiStore]
    );

    // Handle info panel close
    const handleInfoPanelClose = useCallback(() => {
        uiStore?.selectQueue(undefined);
    }, [uiStore]);

    return (
        <Box
            className={className}
            sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                overflow: 'hidden',
                bgcolor: 'background.default',
            }}
        >
            <ReactFlowProvider>
                <FlowInner />
            </ReactFlowProvider>

            {/* Queue Info Panel */}
            <QueueInfoPanel
                queue={selectedQueueData}
                open={!!uiStore?.selectedQueuePath}
                onClose={handleInfoPanelClose}
                onEdit={handleQueueEdit}
                onDelete={handleQueueDelete}
                onToggleState={handleQueueStateToggle}
                onQueueSelect={handleQueueSelect}
            />

            {/* Debug info */}
            {process.env.NODE_ENV === 'development' && (
                <div
                    style={{
                        position: 'fixed',
                        top: 10,
                        right: 10,
                        background: 'rgba(0,0,0,0.8)',
                        color: 'white',
                        padding: '10px',
                        fontSize: '12px',
                        borderRadius: '4px',
                        zIndex: 9999,
                    }}
                >
                    Selected: {uiStore?.selectedQueuePath || 'none'}
                    <br />
                    Panel Open: {uiStore?.selectedQueuePath ? 'true' : 'false'}
                    <br />
                    Queue Data: {selectedQueueData ? 'found' : 'null'}
                </div>
            )}
        </Box>
    );
};
