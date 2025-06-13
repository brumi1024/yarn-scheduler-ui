import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Box, Alert, CircularProgress } from '@mui/material';
import { CanvasDisplay, type CanvasDisplayRef } from './CanvasDisplay';
import { VisualizationControls } from './VisualizationControls';
import { useQueueDataProcessor } from './QueueDataProcessor';
import { QueueInfoPanel } from '../QueueInfoPanel';
import { useConfiguration, useScheduler } from '../../hooks/useApi';
import type { Queue } from '../../types/Queue';
import type { SelectionEvent, HoverEvent } from '../../utils/canvas';

export interface QueueVisualizationContainerProps {
    className?: string;
}

export const QueueVisualizationContainer: React.FC<QueueVisualizationContainerProps> = ({ className }) => {
    const canvasRef = useRef<CanvasDisplayRef>(null);

    // API data
    const { data: configData, loading: configLoading, error: configError } = useConfiguration();
    const { data: schedulerData, loading: schedulerLoading, error: schedulerError } = useScheduler();

    // Process queue data
    const { nodes, flows, isLoading: dataLoading, error: dataError } = useQueueDataProcessor(
        configData,
        schedulerData
    );

    // Selection state
    const [selectedQueue, setSelectedQueue] = useState<string | null>(null);
    const [hoveredQueue, setHoveredQueue] = useState<string | null>(null);
    const [selectedQueueData, setSelectedQueueData] = useState<Queue | null>(null);
    const [infoPanelOpen, setInfoPanelOpen] = useState(false);

    // Loading and error states
    const apiLoading = configLoading || schedulerLoading;
    const apiError = configError || schedulerError;
    const isLoading = apiLoading || dataLoading;
    const error = apiError?.message || dataError;

    // Handle selection events from canvas
    const handleSelectionChange = useCallback((event: SelectionEvent) => {
        if (event.type === 'select' && event.nodeId && event.node?.data) {
            setSelectedQueue(event.nodeId);
            setSelectedQueueData(event.node.data as Queue);
            setInfoPanelOpen(true);
        } else if (event.type === 'deselect' || !event.nodeId) {
            setSelectedQueue(null);
            setSelectedQueueData(null);
            setInfoPanelOpen(false);
        }
    }, []);

    // Handle hover events from canvas
    const handleHoverChange = useCallback((event: HoverEvent) => {
        setHoveredQueue(event.nodeId || null);
    }, []);

    // Handle zoom to fit
    const handleZoomToFit = useCallback(() => {
        canvasRef.current?.zoomToFit();
    }, []);

    // Handle info panel close
    const handleInfoPanelClose = useCallback(() => {
        setInfoPanelOpen(false);
        setSelectedQueueData(null);
        setSelectedQueue(null);

        // Clear selection in canvas
        canvasRef.current?.updateSelection(new Set());
    }, []);

    // Queue action handlers
    const handleQueueEdit = useCallback(() => {
        // TODO: Open property editor modal
        console.log('Edit queue:', selectedQueue);
    }, [selectedQueue]);

    const handleQueueDelete = useCallback(() => {
        // TODO: Show confirmation dialog and delete queue
        console.log('Delete queue:', selectedQueue);
    }, [selectedQueue]);

    const handleQueueStateToggle = useCallback(() => {
        // TODO: Update queue state via API
        console.log('Toggle queue state:', selectedQueue);
    }, [selectedQueue]);

    const handleQueueSaveProperties = useCallback((queuePath: string, changes: Record<string, any>) => {
        // TODO: Save queue properties via API
        console.log('Save properties for queue:', queuePath, changes);
    }, []);

    const handleQueueSelect = useCallback((queue: Queue) => {
        // Find the node in the current nodes array that matches this queue
        const nodeToSelect = nodes.find(node => node.data.queueName === queue.queueName);
        
        if (nodeToSelect) {
            setSelectedQueue(queue.queueName);
            setSelectedQueueData(queue);
            setInfoPanelOpen(true);
            
            // Update canvas selection
            canvasRef.current?.updateSelection(new Set([queue.queueName]));
        }
    }, [nodes]);

    // Center on root when data is first loaded
    useEffect(() => {
        if (nodes.length > 0 && !isLoading) {
            // Small delay to ensure canvas is ready
            setTimeout(() => {
                canvasRef.current?.centerOnRoot();
            }, 100);
        }
    }, [nodes.length, isLoading]);

    // Handle API error
    if (error) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error">
                    Failed to load scheduler data: {error}
                </Alert>
            </Box>
        );
    }

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
            {/* Loading overlay */}
            {isLoading && (
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
            )}

            {/* Canvas display */}
            <CanvasDisplay
                ref={canvasRef}
                nodes={nodes}
                flows={flows}
                onSelectionChange={handleSelectionChange}
                onHoverChange={handleHoverChange}
            />

            {/* Controls and overlays */}
            <VisualizationControls
                panZoomController={canvasRef.current?.panZoomController || null}
                onZoomToFit={handleZoomToFit}
                disabled={isLoading}
                selectedQueue={selectedQueue}
                hoveredQueue={hoveredQueue}
                nodeCount={nodes.length}
            />

            {/* Queue Info Panel */}
            <QueueInfoPanel
                queue={selectedQueueData}
                open={infoPanelOpen}
                onClose={handleInfoPanelClose}
                onEdit={handleQueueEdit}
                onDelete={handleQueueDelete}
                onToggleState={handleQueueStateToggle}
                onSaveProperties={handleQueueSaveProperties}
                onQueueSelect={handleQueueSelect}
            />
        </Box>
    );
};