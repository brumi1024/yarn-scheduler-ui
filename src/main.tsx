import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// Create a client
const queryClient = new QueryClient();

// Start mock service worker in development
async function enableMocking() {
    if (process.env.NODE_ENV === 'development') {
        const { worker } = await import('./api/mocks/browser');
        await worker.start({
            onUnhandledRequest: 'warn',
            serviceWorker: {
                url: '/mockServiceWorker.js',
            },
        });
        console.log('🔄 Mock Service Worker started');
    }
}

enableMocking().then(() => {
    createRoot(document.getElementById('root')!).render(
        <StrictMode>
            <QueryClientProvider client={queryClient}>
                <App />
                <ReactQueryDevtools initialIsOpen={false} />
            </QueryClientProvider>
        </StrictMode>
    );
});
