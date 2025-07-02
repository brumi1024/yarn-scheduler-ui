import { createFileRoute } from '@tanstack/react-router';
import { QueueVisualizationContainer } from '../components/tree/QueueVisualizationContainer';
import { AppLayout } from '../components/AppLayout';

export const Route = createFileRoute('/')({
  component: HomeComponent,
});

function HomeComponent() {
  return (
    <AppLayout>
      <QueueVisualizationContainer />
    </AppLayout>
  );
}