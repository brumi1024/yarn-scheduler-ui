import { GlobalSettings } from '~/components/global-settings/GlobalSettings';

export default function GlobalSettingsRoute() {
  return (
    <div className="h-full overflow-auto p-6">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-2 text-2xl font-semibold">Global Settings</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Configure global scheduler settings
        </p>
        <GlobalSettings />
      </div>
    </div>
  );
}