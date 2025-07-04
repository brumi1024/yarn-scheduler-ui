import { describe, it, expect } from 'vitest';
import {
  buildPropertyKey,
  buildGlobalPropertyKey,
  buildNodeLabelPropertyKey,
  validateQueueName,
  splitQueuePath,
  joinQueuePath,
  getQueueNameFromPath,
  getParentQueuePath,
  isRootQueue,
  isGlobalPropertyKey,
} from './propertyUtils';

describe('propertyUtils', () => {
  describe('buildPropertyKey', () => {
    it('should build simple queue property key', () => {
      const key = buildPropertyKey('root.default', 'capacity');
      expect(key).toBe('yarn.scheduler.capacity.root.default.capacity');
    });

    it('should build nested queue property key', () => {
      const key = buildPropertyKey('root.production.team1', 'maximum-capacity');
      expect(key).toBe('yarn.scheduler.capacity.root.production.team1.maximum-capacity');
    });

    it('should build root queue property key', () => {
      const key = buildPropertyKey('root', 'queues');
      expect(key).toBe('yarn.scheduler.capacity.root.queues');
    });

    it('should build property key with complex property name', () => {
      const key = buildPropertyKey('root.production', 'user-limit-factor');
      expect(key).toBe('yarn.scheduler.capacity.root.production.user-limit-factor');
    });

    it('should handle deeply nested queue paths', () => {
      const key = buildPropertyKey('root.a.b.c.d', 'state');
      expect(key).toBe('yarn.scheduler.capacity.root.a.b.c.d.state');
    });
  });

  describe('buildGlobalPropertyKey', () => {
    it('should build global property key', () => {
      const key = buildGlobalPropertyKey('maximum-applications');
      expect(key).toBe('yarn.scheduler.capacity.maximum-applications');
    });

    it('should build global property key with complex name', () => {
      const key = buildGlobalPropertyKey('resource-calculator');
      expect(key).toBe('yarn.scheduler.capacity.resource-calculator');
    });

    it('should build global property key with dots in name', () => {
      const key = buildGlobalPropertyKey('user-metrics.enable');
      expect(key).toBe('yarn.scheduler.capacity.user-metrics.enable');
    });
  });

  describe('buildNodeLabelPropertyKey', () => {
    it('should build node label property key', () => {
      const key = buildNodeLabelPropertyKey('root.default', 'gpu', 'capacity');
      expect(key).toBe('yarn.scheduler.capacity.root.default.accessible-node-labels.gpu.capacity');
    });

    it('should build node label property key for nested queue', () => {
      const key = buildNodeLabelPropertyKey('root.production.team1', 'ssd', 'maximum-capacity');
      expect(key).toBe(
        'yarn.scheduler.capacity.root.production.team1.accessible-node-labels.ssd.maximum-capacity',
      );
    });

    it('should build node label property key with complex property', () => {
      const key = buildNodeLabelPropertyKey(
        'root.production',
        'gpu',
        'maximum-am-resource-percent',
      );
      expect(key).toBe(
        'yarn.scheduler.capacity.root.production.accessible-node-labels.gpu.maximum-am-resource-percent',
      );
    });

    it('should build node label property key for root queue', () => {
      const key = buildNodeLabelPropertyKey('root', 'highmem', 'capacity');
      expect(key).toBe('yarn.scheduler.capacity.root.accessible-node-labels.highmem.capacity');
    });
  });

  describe('validateQueueName', () => {
    it('should accept valid queue names', () => {
      expect(validateQueueName('production')).toEqual({ valid: true });
      expect(validateQueueName('team-1')).toEqual({ valid: true });
      expect(validateQueueName('batch_jobs')).toEqual({ valid: true });
      expect(validateQueueName('queue123')).toEqual({ valid: true });
      expect(validateQueueName('UPPERCASE')).toEqual({ valid: true });
      expect(validateQueueName('root')).toEqual({ valid: true });
      expect(validateQueueName('a')).toEqual({ valid: true });
      expect(validateQueueName('test-queue_name')).toEqual({ valid: true });
    });

    it('should reject queue names with dots', () => {
      const result = validateQueueName('production.team');
      expect(result).toEqual({
        valid: false,
        message: 'Queue names cannot contain dots (.)',
      });
    });

    it('should reject queue names with multiple dots', () => {
      const result = validateQueueName('a.b.c');
      expect(result).toEqual({
        valid: false,
        message: 'Queue names cannot contain dots (.)',
      });
    });

    it('should reject queue names starting or ending with dots', () => {
      expect(validateQueueName('.production')).toEqual({
        valid: false,
        message: 'Queue names cannot contain dots (.)',
      });

      expect(validateQueueName('production.')).toEqual({
        valid: false,
        message: 'Queue names cannot contain dots (.)',
      });
    });

    it('should reject empty queue names', () => {
      expect(validateQueueName('')).toEqual({
        valid: false,
        message: 'Queue name cannot be empty',
      });

      expect(validateQueueName('   ')).toEqual({
        valid: false,
        message: 'Queue name cannot be empty',
      });
    });

    it('should reject queue names with invalid characters', () => {
      expect(validateQueueName('queue@123')).toEqual({
        valid: false,
        message: 'Queue names should only contain letters, numbers, hyphens, and underscores',
      });

      expect(validateQueueName('queue name')).toEqual({
        valid: false,
        message: 'Queue names should only contain letters, numbers, hyphens, and underscores',
      });

      expect(validateQueueName('queue/name')).toEqual({
        valid: false,
        message: 'Queue names should only contain letters, numbers, hyphens, and underscores',
      });

      expect(validateQueueName('queue$name')).toEqual({
        valid: false,
        message: 'Queue names should only contain letters, numbers, hyphens, and underscores',
      });

      expect(validateQueueName('queue+name')).toEqual({
        valid: false,
        message: 'Queue names should only contain letters, numbers, hyphens, and underscores',
      });
    });
  });

  describe('queue path utilities', () => {
    describe('splitQueuePath', () => {
      it('should split queue path into segments', () => {
        expect(splitQueuePath('root')).toEqual(['root']);
        expect(splitQueuePath('root.production')).toEqual(['root', 'production']);
        expect(splitQueuePath('root.production.team1')).toEqual(['root', 'production', 'team1']);
        expect(splitQueuePath('root.a.b.c.d')).toEqual(['root', 'a', 'b', 'c', 'd']);
      });

      it('should handle empty path', () => {
        expect(splitQueuePath('')).toEqual([]);
      });

      it('should handle single segment', () => {
        expect(splitQueuePath('single')).toEqual(['single']);
      });
    });

    describe('joinQueuePath', () => {
      it('should join queue segments into path', () => {
        expect(joinQueuePath(['root'])).toBe('root');
        expect(joinQueuePath(['root', 'production'])).toBe('root.production');
        expect(joinQueuePath(['root', 'production', 'team1'])).toBe('root.production.team1');
        expect(joinQueuePath(['root', 'a', 'b', 'c', 'd'])).toBe('root.a.b.c.d');
      });

      it('should handle empty segments', () => {
        expect(joinQueuePath([])).toBe('');
      });

      it('should handle single segment', () => {
        expect(joinQueuePath(['single'])).toBe('single');
      });
    });

    describe('getQueueNameFromPath', () => {
      it('should extract queue name from path', () => {
        expect(getQueueNameFromPath('root')).toBe('root');
        expect(getQueueNameFromPath('root.production')).toBe('production');
        expect(getQueueNameFromPath('root.production.team1')).toBe('team1');
        expect(getQueueNameFromPath('root.a.b.c.d')).toBe('d');
      });

      it('should handle empty path', () => {
        expect(getQueueNameFromPath('')).toBe('');
      });

      it('should handle single segment', () => {
        expect(getQueueNameFromPath('single')).toBe('single');
      });
    });

    describe('getParentQueuePath', () => {
      it('should get parent queue path', () => {
        expect(getParentQueuePath('root.default')).toBe('root');
        expect(getParentQueuePath('root.production.team1')).toBe('root.production');
        expect(getParentQueuePath('root.a.b.c.d')).toBe('root.a.b.c');
      });

      it('should return null for root queue', () => {
        expect(getParentQueuePath('root')).toBeNull();
      });

      it('should return null for empty path', () => {
        expect(getParentQueuePath('')).toBeNull();
      });

      it('should return null for single non-root segment', () => {
        expect(getParentQueuePath('single')).toBeNull();
      });
    });

    describe('isRootQueue', () => {
      it('should identify root queue', () => {
        expect(isRootQueue('root')).toBe(true);
      });

      it('should return false for non-root queues', () => {
        expect(isRootQueue('root.default')).toBe(false);
        expect(isRootQueue('root.production.team1')).toBe(false);
        expect(isRootQueue('production')).toBe(false);
        expect(isRootQueue('')).toBe(false);
      });
    });
  });

  describe('property key analysis utilities', () => {
    describe('isGlobalPropertyKey', () => {
      it('should identify global property keys', () => {
        expect(isGlobalPropertyKey('yarn.scheduler.capacity.maximum-applications')).toBe(true);
        expect(isGlobalPropertyKey('yarn.scheduler.capacity.resource-calculator')).toBe(true);
        expect(isGlobalPropertyKey('yarn.scheduler.capacity.user-metrics.enable')).toBe(true);
      });

      it('should return false for queue property keys', () => {
        expect(isGlobalPropertyKey('yarn.scheduler.capacity.root.capacity')).toBe(false);
        expect(isGlobalPropertyKey('yarn.scheduler.capacity.root.default.capacity')).toBe(false);
        expect(isGlobalPropertyKey('yarn.scheduler.capacity.root.production.team1.state')).toBe(
          false,
        );
      });

      it('should return false for node label property keys', () => {
        expect(
          isGlobalPropertyKey(
            'yarn.scheduler.capacity.root.default.accessible-node-labels.gpu.capacity',
          ),
        ).toBe(false);
      });

      it('should return false for invalid property keys', () => {
        expect(isGlobalPropertyKey('invalid.property')).toBe(false);
        expect(isGlobalPropertyKey('')).toBe(false);
        expect(isGlobalPropertyKey('yarn.scheduler')).toBe(false);
      });
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle queue paths with special characters in names', () => {
      const key = buildPropertyKey('root.team-1_test', 'capacity');
      expect(key).toBe('yarn.scheduler.capacity.root.team-1_test.capacity');
    });

    it('should handle property names with special characters', () => {
      const key = buildPropertyKey('root.default', 'maximum-am-resource-percent');
      expect(key).toBe('yarn.scheduler.capacity.root.default.maximum-am-resource-percent');
    });

    it('should handle node labels with special characters', () => {
      const key = buildNodeLabelPropertyKey('root.default', 'gpu-high_mem', 'capacity');
      expect(key).toBe(
        'yarn.scheduler.capacity.root.default.accessible-node-labels.gpu-high_mem.capacity',
      );
    });
  });
});
