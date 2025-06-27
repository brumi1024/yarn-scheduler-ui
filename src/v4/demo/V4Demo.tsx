import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { QueueVisualizationContainer } from '../components/tree/QueueVisualizationContainer';
import { useSchedulerStore } from '../store/schedulerStore';

export function V4Demo(): React.ReactElement {
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

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <Paper sx={{ p: 2, borderRadius: 0 }} elevation={0}>
                <Typography variant="h6" gutterBottom>
                    V4 Queue Tree Visualization (Preview)
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    This is a preview of the new v4 implementation using React Flow v12, Zustand store, and TypeScript.
                    {isLoading && ' Loading...'}
                    {error && ` Error: ${error}`}
                </Typography>
            </Paper>

            {/* Tree Visualization */}
            <Box sx={{ flexGrow: 1, position: 'relative' }}>
                <QueueVisualizationContainer />
            </Box>
        </Box>
    );
}