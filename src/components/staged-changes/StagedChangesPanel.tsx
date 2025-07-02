import React, { useState } from 'react';
import {
    Drawer,
    Box,
    Typography,
    IconButton,
    Badge,
    Button,
    CircularProgress,
    useTheme,
    Fab,
    Paper,
} from '@mui/material';
import {
    Close as CloseIcon,
    Clear as ClearIcon,
    Check as ApplyIcon,
    Speed as SpeedIcon,
    ExpandLess as ExpandLessIcon,
    ExpandMore as ExpandMoreIcon,
    DragHandle as DragHandleIcon,
} from '@mui/icons-material';
import { useSchedulerStore } from '../../store/schedulerStore';
import type { StagedChange } from '../../types';
import { QueueChangeGroup } from './QueueChangeGroup';
import { useNotifications } from '../../hooks/useNotifications';

interface StagedChangesPanelProps {
    open: boolean;
    onClose: () => void;
    onOpen?: () => void;
}

type DrawerState = 'collapsed' | 'expanded';

// Common style constants
const DRAWER_BORDER_RADIUS = '16px 16px 0 0';
const COLLAPSED_HEIGHT = 200;
const EXPANDED_HEIGHT = '60vh';
const SPACING_STANDARD = 2;
const FAB_POSITION = { bottom: 24, right: 24 };

export function StagedChangesPanel({ open, onClose, onOpen }: StagedChangesPanelProps) {
    const theme = useTheme();
    const { showNotification } = useNotifications();
    const [isApplying, setIsApplying] = useState(false);
    const [drawerState, setDrawerState] = useState<DrawerState>('collapsed');
    
    const stagedChanges = useSchedulerStore((state) => state.stagedChanges);
    const revertChange = useSchedulerStore((state) => state.revertChange);
    const clearAllChanges = useSchedulerStore((state) => state.clearAllChanges);
    const applyChanges = useSchedulerStore((state) => state.applyChanges);

    // Consolidated notification helpers
    const notifySuccess = (message: string) => showNotification(message, 'success');
    const notifyInfo = (message: string) => showNotification(message, 'info');
    const notifyError = (message: string) => showNotification(message, 'error');

    const handleRevertChange = (changeId: string) => {
        revertChange(changeId);
        notifyInfo('Change reverted');
    };

    const handleClearAll = () => {
        clearAllChanges();
        notifyInfo('All staged changes cleared');
    };

    const handleApplyChanges = async () => {
        setIsApplying(true);
        try {
            await applyChanges();
            const count = stagedChanges.length;
            notifySuccess(`Successfully applied ${count} change${count !== 1 ? 's' : ''}`);
            onClose();
        } catch (error) {
            console.error('Failed to apply changes:', error);
            notifyError('Failed to apply changes. Please try again.');
        } finally {
            setIsApplying(false);
        }
    };

    const toggleDrawerState = () => {
        setDrawerState(drawerState === 'collapsed' ? 'expanded' : 'collapsed');
    };

    const getDrawerHeight = () => {
        return drawerState === 'collapsed' ? COLLAPSED_HEIGHT : EXPANDED_HEIGHT;
    };

    // Group changes by queue for better organization
    const changesByQueue = stagedChanges.reduce((acc, change) => {
        const queuePath = change.queuePath;
        if (!acc[queuePath]) {
            acc[queuePath] = [];
        }
        acc[queuePath].push(change);
        return acc;
    }, {} as Record<string, StagedChange[]>);

    // Show floating pill when there are changes but panel is closed
    if (!open && stagedChanges.length > 0) {
        return (
            <Fab
                variant="extended"
                onClick={() => {
                    setDrawerState('collapsed');
                    onOpen?.();
                }}
                sx={{
                    position: 'fixed',
                    ...FAB_POSITION,
                    zIndex: theme.zIndex.speedDial,
                    backgroundColor: theme.palette.primary.main,
                    color: theme.palette.primary.contrastText,
                    '&:hover': {
                        backgroundColor: theme.palette.primary.dark,
                    },
                }}
            >
                <Badge badgeContent={stagedChanges.length} color="error" sx={{ mr: 1 }}>
                    <SpeedIcon />
                </Badge>
                Review Changes
            </Fab>
        );
    }

    if (!open) return null;

    return (
        <Drawer
            anchor="bottom"
            open={open}
            onClose={onClose}
            variant="persistent"
            sx={{
                '& .MuiDrawer-paper': {
                    height: getDrawerHeight(),
                    boxSizing: 'border-box',
                    borderRadius: DRAWER_BORDER_RADIUS,
                    boxShadow: theme.shadows[16],
                    transition: 'height 0.3s ease-in-out',
                    backgroundColor: theme.palette.background.paper,
                },
            }}
        >
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {/* Header */}
                <Box 
                    sx={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        py: 1,
                        px: 2,
                        borderBottom: `1px solid ${theme.palette.divider}`,
                        cursor: 'pointer',
                        '&:hover': {
                            backgroundColor: theme.palette.action.hover,
                        },
                    }}
                    onClick={toggleDrawerState}
                >
                    <DragHandleIcon sx={{ color: theme.palette.text.secondary, mr: 1 }} />
                    <SpeedIcon sx={{ color: theme.palette.primary.main, mr: 1 }} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, flexGrow: 1 }}>
                        Staged Changes
                    </Typography>
                    <Badge badgeContent={stagedChanges.length} color="primary" sx={{ mr: 1 }} />
                    {drawerState === 'expanded' ? <ExpandLessIcon sx={{ mr: 1 }} /> : <ExpandMoreIcon sx={{ mr: 1 }} />}
                    <IconButton 
                        onClick={(e) => {
                            e.stopPropagation();
                            onClose();
                        }}
                        size="small"
                    >
                        <CloseIcon />
                    </IconButton>
                </Box>

                {/* Content Area */}
                {
                    <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        {/* Empty state */}
                        {stagedChanges.length === 0 && (
                            <Box sx={{ 
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexGrow: 1,
                                p: 4,
                                textAlign: 'center',
                            }}>
                                <SpeedIcon 
                                    sx={{ 
                                        fontSize: 48, 
                                        color: theme.palette.grey[400],
                                        mb: 1,
                                    }} 
                                />
                                <Typography 
                                    variant="body1" 
                                    sx={{ 
                                        color: theme.palette.text.secondary,
                                        fontWeight: 500,
                                    }}
                                >
                                    No staged changes
                                </Typography>
                                <Typography 
                                    variant="body2" 
                                    sx={{ 
                                        color: theme.palette.text.secondary,
                                        maxWidth: 280,
                                    }}
                                >
                                    Edit queue properties to see changes here.
                                </Typography>
                            </Box>
                        )}

                        {/* Changes list */}
                        {stagedChanges.length > 0 && (
                            <>
                                {/* Collapsed view - compact summary */}
                                {drawerState === 'collapsed' && (
                                    <Box sx={{ 
                                        p: 2,
                                        overflow: 'hidden',
                                    }}>
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                            {Object.entries(changesByQueue).map(([queuePath, changes]) => (
                                                <Paper
                                                    key={queuePath}
                                                    elevation={1}
                                                    sx={{
                                                        p: 1.5,
                                                        borderRadius: 2,
                                                        backgroundColor: theme.palette.grey[50],
                                                        border: `1px solid ${theme.palette.divider}`,
                                                        minWidth: 200,
                                                    }}
                                                >
                                                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                                                        {queuePath === 'global' ? 'Global Settings' : queuePath}
                                                    </Typography>
                                                    <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                                                        {changes.length} change{changes.length !== 1 ? 's' : ''}
                                                    </Typography>
                                                </Paper>
                                            ))}
                                        </Box>
                                        <Typography 
                                            variant="caption" 
                                            sx={{ 
                                                color: theme.palette.text.secondary,
                                                mt: 1,
                                                display: 'block',
                                                textAlign: 'center',
                                            }}
                                        >
                                            Click header to expand for detailed diff view
                                        </Typography>
                                    </Box>
                                )}

                                {/* Expanded view - full diff */}
                                {drawerState === 'expanded' && (
                                    <Box sx={{ 
                                        flexGrow: 1,
                                        overflowY: 'auto',
                                        p: 2,
                                        pb: 1,
                                    }}>
                                        {Object.entries(changesByQueue).map(([queuePath, changes]) => (
                                            <QueueChangeGroup
                                                key={queuePath}
                                                queuePath={queuePath}
                                                changes={changes}
                                                onRevertChange={handleRevertChange}
                                                defaultExpanded={Object.keys(changesByQueue).length <= 2}
                                            />
                                        ))}
                                    </Box>
                                )}
                            </>
                        )}
                    </Box>
                }
                
                {/* Action buttons - always visible when changes exist */}
                {stagedChanges.length > 0 && (
                    <Box sx={{ 
                        p: 2,
                        borderTop: `1px solid ${theme.palette.divider}`,
                        backgroundColor: theme.palette.background.paper,
                        display: 'flex',
                        gap: 1,
                        justifyContent: 'flex-end',
                    }}>
                        <Button
                            variant="outlined"
                            onClick={handleClearAll}
                            disabled={isApplying}
                            startIcon={<ClearIcon />}
                        >
                            Clear All
                        </Button>
                        <Button
                            variant="contained"
                            onClick={handleApplyChanges}
                            disabled={isApplying}
                            startIcon={isApplying ? <CircularProgress size={20} /> : <ApplyIcon />}
                        >
                            {isApplying ? 'Applying Changes...' : `Apply ${stagedChanges.length} Change${stagedChanges.length !== 1 ? 's' : ''}`}
                        </Button>
                    </Box>
                )}
            </Box>
        </Drawer>
    );
}