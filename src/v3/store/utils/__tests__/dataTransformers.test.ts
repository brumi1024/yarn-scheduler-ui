import { describe, it, expect } from 'vitest';
import {
  buildQueueTree,
  extractQueueConfig,
  flattenQueueTree,
  getQueuePrefix
} from '../dataTransformers';
import type { QueueNode } from '../../types';

describe('dataTransformers', () => {
  describe('getQueuePrefix', () => {
    it('should return correct prefix for root queue', () => {
      const prefix = getQueuePrefix('root');
      expect(prefix).toBe('yarn.scheduler.capacity.root');
    });

    it('should return correct prefix for nested queue', () => {
      const prefix = getQueuePrefix('root.production.analytics');
      expect(prefix).toBe('yarn.scheduler.capacity.root.production.analytics');
    });

    it('should return correct prefix for queue named "capacity"', () => {
      const prefix = getQueuePrefix('root.production.capacity');
      expect(prefix).toBe('yarn.scheduler.capacity.root.production.capacity');
    });
  });

  describe('extractQueueConfig', () => {
    it('should extract config for root queue', () => {
      const fullConfig = {
        'yarn.scheduler.capacity.root.capacity': '100',
        'yarn.scheduler.capacity.root.state': 'RUNNING',
        'yarn.scheduler.capacity.root.queues': 'production,development',
        'yarn.scheduler.capacity.root.production.capacity': '70',
        'yarn.scheduler.capacity.root.development.capacity': '30'
      };

      const config = extractQueueConfig(fullConfig, 'root');
      
      expect(config).toEqual({
        capacity: '100',
        state: 'RUNNING',
        queues: 'production,development'
      });
    });

    it('should extract config for nested queue', () => {
      const fullConfig = {
        'yarn.scheduler.capacity.root.capacity': '100',
        'yarn.scheduler.capacity.root.production.capacity': '70',
        'yarn.scheduler.capacity.root.production.maximum-capacity': '100',
        'yarn.scheduler.capacity.root.production.state': 'RUNNING',
        'yarn.scheduler.capacity.root.production.queues': 'analytics',
        'yarn.scheduler.capacity.root.production.analytics.capacity': '20'
      };

      const config = extractQueueConfig(fullConfig, 'root.production');
      
      expect(config).toEqual({
        capacity: '70',
        'maximum-capacity': '100',
        state: 'RUNNING',
        queues: 'analytics'
      });
    });

    it('should return empty object for non-existent queue', () => {
      const fullConfig = {
        'yarn.scheduler.capacity.root.capacity': '100'
      };

      const config = extractQueueConfig(fullConfig, 'root.nonexistent');
      
      expect(config).toEqual({});
    });

    it('should extract config for a misleading queue named "capacity"', () => {
      const fullConfig = {
        'yarn.scheduler.capacity.root.capacity': '100',
        'yarn.scheduler.capacity.root.production.capacity': '70',
        'yarn.scheduler.capacity.root.production.capacity.capacity': '50',
        'yarn.scheduler.capacity.root.production.capacity.maximum-capacity': '100',
        'yarn.scheduler.capacity.root.production.capacity.state': 'RUNNING'
      };

      const config = extractQueueConfig(fullConfig, 'root.production.capacity');
      
      expect(config).toEqual({
        capacity: '50',
        'maximum-capacity': '100',
        state: 'RUNNING'
      });
    });

    it('should handle ambiguous case: queue "capacity" with child queue "capacity"', () => {
      const fullConfig = {
        // root.production.capacity is a queue with capacity=40
        'yarn.scheduler.capacity.root.production.capacity.capacity': '40',
        'yarn.scheduler.capacity.root.production.capacity.queues': 'capacity',
        // root.production.capacity.capacity is a child queue with capacity=100
        'yarn.scheduler.capacity.root.production.capacity.capacity.capacity': '100',
        'yarn.scheduler.capacity.root.production.capacity.capacity.state': 'RUNNING'
      };

      // Extract config for parent queue "capacity"
      const parentConfig = extractQueueConfig(fullConfig, 'root.production.capacity');
      expect(parentConfig).toEqual({
        capacity: '40',
        queues: 'capacity'
      });

      // Extract config for child queue "capacity.capacity"
      const childConfig = extractQueueConfig(fullConfig, 'root.production.capacity.capacity');
      expect(childConfig).toEqual({
        capacity: '100',
        state: 'RUNNING'
      });
    });
  });

  describe('buildQueueTree', () => {
    it('should build simple queue tree from flat config', () => {
      const config = {
        'yarn.scheduler.capacity.root.capacity': '100',
        'yarn.scheduler.capacity.root.state': 'RUNNING',
        'yarn.scheduler.capacity.root.queues': 'production,development',
        'yarn.scheduler.capacity.root.production.capacity': '70',
        'yarn.scheduler.capacity.root.development.capacity': '30'
      };

      const tree = buildQueueTree(config);

      expect(tree).toBeDefined();
      expect(tree?.path).toBe('root');
      expect(tree?.name).toBe('root');
      expect(tree?.config.capacity).toBe('100');
      expect(tree?.config.state).toBe('RUNNING');
      expect(tree?.children).toHaveLength(2);
      
      const production = tree?.children.find(q => q.name === 'production');
      expect(production?.path).toBe('root.production');
      expect(production?.config.capacity).toBe('70');
      
      const development = tree?.children.find(q => q.name === 'development');
      expect(development?.path).toBe('root.development');
      expect(development?.config.capacity).toBe('30');
    });

    it('should build nested queue tree', () => {
      const config = {
        'yarn.scheduler.capacity.root.capacity': '100',
        'yarn.scheduler.capacity.root.queues': 'production',
        'yarn.scheduler.capacity.root.production.capacity': '100',
        'yarn.scheduler.capacity.root.production.queues': 'analytics,web',
        'yarn.scheduler.capacity.root.production.analytics.capacity': '60',
        'yarn.scheduler.capacity.root.production.web.capacity': '40'
      };

      const tree = buildQueueTree(config);

      expect(tree?.children).toHaveLength(1);
      
      const production = tree?.children[0];
      expect(production?.children).toHaveLength(2);
      
      const analytics = production?.children.find(q => q.name === 'analytics');
      expect(analytics?.path).toBe('root.production.analytics');
      expect(analytics?.config.capacity).toBe('60');
    });

    it('should handle empty config', () => {
      const tree = buildQueueTree({});
      expect(tree).toBeNull();
    });

    it('should handle config without root queue', () => {
      const config = {
        'yarn.scheduler.capacity.some.other.property': 'value'
      };

      const tree = buildQueueTree(config);
      expect(tree).toBeNull();
    });

    it('should merge runtime metrics when provided', () => {
      const config = {
        'yarn.scheduler.capacity.root.capacity': '100',
        'yarn.scheduler.capacity.root.queues': 'production',
        'yarn.scheduler.capacity.root.production.capacity': '100'
      };

      const metrics = {
        queueName: 'root',
        capacity: 100,
        usedCapacity: 85.5,
        absoluteCapacity: 100,
        absoluteUsedCapacity: 85.5,
        absoluteMaxCapacity: 100,
        numApplications: 150,
        resourcesUsed: {
          memory: 524288,
          vCores: 256
        },
        queues: {
          queue: [{
            queueName: 'production',
            capacity: 100,
            usedCapacity: 85.5,
            absoluteCapacity: 100,
            absoluteUsedCapacity: 85.5,
            absoluteMaxCapacity: 100,
            numApplications: 150,
            resourcesUsed: {
              memory: 524288,
              vCores: 256
            }
          }]
        }
      };

      const tree = buildQueueTree(config, metrics);

      expect(tree?.metrics).toBeDefined();
      expect(tree?.metrics?.usedCapacity).toBe(85.5);
      expect(tree?.metrics?.numApplications).toBe(150);
      
      const production = tree?.children[0];
      expect(production?.metrics).toBeDefined();
      expect(production?.metrics?.resourcesUsed.memory).toBe(524288);
    });

    it('should build tree with queue named "capacity"', () => {
      const config = {
        'yarn.scheduler.capacity.root.capacity': '100',
        'yarn.scheduler.capacity.root.queues': 'production',
        'yarn.scheduler.capacity.root.production.capacity': '100',
        'yarn.scheduler.capacity.root.production.queues': 'capacity,analytics',
        'yarn.scheduler.capacity.root.production.capacity.capacity': '40',
        'yarn.scheduler.capacity.root.production.capacity.maximum-capacity': '100',
        'yarn.scheduler.capacity.root.production.analytics.capacity': '60'
      };

      const tree = buildQueueTree(config);

      expect(tree?.children).toHaveLength(1);
      
      const production = tree?.children[0];
      expect(production?.children).toHaveLength(2);
      
      const capacityQueue = production?.children.find(q => q.name === 'capacity');
      expect(capacityQueue?.path).toBe('root.production.capacity');
      expect(capacityQueue?.config.capacity).toBe('40');
      expect(capacityQueue?.config['maximum-capacity']).toBe('100');
      
      const analytics = production?.children.find(q => q.name === 'analytics');
      expect(analytics?.path).toBe('root.production.analytics');
      expect(analytics?.config.capacity).toBe('60');
    });
  });

  describe('template property parsing', () => {
    it('should extract leaf-queue-template properties', () => {
      const fullConfig = {
        'yarn.scheduler.capacity.root.parent1.auto-create-child-queue.enabled': 'true',
        'yarn.scheduler.capacity.root.parent1.leaf-queue-template.capacity': '5',
        'yarn.scheduler.capacity.root.parent1.leaf-queue-template.maximum-capacity': '100',
        'yarn.scheduler.capacity.root.parent1.leaf-queue-template.user-limit-factor': '3.0',
        'yarn.scheduler.capacity.root.parent1.leaf-queue-template.ordering-policy': 'fair',
        'yarn.scheduler.capacity.root.parent1.capacity': '50'
      };

      const config = extractQueueConfig(fullConfig, 'root.parent1');
      
      expect(config).toEqual({
        'auto-create-child-queue.enabled': 'true',
        'leaf-queue-template.capacity': '5',
        'leaf-queue-template.maximum-capacity': '100',
        'leaf-queue-template.user-limit-factor': '3.0',
        'leaf-queue-template.ordering-policy': 'fair',
        capacity: '50'
      });
    });

    it('should extract flexible auto-queue-creation-v2 template properties', () => {
      const fullConfig = {
        'yarn.scheduler.capacity.root.parent.auto-queue-creation-v2.enabled': 'true',
        'yarn.scheduler.capacity.root.parent.auto-queue-creation-v2.max-queues': '1000',
        'yarn.scheduler.capacity.root.parent.auto-queue-creation-v2.template.maximum-capacity': '80',
        'yarn.scheduler.capacity.root.parent.auto-queue-creation-v2.parent-template.capacity': '2w',
        'yarn.scheduler.capacity.root.parent.auto-queue-creation-v2.leaf-template.accessible-node-labels': 'GPU',
        'yarn.scheduler.capacity.root.parent.auto-queue-creation-v2.leaf-template.accessible-node-labels.GPU.capacity': '5w'
      };

      const config = extractQueueConfig(fullConfig, 'root.parent');
      
      expect(config).toEqual({
        'auto-queue-creation-v2.enabled': 'true',
        'auto-queue-creation-v2.max-queues': '1000',
        'auto-queue-creation-v2.template.maximum-capacity': '80',
        'auto-queue-creation-v2.parent-template.capacity': '2w',
        'auto-queue-creation-v2.leaf-template.accessible-node-labels': 'GPU',
        'auto-queue-creation-v2.leaf-template.accessible-node-labels.GPU.capacity': '5w'
      });
    });

    it('should handle wildcard template properties', () => {
      const fullConfig = {
        'yarn.scheduler.capacity.root.parent.*.auto-queue-creation-v2.template.maximum-capacity': '80',
        'yarn.scheduler.capacity.root.parent.capacity': '100',
        'yarn.scheduler.capacity.root.parent.queues': 'child1,child2',
        'yarn.scheduler.capacity.root.parent.child1.capacity': '50',
        'yarn.scheduler.capacity.root.parent.child1.template.user-limit-factor': '2.0'
      };

      // This tests that wildcard properties are NOT extracted as direct properties
      const parentConfig = extractQueueConfig(fullConfig, 'root.parent');
      expect(parentConfig).toEqual({
        capacity: '100',
        queues: 'child1,child2'
        // Note: wildcard properties (with *) are not extracted
      });

      const childConfig = extractQueueConfig(fullConfig, 'root.parent.child1');
      expect(childConfig).toEqual({
        capacity: '50',
        'template.user-limit-factor': '2.0'
      });
    });
  });

  describe('node label based capacity parsing', () => {
    it('should extract node label capacity properties', () => {
      const fullConfig = {
        'yarn.scheduler.capacity.root.production.capacity': '70',
        'yarn.scheduler.capacity.root.production.accessible-node-labels': 'GPU,SSD',
        'yarn.scheduler.capacity.root.production.accessible-node-labels.GPU.capacity': '50',
        'yarn.scheduler.capacity.root.production.accessible-node-labels.SSD.capacity': '30',
        'yarn.scheduler.capacity.root.production.accessible-node-labels.GPU.maximum-capacity': '100'
      };

      const config = extractQueueConfig(fullConfig, 'root.production');
      
      expect(config).toEqual({
        capacity: '70',
        'accessible-node-labels': 'GPU,SSD',
        'accessible-node-labels.GPU.capacity': '50',
        'accessible-node-labels.SSD.capacity': '30',
        'accessible-node-labels.GPU.maximum-capacity': '100'
      });
    });

    it('should extract template node label properties', () => {
      const fullConfig = {
        'yarn.scheduler.capacity.root.parent1.leaf-queue-template.accessible-node-labels': 'GPU',
        'yarn.scheduler.capacity.root.parent1.leaf-queue-template.accessible-node-labels.GPU.capacity': '5',
        'yarn.scheduler.capacity.root.parent1.leaf-queue-template.accessible-node-labels.GPU.maximum-capacity': '20',
        'yarn.scheduler.capacity.root.parent1.accessible-node-labels': 'GPU,SSD',
        'yarn.scheduler.capacity.root.parent1.GPU.capacity': '50'
      };

      const config = extractQueueConfig(fullConfig, 'root.parent1');
      
      expect(config).toEqual({
        'leaf-queue-template.accessible-node-labels': 'GPU',
        'leaf-queue-template.accessible-node-labels.GPU.capacity': '5',
        'leaf-queue-template.accessible-node-labels.GPU.maximum-capacity': '20',
        'accessible-node-labels': 'GPU,SSD',
        'GPU.capacity': '50'
      });
    });

    it('should handle absolute resource configurations in templates', () => {
      const fullConfig = {
        'yarn.scheduler.capacity.root.parent2.leaf-queue-template.capacity': '[memory=1024,vcores=1]',
        'yarn.scheduler.capacity.root.parent2.leaf-queue-template.maximum-capacity': '[memory=10240,vcores=10]',
        'yarn.scheduler.capacity.root.parent2.capacity': '30'
      };

      const config = extractQueueConfig(fullConfig, 'root.parent2');
      
      expect(config).toEqual({
        'leaf-queue-template.capacity': '[memory=1024,vcores=1]',
        'leaf-queue-template.maximum-capacity': '[memory=10240,vcores=10]',
        capacity: '30'
      });
    });
  });

  describe('flattenQueueTree', () => {
    it('should flatten queue tree to array', () => {
      const tree: QueueNode = {
        path: 'root',
        name: 'root',
        config: { capacity: '100' },
        children: [
          {
            path: 'root.production',
            name: 'production',
            config: { capacity: '70' },
            children: [
              {
                path: 'root.production.analytics',
                name: 'analytics',
                config: { capacity: '100' },
                children: []
              }
            ]
          },
          {
            path: 'root.development',
            name: 'development',
            config: { capacity: '30' },
            children: []
          }
        ]
      };

      const flattened = flattenQueueTree(tree);

      expect(flattened).toHaveLength(4);
      expect(flattened.map(q => q.path)).toEqual([
        'root',
        'root.production',
        'root.production.analytics',
        'root.development'
      ]);
    });

    it('should handle single node tree', () => {
      const tree: QueueNode = {
        path: 'root',
        name: 'root',
        config: { capacity: '100' },
        children: []
      };

      const flattened = flattenQueueTree(tree);

      expect(flattened).toHaveLength(1);
      expect(flattened[0].path).toBe('root');
    });
  });
});