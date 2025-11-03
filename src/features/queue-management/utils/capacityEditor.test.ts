import { describe, expect, it } from 'vitest';
import type { SchedulerStore } from '~/stores/schedulerStore';
import type { QueueInfo } from '~/types';
import type { StagedChange } from '~/types/staged-change';
import { buildCapacityEditorLabelOptions, buildCapacityEditorDrafts } from './capacityEditor';

describe('capacity editor utilities', () => {
  it('includes accessible labels and staged labels when building options', () => {
    const configData = new Map<string, string>();
    const store = {
      getQueuePropertyValue: () => ({ value: 'gpu,fpga', isStaged: false }),
      getQueueByPath: (queuePath: string) =>
        ({
          queuePath,
          queueName: queuePath.split('.').pop() || queuePath,
          nodeLabels: ['gpu', 'fpga'],
        }) as unknown as QueueInfo,
      nodeLabels: [
        { name: 'gpu', exclusivity: false },
        { name: 'fpga', exclusivity: false },
      ],
      stagedChanges: [],
      configData,
    } as unknown as SchedulerStore;

    const result = buildCapacityEditorLabelOptions(store, 'root.parent', null);
    expect(result.options).toEqual([
      { value: '__DEFAULT_PARTITION__', label: 'Default partition' },
      { value: 'fpga', label: 'fpga' },
      { value: 'gpu', label: 'gpu' },
    ]);
    expect(result.labelsWithoutAccess.size).toBe(0);
  });

  it('adds configured labels even when queue has no access to them', () => {
    const configData = new Map<string, string>([
      ['yarn.scheduler.capacity.root.parent.accessible-node-labels.ssd.capacity', '20'],
    ]);

    const store = {
      getQueuePropertyValue: () => ({ value: '', isStaged: false }),
      getQueueByPath: (queuePath: string) =>
        ({
          queuePath,
          queueName: queuePath.split('.').pop() || queuePath,
          nodeLabels: [], // Queue has no access to any labels
        }) as unknown as QueueInfo,
      nodeLabels: [],
      stagedChanges: [],
      configData,
    } as unknown as SchedulerStore;

    const result = buildCapacityEditorLabelOptions(store, 'root.parent', null);
    expect(result.options).toEqual([
      { value: '__DEFAULT_PARTITION__', label: 'Default partition' },
      { value: 'ssd', label: 'ssd' },
    ]);
    // ssd should be marked as without access
    expect(result.labelsWithoutAccess.has('ssd')).toBe(true);
  });

  it('shows all system labels when queue has wildcard access', () => {
    const configData = new Map<string, string>();
    const store = {
      getQueuePropertyValue: () => ({ value: '', isStaged: false }),
      getQueueByPath: (queuePath: string) =>
        ({
          queuePath,
          queueName: queuePath.split('.').pop() || queuePath,
          nodeLabels: ['*'], // Wildcard means access to all labels
        }) as unknown as QueueInfo,
      nodeLabels: [
        { name: 'gpu', exclusivity: false },
        { name: 'fpga', exclusivity: false },
        { name: 'ssd', exclusivity: false },
      ],
      stagedChanges: [],
      configData,
    } as unknown as SchedulerStore;

    const result = buildCapacityEditorLabelOptions(store, 'root.parent', null);
    expect(result.options).toEqual([
      { value: '__DEFAULT_PARTITION__', label: 'Default partition' },
      { value: 'fpga', label: 'fpga' },
      { value: 'gpu', label: 'gpu' },
      { value: 'ssd', label: 'ssd' },
    ]);
    expect(result.labelsWithoutAccess.size).toBe(0);
  });

  it('includes currently selected label even if not accessible', () => {
    const configData = new Map<string, string>();
    const store = {
      getQueuePropertyValue: () => ({ value: '', isStaged: false }),
      getQueueByPath: (queuePath: string) =>
        ({
          queuePath,
          queueName: queuePath.split('.').pop() || queuePath,
          nodeLabels: ['gpu'], // Only has access to gpu
        }) as unknown as QueueInfo,
      nodeLabels: [
        { name: 'gpu', exclusivity: false },
        { name: 'fpga', exclusivity: false },
      ],
      stagedChanges: [],
      configData,
    } as unknown as SchedulerStore;

    // User has selected fpga which the queue doesn't have access to
    const result = buildCapacityEditorLabelOptions(store, 'root.parent', 'fpga');
    expect(result.options).toEqual([
      { value: '__DEFAULT_PARTITION__', label: 'Default partition' },
      { value: 'fpga', label: 'fpga' },
      { value: 'gpu', label: 'gpu' },
    ]);
    // fpga should be marked as without access
    expect(result.labelsWithoutAccess.has('fpga')).toBe(true);
    expect(result.labelsWithoutAccess.has('gpu')).toBe(false);
  });

  it('falls back to parent when queue has no nodeLabels', () => {
    const configData = new Map<string, string>();
    const store = {
      getQueuePropertyValue: () => ({ value: '', isStaged: false }),
      getQueueByPath: (queuePath: string) => {
        if (queuePath === 'root.parent.child') {
          return {
            queuePath,
            queueName: 'child',
            nodeLabels: undefined, // No nodeLabels, should fallback to parent
          } as unknown as QueueInfo;
        }
        if (queuePath === 'root.parent') {
          return {
            queuePath,
            queueName: 'parent',
            nodeLabels: ['gpu', 'fpga'], // Parent has these labels
          } as unknown as QueueInfo;
        }
        return null;
      },
      nodeLabels: [
        { name: 'gpu', exclusivity: false },
        { name: 'fpga', exclusivity: false },
      ],
      stagedChanges: [],
      configData,
    } as unknown as SchedulerStore;

    const result = buildCapacityEditorLabelOptions(store, 'root.parent.child', null);
    expect(result.options).toEqual([
      { value: '__DEFAULT_PARTITION__', label: 'Default partition' },
      { value: 'fpga', label: 'fpga' },
      { value: 'gpu', label: 'gpu' },
    ]);
    expect(result.labelsWithoutAccess.size).toBe(0);
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
