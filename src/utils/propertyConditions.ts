import type {
  PropertyCondition,
  PropertyDescriptor,
  PropertyEvaluationContext,
  PropertyEvaluationScope,
} from '~/types/property-descriptor';

type BaseContextOptions = Omit<PropertyEvaluationContext, 'property' | 'propertyValue' | 'scope'>;

export type PropertyConditionOptions = BaseContextOptions & {
  scope: PropertyEvaluationScope;
  property: PropertyDescriptor;
  propertyValue: string;
};

function buildContext(options: PropertyConditionOptions): PropertyEvaluationContext {
  const { property, propertyValue, scope, ...rest } = options;
  return {
    property,
    propertyValue,
    scope,
    ...rest,
  };
}

function evaluate(
  conditions: PropertyCondition[] | undefined,
  options: PropertyConditionOptions,
): boolean {
  if (!conditions || conditions.length === 0) {
    return true;
  }

  const context = buildContext(options);

  return conditions.every((condition) => {
    try {
      return condition(context);
    } catch (error) {
      console.error('Failed to evaluate property condition', {
        property: options.property.name,
        scope: options.scope,
        error,
      });
      return true;
    }
  });
}

export function shouldShowProperty(
  property: PropertyDescriptor,
  options: PropertyConditionOptions,
): boolean {
  return evaluate(property.showWhen, options);
}

export function isPropertyEnabled(
  property: PropertyDescriptor,
  options: PropertyConditionOptions,
): boolean {
  return evaluate(property.enableWhen, options);
}
