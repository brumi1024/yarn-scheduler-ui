import { describe, it, expect } from 'vitest';
import { getMergedConfigData, getEffectivePropertyValue } from './stagedChangesUtils';
import type { StagedChange } from '~/types';
import { SPECIAL_VALUES } from '~/types';
import { createTestStagedChange } from '../../../test-helpers/stagedChange';

describe('stagedChangesUtils', () => {
  describe('getMergedConfigData', () => {
    it('should return a copy of configData when no staged changes', () => {
      const configData = new Map([
        ['yarn.scheduler.capacity.root.capacity', '100'],
        ['yarn.scheduler.capacity.root.queues', 'prod,dev'],
      ]);

      const result = getMergedConfigData(configData, []);

      expect(result).toEqual(configData);
      expect(result).not.toBe(configData); // Should be a new Map
    });

    it('should apply staged changes to queue properties', () => {
      const configData = new Map([
        ['yarn.scheduler.capacity.root.prod.capacity', '60'],
        ['yarn.scheduler.capacity.root.dev.capacity', '40'],
      ]);

      const stagedChanges: StagedChange[] = [
        createTestStagedChange({
          queuePath: 'root.prod',
          property: 'capacity',
          oldValue: '60',
          newValue: '70',
        }),
        createTestStagedChange({
          queuePath: 'root.dev',
          property: 'capacity',
          oldValue: '40',
          newValue: '30',
        }),
      ];

      const result = getMergedConfigData(configData, stagedChanges);

      expect(result.get('yarn.scheduler.capacity.root.prod.capacity')).toBe('70');
      expect(result.get('yarn.scheduler.capacity.root.dev.capacity')).toBe('30');
    });

    it('should apply staged changes to global properties', () => {
      const configData = new Map([['yarn.scheduler.capacity.legacy-queue-mode.enabled', 'true']]);

      const stagedChanges: StagedChange[] = [
        createTestStagedChange({
          queuePath: SPECIAL_VALUES.GLOBAL_QUEUE_PATH,
          property: SPECIAL_VALUES.LEGACY_MODE_PROPERTY,
          oldValue: 'true',
          newValue: 'false',
        }),
      ];

      const result = getMergedConfigData(configData, stagedChanges);

      expect(result.get('yarn.scheduler.capacity.legacy-queue-mode.enabled')).toBe('false');
    });

    it('should delete properties when new value is empty', () => {
      const configData = new Map([['yarn.scheduler.capacity.root.prod.maximum-capacity', '100']]);

      const stagedChanges: StagedChange[] = [
        createTestStagedChange({
          queuePath: 'root.prod',
          property: 'maximum-capacity',
          oldValue: '100',
          newValue: '',
        }),
      ];

      const result = getMergedConfigData(configData, stagedChanges);

      expect(result.has('yarn.scheduler.capacity.root.prod.maximum-capacity')).toBe(false);
    });

    it('should handle multiple staged changes for the same property (last wins)', () => {
      const configData = new Map([['yarn.scheduler.capacity.root.prod.capacity', '60']]);

      const stagedChanges: StagedChange[] = [
        createTestStagedChange({
          queuePath: 'root.prod',
          property: 'capacity',
          oldValue: '60',
          newValue: '70',
        }),
        createTestStagedChange({
          queuePath: 'root.prod',
          property: 'capacity',
          oldValue: '70',
          newValue: '80',
        }),
      ];

      const result = getMergedConfigData(configData, stagedChanges);

      expect(result.get('yarn.scheduler.capacity.root.prod.capacity')).toBe('80');
    });
  });

  describe('getEffectivePropertyValue', () => {
    it('should return staged value when available', () => {
      const configData = new Map([['yarn.scheduler.capacity.root.prod.capacity', '60']]);

      const stagedChanges: StagedChange[] = [
        createTestStagedChange({
          queuePath: 'root.prod',
          property: 'capacity',
          oldValue: '60',
          newValue: '70',
        }),
      ];

      const result = getEffectivePropertyValue(configData, stagedChanges, 'root.prod', 'capacity');

      expect(result).toBe('70');
    });

    it('should return config value when no staged change', () => {
      const configData = new Map([['yarn.scheduler.capacity.root.prod.capacity', '60']]);

      const result = getEffectivePropertyValue(configData, [], 'root.prod', 'capacity');

      expect(result).toBe('60');
    });

    it('should return empty string when property not found', () => {
      const configData = new Map();

      const result = getEffectivePropertyValue(configData, [], 'root.prod', 'capacity');

      expect(result).toBe('');
    });

    it('should handle global properties', () => {
      const configData = new Map([['yarn.scheduler.capacity.legacy-queue-mode.enabled', 'true']]);

      const stagedChanges: StagedChange[] = [
        createTestStagedChange({
          queuePath: SPECIAL_VALUES.GLOBAL_QUEUE_PATH,
          property: SPECIAL_VALUES.LEGACY_MODE_PROPERTY,
          oldValue: 'true',
          newValue: 'false',
        }),
      ];

      const result = getEffectivePropertyValue(
        configData,
        stagedChanges,
        SPECIAL_VALUES.GLOBAL_QUEUE_PATH,
        SPECIAL_VALUES.LEGACY_MODE_PROPERTY,
      );

      expect(result).toBe('false');
    });
  });
});
