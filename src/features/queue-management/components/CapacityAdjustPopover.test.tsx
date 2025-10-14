import React from 'react';
import { describe, it, beforeEach, expect, vi } from 'vitest';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import { CapacityAdjustPopover } from './CapacityAdjustPopover';
import type { QueueInfo } from '~/types';
import type { StagedChange } from '~/types/staged-change';

vi.mock('~/stores/schedulerStore', () => {
  const stateRef: { current: any } = { current: {} };

  const useSchedulerStore = (selector?: (state: any) => any) => {
    if (typeof selector === 'function') {
      return selector(stateRef.current);
    }
    return stateRef.current;
  };

  (useSchedulerStore as any).setState = (partial: any) => {
    if (typeof partial === 'function') {
      stateRef.current = partial(stateRef.current);
    } else {
      stateRef.current = { ...stateRef.current, ...partial };
    }
  };

  (useSchedulerStore as any).__setState = (next: any) => {
    stateRef.current = next;
  };

  return { useSchedulerStore };
});

import { useSchedulerStore } from '~/stores/schedulerStore';

const setSchedulerStoreState = (next: any) => {
  (useSchedulerStore as any).__setState(next);
};

const makeLeafQueue = (queueName: string, queuePath: string): QueueInfo => ({
  queueType: 'leaf',
  queueName,
  queuePath,
  capacity: 0,
  usedCapacity: 0,
  maxCapacity: 100,
  absoluteCapacity: 0,
  absoluteMaxCapacity: 100,
  absoluteUsedCapacity: 0,
  numApplications: 0,
  numActiveApplications: 0,
  numPendingApplications: 0,
  state: 'RUNNING',
  resourcesUsed: {
    memory: 0,
    vCores: 0,
  },
});

const ACTIVE_QUEUE_PATH = 'root.parent.active';
const SIBLING_QUEUE_PATH = 'root.parent.sibling';
const PARENT_QUEUE_PATH = 'root.parent';

const activeQueueInfo = makeLeafQueue('active', ACTIVE_QUEUE_PATH);
const siblingQueueInfo = makeLeafQueue('sibling', SIBLING_QUEUE_PATH);

const parentQueue: QueueInfo = {
  queueType: 'parent',
  queueName: 'parent',
  queuePath: PARENT_QUEUE_PATH,
  capacity: 0,
  usedCapacity: 0,
  maxCapacity: 100,
  absoluteCapacity: 0,
  absoluteMaxCapacity: 100,
  absoluteUsedCapacity: 0,
  numApplications: 0,
  numActiveApplications: 0,
  numPendingApplications: 0,
  state: 'RUNNING',
  queues: { queue: [activeQueueInfo, siblingQueueInfo] },
  resourcesUsed: {
    memory: 0,
    vCores: 0,
  },
};

type MockOptions = {
  stagedChanges?: StagedChange[];
  config?: Record<string, string>;
};

const createMockStoreState = (options: MockOptions = {}) => {
  const { stagedChanges = [], config = {} } = options;

  const baseConfig: Record<string, string> = {
    [`${ACTIVE_QUEUE_PATH}.capacity`]: '50%',
    [`${ACTIVE_QUEUE_PATH}.maximum-capacity`]: '60%',
    [`${SIBLING_QUEUE_PATH}.capacity`]: '40%',
    [`${SIBLING_QUEUE_PATH}.maximum-capacity`]: '60%',
    ...config,
  };

  return {
    stagedChanges,
    getQueueByPath: vi.fn((path: string) => {
      if (path === PARENT_QUEUE_PATH) {
        return parentQueue;
      }
      if (path === ACTIVE_QUEUE_PATH) {
        return activeQueueInfo;
      }
      if (path === SIBLING_QUEUE_PATH) {
        return siblingQueueInfo;
      }
      return null;
    }),
    getQueuePropertyValue: vi.fn((queuePath: string, property: string) => {
      const staged = stagedChanges.find(
        (change) => change.queuePath === queuePath && change.property === property,
      );

      if (staged && staged.newValue !== undefined) {
        return { value: staged.newValue, isStaged: true };
      }

      const key = `${queuePath}.${property}`;
      return { value: baseConfig[key] ?? '', isStaged: false };
    }),
  };
};

describe('CapacityAdjustPopover', () => {
  beforeEach(() => {
    setSchedulerStoreState(createMockStoreState());
  });

  it('prefills sibling inputs with staged values', async () => {
    const stagedCapacity: StagedChange = {
      id: 'staged-capacity',
      type: 'update',
      queuePath: SIBLING_QUEUE_PATH,
      property: 'capacity',
      oldValue: '40%',
      newValue: '70%',
      timestamp: Date.now(),
    };

    const stagedMax: StagedChange = {
      id: 'staged-max',
      type: 'update',
      queuePath: SIBLING_QUEUE_PATH,
      property: 'maximum-capacity',
      oldValue: '60%',
      newValue: '80%',
      timestamp: Date.now(),
    };

    setSchedulerStoreState(
      createMockStoreState({
        stagedChanges: [stagedCapacity, stagedMax],
      }),
    );

    render(
      <CapacityAdjustPopover
        parentQueuePath={PARENT_QUEUE_PATH}
        activeQueuePath={ACTIVE_QUEUE_PATH}
        activeQueueName="active"
        capacityValue="55%"
        maxCapacityValue="65%"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /adjust siblings/i }));

    const stagedInput = await screen.findByDisplayValue('70%');
    expect(stagedInput).toBeInTheDocument();
    expect(screen.getByText(/Base: 70%/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue('80%')).toBeInTheDocument();
    expect(screen.getByText(/Base: 80%/i)).toBeInTheDocument();
  });

  it('applies changes without resetting active queue values and invokes callbacks with final values', async () => {
    const onApply = vi.fn().mockResolvedValue(undefined);
    const onActiveQueueChange = vi.fn();

    render(
      <CapacityAdjustPopover
        parentQueuePath={PARENT_QUEUE_PATH}
        activeQueuePath={ACTIVE_QUEUE_PATH}
        activeQueueName="active"
        capacityValue="50%"
        maxCapacityValue="60%"
        onApply={onApply}
        onActiveQueueChange={onActiveQueueChange}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /adjust siblings/i }));

    await screen.findByText(/Sibling capacities/i);

    const activeCapacityInput = document.getElementById(
      `${ACTIVE_QUEUE_PATH}-capacity`,
    ) as HTMLInputElement;
    const activeMaxInput = document.getElementById(
      `${ACTIVE_QUEUE_PATH}-max-capacity`,
    ) as HTMLInputElement;
    const siblingCapacityInput = document.getElementById(
      `${SIBLING_QUEUE_PATH}-capacity`,
    ) as HTMLInputElement;

    fireEvent.change(activeCapacityInput, { target: { value: '55%' } });
    fireEvent.change(activeMaxInput, { target: { value: '65%' } });
    fireEvent.change(siblingCapacityInput, { target: { value: '70%' } });

    fireEvent.click(screen.getByRole('button', { name: /apply adjustments/i }));

    await waitFor(() => expect(onApply).toHaveBeenCalled());

    const lastActiveChangeCall = onActiveQueueChange.mock.calls.at(-1)?.[0];
    expect(lastActiveChangeCall).toEqual({
      capacity: '55%',
      maxCapacity: '65%',
    });

    const validationOverrides = onActiveQueueChange.mock.calls.at(-1)?.[1]?.validationOverrides;
    expect(validationOverrides).toEqual(
      expect.arrayContaining([
        { queuePath: ACTIVE_QUEUE_PATH, field: 'capacity', value: '55%' },
        { queuePath: ACTIVE_QUEUE_PATH, field: 'maximum-capacity', value: '65%' },
        { queuePath: SIBLING_QUEUE_PATH, field: 'capacity', value: '70%' },
      ]),
    );

    expect(onApply).toHaveBeenCalledWith({
      [SIBLING_QUEUE_PATH]: { capacity: '70%' },
      [ACTIVE_QUEUE_PATH]: { capacity: '55%', maxCapacity: '65%' },
    });
  });

  it('revalidates active queue even when only sibling adjustments are made', async () => {
    const onApply = vi.fn().mockResolvedValue(undefined);
    const onActiveQueueChange = vi.fn();

    render(
      <CapacityAdjustPopover
        parentQueuePath={PARENT_QUEUE_PATH}
        activeQueuePath={ACTIVE_QUEUE_PATH}
        activeQueueName="active"
        capacityValue="50%"
        maxCapacityValue="60%"
        onApply={onApply}
        onActiveQueueChange={onActiveQueueChange}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /adjust siblings/i }));

    await screen.findByText(/Sibling capacities/i);

    const siblingCapacityInput = document.getElementById(
      `${SIBLING_QUEUE_PATH}-capacity`,
    ) as HTMLInputElement;

    fireEvent.change(siblingCapacityInput, { target: { value: '55%' } });

    fireEvent.click(screen.getByRole('button', { name: /apply adjustments/i }));

    await waitFor(() => expect(onApply).toHaveBeenCalled());

    expect(onActiveQueueChange).toHaveBeenCalled();

    const lastCall = onActiveQueueChange.mock.calls.at(-1)?.[0];
    expect(lastCall).toEqual({
      capacity: '50%',
      maxCapacity: '60%',
    });

    const overrides = onActiveQueueChange.mock.calls.at(-1)?.[1]?.validationOverrides;
    expect(overrides).toEqual(
      expect.arrayContaining([{ queuePath: SIBLING_QUEUE_PATH, field: 'capacity', value: '55%' }]),
    );

    expect(onApply).toHaveBeenCalledWith({
      [SIBLING_QUEUE_PATH]: { capacity: '55%' },
    });
  });
});
