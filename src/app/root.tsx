import { Links, Meta, Outlet, Scripts, ScrollRestoration } from 'react-router';
import { Toaster } from '~/components/ui/sonner';
import { ThemeProvider } from '~/components/providers/theme-provider';
import { ValidationProvider } from '~/contexts/ValidationContext';

import './app.css';

// eslint-disable-next-line react-refresh/only-export-components
export { links } from './root.links';

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body suppressHydrationWarning>
        <ThemeProvider defaultTheme="system" storageKey="yarn-scheduler-theme">
          {children}
          <Toaster />
        </ThemeProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return (
    <ValidationProvider>
      <Outlet />
    </ValidationProvider>
  );
}
