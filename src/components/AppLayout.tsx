import React, { useEffect } from 'react';
import { Box, Tabs, Tab, Container, AppBar, Toolbar, Typography } from '@mui/material';
import clsx from 'clsx';
import { useNavigate, useLocation } from '@tanstack/react-router';
import { useSchedulerStore } from '../store/schedulerStore';

interface AppLayoutProps {
  children: React.ReactNode;
}

const tabs = [
  { id: 'queues', label: 'Queue Management' },
  { id: 'nodeLabels', label: 'Node Labels' },
  { id: 'globalSettings', label: 'Global Settings' },
] as const;

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const loadInitialData = useSchedulerStore((state) => state.loadInitialData);

  useEffect(() => {
    // Initialize V4 scheduler store data when app starts
    loadInitialData().catch((error) => {
      console.error('Failed to load initial data:', error);
    });
  }, [loadInitialData]);

  const navigate = useNavigate();
  const location = useLocation();

  // Determine active tab based on current route
  const getActiveTab = () => {
    if (location.pathname.startsWith('/node-labels')) return 'nodeLabels';
    if (location.pathname.startsWith('/global-settings')) return 'globalSettings';
    return 'queues'; // Default for / and /queue routes
  };

  const currentActiveTab = getActiveTab();

  const handleTabChange = (event: React.SyntheticEvent, newValue: string) => {
    const routeMap = {
      queues: '/',
      nodeLabels: '/node-labels',
      globalSettings: '/global-settings',
    };
    
    const targetRoute = routeMap[newValue as keyof typeof routeMap];
    if (targetRoute) {
      navigate({ to: targetRoute }).catch((error) => {
        console.error('Failed to navigate to:', targetRoute, error);
      });
    }
  };

  return (
    <Box className={clsx('app-layout')} sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* App Bar */}
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            YARN Capacity Scheduler
          </Typography>
        </Toolbar>
      </AppBar>
      
      {/* Navigation Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', backgroundColor: 'background.paper' }}>
        <Container maxWidth={false}>
          <Tabs
            value={currentActiveTab}
            onChange={handleTabChange}
            aria-label="Navigation tabs"
          >
            {tabs.map((tab) => (
              <Tab
                key={tab.id}
                label={tab.label}
                value={tab.id}
                className={clsx('nav-tab', { 'active': currentActiveTab === tab.id })}
              />
            ))}
          </Tabs>
        </Container>
      </Box>
      
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        {children}
      </Box>
    </Box>
  );
};