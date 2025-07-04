import { GlobalSettings } from '~/features/global-settings/components/GlobalSettings';

export default function GlobalSettingsRoute() {
  return (
    <div className="h-full overflow-auto p-6">
      <div className="mx-auto max-w-4xl">
        <GlobalSettings />
      </div>
    </div>
  );
}