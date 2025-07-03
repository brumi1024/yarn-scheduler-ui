import { GlobalSettings } from '~/components/global-settings/GlobalSettings';

export default function GlobalSettingsRoute() {
  return (
    <div className="h-full overflow-auto p-6">
      <div className="mx-auto max-w-4xl">
        <GlobalSettings />
      </div>
    </div>
  );
}