import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useYarnSchedulerStore } from '../yarnSchedulerStore';
import type { QueueNode, PropertyChange, NodeInfo } from '../types';

describe('YarnSchedulerStore', () => {
  beforeEach(() => {
    const store = useYarnSchedulerStore.getState();
    store.reset();
  });

  describe('Initial State', () => {
    it('should have null queue tree initially', () => {
      const { result } = renderHook(() => useYarnSchedulerStore());
      expect(result.current.queueTree).toBeNull();
    });

    it('should have empty original config initially', () => {
      const { result } = renderHook(() => useYarnSchedulerStore());
      expect(result.current.originalConfig).toEqual({});
    });

    it('should have empty property changes initially', () => {
      const { result } = renderHook(() => useYarnSchedulerStore());
      expect(result.current.propertyChanges.size).toBe(0);
    });

    it('should have empty property definitions initially', () => {
      const { result } = renderHook(() => useYarnSchedulerStore());
      expect(result.current.propertyDefinitions).toEqual([]);
    });

    it('should not be loading initially', () => {
      const { result } = renderHook(() => useYarnSchedulerStore());
      expect(result.current.loading).toBe(false);
    });

    it('should have idle commit status initially', () => {
      const { result } = renderHook(() => useYarnSchedulerStore());
      expect(result.current.commitStatus).toBe('idle');
    });
  });

  describe('Property Updates', () => {
    it('should stage property change when value differs from original', () => {
      const { result } = renderHook(() => useYarnSchedulerStore());
      
      act(() => {
        result.current.setOriginalConfig({
          'yarn.scheduler.capacity.root.capacity': '100'
        });
      });

      act(() => {
        result.current.updateProperty('yarn.scheduler.capacity.root.capacity', '90');
      });

      const change = result.current.propertyChanges.get('yarn.scheduler.capacity.root.capacity');
      expect(change).toEqual({
        originalValue: '100',
        stagedValue: '90'
      });
    });

    it('should remove property change when value matches original', () => {
      const { result } = renderHook(() => useYarnSchedulerStore());
      
      act(() => {
        result.current.setOriginalConfig({
          'yarn.scheduler.capacity.root.capacity': '100'
        });
      });

      act(() => {
        result.current.updateProperty('yarn.scheduler.capacity.root.capacity', '90');
      });

      expect(result.current.propertyChanges.size).toBe(1);

      act(() => {
        result.current.updateProperty('yarn.scheduler.capacity.root.capacity', '100');
      });

      expect(result.current.propertyChanges.size).toBe(0);
    });

    it('should track new property that does not exist in original config', () => {
      const { result } = renderHook(() => useYarnSchedulerStore());

      act(() => {
        result.current.updateProperty('yarn.scheduler.capacity.root.new-queue.capacity', '25');
      });

      const change = result.current.propertyChanges.get('yarn.scheduler.capacity.root.new-queue.capacity');
      expect(change).toEqual({
        originalValue: undefined,
        stagedValue: '25'
      });
    });
  });

  describe('Selectors', () => {
    it('should return false for hasChanges when no changes exist', () => {
      const { result } = renderHook(() => useYarnSchedulerStore());
      expect(result.current.hasChanges()).toBe(false);
    });

    it('should return true for hasChanges when property changes exist', () => {
      const { result } = renderHook(() => useYarnSchedulerStore());

      act(() => {
        result.current.updateProperty('test.property', 'value');
      });

      expect(result.current.hasChanges()).toBe(true);
    });

    it('should return true for hasChanges when node label changes exist', () => {
      const { result } = renderHook(() => useYarnSchedulerStore());

      const mockNodes: Map<string, NodeInfo> = new Map([
        ['node-1', { nodeLabels: [] } as NodeInfo]
      ]);

      act(() => {
        result.current.setNodes(mockNodes);
      });

      act(() => {
        result.current.assignNodeLabel('node-1', 'gpu');
      });

      expect(result.current.hasChanges()).toBe(true);
    });

    it('should get property value with original and staged values', () => {
      const { result } = renderHook(() => useYarnSchedulerStore());

      act(() => {
        result.current.setOriginalConfig({
          'test.property': 'original'
        });
      });

      const valueBeforeChange = result.current.getPropertyValue('test.property');
      expect(valueBeforeChange).toEqual({
        original: 'original',
        staged: 'original',
        isDirty: false
      });

      act(() => {
        result.current.updateProperty('test.property', 'modified');
      });

      const valueAfterChange = result.current.getPropertyValue('test.property');
      expect(valueAfterChange).toEqual({
        original: 'original',
        staged: 'modified',
        isDirty: true
      });
    });
  });

  describe('Queue Management', () => {
    const mockQueueTree: QueueNode = {
      path: 'root',
      name: 'root',
      config: { capacity: '100' },
      children: [
        {
          path: 'root.production',
          name: 'production',
          config: { capacity: '70' },
          children: []
        },
        {
          path: 'root.development',
          name: 'development',
          config: { capacity: '30' },
          children: []
        }
      ]
    };

    it('should find queue by path', () => {
      const { result } = renderHook(() => useYarnSchedulerStore());

      act(() => {
        result.current.setQueueTree(mockQueueTree);
      });

      const queue = result.current.getQueueByPath('root.production');
      expect(queue).toBeDefined();
      expect(queue?.name).toBe('production');
      expect(queue?.config.capacity).toBe('70');
    });

    it('should return null for non-existent queue path', () => {
      const { result } = renderHook(() => useYarnSchedulerStore());

      act(() => {
        result.current.setQueueTree(mockQueueTree);
      });

      const queue = result.current.getQueueByPath('root.nonexistent');
      expect(queue).toBeNull();
    });

    it('should add new queue with initial capacity', () => {
      const { result } = renderHook(() => useYarnSchedulerStore());

      act(() => {
        result.current.setQueueTree(mockQueueTree);
      });

      act(() => {
        result.current.addQueue('root.production', 'analytics', 10);
      });

      const newQueue = result.current.getQueueByPath('root.production.analytics');
      expect(newQueue).toBeDefined();
      expect(newQueue?.name).toBe('analytics');
      expect(newQueue?.isNew).toBe(true);

      const capacityChange = result.current.propertyChanges.get(
        'yarn.scheduler.capacity.root.production.analytics.capacity'
      );
      expect(capacityChange).toEqual({
        originalValue: undefined,
        stagedValue: '10'
      });
    });

    it('should mark queue as deleted and stop it if running', () => {
      const { result } = renderHook(() => useYarnSchedulerStore());

      const treeWithRunningQueue: QueueNode = {
        ...mockQueueTree,
        children: [
          {
            path: 'root.production',
            name: 'production',
            config: { capacity: '70', state: 'RUNNING' },
            children: []
          },
          mockQueueTree.children[1]
        ]
      };

      act(() => {
        result.current.setQueueTree(treeWithRunningQueue);
        result.current.setOriginalConfig({
          'yarn.scheduler.capacity.root.production.state': 'RUNNING'
        });
      });

      act(() => {
        result.current.removeQueue('root.production');
      });

      const queue = result.current.getQueueByPath('root.production');
      expect(queue?.isDeleted).toBe(true);

      const stateChange = result.current.propertyChanges.get(
        'yarn.scheduler.capacity.root.production.state'
      );
      expect(stateChange).toEqual({
        originalValue: 'RUNNING',
        stagedValue: 'STOPPED'
      });
    });
  });

  describe('Node Label Management', () => {
    const mockNodes: Map<string, NodeInfo> = new Map([
      ['node-1', {
        id: 'node-1',
        nodeHostName: 'host-1',
        nodeHTTPAddress: 'host-1:8042',
        state: 'RUNNING',
        lastHealthUpdate: Date.now(),
        numContainers: 0,
        usedMemoryMB: 0,
        availMemoryMB: 8192,
        usedVirtualCores: 0,
        availableVirtualCores: 8,
        nodeLabels: ['cpu']
      } as NodeInfo]
    ]);

    it('should assign new label to node', () => {
      const { result } = renderHook(() => useYarnSchedulerStore());

      act(() => {
        result.current.setNodes(mockNodes);
      });

      act(() => {
        result.current.assignNodeLabel('node-1', 'gpu');
      });

      const change = result.current.nodeLabelChanges.get('node-1');
      expect(change).toEqual({
        nodeId: 'node-1',
        originalLabels: ['cpu'],
        stagedLabels: ['cpu', 'gpu']
      });
    });

    it('should not duplicate labels when assigning', () => {
      const { result } = renderHook(() => useYarnSchedulerStore());

      act(() => {
        result.current.setNodes(mockNodes);
      });

      act(() => {
        result.current.assignNodeLabel('node-1', 'cpu');
      });

      expect(result.current.nodeLabelChanges.size).toBe(0);
    });

    it('should remove label from node', () => {
      const { result } = renderHook(() => useYarnSchedulerStore());

      act(() => {
        result.current.setNodes(mockNodes);
      });

      act(() => {
        result.current.removeNodeLabel('node-1', 'cpu');
      });

      const change = result.current.nodeLabelChanges.get('node-1');
      expect(change).toEqual({
        nodeId: 'node-1',
        originalLabels: ['cpu'],
        stagedLabels: []
      });
    });
  });

  describe('Revert Changes', () => {
    it('should clear all property changes', () => {
      const { result } = renderHook(() => useYarnSchedulerStore());

      act(() => {
        result.current.updateProperty('test.property1', 'value1');
        result.current.updateProperty('test.property2', 'value2');
      });

      expect(result.current.propertyChanges.size).toBe(2);

      act(() => {
        result.current.revertAllChanges();
      });

      expect(result.current.propertyChanges.size).toBe(0);
    });

    it('should clear all node label changes', () => {
      const { result } = renderHook(() => useYarnSchedulerStore());

      const mockNodes: Map<string, NodeInfo> = new Map([
        ['node-1', { nodeLabels: [] } as NodeInfo]
      ]);

      act(() => {
        result.current.setNodes(mockNodes);
        result.current.assignNodeLabel('node-1', 'gpu');
      });

      expect(result.current.nodeLabelChanges.size).toBe(1);

      act(() => {
        result.current.revertAllChanges();
      });

      expect(result.current.nodeLabelChanges.size).toBe(0);
    });

    it('should restore queue tree to original state', () => {
      const { result } = renderHook(() => useYarnSchedulerStore());

      const originalTree: QueueNode = {
        path: 'root',
        name: 'root',
        config: { capacity: '100' },
        children: []
      };

      act(() => {
        result.current.setQueueTree(originalTree);
        result.current.setOriginalConfig({ 'yarn.scheduler.capacity.root.capacity': '100' });
      });

      act(() => {
        result.current.addQueue('root', 'new-queue', 50);
      });

      expect(result.current.queueTree?.children.length).toBe(1);

      act(() => {
        result.current.revertAllChanges();
      });

      expect(result.current.queueTree).toEqual(originalTree);
    });
  });
});