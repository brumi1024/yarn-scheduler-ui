import { Box, AppBar, Toolbar, Typography } from '@mui/material';
import { useState } from 'react';
import TabNavigation from './TabNavigation';
import StatusBar from './StatusBar';
import QueueEditor from '../features/QueueEditor';
import GlobalSettings from '../features/GlobalSettings';
import NodeLabels from '../features/NodeLabels';
import Diagnostics from '../features/Diagnostics';

const TAB_COMPONENTS = [QueueEditor, GlobalSettings, NodeLabels, Diagnostics];

export default function MainLayout() {
    const [activeTab, setActiveTab] = useState(0);

    const ActiveComponent = TAB_COMPONENTS[activeTab];

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
            <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

            {/* Content Area */}
            <Box
                sx={{
                    flexGrow: 1,
                    overflow: 'auto',
                    backgroundColor: 'background.default',
                    minHeight: 0, // Allows flex child to shrink
                }}
                role="tabpanel"
                id={`tabpanel-${activeTab}`}
                aria-labelledby={`tab-${activeTab}`}
            >
                <ActiveComponent />
            </Box>

            {/* Status Bar */}
            <StatusBar />
        </Box>
    );
}
