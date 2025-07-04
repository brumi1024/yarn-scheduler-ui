import type { Route } from './+types/home';
import { QueueVisualizationContainer } from '~/features/queue-management/components/QueueVisualizationContainer';
import { PropertyPanel } from '~/features/property-editor/components/PropertyPanel';

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'YARN Scheduler UI' },
    { name: 'description', content: 'YARN Capacity Scheduler' },
  ];
}

export default function Home() {
  return (
    <>
      <QueueVisualizationContainer />
      <PropertyPanel />
    </>
  );
}
