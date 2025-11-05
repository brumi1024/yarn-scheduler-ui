import { GlobalSettings } from '~/features/global-settings/components/GlobalSettings';

// eslint-disable-next-line react-refresh/only-export-components
export { meta } from './global-settings.meta';

export default function GlobalSettingsRoute() {
  return (
    <div className="h-full overflow-auto p-6">
      <div className="mx-auto max-w-4xl">
        <GlobalSettings />
      </div>
    </div>
  );
}
