import { describe, it, expect, beforeEach } from 'vitest';
import { TreeBuilder } from '../TreeBuilder';
import type { ParsedQueue } from '../../types/Queue';
import { CapacityModeDetector } from '../CapacityModeDetector';

// Helper function to create test queues
function createTestQueue(
  name: string, 
  path: string, 
  capacity: string, 
  children: ParsedQueue[] = []
): ParsedQueue {
  const capacityValue = CapacityModeDetector.parseCapacityValue(capacity);
  
  return {
    name,
    path,
    parent: path === 'root' ? undefined : path.split('.').slice(0, -1).join('.'),
    children,
    isLeaf: children.length === 0,
    capacity: capacityValue,
    maxCapacity: CapacityModeDetector.parseCapacityValue('100'),
    state: 'RUNNING',
    maxApplications: -1,
    minimumUserLimitPercent: 100,
    userLimitFactor: 1.0,
    maxParallelApps: Number.MAX_SAFE_INTEGER,
    priority: 0,
    submitACL: '*',
    adminACL: '*',
    accessibleNodeLabels: [],
    preemptionDisabled: false,
    intraQueuePreemptionDisabled: false,
    properties: {}
  };
}

describe('TreeBuilder', () => {
  describe('calculateMetrics', () => {
    it('should calculate basic metrics for a simple tree', () => {
      const defaultQueue = createTestQueue('default', 'root.default', '50');
      const productionQueue = createTestQueue('production', 'root.production', '50');
      const rootQueue = createTestQueue('root', 'root', '100', [defaultQueue, productionQueue]);

      const metrics = TreeBuilder.calculateMetrics(rootQueue);

      expect(metrics.totalQueues).toBe(3);
      expect(metrics.leafQueues).toBe(2);
      expect(metrics.maxDepth).toBe(1);
      expect(metrics.modeDistribution.percentage).toBe(100);
      expect(metrics.modeDistribution.weight).toBe(0);
      expect(metrics.modeDistribution.absolute).toBe(0);
    });

    it('should calculate metrics for a complex hierarchy', () => {
      const highQueue = createTestQueue('high', 'root.production.high', '50w');
      const lowQueue = createTestQueue('low', 'root.production.low', '25w');
      const productionQueue = createTestQueue('production', 'root.production', '70', [highQueue, lowQueue]);
      const devQueue = createTestQueue('dev', 'root.dev', '30');
      const rootQueue = createTestQueue('root', 'root', '100', [productionQueue, devQueue]);

      const metrics = TreeBuilder.calculateMetrics(rootQueue);

      expect(metrics.totalQueues).toBe(5);
      expect(metrics.leafQueues).toBe(3); // high, low, dev
      expect(metrics.maxDepth).toBe(2);
      expect(metrics.modeDistribution.percentage).toBe(60); // 3 out of 5 queues
      expect(metrics.modeDistribution.weight).toBe(40); // 2 out of 5 queues
    });

    it('should handle mixed capacity modes', () => {
      const gpuQueue = createTestQueue('gpu', 'root.gpu', '[memory=8192mb,vcores=4]');
      const cpuQueue = createTestQueue('cpu', 'root.cpu', '75w');
      const defaultQueue = createTestQueue('default', 'root.default', '25');
      const rootQueue = createTestQueue('root', 'root', '100', [gpuQueue, cpuQueue, defaultQueue]);

      const metrics = TreeBuilder.calculateMetrics(rootQueue);

      expect(metrics.modeDistribution.percentage).toBe(50); // 2 out of 4
      expect(metrics.modeDistribution.weight).toBe(25); // 1 out of 4
      expect(metrics.modeDistribution.absolute).toBe(25); // 1 out of 4
    });
  });

  describe('searchQueues', () => {
    let rootQueue: ParsedQueue;

    beforeEach(() => {
      const highQueue = createTestQueue('high-priority', 'root.production.high-priority', '70');
      const lowQueue = createTestQueue('low-priority', 'root.production.low-priority', '30');
      const productionQueue = createTestQueue('production', 'root.production', '80', [highQueue, lowQueue]);
      const devQueue = createTestQueue('development', 'root.development', '20');
      rootQueue = createTestQueue('root', 'root', '100', [productionQueue, devQueue]);
    });

    it('should find queues by name', () => {
      const results = TreeBuilder.searchQueues(rootQueue, { searchTerm: 'production' });
      expect(results).toHaveLength(3); // production queue + its two children (path contains "production")
      const productionQueue = results.find(q => q.name === 'production');
      expect(productionQueue).toBeDefined();
      expect(productionQueue?.name).toBe('production');
    });

    it('should find queues by path', () => {
      const results = TreeBuilder.searchQueues(rootQueue, { searchTerm: 'root.development' });
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('development');
    });

    it('should find multiple matching queues', () => {
      const results = TreeBuilder.searchQueues(rootQueue, { searchTerm: 'priority' });
      expect(results).toHaveLength(2);
      expect(results.map(q => q.name).sort()).toEqual(['high-priority', 'low-priority']);
    });

    it('should support case-insensitive search', () => {
      const results = TreeBuilder.searchQueues(rootQueue, { 
        searchTerm: 'PRODUCTION',
        caseSensitive: false 
      });
      expect(results).toHaveLength(3); // production queue + its two children (path contains "production")
      expect(results.find(q => q.name === 'production')).toBeDefined();
    });

    it('should support case-sensitive search', () => {
      const results = TreeBuilder.searchQueues(rootQueue, { 
        searchTerm: 'PRODUCTION',
        caseSensitive: true 
      });
      expect(results).toHaveLength(0);
    });

    it('should search in properties when enabled', () => {
      // Add a property to test search
      const testQueue = rootQueue.children[0]; // production queue
      testQueue.properties = { 'test-property': 'special-value' };

      const results = TreeBuilder.searchQueues(rootQueue, { 
        searchTerm: 'special-value',
        includeProperties: true 
      });
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('production');
    });
  });

  describe('filterQueues', () => {
    let rootQueue: ParsedQueue;

    beforeEach(() => {
      const stoppedQueue = createTestQueue('stopped', 'root.stopped', '30');
      stoppedQueue.state = 'STOPPED';
      
      const weightQueue = createTestQueue('weight', 'root.weight', '50w');
      const absoluteQueue = createTestQueue('absolute', 'root.absolute', '[memory=1024mb]');
      
      const runningQueue = createTestQueue('running', 'root.running', '40');
      
      rootQueue = createTestQueue('root', 'root', '100', [stoppedQueue, weightQueue, absoluteQueue, runningQueue]);
    });

    it('should filter by state', () => {
      const results = TreeBuilder.filterQueues(rootQueue, { state: 'STOPPED' });
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('stopped');
    });

    it('should filter by capacity mode', () => {
      const results = TreeBuilder.filterQueues(rootQueue, { capacityMode: 'weight' });
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('weight');
    });

    it('should filter by hasChildren', () => {
      const parentQueue = createTestQueue('parent', 'root.parent', '20', [
        createTestQueue('child', 'root.parent.child', '100')
      ]);
      rootQueue.children.push(parentQueue);

      const withChildren = TreeBuilder.filterQueues(rootQueue, { hasChildren: true });
      const withoutChildren = TreeBuilder.filterQueues(rootQueue, { hasChildren: false });

      expect(withChildren.map(q => q.name).sort()).toEqual(['parent', 'root']);
      expect(withoutChildren.length).toBeGreaterThan(0);
      expect(withoutChildren.every(q => q.children.length === 0)).toBe(true);
    });

    it('should filter by capacity range', () => {
      const results = TreeBuilder.filterQueues(rootQueue, { 
        minCapacity: 35, 
        maxCapacity: 45 
      });
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('running'); // 40% capacity
    });
  });

  describe('findQueueByPath', () => {
    let rootQueue: ParsedQueue;

    beforeEach(() => {
      const childQueue = createTestQueue('child', 'root.parent.child', '100');
      const parentQueue = createTestQueue('parent', 'root.parent', '50', [childQueue]);
      rootQueue = createTestQueue('root', 'root', '100', [parentQueue]);
    });

    it('should find root queue', () => {
      const result = TreeBuilder.findQueueByPath(rootQueue, 'root');
      expect(result).toBe(rootQueue);
    });

    it('should find nested queue', () => {
      const result = TreeBuilder.findQueueByPath(rootQueue, 'root.parent.child');
      expect(result?.name).toBe('child');
    });

    it('should return null for non-existent queue', () => {
      const result = TreeBuilder.findQueueByPath(rootQueue, 'root.nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('getAncestorPaths', () => {
    it('should return ancestor paths', () => {
      const paths = TreeBuilder.getAncestorPaths('root.production.high.critical');
      expect(paths).toEqual(['root', 'root.production', 'root.production.high']);
    });

    it('should return empty array for root', () => {
      const paths = TreeBuilder.getAncestorPaths('root');
      expect(paths).toEqual([]);
    });

    it('should handle single-level path', () => {
      const paths = TreeBuilder.getAncestorPaths('root.default');
      expect(paths).toEqual(['root']);
    });
  });

  describe('getDescendants', () => {
    it('should get all descendants', () => {
      const grandChild = createTestQueue('grandchild', 'root.parent.child.grandchild', '100');
      const child = createTestQueue('child', 'root.parent.child', '100', [grandChild]);
      const parent = createTestQueue('parent', 'root.parent', '100', [child]);

      const descendants = TreeBuilder.getDescendants(parent);
      
      expect(descendants).toHaveLength(2);
      expect(descendants.map(q => q.name).sort()).toEqual(['child', 'grandchild']);
    });

    it('should return empty array for leaf queue', () => {
      const leafQueue = createTestQueue('leaf', 'root.leaf', '100');
      const descendants = TreeBuilder.getDescendants(leafQueue);
      expect(descendants).toHaveLength(0);
    });
  });

  describe('validateHierarchy', () => {
    it('should validate correct hierarchy', () => {
      const child = createTestQueue('child', 'root.child', '100');
      const root = createTestQueue('root', 'root', '100', [child]);

      const result = TreeBuilder.validateHierarchy(root);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect incorrect parent reference', () => {
      const child = createTestQueue('child', 'root.child', '100');
      child.parent = 'wrong.parent'; // Incorrect parent reference
      const root = createTestQueue('root', 'root', '100', [child]);

      const result = TreeBuilder.validateHierarchy(root);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('incorrect parent reference'))).toBe(true);
    });

    it('should detect incorrect path construction', () => {
      const child = createTestQueue('child', 'wrong.path', '100'); // Incorrect path
      const root = createTestQueue('root', 'root', '100', [child]);

      const result = TreeBuilder.validateHierarchy(root);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('incorrect path'))).toBe(true);
    });
  });

  describe('utility functions', () => {
    it('should calculate queue depth correctly', () => {
      expect(TreeBuilder.getQueueDepth('root')).toBe(0);
      expect(TreeBuilder.getQueueDepth('root.default')).toBe(1);
      expect(TreeBuilder.getQueueDepth('root.production.high')).toBe(2);
    });

    it('should check ancestor relationship correctly', () => {
      expect(TreeBuilder.isAncestor('root', 'root.production')).toBe(true);
      expect(TreeBuilder.isAncestor('root', 'root.production.high')).toBe(true);
      expect(TreeBuilder.isAncestor('root.production', 'root.production.high')).toBe(true);
      expect(TreeBuilder.isAncestor('root.production', 'root.development')).toBe(false);
      expect(TreeBuilder.isAncestor('root.production', 'root.production')).toBe(false); // Same queue
    });

    it('should get siblings correctly', () => {
      const child1 = createTestQueue('child1', 'root.child1', '50');
      const child2 = createTestQueue('child2', 'root.child2', '50');
      const root = createTestQueue('root', 'root', '100', [child1, child2]);

      const siblings = TreeBuilder.getSiblings(root, 'root.child1');
      expect(siblings).toHaveLength(1);
      expect(siblings[0].name).toBe('child2');
    });

    it('should flatten tree correctly', () => {
      const child = createTestQueue('child', 'root.child', '100');
      const root = createTestQueue('root', 'root', '100', [child]);

      const flattened = TreeBuilder.flattenTree(root);
      expect(flattened).toHaveLength(2);
      expect(flattened[0]).toBe(root);
      expect(flattened[1]).toBe(child);
    });
  });
});