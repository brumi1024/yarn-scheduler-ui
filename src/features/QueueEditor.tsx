import { Box, Typography } from '@mui/material';
import { QueueVisualization } from '../components/QueueVisualization';
import { ComponentErrorBoundary } from '../components/ErrorBoundary';
import { StagedChangesPanel } from '../components/StagedChangesPanel';

export default function QueueEditor() {
    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                overflow: 'hidden',
            }}
        >
            {/* Header */}
            <Box
                sx={{
                    p: 2,
                    borderBottom: 1,
                    borderColor: 'divider',
                    backgroundColor: 'background.paper',
                }}
            >
                <Typography variant="h5" component="h1">
                    Queue Visualization
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Interactive YARN Capacity Scheduler queue tree with pan, zoom, and selection
                </Typography>
            </Box>

            {/* Visualization Area */}
            <Box
                sx={{
                    flexGrow: 1,
                    position: 'relative',
                    minHeight: 0, // Important for flex children
                }}
            >
                <ComponentErrorBoundary context="Queue Visualization">
                    <QueueVisualization />
                </ComponentErrorBoundary>
                
                {/* Staged Changes Panel */}
                <StagedChangesPanel 
                    onApplyChanges={() => {
                        // TODO: Implement apply changes logic
                        console.log('Apply changes requested');
                    }}
                />
            </Box>
        </Box>
    );
}
