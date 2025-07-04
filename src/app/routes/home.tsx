import { QueueVisualizationContainer } from '~/features/queue-management/components/QueueVisualizationContainer';
import { PropertyPanel } from '~/features/property-editor/components/PropertyPanel';

// eslint-disable-next-line react-refresh/only-export-components
export { meta } from './home.meta';

export default function Home() {
  return (
    <>
      <QueueVisualizationContainer />
      <PropertyPanel />
    </>
  );
}
