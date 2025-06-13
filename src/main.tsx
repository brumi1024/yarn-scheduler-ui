import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Start mock service worker in development
async function enableMocking() {
    if (process.env.NODE_ENV === 'development') {
        const { startMockService } = await import('./api/mocks/browser');
        return startMockService();
    }
}

enableMocking().then(() => {
    createRoot(document.getElementById('root')!).render(
        <StrictMode>
            <App />
        </StrictMode>
    );
});
