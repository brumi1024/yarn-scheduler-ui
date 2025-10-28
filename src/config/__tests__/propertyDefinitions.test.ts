import { describe, it, expect } from 'vitest';
import { queuePropertyDefinitions } from '../properties/queue-properties';
import {
  getPropertiesByCategory,
  getPropertyCategories,
  getPropertyDefinition,
} from '../properties/helpers';
import { globalPropertyDefinitions } from '../properties/global-properties';
import { CONFIG_PREFIXES } from '~/types';
import {
  capacityValueSchema,
  percentageSchema,
  positiveNumberSchema,
  integerSchema,
  aclFormatSchema,
} from '../schemas/validation';
import { shouldShowProperty } from '~/utils/propertyConditions';

describe('propertyDefinitions', () => {
  describe('queuePropertyDefinitions', () => {
    const LEGACY_MODE_PROPERTY = 'yarn.scheduler.capacity.legacy-queue-mode.enabled';

    const createConditionOptions = ({
      property,
      capacity = '50',
      legacyMode = 'true',
      values: overrideValues = {},
    }: {
      property: (typeof queuePropertyDefinitions)[number];
      capacity?: string;
      legacyMode?: string;
      values?: Record<string, string>;
    }) => {
      const values: Record<string, string> = {
        capacity,
        ...overrideValues,
      };
      const globalValues: Record<string, string> = {
        [LEGACY_MODE_PROPERTY]: legacyMode,
      };

      return {
        scope: 'queue' as const,
        property,
        propertyValue: values[property.name] ?? '',
        values,
        globalValues,
        queuePath: 'root.test',
        queueInfo: null,
        schedulerInfo: null,
        stagedChanges: [],
        configData: new Map(),
        getValue: (name: string) => values[name],
        getGlobalValue: (name: string) => globalValues[name],
        getQueueValue: (queuePath: string, name: string) =>
          queuePath === 'root.test' ? values[name] : undefined,
        getConfigValue: () => undefined,
      };
    };

    it('includes essential YARN queue properties', () => {
      const propertyNames = queuePropertyDefinitions.map((p) => p.name);

      // Core properties
      expect(propertyNames).toContain('capacity');
      expect(propertyNames).toContain('maximum-capacity');
      expect(propertyNames).toContain('state');

      // User limits
      expect(propertyNames).toContain('minimum-user-limit-percent');
      expect(propertyNames).toContain('user-limit-factor');

      // Application control
      expect(propertyNames).toContain('maximum-applications');
      expect(propertyNames).toContain('maximum-am-resource-percent');

      // Security
      expect(propertyNames).toContain('acl_submit_applications');
      expect(propertyNames).toContain('acl_administer_queue');

      // Node label access control
      expect(propertyNames).toContain('accessible-node-labels');
      expect(propertyNames).toContain('default-node-label-expression');
    });

    it('has required capacity property', () => {
      const capacityProperty = queuePropertyDefinitions.find((p) => p.name === 'capacity');
      expect(capacityProperty).toBeDefined();
      expect(capacityProperty?.required).toBe(true);
      expect(capacityProperty?.category).toBe('general');
    });

    it('has proper categories for all properties', () => {
      const validCategories = [
        'general',
        'resource',
        'scheduling',
        'limits',
        'security',
        'advanced',
      ];

      queuePropertyDefinitions.forEach((property) => {
        expect(validCategories).toContain(property.category);
      });
    });

    it('has validation rules for properties that need them', () => {
      const capacityProperty = queuePropertyDefinitions.find((p) => p.name === 'capacity');
      expect(capacityProperty?.validationRules).toBeDefined();
      expect(capacityProperty?.validationRules?.length).toBeGreaterThan(0);

      const userLimitProperty = queuePropertyDefinitions.find(
        (p) => p.name === 'minimum-user-limit-percent',
      );
      expect(userLimitProperty?.validationRules).toBeDefined();
    });

    it('has enum values for enum type properties', () => {
      const stateProperty = queuePropertyDefinitions.find((p) => p.name === 'state');
      expect(stateProperty?.type).toBe('enum');
      expect(stateProperty?.enumValues?.some((option) => option.value === 'RUNNING')).toBe(true);
      expect(stateProperty?.enumValues?.some((option) => option.value === 'STOPPED')).toBe(true);

      const orderingPolicy = queuePropertyDefinitions.find((p) => p.name === 'ordering-policy');
      expect(orderingPolicy?.type).toBe('enum');
      expect(orderingPolicy?.enumValues?.some((option) => option.value === 'fifo')).toBe(true);
      expect(orderingPolicy?.enumValues?.some((option) => option.value === 'fair')).toBe(true);
    });

    it('has conditional enableWhen for dependent properties', () => {
      const fairWeightProperty = queuePropertyDefinitions.find(
        (p) => p.name === 'ordering-policy.fair.enable-size-based-weight',
      );
      expect(Array.isArray(fairWeightProperty?.enableWhen)).toBe(true);
      const fairCondition = fairWeightProperty?.enableWhen?.[0];
      expect(fairCondition).toBeInstanceOf(Function);
      if (fairCondition && fairWeightProperty) {
        const baseValues: Record<string, string> = { 'ordering-policy': 'fair' };
        const result = fairCondition({
          scope: 'queue',
          property: fairWeightProperty,
          propertyValue: '',
          values: baseValues,
          globalValues: {},
          queuePath: 'root.a',
          queueInfo: null,
          schedulerInfo: null,
          stagedChanges: [],
          configData: new Map(),
          getValue: (name: string) => baseValues[name],
          getGlobalValue: () => undefined,
          getQueueValue: () => undefined,
          getConfigValue: () => undefined,
        });
        expect(result).toBe(true);

        const negative = fairCondition({
          scope: 'queue',
          property: fairWeightProperty,
          propertyValue: '',
          values: { 'ordering-policy': 'fifo' },
          globalValues: {},
          queuePath: 'root.a',
          queueInfo: null,
          schedulerInfo: null,
          stagedChanges: [],
          configData: new Map(),
          getValue: (name: string) => (name === 'ordering-policy' ? 'fifo' : undefined),
          getGlobalValue: () => undefined,
          getQueueValue: () => undefined,
          getConfigValue: () => undefined,
        });
        expect(negative).toBe(false);
      }

      const templateSupported = queuePropertyDefinitions.filter((p) => p.templateSupport);
      expect(templateSupported.length).toBeGreaterThan(0);
      expect(templateSupported.some((p) => p.name === 'capacity')).toBe(true);
    });

    it('shows correct auto-creation properties based on capacity and legacy mode', () => {
      const legacyAutoCreate = queuePropertyDefinitions.find(
        (p) => p.name === 'auto-create-child-queue.enabled',
      );
      const flexibleAutoCreate = queuePropertyDefinitions.find(
        (p) => p.name === 'auto-queue-creation-v2.enabled',
      );
      const flexibleMaxQueues = queuePropertyDefinitions.find(
        (p) => p.name === 'auto-queue-creation-v2.max-queues',
      );

      expect(legacyAutoCreate).toBeDefined();
      expect(flexibleAutoCreate).toBeDefined();
      expect(flexibleMaxQueues).toBeDefined();
      if (!legacyAutoCreate || !flexibleAutoCreate || !flexibleMaxQueues) {
        return;
      }

      // Legacy mode with weight capacity -> show only flexible auto-creation
      const legacyWeightOptions = createConditionOptions({
        property: flexibleAutoCreate,
        capacity: '2w',
        legacyMode: 'true',
      });
      expect(shouldShowProperty(flexibleAutoCreate, legacyWeightOptions)).toBe(true);
      expect(
        shouldShowProperty(
          legacyAutoCreate,
          createConditionOptions({
            property: legacyAutoCreate,
            capacity: '2w',
            legacyMode: 'true',
          }),
        ),
      ).toBe(false);

      // Legacy mode with percentage capacity -> show only legacy auto-creation
      const legacyPercentOptions = createConditionOptions({
        property: legacyAutoCreate,
        capacity: '50',
        legacyMode: 'true',
      });
      expect(shouldShowProperty(legacyAutoCreate, legacyPercentOptions)).toBe(true);
      expect(
        shouldShowProperty(
          flexibleAutoCreate,
          createConditionOptions({
            property: flexibleAutoCreate,
            capacity: '50',
            legacyMode: 'true',
          }),
        ),
      ).toBe(false);

      // Flexible max-queues aligns with flexible toggle visibility
      expect(
        shouldShowProperty(
          flexibleMaxQueues,
          createConditionOptions({
            property: flexibleMaxQueues,
            capacity: '2w',
            legacyMode: 'true',
            values: { 'auto-queue-creation-v2.enabled': 'true' },
          }),
        ),
      ).toBe(true);
      expect(
        shouldShowProperty(
          flexibleMaxQueues,
          createConditionOptions({
            property: flexibleMaxQueues,
            capacity: '50',
            legacyMode: 'true',
            values: { 'auto-queue-creation-v2.enabled': 'true' },
          }),
        ),
      ).toBe(false);

      // Non-legacy mode always shows flexible auto-creation and hides legacy
      expect(
        shouldShowProperty(
          flexibleAutoCreate,
          createConditionOptions({
            property: flexibleAutoCreate,
            capacity: '50',
            legacyMode: 'false',
          }),
        ),
      ).toBe(true);
      expect(
        shouldShowProperty(
          legacyAutoCreate,
          createConditionOptions({
            property: legacyAutoCreate,
            capacity: '50',
            legacyMode: 'false',
          }),
        ),
      ).toBe(false);
    });

    it('has accessible node labels properties', () => {
      const accessibleLabelsProperty = queuePropertyDefinitions.find(
        (p) => p.name === 'accessible-node-labels',
      );
      expect(accessibleLabelsProperty).toBeDefined();
      expect(accessibleLabelsProperty?.category).toBe('general');
      expect(accessibleLabelsProperty?.required).toBe(false);
      expect(accessibleLabelsProperty?.type).toBe('string');
      expect(accessibleLabelsProperty?.validationRules).toBeDefined();

      const defaultExpressionProperty = queuePropertyDefinitions.find(
        (p) => p.name === 'default-node-label-expression',
      );
      expect(defaultExpressionProperty).toBeDefined();
      expect(defaultExpressionProperty?.category).toBe('general');
      expect(defaultExpressionProperty?.required).toBe(false);
      expect(defaultExpressionProperty?.type).toBe('string');
    });

    it('validates accessible node labels correctly', () => {
      const accessibleLabelsProperty = queuePropertyDefinitions.find(
        (p) => p.name === 'accessible-node-labels',
      );
      const validator = accessibleLabelsProperty?.validationRules?.[0]?.validator;

      expect(validator).toBeDefined();
      if (validator) {
        // Valid cases
        expect(validator('')).toBe(true); // Empty for default partition
        expect(validator('*')).toBe(true); // All labels
        expect(validator('gpu')).toBe(true); // Single label
        expect(validator('gpu,cpu')).toBe(true); // Multiple labels
        expect(validator('gpu, cpu, fpga')).toBe(true); // With spaces

        // Invalid cases
        expect(validator('gpu,cpu,')).toBe(false); // Trailing comma
        expect(validator(',gpu')).toBe(false); // Leading comma
        expect(validator('gpu.cpu')).toBe(false); // Invalid character
        expect(validator('gpu cpu')).toBe(false); // Space instead of comma
      }
    });
  });

  describe('globalPropertyDefinitions', () => {
    it('includes global YARN properties', () => {
      const propertyNames = globalPropertyDefinitions.map((p) => p.name);

      expect(propertyNames).toContain(`${CONFIG_PREFIXES.BASE}.maximum-applications`);
      expect(propertyNames).toContain(`${CONFIG_PREFIXES.BASE}.maximum-am-resource-percent`);
      expect(propertyNames).toContain(`${CONFIG_PREFIXES.BASE}.resource-calculator`);
    });

    it('has correct enum values for resource calculator', () => {
      const resourceCalcProperty = globalPropertyDefinitions.find(
        (p) => p.name === `${CONFIG_PREFIXES.BASE}.resource-calculator`,
      );
      expect(resourceCalcProperty?.type).toBe('enum');
      expect(
        resourceCalcProperty?.enumValues?.some(
          (option) =>
            option.value === 'org.apache.hadoop.yarn.util.resource.DefaultResourceCalculator',
        ),
      ).toBe(true);
      expect(
        resourceCalcProperty?.enumValues?.some(
          (option) =>
            option.value === 'org.apache.hadoop.yarn.util.resource.DominantResourceCalculator',
        ),
      ).toBe(true);
    });
  });

  describe('helper functions', () => {
    describe('getPropertiesByCategory', () => {
      it('returns properties for a valid category', () => {
        const generalProperties = getPropertiesByCategory('general');
        expect(generalProperties.length).toBeGreaterThan(0);
        generalProperties.forEach((prop) => {
          expect(prop.category).toBe('general');
        });
      });

      it('returns empty array for categories with no properties', () => {
        const nonExistentProperties = getPropertiesByCategory('nonexistent' as any);
        expect(nonExistentProperties).toEqual([]);
      });
    });

    describe('getPropertyCategories', () => {
      it('returns all valid categories', () => {
        const categories = getPropertyCategories();
        expect(categories).toContain('general');
        expect(categories).toContain('resource');
        expect(categories).toContain('scheduling');
        expect(categories).toContain('limits');
        expect(categories).toContain('security');
        expect(categories).toContain('advanced');
      });
    });

    describe('getPropertyDefinition', () => {
      it('returns property definition for valid name', () => {
        const capacityProperty = getPropertyDefinition('capacity');
        expect(capacityProperty).toBeDefined();
        expect(capacityProperty?.name).toBe('capacity');
      });

      it('returns undefined for invalid name', () => {
        const invalidProperty = getPropertyDefinition('nonexistent-property');
        expect(invalidProperty).toBeUndefined();
      });
    });
  });

  describe('validation schemas', () => {
    describe('capacityValueSchema', () => {
      it('validates percentage values', () => {
        expect(capacityValueSchema.safeParse('50').success).toBe(true);
        expect(capacityValueSchema.safeParse('50%').success).toBe(true);
        expect(capacityValueSchema.safeParse('100').success).toBe(true);
        expect(capacityValueSchema.safeParse('0').success).toBe(true);

        expect(capacityValueSchema.safeParse('101').success).toBe(false);
        expect(capacityValueSchema.safeParse('-1').success).toBe(false);
        expect(capacityValueSchema.safeParse('150%').success).toBe(false);
      });

      it('validates weight values', () => {
        expect(capacityValueSchema.safeParse('2w').success).toBe(true);
        expect(capacityValueSchema.safeParse('10w').success).toBe(true);
        expect(capacityValueSchema.safeParse('0.5w').success).toBe(true);

        expect(capacityValueSchema.safeParse('0w').success).toBe(false);
        expect(capacityValueSchema.safeParse('-1w').success).toBe(false);
        expect(capacityValueSchema.safeParse('w').success).toBe(false);
      });

      it('validates absolute resource values', () => {
        expect(capacityValueSchema.safeParse('[memory=1024,vcores=2]').success).toBe(true);
        expect(capacityValueSchema.safeParse('[memory=2048]').success).toBe(true);
        expect(capacityValueSchema.safeParse('[vcores=4]').success).toBe(true);

        expect(capacityValueSchema.safeParse('[]').success).toBe(false);
        expect(capacityValueSchema.safeParse('[memory=]').success).toBe(false);
        expect(capacityValueSchema.safeParse('[=1024]').success).toBe(false);
        expect(capacityValueSchema.safeParse('[memory=abc]').success).toBe(false);
      });

      it('allows empty values', () => {
        expect(capacityValueSchema.safeParse('').success).toBe(true);
        expect(capacityValueSchema.safeParse('   ').success).toBe(true);
      });
    });

    describe('percentageSchema', () => {
      it('validates percentage values', () => {
        expect(percentageSchema.safeParse('0').success).toBe(true);
        expect(percentageSchema.safeParse('50').success).toBe(true);
        expect(percentageSchema.safeParse('100').success).toBe(true);
        expect(percentageSchema.safeParse('25.5').success).toBe(true);

        expect(percentageSchema.safeParse('101').success).toBe(false);
        expect(percentageSchema.safeParse('-1').success).toBe(false);
        expect(percentageSchema.safeParse('abc').success).toBe(false);
      });

      it('allows empty values', () => {
        expect(percentageSchema.safeParse('').success).toBe(true);
      });
    });

    describe('positiveNumberSchema', () => {
      it('validates positive numbers', () => {
        expect(positiveNumberSchema.safeParse('1').success).toBe(true);
        expect(positiveNumberSchema.safeParse('0.1').success).toBe(true);
        expect(positiveNumberSchema.safeParse('100').success).toBe(true);

        expect(positiveNumberSchema.safeParse('0').success).toBe(false);
        expect(positiveNumberSchema.safeParse('-1').success).toBe(false);
        expect(positiveNumberSchema.safeParse('abc').success).toBe(false);
      });

      it('allows empty values', () => {
        expect(positiveNumberSchema.safeParse('').success).toBe(true);
      });
    });

    describe('integerSchema', () => {
      it('validates positive integers', () => {
        expect(integerSchema.safeParse('1').success).toBe(true);
        expect(integerSchema.safeParse('100').success).toBe(true);
        expect(integerSchema.safeParse('1000').success).toBe(true);

        expect(integerSchema.safeParse('0').success).toBe(false);
        expect(integerSchema.safeParse('-1').success).toBe(false);
        expect(integerSchema.safeParse('1.5').success).toBe(false);
        expect(integerSchema.safeParse('abc').success).toBe(false);
      });

      it('allows empty values', () => {
        expect(integerSchema.safeParse('').success).toBe(true);
      });
    });

    describe('aclFormatSchema', () => {
      it('validates ACL format', () => {
        expect(aclFormatSchema.safeParse('*').success).toBe(true);
        expect(aclFormatSchema.safeParse(' ').success).toBe(true);
        expect(aclFormatSchema.safeParse('user1,user2 group1,group2').success).toBe(true);
        expect(aclFormatSchema.safeParse('user1 group1').success).toBe(true);
        expect(aclFormatSchema.safeParse('user1').success).toBe(true);
        expect(aclFormatSchema.safeParse('user1,user2').success).toBe(true);

        expect(aclFormatSchema.safeParse('user1 group1 extra').success).toBe(false);
        expect(aclFormatSchema.safeParse('user@domain').success).toBe(false);
        expect(aclFormatSchema.safeParse('user with spaces').success).toBe(false);
      });

      it('allows empty values', () => {
        expect(aclFormatSchema.safeParse('').success).toBe(true);
      });
    });
  });

  describe('property completeness', () => {
    it('covers major YARN configuration categories', () => {
      const categories = new Set(queuePropertyDefinitions.map((p) => p.category));

      expect(categories.has('general')).toBe(true);
      expect(categories.has('resource')).toBe(true);
      expect(categories.has('limits')).toBe(true);
      expect(categories.has('security')).toBe(true);
      expect(categories.has('advanced')).toBe(true);
    });

    it('has properties for auto-queue creation', () => {
      const autoQueueProperties = queuePropertyDefinitions.filter(
        (p) => p.name.includes('auto-') || p.name.includes('template'),
      );
      expect(autoQueueProperties.length).toBeGreaterThan(0);
    });

    it('has properties for preemption control', () => {
      const preemptionProperties = queuePropertyDefinitions.filter((p) =>
        p.name.includes('preemption'),
      );
      expect(preemptionProperties.length).toBeGreaterThan(0);
    });

    it('has properties for application lifetime management', () => {
      const lifetimeProperties = queuePropertyDefinitions.filter((p) =>
        p.name.includes('lifetime'),
      );
      expect(lifetimeProperties.length).toBeGreaterThan(0);
    });
  });
});
