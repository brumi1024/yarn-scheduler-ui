import { useMemo } from 'react';
import { useSchedulerStore } from '~/stores/schedulerStore';
import { buildComparisonData } from '../utils/comparison';
import type { ComparisonData } from '../utils/comparison';

export const useQueueComparison = (): {
  comparisonData: ComparisonData | null;
  isComparing: boolean;
  selectedCount: number;
} => {
  const { comparisonQueues, getComparisonData, canCompareQueues } = useSchedulerStore();

  const comparisonData = useMemo(() => {
    if (!canCompareQueues()) return null;

    const configs = getComparisonData();
    return buildComparisonData(configs);
  }, [getComparisonData, canCompareQueues]);

  return {
    comparisonData,
    isComparing: canCompareQueues(),
    selectedCount: comparisonQueues.length,
  };
};
