import { describe, it, expect } from 'vitest';
import {
  queuePropertyDefinitions,
  globalPropertyDefinitions,
  getPropertiesByCategory,
  getPropertyCategories,
  getPropertyDefinition,
  capacityValueSchema,
  percentageSchema,
  positiveNumberSchema,
  nonNegativeNumberSchema,
  integerSchema,
  aclFormatSchema,
} from '../propertyDefinitions';

describe('propertyDefinitions', () => {
  describe('queuePropertyDefinitions', () => {
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
      expect(stateProperty?.enumValues).toContain('RUNNING');
      expect(stateProperty?.enumValues).toContain('STOPPED');

      const orderingPolicy = queuePropertyDefinitions.find((p) => p.name === 'ordering-policy');
      expect(orderingPolicy?.type).toBe('enum');
      expect(orderingPolicy?.enumValues).toContain('fifo');
      expect(orderingPolicy?.enumValues).toContain('fair');
    });

    it('has conditional enableWhen for dependent properties', () => {
      const fairWeightProperty = queuePropertyDefinitions.find(
        (p) => p.name === 'ordering-policy.fair.enable-size-based-weight',
      );
      expect(fairWeightProperty?.enableWhen).toBeDefined();
      expect(fairWeightProperty?.enableWhen?.['ordering-policy']).toBeDefined();

      const leafQueueTemplate = queuePropertyDefinitions.find(
        (p) => p.name === 'leaf-queue-template.capacity',
      );
      expect(leafQueueTemplate?.enableWhen).toBeDefined();
      expect(leafQueueTemplate?.enableWhen?.['auto-create-child-queue.enabled']).toBeDefined();
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

      expect(propertyNames).toContain('maximum-applications');
      expect(propertyNames).toContain('maximum-am-resource-percent');
      expect(propertyNames).toContain('resource-calculator');
    });

    it('has correct enum values for resource calculator', () => {
      const resourceCalcProperty = globalPropertyDefinitions.find(
        (p) => p.name === 'resource-calculator',
      );
      expect(resourceCalcProperty?.type).toBe('enum');
      expect(resourceCalcProperty?.enumValues).toContain(
        'org.apache.hadoop.yarn.util.resource.DefaultResourceCalculator',
      );
      expect(resourceCalcProperty?.enumValues).toContain(
        'org.apache.hadoop.yarn.util.resource.DominantResourceCalculator',
      );
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
