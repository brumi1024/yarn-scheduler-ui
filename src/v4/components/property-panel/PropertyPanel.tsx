import React, { useState } from 'react';
import {
    Drawer,
    Box,
    Typography,
    IconButton,
    Tabs,
    Tab,
    Divider,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { useSchedulerStore } from '../../store/schedulerStore';
import { QueueOverview } from './QueueOverview';

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
            {...other}
        >
            {value === index && (
                <Box sx={{ height: '100%', overflow: 'auto' }}>
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

    const selectedQueue = selectedQueuePath ? getQueueByPath(selectedQueuePath) : null;

    const handleClose = () => {
        setPropertyPanelOpen(false);
    };

    const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
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
                width: 320,
                flexShrink: 0,
                '& .MuiDrawer-paper': {
                    width: 320,
                    boxSizing: 'border-box',
                },
            }}
        >
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
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
                        <Tab label="Settings" />
                    </Tabs>
                </Box>
                
                <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
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
                        {/* TODO: Implement Settings tab */}
                        <Box sx={{ p: 2 }}>
                            <Typography variant="body2" color="text.secondary">
                                Settings view coming soon...
                            </Typography>
                        </Box>
                    </TabPanel>
                </Box>
            </Box>
        </Drawer>
    );
};