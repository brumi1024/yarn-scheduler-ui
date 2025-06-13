import React from 'react';
import { Box } from '@mui/material';
import { ZoomControls } from '../ZoomControls';
import type { D3ZoomController } from '../../utils/canvas';

export interface VisualizationControlsProps {
    panZoomController: D3ZoomController | null;
    onZoomToFit: () => void;
    disabled?: boolean;
    selectedQueue?: string | null;
    hoveredQueue?: string | null;
    nodeCount: number;
}

export const VisualizationControls: React.FC<VisualizationControlsProps> = ({
    panZoomController,
    onZoomToFit,
    disabled = false,
    selectedQueue,
    hoveredQueue,
    nodeCount,
}) => {
    return (
        <>
            {/* Zoom controls */}
            <ZoomControls
                panZoomController={panZoomController}
                onZoomToFit={onZoomToFit}
                disabled={disabled}
                position="top-right"
                showScale={true}
            />

            {/* Queue count indicator */}
            {!disabled && nodeCount > 0 && (
                <Box
                    sx={{
                        position: 'absolute',
                        bottom: 16,
                        left: 16,
                        bgcolor: 'background.paper',
                        px: 2,
                        py: 1,
                        borderRadius: 1,
                        boxShadow: 1,
                        typography: 'caption',
                        color: 'text.secondary',
                    }}
                >
                    {nodeCount} queue{nodeCount !== 1 ? 's' : ''}
                </Box>
            )}

            {/* Selected queue indicator */}
            {selectedQueue && (
                <Box
                    sx={{
                        position: 'absolute',
                        top: 16,
                        left: 16,
                        bgcolor: 'primary.main',
                        color: 'primary.contrastText',
                        px: 2,
                        py: 1,
                        borderRadius: 1,
                        boxShadow: 2,
                        typography: 'body2',
                        fontWeight: 'medium',
                    }}
                >
                    Selected: {selectedQueue}
                </Box>
            )}

            {/* Hovered queue tooltip */}
            {hoveredQueue && !selectedQueue && (
                <Box
                    sx={{
                        position: 'absolute',
                        top: 16,
                        left: 16,
                        bgcolor: 'grey.800',
                        color: 'white',
                        px: 2,
                        py: 1,
                        borderRadius: 1,
                        boxShadow: 2,
                        typography: 'caption',
                        opacity: 0.9,
                    }}
                >
                    Hover: {hoveredQueue}
                </Box>
            )}
        </>
    );
};
