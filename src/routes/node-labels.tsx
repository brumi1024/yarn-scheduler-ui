import { createFileRoute } from '@tanstack/react-router';
import { NodeLabels } from '../components/node-labels';
import { AppLayout } from '../components/AppLayout';

export const Route = createFileRoute('/node-labels')({
  component: NodeLabelsComponent,
});

function NodeLabelsComponent() {
  return (
    <AppLayout>
      <NodeLabels />
    </AppLayout>
  );
}