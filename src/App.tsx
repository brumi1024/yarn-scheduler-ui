import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { useEffect } from 'react';
import { theme } from './theme';
import MainLayout from './components/MainLayout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useDataStore } from './store/dataStore';

function App() {
    const loadAllData = useDataStore((state) => state.loadAllData);

    useEffect(() => {
        // Initialize data when app starts
        loadAllData().catch((error) => {
            console.error('Failed to load initial data:', error);
        });
    }, [loadAllData]);

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
