import React, { useState } from 'react';
import { Box, AppBar, Toolbar, Typography, Tabs, Tab } from '@mui/material';
import { QueueVisualizationContainer } from './tree/QueueVisualizationContainer';
import { GlobalSettings } from './global-settings';
import { NodeLabels } from './node-labels';

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
            id={`tabpanel-${index}`}
            aria-labelledby={`tab-${index}`}
            {...other}
        >
            {value === index && children}
        </div>
    );
}

const TABS = [
    { label: 'Queue Tree', component: QueueVisualizationContainer },
    { label: 'Global Settings', component: GlobalSettings },
    { label: 'Node Labels', component: NodeLabels },
];

export default function MainLayout(): React.ReactElement {
    const [activeTab, setActiveTab] = useState(0);

    const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
        setActiveTab(newValue);
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
            {/* App Bar */}
            <AppBar position="static">
                <Toolbar>
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                        YARN Capacity Scheduler
                    </Typography>
                </Toolbar>
            </AppBar>

            {/* Tab Navigation */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={activeTab} onChange={handleTabChange} aria-label="navigation tabs">
                    {TABS.map((tab, index) => (
                        <Tab key={index} label={tab.label} id={`tab-${index}`} aria-controls={`tabpanel-${index}`} />
                    ))}
                </Tabs>
            </Box>

            {/* Content Area */}
            <Box
                sx={{
                    flexGrow: 1,
                    overflow: 'auto',
                    backgroundColor: 'background.default',
                    minHeight: 0, // Allows flex child to shrink
                }}
            >
                {TABS.map((tab, index) => (
                    <TabPanel key={index} value={activeTab} index={index}>
                        <tab.component />
                    </TabPanel>
                ))}
            </Box>
        </Box>
    );
}