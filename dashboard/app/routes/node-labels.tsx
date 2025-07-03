import { NodeLabels } from '~/components/node-labels/NodeLabels';

export default function NodeLabelsRoute() {
  return (
    <div className="h-full overflow-auto p-6">
      <NodeLabels />
    </div>
  );
}