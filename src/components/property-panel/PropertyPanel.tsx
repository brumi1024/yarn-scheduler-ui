import React, { useState, useEffect } from 'react';
import clsx from 'clsx';
import {
    Drawer,
    Box,
    Typography,
    IconButton,
    Tabs,
    Tab,
    Divider,
    Button,
    CircularProgress,
} from '@mui/material';
import {
    Close as CloseIcon,
    Save as SaveIcon,
    Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from '@tanstack/react-router';
import { useSchedulerStore } from '../../store/schedulerStore';
import { QueueOverview } from './QueueOverview';
import { PropertyEditorTab, PropertyEditorTabHandle } from './PropertyEditorTab';

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`property-tabpanel-${index}`}
            aria-labelledby={`property-tab-${index}`}
            className={clsx('tab-panel-content', {
                'config-tab': index === 2,
                'standard-tab': index !== 2,
            })}
            style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
            }}
            {...other}
        >
            {value === index && (
                <Box sx={{
                    height: '100%',
                    // Configuration tab needs full height for its internal scrolling
                    // Other tabs can use auto overflow
                    overflow: index === 2 ? 'hidden' : 'auto',
                    display: index === 2 ? 'flex' : 'block',
                    flexDirection: index === 2 ? 'column' : undefined,
                }}>
                    {children}
                </Box>
            )}
        </div>
    );
}

// Tab configuration mapping URL search params to tab indices
const TAB_CONFIG = {
    overview: 0,
    statistics: 1,
    configuration: 2,
} as const;

const TAB_NAMES = Object.keys(TAB_CONFIG) as Array<keyof typeof TAB_CONFIG>;

export const PropertyPanel: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    
    const {
        selectedQueuePath,
        isPropertyPanelOpen,
        setPropertyPanelOpen,
        getQueueByPath
    } = useSchedulerStore();

    const [tabValue, setTabValue] = useState(0);
    const [hasChanges, setHasChanges] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const propertyEditorRef = React.useRef<PropertyEditorTabHandle>(null);

    const selectedQueue = selectedQueuePath ? getQueueByPath(selectedQueuePath) : null;

    // Reset tab to overview when panel opens
    useEffect(() => {
        if (isPropertyPanelOpen) {
            setTabValue(0); // Start with Overview tab when panel opens
        }
    }, [isPropertyPanelOpen]);

    const updateURLState = (panelOpen: boolean) => {
        if (!selectedQueuePath) return;
        
        const encodedQueuePath = encodeURIComponent(selectedQueuePath);
        
        navigate({
            to: '/queue/$queuePath',
            params: { queuePath: encodedQueuePath },
            search: {
                panel: panelOpen,
            },
            replace: true, // Use replace to avoid cluttering browser history
        }).catch((error) => {
            console.error('Failed to update URL state:', error);
        });
    };

    const handleClose = () => {
        setPropertyPanelOpen(false);
        updateURLState(false);
    };

    const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
        // Tab state is now local-only for instant performance
        // URL only tracks panel open/close state
    };

    const handleSubmit = async () => {
        if (propertyEditorRef.current) {
            await propertyEditorRef.current.submit();
        }
    };

    const handleReset = () => {
        if (propertyEditorRef.current) {
            propertyEditorRef.current.reset();
        }
    };

    const handleHasChangesChange = (newHasChanges: boolean) => {
        setHasChanges(newHasChanges);
    };

    // Reset hasChanges state when panel opens/closes or queue changes
    useEffect(() => {
        if (!isPropertyPanelOpen || !selectedQueuePath) {
            setHasChanges(false);
        }
    }, [isPropertyPanelOpen, selectedQueuePath]);

    // Update URL when panel opens (from tree interaction)
    useEffect(() => {
        if (isPropertyPanelOpen && selectedQueuePath) {
            updateURLState(true);
        }
    }, [isPropertyPanelOpen, selectedQueuePath]);

    // Close panel when navigating away from queue management routes
    useEffect(() => {
        const currentPath = location.pathname;
        
        // Close panel when navigating to node-labels, global-settings, or other non-queue routes
        if (isPropertyPanelOpen && (
            currentPath === '/node-labels' || 
            currentPath === '/global-settings' ||
            (currentPath === '/' && !currentPath.includes('/queue/'))
        )) {
            setPropertyPanelOpen(false);
        }
    }, [location.pathname, isPropertyPanelOpen, setPropertyPanelOpen]);

    const handleIsSubmittingChange = (newIsSubmitting: boolean) => {
        setIsSubmitting(newIsSubmitting);
    };

    if (!selectedQueue || !isPropertyPanelOpen) {
        return null;
    }

    return (
        <Drawer
            anchor="right"
            open={isPropertyPanelOpen}
            onClose={handleClose}
            variant="persistent"
            sx={{
                width: 450,
                flexShrink: 0,
                '& .MuiDrawer-paper': {
                    width: 450,
                    boxSizing: 'border-box',
                    borderRadius: 2,
                    backgroundImage: 'none',
                    backgroundColor: 'background.paper',
                    borderLeft: 1,
                    borderColor: 'divider',
                    top: '64px', // Position below Toolpad header
                    height: 'calc(100vh - 64px)', // Adjust height to not overlap header
                },
            }}
        >
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
                <Box sx={{ 
                    p: 2, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    borderBottom: 1,
                    borderColor: 'divider',
                }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Queue Details
                    </Typography>
                    <IconButton 
                        onClick={handleClose} 
                        size="small"
                        sx={{
                            '&:hover': {
                                backgroundColor: 'action.hover',
                            },
                        }}
                    >
                        <CloseIcon />
                    </IconButton>
                </Box>

                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs 
                        value={tabValue} 
                        onChange={handleTabChange} 
                        aria-label="property panel tabs"
                        sx={{
                            '& .MuiTab-root': {
                                textTransform: 'none',
                                fontWeight: 500,
                                minHeight: 48,
                                '&:hover': {
                                    backgroundColor: 'action.hover',
                                },
                                '&.Mui-selected': {
                                    fontWeight: 600,
                                },
                            },
                        }}
                    >
                        <Tab label="Overview" />
                        <Tab label="Statistics" />
                        <Tab label="Configuration" />
                    </Tabs>
                </Box>

                <Box sx={{
                    flexGrow: 1,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    pb: tabValue === 2 ? 8 : 0, // Add padding bottom for buttons on Configuration tab
                }}>
                    <TabPanel value={tabValue} index={0}>
                        <QueueOverview queue={selectedQueue} />
                    </TabPanel>
                    <TabPanel value={tabValue} index={1}>
                        {/* TODO: Implement Statistics tab */}
                        <Box sx={{ p: 2 }}>
                            <Typography variant="body2" color="text.secondary">
                                Statistics view coming soon...
                            </Typography>
                        </Box>
                    </TabPanel>
                    <TabPanel value={tabValue} index={2}>
                        <PropertyEditorTab
                            ref={propertyEditorRef}
                            queue={selectedQueue}
                            onHasChangesChange={handleHasChangesChange}
                            onIsSubmittingChange={handleIsSubmittingChange}
                        />
                    </TabPanel>
                </Box>

                {/* Fixed Apply/Reset buttons - show on Configuration tab, disabled when no changes */}
                {tabValue === 2 && (
                    <Box
                        sx={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            p: 2,
                            bgcolor: 'background.paper',
                            borderTop: 1,
                            borderColor: 'divider',
                            display: 'flex',
                            gap: 1,
                            justifyContent: 'flex-end',
                        }}
                    >
                        <Button
                            variant="outlined"
                            onClick={handleReset}
                            disabled={isSubmitting || !hasChanges}
                            startIcon={<RefreshIcon />}
                            sx={{
                                borderRadius: 2,
                                textTransform: 'none',
                                fontWeight: 500,
                            }}
                        >
                            Reset
                        </Button>
                        <Button
                            variant="contained"
                            onClick={handleSubmit}
                            disabled={isSubmitting || !hasChanges}
                            startIcon={isSubmitting ? <CircularProgress size={20} /> : <SaveIcon />}
                            sx={{
                                borderRadius: 2,
                                textTransform: 'none',
                                fontWeight: 600,
                                boxShadow: 2,
                                '&:hover': {
                                    boxShadow: 4,
                                },
                            }}
                        >
                            {isSubmitting ? 'Applying...' : 'Apply Changes'}
                        </Button>
                    </Box>
                )}
            </Box>
        </Drawer>
    );
};