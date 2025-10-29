import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const openCapacityEditor = vi.fn();
const mockStore = {
  openCapacityEditor,
  selectedNodeLabelFilter: 'legacy',
};

vi.mock('~/stores/schedulerStore', () => ({
  useSchedulerStore: (selector: (state: typeof mockStore) => unknown) => selector(mockStore),
}));

import { useCapacityEditor } from './useCapacityEditor';

describe('useCapacityEditor', () => {
  beforeEach(() => {
    openCapacityEditor.mockClear();
    mockStore.selectedNodeLabelFilter = 'legacy';
  });

  it('resolves origin queue path when one is not supplied', () => {
    const { result } = renderHook(() => useCapacityEditor());

    act(() => {
      result.current.openCapacityEditor({
        origin: 'context-menu',
        parentQueuePath: 'root',
        originQueueName: 'analytics',
      });
    });

    expect(openCapacityEditor).toHaveBeenCalledWith(
      expect.objectContaining({
        originQueuePath: 'root.analytics',
        selectedNodeLabel: 'legacy',
      }),
    );
  });

  it('respects supplied queue path and label override', () => {
    const { result } = renderHook(() => useCapacityEditor());

    act(() => {
      result.current.openCapacityEditor({
        origin: 'add-queue',
        parentQueuePath: 'root.department',
        originQueuePath: 'root.department.new',
        originQueueName: 'new',
        selectedNodeLabel: 'sales',
        capacityValue: '10',
        maxCapacityValue: '50',
        markOriginAsNew: true,
        queueState: 'RUNNING',
      });
    });

    expect(openCapacityEditor).toHaveBeenCalledWith({
      origin: 'add-queue',
      parentQueuePath: 'root.department',
      originQueuePath: 'root.department.new',
      originQueueName: 'new',
      originQueueState: 'RUNNING',
      originInitialCapacity: '10',
      originInitialMaxCapacity: '50',
      originIsNew: true,
      selectedNodeLabel: 'sales',
    });
  });
});
