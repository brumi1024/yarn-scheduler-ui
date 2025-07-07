import { describe, it, expect } from 'vitest';
import { buildMutationRequest, groupChangesByQueue } from './mutationBuilder';
import type { StagedChange } from '~/types';

describe('mutationBuilder', () => {
  const now = Date.now();

  describe('buildMutationRequest', () => {
    it('should build complete mutation request with all change types', () => {
      const stagedChanges: StagedChange[] = [
        {
          id: '1',
          type: 'update',
          timestamp: now,
          queuePath: 'root.default',
          property: 'capacity',
          oldValue: '50',
          newValue: '60',
        },
        {
          id: '2',
          type: 'update',
          timestamp: now,
          queuePath: 'root.production',
          property: 'maximum-capacity',
          oldValue: '100',
          newValue: '80',
        },
        {
          id: '3',
          type: 'update',
          timestamp: now,
          queuePath: 'global',
          property: 'maximum-applications',
          oldValue: '10000',
          newValue: '15000',
        },
        {
          id: '4',
          type: 'add',
          timestamp: now,
          queuePath: 'root.test',
          property: 'capacity',
          newValue: '20',
        },
        {
          id: '4a',
          type: 'add',
          timestamp: now,
          queuePath: 'root.test',
          property: 'state',
          newValue: 'RUNNING',
        },
        {
          id: '6',
          type: 'remove',
          timestamp: now,
          queuePath: 'root.old',
          property: '__queue__',
          oldValue: 'exists',
          newValue: undefined,
        },
      ];

      const request = buildMutationRequest(stagedChanges);

      expect(request).toEqual({
        'update-queue': [
          {
            'queue-name': 'root.default',
            params: {
              capacity: '60',
            },
          },
          {
            'queue-name': 'root.production',
            params: {
              'maximum-capacity': '80',
            },
          },
        ],
        'add-queue': [
          {
            'queue-name': 'root.test',
            params: {
              capacity: '20',
              state: 'RUNNING',
            },
          },
        ],
        'remove-queue': ['root.old'],
        'global-updates': {
          'maximum-applications': '15000',
        },
      });
    });

    it('should handle empty staged changes', () => {
      const request = buildMutationRequest([]);

      expect(request).toEqual({
        'update-queue': [],
        'add-queue': [],
        'remove-queue': [],
        'global-updates': {},
      });
    });

    it('should handle add queue with multiple property changes', () => {
      const stagedChanges: StagedChange[] = [
        {
          id: '1',
          type: 'add',
          timestamp: now,
          queuePath: 'root.production.team2',
          property: 'capacity',
          newValue: '20',
        },
        {
          id: '2',
          type: 'add',
          timestamp: now,
          queuePath: 'root.production.team2',
          property: 'maximum-capacity',
          newValue: '50',
        },
        {
          id: '3',
          type: 'add',
          timestamp: now,
          queuePath: 'root.production.team2',
          property: 'state',
          newValue: 'RUNNING',
        },
      ];

      const request = buildMutationRequest(stagedChanges);

      expect(request['add-queue']).toEqual([
        {
          'queue-name': 'root.production.team2',
          params: {
            capacity: '20',
            'maximum-capacity': '50',
            state: 'RUNNING',
          },
        },
      ]);
    });

    it('should group multiple properties for same queue', () => {
      const stagedChanges: StagedChange[] = [
        {
          id: '1',
          type: 'update',
          timestamp: now,
          queuePath: 'root.default',
          property: 'capacity',
          oldValue: '50',
          newValue: '60',
        },
        {
          id: '2',
          type: 'update',
          timestamp: now,
          queuePath: 'root.default',
          property: 'maximum-capacity',
          oldValue: '100',
          newValue: '90',
        },
        {
          id: '3',
          type: 'update',
          timestamp: now,
          queuePath: 'root.default',
          property: 'state',
          oldValue: 'RUNNING',
          newValue: 'STOPPED',
        },
      ];

      const request = buildMutationRequest(stagedChanges);

      expect(request['update-queue']).toHaveLength(1);
      expect(request['update-queue']![0]).toEqual({
        'queue-name': 'root.default',
        params: {
          capacity: '60',
          'maximum-capacity': '90',
          state: 'STOPPED',
        },
      });
    });

    it('should handle node label properties correctly', () => {
      const stagedChanges: StagedChange[] = [
        {
          id: '1',
          type: 'update',
          timestamp: now,
          queuePath: 'root.default',
          property: 'accessible-node-labels.gpu.capacity',
          oldValue: '30',
          newValue: '40',
        },
        {
          id: '2',
          type: 'update',
          timestamp: now,
          queuePath: 'root.default',
          property: 'accessible-node-labels.gpu.maximum-capacity',
          oldValue: '50',
          newValue: '60',
        },
        {
          id: '3',
          type: 'update',
          timestamp: now,
          queuePath: 'root.default',
          property: 'accessible-node-labels.ssd.capacity',
          oldValue: '20',
          newValue: '25',
        },
      ];

      const request = buildMutationRequest(stagedChanges);

      expect(request['update-queue']).toHaveLength(1);
      expect(request['update-queue']![0]).toEqual({
        'queue-name': 'root.default',
        params: {
          'accessible-node-labels.gpu.capacity': '40',
          'accessible-node-labels.gpu.maximum-capacity': '60',
          'accessible-node-labels.ssd.capacity': '25',
        },
      });
    });

    it('should handle multiple global properties', () => {
      const stagedChanges: StagedChange[] = [
        {
          id: '1',
          type: 'update',
          timestamp: now,
          queuePath: 'global',
          property: 'maximum-applications',
          oldValue: '10000',
          newValue: '15000',
        },
        {
          id: '2',
          type: 'update',
          timestamp: now,
          queuePath: 'global',
          property: 'resource-calculator',
          oldValue: 'org.apache.hadoop.yarn.util.resource.DefaultResourceCalculator',
          newValue: 'org.apache.hadoop.yarn.util.resource.DominantResourceCalculator',
        },
        {
          id: '3',
          type: 'update',
          timestamp: now,
          queuePath: 'global',
          property: 'user-metrics.enable',
          oldValue: 'false',
          newValue: 'true',
        },
      ];

      const request = buildMutationRequest(stagedChanges);

      expect(request['global-updates']).toEqual({
        'maximum-applications': '15000',
        'resource-calculator': 'org.apache.hadoop.yarn.util.resource.DominantResourceCalculator',
        'user-metrics.enable': 'true',
      });
    });
  });

  describe('groupChangesByQueue', () => {
    it('should group changes by queue path', () => {
      const changes: StagedChange[] = [
        {
          id: '1',
          type: 'update',
          timestamp: now,
          queuePath: 'root.default',
          property: 'capacity',
          oldValue: '50',
          newValue: '60',
        },
        {
          id: '2',
          type: 'update',
          timestamp: now,
          queuePath: 'root.production',
          property: 'capacity',
          oldValue: '50',
          newValue: '40',
        },
        {
          id: '3',
          type: 'update',
          timestamp: now,
          queuePath: 'root.default',
          property: 'maximum-capacity',
          oldValue: '100',
          newValue: '90',
        },
        {
          id: '4',
          type: 'update',
          timestamp: now,
          queuePath: 'global',
          property: 'maximum-applications',
          oldValue: '10000',
          newValue: '15000',
        },
      ];

      const grouped = groupChangesByQueue(changes);

      expect(grouped.size).toBe(3);
      expect(grouped.get('root.default')).toHaveLength(2);
      expect(grouped.get('root.production')).toHaveLength(1);
      expect(grouped.get('global')).toHaveLength(1);
    });

    it('should handle empty changes array', () => {
      const grouped = groupChangesByQueue([]);
      expect(grouped.size).toBe(0);
    });

    it('should handle single change', () => {
      const changes: StagedChange[] = [
        {
          id: '1',
          type: 'update',
          timestamp: now,
          queuePath: 'root.only',
          property: 'capacity',
          oldValue: '50',
          newValue: '60',
        },
      ];

      const grouped = groupChangesByQueue(changes);

      expect(grouped.size).toBe(1);
      expect(grouped.get('root.only')).toHaveLength(1);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complex real-world mutation scenario', () => {
      const stagedChanges: StagedChange[] = [
        // Update existing queue capacities
        {
          id: '1',
          type: 'update',
          timestamp: now,
          queuePath: 'root.default',
          property: 'capacity',
          oldValue: '40',
          newValue: '30',
        },
        {
          id: '2',
          type: 'update',
          timestamp: now,
          queuePath: 'root.production',
          property: 'capacity',
          oldValue: '40',
          newValue: '50',
        },
        {
          id: '3',
          type: 'update',
          timestamp: now,
          queuePath: 'root.production',
          property: 'maximum-capacity',
          oldValue: '60',
          newValue: '80',
        },
        // Add new queue with node label support
        {
          id: '4',
          type: 'add',
          timestamp: now,
          queuePath: 'root.ml',
          property: 'capacity',
          newValue: '20',
        },
        {
          id: '4a',
          type: 'add',
          timestamp: now,
          queuePath: 'root.ml',
          property: 'state',
          newValue: 'RUNNING',
        },
        {
          id: '4b',
          type: 'add',
          timestamp: now,
          queuePath: 'root.ml',
          property: 'accessible-node-labels.gpu.capacity',
          newValue: '100',
        },
        // Remove deprecated queue
        {
          id: '7',
          type: 'remove',
          timestamp: now,
          queuePath: 'root.deprecated',
          property: '__queue__',
          oldValue: undefined,
          newValue: undefined,
        },
        // Update global settings
        {
          id: '8',
          type: 'update',
          timestamp: now,
          queuePath: 'global',
          property: 'maximum-applications',
          oldValue: '10000',
          newValue: '20000',
        },
        {
          id: '9',
          type: 'update',
          timestamp: now,
          queuePath: 'global',
          property: 'resource-calculator',
          oldValue: 'DefaultResourceCalculator',
          newValue: 'DominantResourceCalculator',
        },
      ];

      const request = buildMutationRequest(stagedChanges);

      expect(request).toEqual({
        'update-queue': [
          {
            'queue-name': 'root.default',
            params: {
              capacity: '30',
            },
          },
          {
            'queue-name': 'root.production',
            params: {
              capacity: '50',
              'maximum-capacity': '80',
            },
          },
        ],
        'add-queue': [
          {
            'queue-name': 'root.ml',
            params: {
              capacity: '20',
              state: 'RUNNING',
              'accessible-node-labels.gpu.capacity': '100',
            },
          },
        ],
        'remove-queue': ['root.deprecated'],
        'global-updates': {
          'maximum-applications': '20000',
          'resource-calculator': 'DominantResourceCalculator',
        },
      });

      // Verify the request structure is correct
      expect(request['update-queue']).toBeDefined();
      expect(request['add-queue']).toBeDefined();
      expect(request['remove-queue']).toBeDefined();
      expect(request['global-updates']).toBeDefined();
    });

    it('should handle edge case with only global changes', () => {
      const stagedChanges: StagedChange[] = [
        {
          id: '1',
          type: 'update',
          timestamp: now,
          queuePath: 'global',
          property: 'maximum-applications',
          oldValue: '10000',
          newValue: '15000',
        },
      ];

      const request = buildMutationRequest(stagedChanges);

      expect(request).toEqual({
        'update-queue': [],
        'add-queue': [],
        'remove-queue': [],
        'global-updates': {
          'maximum-applications': '15000',
        },
      });
    });

    it('should handle edge case with only queue removals', () => {
      const stagedChanges: StagedChange[] = [
        {
          id: '1',
          type: 'remove',
          timestamp: now,
          queuePath: 'root.old1',
          property: '__queue__',
          oldValue: undefined,
          newValue: undefined,
        },
        {
          id: '2',
          type: 'remove',
          timestamp: now,
          queuePath: 'root.old2',
          property: '__queue__',
          oldValue: undefined,
          newValue: undefined,
        },
      ];

      const request = buildMutationRequest(stagedChanges);

      expect(request).toEqual({
        'update-queue': [],
        'add-queue': [],
        'remove-queue': ['root.old1', 'root.old2'],
        'global-updates': {},
      });
    });
  });
});
