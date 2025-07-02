import React, { useState } from 'react';
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

export const PropertyPanel: React.FC = () => {
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

    const handleClose = () => {
        setPropertyPanelOpen(false);
    };

    const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
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
    React.useEffect(() => {
        if (!isPropertyPanelOpen || !selectedQueuePath) {
            setHasChanges(false);
        }
    }, [isPropertyPanelOpen, selectedQueuePath]);

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
                },
            }}
        >
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
                <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="h6">Queue Details</Typography>
                    <IconButton onClick={handleClose} size="small">
                        <CloseIcon />
                    </IconButton>
                </Box>

                <Divider />

                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs value={tabValue} onChange={handleTabChange} aria-label="property panel tabs">
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
                        >
                            Reset
                        </Button>
                        <Button
                            variant="contained"
                            onClick={handleSubmit}
                            disabled={isSubmitting || !hasChanges}
                            startIcon={isSubmitting ? <CircularProgress size={20} /> : <SaveIcon />}
                        >
                            {isSubmitting ? 'Applying...' : 'Apply Changes'}
                        </Button>
                    </Box>
                )}
            </Box>
        </Drawer>
    );
};