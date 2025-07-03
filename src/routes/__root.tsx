import { createRootRoute, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';
import CssBaseline from '@mui/material/CssBaseline';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { PropertyPanel } from '../components/property-panel/PropertyPanel';
import { StagedChangesPanel } from '../components/staged-changes';
import { NotificationProvider } from '../components/notifications/NotificationProvider';
import { TanStackRouterAppProvider } from '@toolpad/core/tanstack-router';
import type { Navigation } from '@toolpad/core/AppProvider';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import LabelIcon from '@mui/icons-material/Label';
import SettingsIcon from '@mui/icons-material/Settings';
import { useState } from 'react';

const NAVIGATION: Navigation = [
  {
    kind: 'header',
    title: 'YARN Scheduler UI',
  },
  {
    segment: '',
    title: 'Queues',
    icon: <AccountTreeIcon />,
  },
  {
    segment: 'node-labels',
    title: 'Node Labels',
    icon: <LabelIcon />,
  },
  {
    segment: 'global-settings',
    title: 'Global' +
        ' Settings',
    icon: <SettingsIcon />,
  },
];

const BRANDING = {
  title: 'YARN Capacity Scheduler',
};

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  const [stagedChangesPanelOpen, setStagedChangesPanelOpen] = useState(false);

  const handleOpenStagedChanges = () => {
    setStagedChangesPanelOpen(true);
  };

  const handleCloseStagedChanges = () => {
    setStagedChangesPanelOpen(false);
  };

  return (
    <ErrorBoundary>
      <CssBaseline />
      <NotificationProvider>
        <TanStackRouterAppProvider 
          navigation={NAVIGATION} 
          branding={BRANDING}
        >
          <Outlet />
          <PropertyPanel />

        {/* Staged Changes Panel */}
        <StagedChangesPanel 
          open={stagedChangesPanelOpen}
          onClose={handleCloseStagedChanges}
          onOpen={handleOpenStagedChanges}
        />
        
        <TanStackRouterDevtools />
        </TanStackRouterAppProvider>
      </NotificationProvider>
    </ErrorBoundary>
  );
}