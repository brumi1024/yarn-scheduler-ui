import { NodeLabels } from '~/features/node-labels/components/NodeLabels';

// eslint-disable-next-line react-refresh/only-export-components
export { meta } from './node-labels.meta';

export default function NodeLabelsRoute() {
  return (
    <div className="h-full overflow-auto p-6">
      <NodeLabels />
    </div>
  );
}
