import React, { useState } from 'react';
import { Box, Typography, Paper, Tabs, Tab } from '@mui/material';
import { QueueVisualizationContainer } from '../components/tree/QueueVisualizationContainer';
import { GlobalSettings } from '../components/global-settings';
import { useSchedulerStore } from '../store/schedulerStore';

const V4_TABS = [
    { label: 'Queue Tree', component: QueueVisualizationContainer },
    { label: 'Global Settings', component: GlobalSettings },
];

export function V4Demo(): React.ReactElement {
    const [activeTab, setActiveTab] = useState(0);
    const loadInitialData = useSchedulerStore(state => state.loadInitialData);
    const isLoading = useSchedulerStore(state => state.isLoading);
    const error = useSchedulerStore(state => state.error);

    React.useEffect(() => {
        // Load initial data when component mounts
        // The default store will use MSW mock data in development
        loadInitialData().catch(err => {
            console.error('Failed to load v4 data:', err);
        });
    }, [loadInitialData]);

    const ActiveComponent = V4_TABS[activeTab].component;

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <Paper sx={{ p: 2, borderRadius: 0 }} elevation={0}>
                <Typography variant="h6" gutterBottom>
                    V4 Implementation (Preview)
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    This is a preview of the new v4 implementation using React Flow v12, Zustand store, and TypeScript.
                    {isLoading && ' Loading...'}
                    {error && ` Error: ${error}`}
                </Typography>
            </Paper>

            {/* V4 Tab Navigation */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
                    {V4_TABS.map((tab, index) => (
                        <Tab key={index} label={tab.label} />
                    ))}
                </Tabs>
            </Box>

            {/* Content */}
            <Box sx={{ flexGrow: 1, position: 'relative' }}>
                <ActiveComponent />
            </Box>
        </Box>
    );
}