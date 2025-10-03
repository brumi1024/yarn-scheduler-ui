import { describe, it, expect, beforeEach } from 'vitest';
import { BusinessValidationService } from './service';
import type { QueueValidationContext } from './types';

describe('BusinessValidationService', () => {
  let service: BusinessValidationService;
  let context: QueueValidationContext;

  beforeEach(() => {
    service = new BusinessValidationService();
    context = {
      queuePath: 'root.a',
      legacyModeEnabled: true,
      schedulerData: {
        queues: {
          queue: [
            {
              queuePath: 'root',
              queues: {
                queue: [
                  { queuePath: 'root.a', queueName: 'a' },
                  { queuePath: 'root.b', queueName: 'b' },
                ],
              },
            },
          ],
        },
      } as any,
      configData: new Map([
        ['yarn.scheduler.capacity.root.a.capacity', '50%'],
        ['yarn.scheduler.capacity.root.b.capacity', '50%'],
      ]),
      parentQueue: undefined,
      siblingQueues: [
        { queuePath: 'root.a', queueName: 'a' } as any,
        { queuePath: 'root.b', queueName: 'b' } as any,
      ],
    };
  });

  describe('validateField', () => {
    it('should validate capacity field', () => {
      const result = service.validateField('capacity', '50%', context);
      expect(result.valid).toBe(true);
    });

    it('should validate maximum-capacity field', () => {
      const result = service.validateField('maximum-capacity', '75%', context);
      expect(result.valid).toBe(true);
    });

    it('should validate state field', () => {
      const result = service.validateField('state', 'RUNNING', context);
      expect(result.valid).toBe(true);
    });

    it('should validate application lifetime fields', () => {
      const result = service.validateField('default-application-lifetime', '3600', context);
      expect(result.valid).toBe(true);
    });

    it('should return valid for fields without validators', () => {
      const result = service.validateField('unknown-field', 'any-value', context);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should aggregate errors from multiple validators', () => {
      // Set up context to trigger multiple capacity validators
      context.configData.set('yarn.scheduler.capacity.root.b.capacity', '2w'); // Different type
      const result = service.validateField('capacity', '50%', context);

      // Should have error for capacity type consistency
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((e) => e.rule === 'capacity-type-consistency')).toBe(true);
    });

    it('should enforce parent label access for accessible-node-labels', () => {
      context.queuePath = 'root.a.leaf';
      context.configData.set('yarn.scheduler.capacity.root.a.accessible-node-labels', 'gpu');

      const allowedResult = service.validateField('accessible-node-labels', 'gpu', context);
      expect(allowedResult.valid).toBe(true);

      const deniedResult = service.validateField('accessible-node-labels', 'cpu', context);
      expect(deniedResult.valid).toBe(false);
      expect(deniedResult.errors.some((e) => e.rule === 'queue-label-access')).toBe(true);
    });

    it('should ensure label capacities sum to 100 across siblings', () => {
      context.queuePath = 'root.a';
      context.configData.set('yarn.scheduler.capacity.root.a.accessible-node-labels', 'gpu');
      context.configData.set('yarn.scheduler.capacity.root.b.accessible-node-labels', 'gpu');
      context.configData.set(
        'yarn.scheduler.capacity.root.b.accessible-node-labels.gpu.capacity',
        '40',
      );

      const validResult = service.validateField(
        'accessible-node-labels.gpu.capacity',
        '60',
        context,
      );
      expect(validResult.valid).toBe(true);

      context.configData.set(
        'yarn.scheduler.capacity.root.b.accessible-node-labels.gpu.capacity',
        '10',
      );

      const invalidResult = service.validateField(
        'accessible-node-labels.gpu.capacity',
        '60',
        context,
      );
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors.some((e) => e.rule === 'label-capacity-sum')).toBe(true);
    });

    it('should skip label capacity validation when legacy mode disabled', () => {
      context.queuePath = 'root.a';
      context.legacyModeEnabled = false;
      context.configData.set('yarn.scheduler.capacity.root.a.accessible-node-labels', 'gpu');
      context.configData.set('yarn.scheduler.capacity.root.b.accessible-node-labels', 'gpu');
      context.configData.set(
        'yarn.scheduler.capacity.root.b.accessible-node-labels.gpu.capacity',
        '10',
      );

      const result = service.validateField('accessible-node-labels.gpu.capacity', '60', context);
      expect(result.valid).toBe(true);
      expect(result.errors.some((e) => e.rule === 'label-capacity-sum')).toBe(false);
    });
  });

  describe('validateQueue', () => {
    it('should validate all properties', () => {
      const properties = {
        capacity: '50%',
        'maximum-capacity': '75%',
        state: 'RUNNING',
        'default-application-lifetime': '3600',
      };

      const result = service.validateQueue('root.a', properties, context);
      expect(result.valid).toBe(true);
    });

    it('should include child capacity sum validation in legacy mode', () => {
      // Set up parent context
      const parentContext: QueueValidationContext = {
        ...context,
        queuePath: 'root',
        schedulerData: {
          queueName: 'root',
          queuePath: 'root',
          queues: {
            queue: [
              { queuePath: 'root.a', queueName: 'a' },
              { queuePath: 'root.b', queueName: 'b' },
            ],
          },
        } as any,
        configData: new Map([
          ['yarn.scheduler.capacity.root.a.capacity', '30%'],
          ['yarn.scheduler.capacity.root.b.capacity', '40%'], // Total 70%, not 100%
        ]),
      };

      const result = service.validateQueue('root', {}, parentContext);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.rule === 'child-capacity-sum')).toBe(true);
    });

    it('should skip child capacity sum validation when legacy mode disabled', () => {
      const nonLegacyContext = { ...context, legacyModeEnabled: false };
      const result = service.validateQueue('root', {}, nonLegacyContext);
      expect(result.valid).toBe(true);
    });
  });

  describe('validateOperation', () => {
    it('should validate delete operation', () => {
      context.schedulerData = {
        queueName: 'root',
        queuePath: 'root',
        queues: {
          queue: [
            {
              queuePath: 'root.a',
              queueName: 'a',
              state: 'STOPPED',
              numApplications: 0,
              queues: { queue: [] },
            },
          ],
        },
      } as any;

      const result = service.validateOperation('delete', context);
      expect(result.valid).toBe(true);
    });

    it('should validate convert operation', () => {
      context.schedulerData = {
        queueName: 'root',
        queuePath: 'root',
        queues: {
          queue: [
            {
              queuePath: 'root.a',
              queueName: 'a',
              state: 'RUNNING',
              numApplications: 0,
            },
          ],
        },
      } as any;

      const result = service.validateOperation('convert', context);
      expect(result.valid).toBe(false);
      expect(result.errors[0].rule).toBe('conversion-state-requirement');
    });

    it('should return valid for unknown operations', () => {
      const result = service.validateOperation('unknown' as any, context);
      expect(result.valid).toBe(true);
    });
  });

  describe('getFieldValidators', () => {
    it('should return validators for registered fields', () => {
      const validators = service.getFieldValidators('capacity');
      expect(validators.length).toBeGreaterThan(0);
    });

    it('should return validators for label capacity pattern fields', () => {
      const validators = service.getFieldValidators('accessible-node-labels.gpu.capacity');
      expect(validators.length).toBeGreaterThan(0);
    });

    it('should return empty array for unregistered fields', () => {
      const validators = service.getFieldValidators('unknown-field');
      expect(validators).toEqual([]);
    });
  });

  describe('hasFieldValidators', () => {
    it('should return true for registered fields', () => {
      expect(service.hasFieldValidators('capacity')).toBe(true);
      expect(service.hasFieldValidators('maximum-capacity')).toBe(true);
      expect(service.hasFieldValidators('state')).toBe(true);
    });

    it('should return true for label capacity pattern fields', () => {
      expect(service.hasFieldValidators('accessible-node-labels.gpu.capacity')).toBe(true);
    });

    it('should return false for unregistered fields', () => {
      expect(service.hasFieldValidators('unknown-field')).toBe(false);
    });
  });
});
