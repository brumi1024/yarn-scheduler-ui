import React from 'react';
import {
  Box,
  IconButton,
  Tooltip,
  Paper,
  Divider,
  Typography,
  useTheme
} from '@mui/material';
import {
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  CenterFocusStrong as ResetIcon,
  FitScreen as FitScreenIcon
} from '@mui/icons-material';
import type { PanZoomController } from '../utils/canvas/PanZoomController';

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
  showScale = true
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
      margin: theme.spacing(2)
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
    <Paper
      elevation={6}
      sx={{
        ...getPositionStyles(),
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
        borderRadius: 2,
        overflow: 'hidden',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.1)'
      }}
    >
      <Box sx={{ p: 1 }}>
        <Tooltip title="Zoom In (Ctrl/Cmd + +)" placement="left">
          <span>
            <IconButton
              onClick={handleZoomIn}
              disabled={disabled || !panZoomController}
              size="small"
              sx={{ 
                width: 40, 
                height: 40,
                '&:hover': {
                  bgcolor: 'action.hover'
                }
              }}
            >
              <ZoomInIcon />
            </IconButton>
          </span>
        </Tooltip>

        <Tooltip title="Zoom Out (Ctrl/Cmd + -)" placement="left">
          <span>
            <IconButton
              onClick={handleZoomOut}
              disabled={disabled || !panZoomController}
              size="small"
              sx={{ 
                width: 40, 
                height: 40,
                '&:hover': {
                  bgcolor: 'action.hover'
                }
              }}
            >
              <ZoomOutIcon />
            </IconButton>
          </span>
        </Tooltip>

        <Divider sx={{ my: 1 }} />

        <Tooltip title="Fit to Screen" placement="left">
          <span>
            <IconButton
              onClick={handleFitToScreen}
              disabled={disabled}
              size="small"
              sx={{ 
                width: 40, 
                height: 40,
                '&:hover': {
                  bgcolor: 'action.hover'
                }
              }}
            >
              <FitScreenIcon />
            </IconButton>
          </span>
        </Tooltip>

        <Tooltip title="Reset View (Ctrl/Cmd + 0)" placement="left">
          <span>
            <IconButton
              onClick={handleReset}
              disabled={disabled || !panZoomController}
              size="small"
              sx={{ 
                width: 40, 
                height: 40,
                '&:hover': {
                  bgcolor: 'action.hover'
                }
              }}
            >
              <ResetIcon />
            </IconButton>
          </span>
        </Tooltip>

        {showScale && (
          <>
            <Divider sx={{ my: 1 }} />
            <Box 
              sx={{ 
                display: 'flex', 
                justifyContent: 'center',
                px: 1,
                py: 0.5
              }}
            >
              <Typography 
                variant="caption" 
                sx={{ 
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                  color: 'text.secondary',
                  userSelect: 'none'
                }}
              >
                {formatScale(scale)}
              </Typography>
            </Box>
          </>
        )}
      </Box>
    </Paper>
  );
};

export default ZoomControls;