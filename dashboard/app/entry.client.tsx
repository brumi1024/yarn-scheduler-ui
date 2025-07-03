import { RemixBrowser } from "react-router";
import { startTransition, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";

async function enableMocking() {
  if (process.env.NODE_ENV !== 'development') {
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
        <RemixBrowser />
      </StrictMode>
    );
  });
});