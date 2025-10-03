import type {
  BusinessValidator,
  BusinessValidationResult,
  BusinessValidationError,
  QueueValidationContext,
} from './types';
import {
  validateCapacityTypeConsistency,
  validateChildCapacitySum,
  validateMaxCapacityRelationship,
  validateParentChildCapacityConstraints,
} from './capacityRules';
import {
  validateQueueStateTransition,
  validateQueueDeletion,
  validateQueueConversion,
} from './stateRules';
import {
  validateApplicationLifetime,
  validateUserLimitFactor,
  validateMinimumUserLimitPercent,
} from './lifetimeRules';
import { validateAccessibleNodeLabels, validateLabelSpecificCapacities } from './labelRules';

export class BusinessValidationService {
  private validators = new Map<string, BusinessValidator<unknown>[]>();
  private patternValidators: Array<{
    pattern: RegExp;
    validators: BusinessValidator<unknown>[];
  }> = [];

  constructor() {
    this.registerValidators();
  }

  private registerValidators() {
    this.addValidator('capacity', [
      validateCapacityTypeConsistency as BusinessValidator<unknown>,
      validateChildCapacitySum as BusinessValidator<unknown>,
      validateParentChildCapacityConstraints as BusinessValidator<unknown>,
    ]);

    this.addValidator('maximum-capacity', [
      validateMaxCapacityRelationship as BusinessValidator<unknown>,
    ]);

    this.addValidator('state', [validateQueueStateTransition as BusinessValidator<unknown>]);

    this.addValidator('accessible-node-labels', [
      validateAccessibleNodeLabels as BusinessValidator<unknown>,
    ]);

    this.addPatternValidator(/^accessible-node-labels\.[^.]+\.capacity$/, [
      validateLabelSpecificCapacities as BusinessValidator<unknown>,
    ]);

    this.addValidator('default-application-lifetime', [
      validateApplicationLifetime as BusinessValidator<unknown>,
    ]);
    this.addValidator('maximum-application-lifetime', [
      validateApplicationLifetime as BusinessValidator<unknown>,
    ]);

    this.addValidator('user-limit-factor', [validateUserLimitFactor as BusinessValidator<unknown>]);
    this.addValidator('minimum-user-limit-percent', [
      validateMinimumUserLimitPercent as BusinessValidator<unknown>,
    ]);
  }

  private addValidator(field: string, validators: BusinessValidator<unknown>[]) {
    this.validators.set(field, validators);
  }

  private addPatternValidator(pattern: RegExp, validators: BusinessValidator<unknown>[]) {
    this.patternValidators.push({ pattern, validators });
  }

  validateField(
    field: string,
    value: unknown,
    context: QueueValidationContext,
  ): BusinessValidationResult {
    const validators = this.getFieldValidators(field);
    const errors: BusinessValidationError[] = [];

    for (const validator of validators) {
      const result = validator(value, { ...context, field });
      errors.push(...result.errors);
    }

    return {
      valid: errors.filter((e) => e.severity === 'error').length === 0,
      errors,
    };
  }

  validateQueue(
    queuePath: string,
    properties: Record<string, string>,
    context: QueueValidationContext,
  ): BusinessValidationResult {
    const errors: BusinessValidationError[] = [];
    const queueContext = { ...context, queuePath };

    for (const [field, value] of Object.entries(properties)) {
      const result = this.validateField(field, value, queueContext);
      errors.push(...result.errors);
    }

    if (context.legacyModeEnabled) {
      const sumResult = validateChildCapacitySum('', queueContext);
      errors.push(...sumResult.errors);
    }

    return {
      valid: errors.filter((e) => e.severity === 'error').length === 0,
      errors,
    };
  }

  validateOperation(
    operation: 'delete' | 'convert',
    context: QueueValidationContext,
  ): BusinessValidationResult {
    switch (operation) {
      case 'delete':
        return validateQueueDeletion('', context);
      case 'convert':
        return validateQueueConversion('', context);
      default:
        return { valid: true, errors: [] };
    }
  }

  getFieldValidators(field: string): BusinessValidator[] {
    const directValidators = this.validators.get(field) || [];
    const patternValidators = this.patternValidators.flatMap(({ pattern, validators }) => {
      pattern.lastIndex = 0;
      return pattern.test(field) ? validators : [];
    });

    return [...directValidators, ...patternValidators];
  }

  hasFieldValidators(field: string): boolean {
    if (this.validators.has(field)) {
      return true;
    }

    return this.patternValidators.some(({ pattern }) => {
      pattern.lastIndex = 0;
      return pattern.test(field);
    });
  }
}

export const businessValidation = new BusinessValidationService();
