import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { theme } from './theme';
import MainLayout from './components/MainLayout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useScheduler, useConfiguration, useNodeLabels, useNodes } from './hooks/useApiWithZustand';

function App() {
    // Initialize data loading for all stores
    useScheduler();
    useConfiguration();
    useNodeLabels();
    useNodes();

    return (
        <ErrorBoundary>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                <MainLayout />
            </ThemeProvider>
        </ErrorBoundary>
    );
}

export default App;
