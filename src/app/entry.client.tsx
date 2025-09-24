import { HydratedRouter } from 'react-router/dom';
import { startTransition, StrictMode } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { API_CONFIG } from '~/lib/api/config';

async function enableMocking() {
  if (!import.meta.env.DEV) {
    return;
  }

  if (API_CONFIG.mockMode !== 'static') {
    return;
  }

  const { worker } = await import('~/lib/api/mocks/browser');

  // Start the worker
  return worker.start({
    onUnhandledRequest: 'bypass',
  });
}

enableMocking().then(() => {
  startTransition(() => {
    hydrateRoot(
      document,
      <StrictMode>
        <HydratedRouter />
      </StrictMode>,
    );
  });
});
