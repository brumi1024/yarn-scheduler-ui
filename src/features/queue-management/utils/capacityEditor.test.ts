import { describe, expect, it } from 'vitest';
import type { SchedulerStore } from '~/stores/schedulerStore';
import type { QueueInfo } from '~/types';
import type { StagedChange } from '~/types/staged-change';
import { buildCapacityEditorLabelOptions, buildCapacityEditorDrafts } from './capacityEditor';

describe('capacity editor utilities', () => {
  it('includes accessible labels and staged labels when building options', () => {
    const store = {
      getQueuePropertyValue: () => ({ value: 'gpu,fpga', isStaged: false }),
      nodeLabels: [
        { name: 'gpu', exclusivity: false },
        { name: 'fpga', exclusivity: false },
      ],
      stagedChanges: [],
    } as unknown as SchedulerStore;

    const options = buildCapacityEditorLabelOptions(store, 'root.parent');
    expect(options).toEqual([
      { value: '__DEFAULT_PARTITION__', label: 'Default partition' },
      { value: 'fpga', label: 'fpga' },
      { value: 'gpu', label: 'gpu' },
    ]);
  });

  it('adds staged labels when parent has empty accessible-node-labels', () => {
    const stagedChanges: StagedChange[] = [
      {
        id: 'change-1',
        type: 'update',
        queuePath: 'root.parent.child',
        property: 'accessible-node-labels.ssd.capacity',
        oldValue: undefined,
        newValue: '20',
        timestamp: Date.now(),
      },
    ];

    const store = {
      getQueuePropertyValue: () => ({ value: '', isStaged: false }),
      nodeLabels: [],
      stagedChanges,
    } as unknown as SchedulerStore;

    const options = buildCapacityEditorLabelOptions(store, 'root.parent');
    expect(options).toEqual([
      { value: '__DEFAULT_PARTITION__', label: 'Default partition' },
      { value: 'ssd', label: 'ssd' },
    ]);
  });

  it('builds drafts including staged additions and origin queue first', () => {
    const configData = new Map<string, string>([
      ['yarn.scheduler.capacity.root.parent.child.capacity', '50'],
      ['yarn.scheduler.capacity.root.parent.child.maximum-capacity', '100'],
    ]);

    const childQueue: QueueInfo = {
      queueName: 'child',
      queuePath: 'root.parent.child',
      queueType: 'leaf',
      capacity: 50,
      usedCapacity: 0,
      maxCapacity: 100,
      absoluteCapacity: 0,
      absoluteMaxCapacity: 0,
      absoluteUsedCapacity: 0,
      numApplications: 0,
      numActiveApplications: 0,
      numPendingApplications: 0,
      state: 'RUNNING',
      resourcesUsed: { memory: 0, vCores: 0 },
    };

    const stagedChanges: StagedChange[] = [
      {
        id: 'add-1',
        type: 'add',
        queuePath: 'root.parent.newChild',
        property: 'capacity',
        oldValue: undefined,
        newValue: '30',
        timestamp: Date.now(),
      },
      {
        id: 'add-2',
        type: 'add',
        queuePath: 'root.parent.newChild',
        property: 'maximum-capacity',
        oldValue: undefined,
        newValue: '60',
        timestamp: Date.now(),
      },
    ];

    const store = {
      configData,
      getChildQueues: (parentPath: string) => (parentPath === 'root.parent' ? [childQueue] : []),
      getQueuePropertyValue: (queuePath: string, property: string) => {
        if (queuePath === 'root.parent.child') {
          if (property === 'capacity') {
            return { value: '50', isStaged: false };
          }
          if (property === 'maximum-capacity') {
            return { value: '100', isStaged: false };
          }
        }
        if (queuePath === 'root.parent.newChild') {
          if (property === 'capacity') {
            return { value: '30', isStaged: true };
          }
          if (property === 'maximum-capacity') {
            return { value: '60', isStaged: true };
          }
        }
        return { value: '', isStaged: false };
      },
      stagedChanges,
    } as unknown as SchedulerStore;

    const drafts = buildCapacityEditorDrafts({
      store,
      parentQueuePath: 'root.parent',
      originQueuePath: 'root.parent.child',
      originQueueName: 'child',
      originInitialCapacity: null,
      originInitialMaxCapacity: null,
      originIsNew: false,
      selectedNodeLabel: null,
    });

    expect(drafts).toHaveLength(2);
    expect(drafts[0].queuePath).toBe('root.parent.child');
    expect(drafts[0].isOrigin).toBe(true);
    expect(drafts[1].queuePath).toBe('root.parent.newChild');
    expect(drafts[1].isNew).toBe(true);
    expect(drafts[1].capacityValue).toBe('30');
    expect(drafts[1].maxCapacityValue).toBe('60');
  });
});
