import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);

// Start the worker in development mode
export async function startMockService() {
  if (process.env.NODE_ENV === 'development') {
    await worker.start({
      onUnhandledRequest: 'warn',
      serviceWorker: {
        url: '/mockServiceWorker.js'
      }
    });
    console.log('🔄 Mock Service Worker started');
  }
}