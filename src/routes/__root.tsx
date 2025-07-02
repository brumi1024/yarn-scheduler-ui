import { createRootRoute, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { theme } from '../theme';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { PropertyPanel } from '../components/property-panel/PropertyPanel';
import { TanStackRouterAppProvider } from '@toolpad/core/tanstack-router';
import type { Navigation } from '@toolpad/core/AppProvider';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import LabelIcon from '@mui/icons-material/Label';
import SettingsIcon from '@mui/icons-material/Settings';

const NAVIGATION: Navigation = [
  {
    kind: 'header',
    title: 'YARN Scheduler',
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
  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <TanStackRouterAppProvider navigation={NAVIGATION} branding={BRANDING}>
          <Outlet />
          <PropertyPanel />
          <TanStackRouterDevtools />
        </TanStackRouterAppProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}