import { createFileRoute } from '@tanstack/react-router';
import { GlobalSettings } from '../components/global-settings';
import { AppLayout } from '../components/AppLayout';

export const Route = createFileRoute('/global-settings')({
  component: GlobalSettingsComponent,
});

function GlobalSettingsComponent() {
  return (
    <AppLayout>
      <GlobalSettings />
    </AppLayout>
  );
}