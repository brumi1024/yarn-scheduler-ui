import { useEffect } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { theme } from './theme';
import MainLayout from './components/MainLayout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useDataStore } from './store/dataStore';

function App() {
    const loadAllData = useDataStore(state => state.loadAllData);
    
    useEffect(() => {
        loadAllData();
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
