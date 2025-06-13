import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { theme } from './theme';
import MainLayout from './components/MainLayout';
import { StoreProvider } from './store/StoreProvider';
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
    return (
        <ErrorBoundary>
            <StoreProvider>
                <ThemeProvider theme={theme}>
                    <CssBaseline />
                    <MainLayout />
                </ThemeProvider>
            </StoreProvider>
        </ErrorBoundary>
    );
}

export default App;
