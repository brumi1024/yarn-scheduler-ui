import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { useEffect } from 'react';
import { theme } from './theme';
import MainLayout from './components/MainLayout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useConfigStore } from './store/configStore';
import { useRuntimeStore } from './store/runtimeStore';

function App() {
    const loadConfiguration = useConfigStore((state) => state.loadConfiguration);
    const loadAllRuntimeData = useRuntimeStore((state) => state.loadAllData);

    useEffect(() => {
        // Initialize both config and runtime data when app starts
        Promise.all([loadConfiguration(), loadAllRuntimeData()]).catch((error) => {
            console.error('Failed to load initial data:', error);
        });
    }, [loadConfiguration, loadAllRuntimeData]);

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
