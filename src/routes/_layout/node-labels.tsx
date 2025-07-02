import { createFileRoute } from '@tanstack/react-router';
import { NodeLabels } from '../../components/node-labels';

export const Route = createFileRoute('/_layout/node-labels')({
  component: NodeLabelsComponent,
});

function NodeLabelsComponent() {
  return <NodeLabels />;
}