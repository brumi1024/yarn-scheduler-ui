import { SPECIAL_VALUES } from '~/types';
import { useSchedulerStore } from '~/stores/schedulerStore';
import type { CapacityEditorOrigin } from '~/stores/slices/capacityEditorSlice';

const resolveOriginQueuePath = (
  parentQueuePath: string,
  originQueuePath: string | undefined,
  originQueueName: string,
) => {
  if (originQueuePath && originQueuePath.trim().length > 0) {
    return originQueuePath;
  }

  const safeName = originQueueName.trim() || 'pending';
  if (parentQueuePath === SPECIAL_VALUES.ROOT_QUEUE_NAME) {
    return `${SPECIAL_VALUES.ROOT_QUEUE_NAME}.${safeName}`;
  }

  if (!parentQueuePath) {
    return safeName;
  }

  return `${parentQueuePath}.${safeName}`;
};

export interface LaunchCapacityEditorOptions {
  origin: CapacityEditorOrigin;
  parentQueuePath: string;
  originQueuePath?: string;
  originQueueName: string;
  capacityValue?: string | null;
  maxCapacityValue?: string | null;
  markOriginAsNew?: boolean;
  queueState?: string | null;
  selectedNodeLabel?: string | null;
}

export const useCapacityEditor = () => {
  const openCapacityEditorAction = useSchedulerStore((state) => state.openCapacityEditor);
  const selectedNodeLabelFilter = useSchedulerStore((state) => state.selectedNodeLabelFilter);

  return {
    openCapacityEditor: ({
      origin,
      parentQueuePath,
      originQueuePath,
      originQueueName,
      capacityValue = null,
      maxCapacityValue = null,
      markOriginAsNew = false,
      queueState = null,
      selectedNodeLabel,
    }: LaunchCapacityEditorOptions) => {
      const resolvedOriginPath = resolveOriginQueuePath(
        parentQueuePath,
        originQueuePath,
        originQueueName,
      );

      openCapacityEditorAction({
        origin,
        parentQueuePath,
        originQueuePath: resolvedOriginPath,
        originQueueName,
        originQueueState: queueState,
        originInitialCapacity: capacityValue,
        originInitialMaxCapacity: maxCapacityValue,
        originIsNew: Boolean(markOriginAsNew),
        selectedNodeLabel: selectedNodeLabel ?? selectedNodeLabelFilter ?? null,
      });
    },
  };
};
