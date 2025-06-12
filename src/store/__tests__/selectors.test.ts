import { describe, it, expect } from 'vitest';
import {
  selectScheduler,
  selectConfiguration,
  selectAllQueues,
  selectQueueByPath,
  selectStagedChanges,
  selectHasUnsavedChanges,
  selectSelectedQueue,
  selectIsQueueExpanded,
  selectRecentLogs,
} from '../selectors';
import type { RootState } from '../types';

describe('Selectors', () => {
  const mockState: RootState = {
    configuration: {
      scheduler: {
        scheduler: {
          schedulerInfo: {
            type: 'capacityScheduler' as const,
            capacity: 100,
            usedCapacity: 50,
            maxCapacity: 100,
            queueName: 'root',
            queues: {
              queue: [
                {
                  queueName: 'default',
                  capacity: 50,
                  usedCapacity: 25,
                  maxCapacity: 50,
                  absoluteCapacity: 50,
                  absoluteUsedCapacity: 25,
                  absoluteMaxCapacity: 50,
                  state: 'RUNNING' as const,
                  numApplications: 5,
                  resourcesUsed: { memory: 2048, vCores: 4 },
                  queues: {
                    queue: [
                      {
                        queueName: 'sub1',
                        capacity: 25,
                        usedCapacity: 10,
                        maxCapacity: 25,
                        absoluteCapacity: 12.5,
                        absoluteUsedCapacity: 5,
                        absoluteMaxCapacity: 12.5,
                        state: 'RUNNING' as const,
                        numApplications: 2,
                        resourcesUsed: { memory: 1024, vCores: 2 },
                      },
                    ],
                  },
                },
                {
                  queueName: 'production',
                  capacity: 50,
                  usedCapacity: 30,
                  maxCapacity: 50,
                  absoluteCapacity: 50,
                  absoluteUsedCapacity: 30,
                  absoluteMaxCapacity: 50,
                  state: 'RUNNING' as const,
                  numApplications: 10,
                  resourcesUsed: { memory: 4096, vCores: 8 },
                },
              ],
            },
          },
        },
      },
      configuration: null,
      nodeLabels: null,
      nodes: null,
      loading: {
        scheduler: false,
        configuration: false,
        nodeLabels: false,
        nodes: false,
      },
      errors: {
        scheduler: null,
        configuration: null,
        nodeLabels: null,
        nodes: null,
      },
      lastUpdated: { scheduler: Date.now() },
    },
    stagedChanges: {
      changes: [
        {
          id: 'change1',
          timestamp: new Date(),
          type: 'update-queue',
          queueName: 'default',
          property: 'capacity',
          oldValue: '50',
          newValue: '60',
          description: 'Update capacity',
        },
      ],
      conflicts: [],
      applying: false,
      lastApplied: undefined,
    },
    ui: {
      selectedQueuePath: 'default',
      expandedQueues: new Set(['default', 'production']),
      viewSettings: {
        showCapacityBars: true,
        showUsageMetrics: true,
        layout: 'tree',
        zoomLevel: 1,
        panPosition: { x: 0, y: 0 },
      },
      notifications: [],
      modals: {
        propertyEditor: { open: false, mode: 'edit' },
        confirmDialog: { open: false, title: '', message: '', onConfirm: () => {} },
      },
    },
    activity: {
      logs: [
        {
          id: 'log1',
          timestamp: Date.now() - 3000,
          type: 'user_action',
          level: 'info',
          message: 'Queue selected',
          details: { queuePath: 'default' },
        },
        {
          id: 'log2',
          timestamp: Date.now() - 2000,
          type: 'system_event',
          level: 'info',
          message: 'Data refreshed',
        },
        {
          id: 'log3',
          timestamp: Date.now() - 1000,
          type: 'user_action',
          level: 'info',
          message: 'Property changed',
        },
      ],
      apiCalls: [],
      maxEntries: 1000,
    },
  };

  describe('Configuration selectors', () => {
    it('should select scheduler', () => {
      const result = selectScheduler(mockState);
      expect(result).toBe(mockState.configuration.scheduler);
    });

    it('should select configuration', () => {
      const result = selectConfiguration(mockState);
      expect(result).toBe(mockState.configuration.configuration);
    });

    it('should select all queues (flattened)', () => {
      const result = selectAllQueues(mockState);
      expect(result).toHaveLength(3); // default, sub1, production
      expect(result[0].queueName).toBe('default');
      expect(result[0].path).toBe('default');
      expect(result[1].queueName).toBe('sub1');
      expect(result[1].path).toBe('default.sub1');
      expect(result[2].queueName).toBe('production');
      expect(result[2].path).toBe('production');
    });

    it('should select queue by path', () => {
      const result = selectQueueByPath(mockState, 'default.sub1');
      expect(result?.queueName).toBe('sub1');
      expect(result?.path).toBe('default.sub1');
    });

    it('should return null for non-existent queue path', () => {
      const result = selectQueueByPath(mockState, 'non.existent');
      expect(result).toBeUndefined();
    });
  });

  describe('Staged changes selectors', () => {
    it('should select staged changes', () => {
      const result = selectStagedChanges(mockState);
      expect(result).toBe(mockState.stagedChanges.changes);
      expect(result).toHaveLength(1);
    });

    it('should detect unsaved changes', () => {
      const result = selectHasUnsavedChanges(mockState);
      expect(result).toBe(true);
    });

    it('should detect no unsaved changes', () => {
      const stateWithoutChanges = {
        ...mockState,
        stagedChanges: {
          ...mockState.stagedChanges,
          changes: [],
        },
      };
      const result = selectHasUnsavedChanges(stateWithoutChanges);
      expect(result).toBe(false);
    });
  });

  describe('UI selectors', () => {
    it('should select selected queue', () => {
      const result = selectSelectedQueue(mockState);
      expect(result?.queueName).toBe('default');
      expect(result?.path).toBe('default');
    });

    it('should return null when no queue selected', () => {
      const stateWithoutSelection = {
        ...mockState,
        ui: {
          ...mockState.ui,
          selectedQueuePath: undefined,
        },
      };
      const result = selectSelectedQueue(stateWithoutSelection);
      expect(result).toBe(null);
    });

    it('should check if queue is expanded', () => {
      const result = selectIsQueueExpanded(mockState, 'default');
      expect(result).toBe(true);
      
      const notExpanded = selectIsQueueExpanded(mockState, 'other');
      expect(notExpanded).toBe(false);
    });
  });

  describe('Activity selectors', () => {
    it('should select recent logs', () => {
      const result = selectRecentLogs(mockState, 2);
      expect(result).toHaveLength(2);
      expect(result[0].message).toBe('Queue selected');
      expect(result[1].message).toBe('Data refreshed');
    });

    it('should default to 10 recent logs', () => {
      const result = selectRecentLogs(mockState);
      expect(result).toHaveLength(3); // Only 3 logs in mock state
    });
  });

  describe('Edge cases', () => {
    it('should handle empty scheduler data', () => {
      const emptyState = {
        ...mockState,
        configuration: {
          ...mockState.configuration,
          scheduler: null,
        },
      };
      
      const allQueues = selectAllQueues(emptyState);
      expect(allQueues).toEqual([]);
    });

    it('should handle scheduler without queues', () => {
      const noQueuesState = {
        ...mockState,
        configuration: {
          ...mockState.configuration,
          scheduler: {
            scheduler: {
              schedulerInfo: {
                type: 'capacityScheduler' as const,
                capacity: 100,
                usedCapacity: 50,
                maxCapacity: 100,
                queueName: 'root',
                queues: undefined,
              },
            },
          },
        },
      };
      
      const allQueues = selectAllQueues(noQueuesState);
      expect(allQueues).toEqual([]);
    });
  });
});