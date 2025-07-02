import { createFileRoute } from '@tanstack/react-router';
import { QueueVisualizationContainer } from '../../components/tree/QueueVisualizationContainer';

export const Route = createFileRoute('/_layout/')({
  component: HomeComponent,
});

function HomeComponent() {
  return <QueueVisualizationContainer />;
}