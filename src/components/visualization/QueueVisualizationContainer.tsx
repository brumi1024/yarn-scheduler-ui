import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Box, Alert, CircularProgress } from '@mui/material';
import { CanvasDisplay, type CanvasDisplayRef } from './CanvasDisplay';
import { VisualizationControls } from './VisualizationControls';
import { useQueueDataProcessor } from './QueueDataProcessor';
import { QueueInfoPanel } from '../QueueInfoPanel';
import { useDataStore, useUIStore, useSelectedQueue } from '../../store/zustand';
import type { Queue } from '../../types/Queue';
import type { SelectionEvent, HoverEvent } from '../../utils/canvas';

export interface QueueVisualizationContainerProps {
    className?: string;
}

export const QueueVisualizationContainer: React.FC<QueueVisualizationContainerProps> = ({ className }) => {
    const canvasRef = useRef<CanvasDisplayRef>(null);

    // Zustand stores
    const { configuration, scheduler, loading, error: apiError } = useDataStore();
    const uiStore = useUIStore();
    const selectedQueueData = useSelectedQueue();

    // Process queue data
    const {
        nodes,
        flows,
        isLoading: dataLoading,
        error: dataError,
    } = useQueueDataProcessor(configuration, scheduler);

    // Local state for hover
    const [hoveredQueue, setHoveredQueue] = useState<string | null>(null);

    // Loading and error states
    const isLoading = loading || dataLoading;
    const error = apiError?.message || dataError;

    // Handle selection events from canvas
    const handleSelectionChange = useCallback(
        (event: SelectionEvent) => {
            if (event.type === 'select' && event.nodeId) {
                uiStore.selectQueue(event.nodeId);
            } else if (event.type === 'deselect' || !event.nodeId) {
                uiStore.selectQueue(undefined);
            }
        },
        [uiStore]
    );

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
        uiStore.selectQueue(undefined);
        // Clear selection in canvas
        canvasRef.current?.updateSelection(new Set());
    }, [uiStore]);

    // Queue action handlers
    const handleQueueEdit = useCallback(() => {
        if (uiStore.selectedQueuePath) {
            uiStore.openPropertyEditor(uiStore.selectedQueuePath, 'edit');
        }
    }, [uiStore]);

    const handleQueueDelete = useCallback(() => {
        if (uiStore.selectedQueuePath) {
            uiStore.openConfirmDialog(
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
        console.log('Toggle queue state:', uiStore.selectedQueuePath);
    }, [uiStore]);

    const handleQueueSaveProperties = useCallback((queuePath: string, changes: Record<string, any>) => {
        // TODO: Save queue properties via API
        console.log('Save properties for queue:', queuePath, changes);
    }, []);

    const handleQueueSelect = useCallback(
        (queue: Queue) => {
            // Get the queue path from the queue object
            const queuePath = (queue as any).queuePath || (queue as any).id || queue.queueName;

            // Find the node in the current nodes array that matches this queue path
            const nodeToSelect = nodes.find((node) => node.id === queuePath);

            if (nodeToSelect) {
                uiStore.selectQueue(queuePath);

                // Update canvas selection
                canvasRef.current?.updateSelection(new Set([queuePath]));
            }
        },
        [nodes, uiStore]
    );

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
                <Alert severity="error">Failed to load scheduler data: {error}</Alert>
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
                selectedQueue={uiStore.selectedQueuePath}
                hoveredQueue={hoveredQueue}
                nodeCount={nodes.length}
            />

            {/* Queue Info Panel */}
            <QueueInfoPanel
                queue={selectedQueueData}
                open={!!uiStore.selectedQueuePath}
                onClose={handleInfoPanelClose}
                onEdit={handleQueueEdit}
                onDelete={handleQueueDelete}
                onToggleState={handleQueueStateToggle}
                onSaveProperties={handleQueueSaveProperties}
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
                    Selected: {uiStore.selectedQueuePath || 'none'}
                    <br />
                    Panel Open: {uiStore.selectedQueuePath ? 'true' : 'false'}
                    <br />
                    Queue Data: {selectedQueueData ? 'found' : 'null'}
                    <br />
                    Nodes Count: {nodes.length}
                </div>
            )}
        </Box>
    );
};
