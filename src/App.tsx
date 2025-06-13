import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { theme } from './theme';
import MainLayout from './components/MainLayout';
import { StoreProvider } from './store/StoreProvider';

function App() {
    return (
        <StoreProvider>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                <MainLayout />
            </ThemeProvider>
        </StoreProvider>
    );
}

export default App;
