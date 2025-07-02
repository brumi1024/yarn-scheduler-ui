import { createRootRoute, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { theme } from '../theme';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { PropertyPanel } from '../components/property-panel/PropertyPanel';

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Outlet />
        <PropertyPanel />
        <TanStackRouterDevtools />
      </ThemeProvider>
    </ErrorBoundary>
  );
}