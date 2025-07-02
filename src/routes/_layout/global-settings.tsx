import { createFileRoute } from '@tanstack/react-router';
import { GlobalSettings } from '../../components/global-settings';

export const Route = createFileRoute('/_layout/global-settings')({
  component: GlobalSettingsComponent,
});

function GlobalSettingsComponent() {
  return <GlobalSettings />;
}