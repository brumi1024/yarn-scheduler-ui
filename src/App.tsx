import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { useEffect } from 'react';
import { theme } from './theme';
import MainLayout from './components/MainLayout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useSchedulerStore } from './store/schedulerStore';

function App() {
    const loadInitialData = useSchedulerStore((state) => state.loadInitialData);

    useEffect(() => {
        // Initialize V4 scheduler store data when app starts
        loadInitialData().catch((error) => {
            console.error('Failed to load initial data:', error);
        });
    }, [loadInitialData]);

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
