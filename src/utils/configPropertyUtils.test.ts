import { describe, it, expect } from 'vitest';
import { configPropertyUtils } from './configPropertyUtils';

describe('configPropertyUtils', () => {
  const createTestConfigData = () => {
    return new Map([
      // Queue properties
      ['yarn.scheduler.capacity.root.capacity', '100'],
      ['yarn.scheduler.capacity.root.queues', 'default,production'],
      ['yarn.scheduler.capacity.root.default.capacity', '40'],
      ['yarn.scheduler.capacity.root.default.maximum-capacity', '60'],
      ['yarn.scheduler.capacity.root.default.state', 'RUNNING'],
      ['yarn.scheduler.capacity.root.production.capacity', '60'],
      ['yarn.scheduler.capacity.root.production.state', 'RUNNING'],
      // Nested properties (should be skipped for queue properties)
      ['yarn.scheduler.capacity.root.production.accessible-node-labels.gpu.capacity', '50'],
      // Global properties
      ['yarn.scheduler.capacity.maximum-applications', '10000'],
      ['yarn.scheduler.capacity.resource-calculator', 'DefaultResourceCalculator'],
      ['yarn.scheduler.capacity.node-locality-delay', '40'],
      ['yarn.resourcemanager.scheduler.class', 'CapacityScheduler'],
      ['yarn.acl.enable', 'true'],
    ]);
  };

  describe('getQueueProperties', () => {
    it('should return all direct properties for a queue', () => {
      const configData = createTestConfigData();
      const props = configPropertyUtils.getQueueProperties(configData, 'root.default');

      expect(props).toEqual({
        capacity: '40',
        'maximum-capacity': '60',
        state: 'RUNNING',
      });
    });

    it('should return properties for root queue', () => {
      const configData = createTestConfigData();
      const props = configPropertyUtils.getQueueProperties(configData, 'root');

      expect(props).toEqual({
        capacity: '100',
        queues: 'default,production',
      });
    });

    it('should skip nested properties', () => {
      const configData = createTestConfigData();
      const props = configPropertyUtils.getQueueProperties(configData, 'root.production');

      expect(props).toEqual({
        capacity: '60',
        state: 'RUNNING',
      });
      // Should not include accessible-node-labels.gpu.capacity
      expect(props['accessible-node-labels.gpu.capacity']).toBeUndefined();
    });

    it('should return empty object for non-existent queue', () => {
      const configData = createTestConfigData();
      const props = configPropertyUtils.getQueueProperties(configData, 'root.nonexistent');

      expect(props).toEqual({});
    });
  });

  describe('getGlobalProperties', () => {
    it('should return all global properties', () => {
      const configData = createTestConfigData();
      const props = configPropertyUtils.getGlobalProperties(configData);

      expect(props).toEqual({
        'yarn.scheduler.capacity.maximum-applications': '10000',
        'yarn.scheduler.capacity.resource-calculator': 'DefaultResourceCalculator',
        'yarn.scheduler.capacity.node-locality-delay': '40',
        'yarn.resourcemanager.scheduler.class': 'CapacityScheduler',
        'yarn.acl.enable': 'true',
      });
    });

    it('should exclude all queue properties', () => {
      const configData = createTestConfigData();
      const props = configPropertyUtils.getGlobalProperties(configData);

      // Should not include any properties with queue paths
      expect(Object.keys(props).some((key) => key.includes('.root.'))).toBe(false);
      expect(Object.keys(props).some((key) => key.endsWith('.root'))).toBe(false);
    });

    it('should handle empty config data', () => {
      const configData = new Map<string, string>();
      const props = configPropertyUtils.getGlobalProperties(configData);

      expect(props).toEqual({});
    });
  });
});
