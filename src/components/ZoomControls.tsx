import React from 'react';
import { Box, Divider, Typography, useTheme } from '@mui/material';
import {
    ZoomIn as ZoomInIcon,
    ZoomOut as ZoomOutIcon,
    CenterFocusStrong as ResetIcon,
    FitScreen as FitScreenIcon,
} from '@mui/icons-material';
import type { PanZoomController } from '../utils/canvas/PanZoomController';
import { StyledIconButton, ElevatedPaper } from './shared';

export interface ZoomControlsProps {
    panZoomController: PanZoomController | null;
    onZoomToFit?: () => void;
    disabled?: boolean;
    position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
    showScale?: boolean;
}

export const ZoomControls: React.FC<ZoomControlsProps> = ({
    panZoomController,
    onZoomToFit,
    disabled = false,
    position = 'top-right',
    showScale = true,
}) => {
    const theme = useTheme();
    const [scale, setScale] = React.useState(1);

    // Update scale display when pan/zoom state changes
    React.useEffect(() => {
        if (!panZoomController) return;

        const handlePanZoom = () => {
            const state = panZoomController.getState();
            setScale(state.scale);
        };

        panZoomController.addEventListener(handlePanZoom);

        // Set initial scale
        const initialState = panZoomController.getState();
        setScale(initialState.scale);

        return () => {
            panZoomController.removeEventListener(handlePanZoom);
        };
    }, [panZoomController]);

    const handleZoomIn = () => {
        if (disabled || !panZoomController) return;
        panZoomController.zoomBy(1.2);
    };

    const handleZoomOut = () => {
        if (disabled || !panZoomController) return;
        panZoomController.zoomBy(0.8);
    };

    const handleReset = () => {
        if (disabled || !panZoomController) return;
        panZoomController.reset(true);
    };

    const handleFitToScreen = () => {
        if (disabled) return;
        onZoomToFit?.();
    };

    const getPositionStyles = () => {
        const baseStyles = {
            position: 'absolute' as const,
            zIndex: 1000,
            margin: theme.spacing(2),
        };

        switch (position) {
            case 'top-right':
                return { ...baseStyles, top: theme.spacing(2), right: theme.spacing(2) };
            case 'top-left':
                return { ...baseStyles, top: theme.spacing(2), left: theme.spacing(2) };
            case 'bottom-right':
                return { ...baseStyles, bottom: theme.spacing(2), right: theme.spacing(2) };
            case 'bottom-left':
                return { ...baseStyles, bottom: theme.spacing(2), left: theme.spacing(2) };
            default:
                return { ...baseStyles, top: theme.spacing(2), right: theme.spacing(2) };
        }
    };

    const formatScale = (value: number): string => {
        return `${Math.round(value * 100)}%`;
    };

    return (
        <ElevatedPaper
            variant="floating"
            sx={{
                ...getPositionStyles(),
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            <Box sx={{ p: 1 }}>
                <StyledIconButton
                    tooltip="Zoom In (Ctrl/Cmd + +)"
                    tooltipPlacement="left"
                    onClick={handleZoomIn}
                    disabled={disabled || !panZoomController}
                >
                    <ZoomInIcon />
                </StyledIconButton>

                <StyledIconButton
                    tooltip="Zoom Out (Ctrl/Cmd + -)"
                    tooltipPlacement="left"
                    onClick={handleZoomOut}
                    disabled={disabled || !panZoomController}
                >
                    <ZoomOutIcon />
                </StyledIconButton>

                <Divider sx={{ my: 1 }} />

                <StyledIconButton
                    tooltip="Fit to Screen"
                    tooltipPlacement="left"
                    onClick={handleFitToScreen}
                    disabled={disabled}
                >
                    <FitScreenIcon />
                </StyledIconButton>

                <StyledIconButton
                    tooltip="Reset View (Ctrl/Cmd + 0)"
                    tooltipPlacement="left"
                    onClick={handleReset}
                    disabled={disabled || !panZoomController}
                >
                    <ResetIcon />
                </StyledIconButton>

                {showScale && (
                    <>
                        <Divider sx={{ my: 1 }} />
                        <Box
                            sx={{
                                display: 'flex',
                                justifyContent: 'center',
                                px: 1,
                                py: 0.5,
                            }}
                        >
                            <Typography
                                variant="caption"
                                sx={{
                                    fontFamily: 'monospace',
                                    fontSize: '0.75rem',
                                    color: 'text.secondary',
                                    userSelect: 'none',
                                }}
                            >
                                {formatScale(scale)}
                            </Typography>
                        </Box>
                    </>
                )}
            </Box>
        </ElevatedPaper>
    );
};

export default ZoomControls;
