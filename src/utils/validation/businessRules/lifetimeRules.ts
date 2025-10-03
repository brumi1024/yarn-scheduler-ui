import type { BusinessValidator, BusinessValidationError } from './types';

export const validateApplicationLifetime: BusinessValidator<string> = (value, context) => {
  const field = context.field || 'default-application-lifetime';

  if (!value || value.trim() === '' || value === '-1') {
    return { valid: true, errors: [] };
  }

  const lifetime = parseInt(value, 10);
  if (isNaN(lifetime)) {
    return { valid: true, errors: [] };
  }

  const errors: BusinessValidationError[] = [];

  if (field === 'default-application-lifetime') {
    const maxLifetime = context.configData.get(
      `yarn.scheduler.capacity.${context.queuePath}.maximum-application-lifetime`,
    );

    if (maxLifetime && maxLifetime !== '-1') {
      const maxNum = parseInt(maxLifetime, 10);
      if (!isNaN(maxNum) && lifetime > maxNum) {
        errors.push({
          field: 'default-application-lifetime',
          message: `Default lifetime (${lifetime}s) cannot exceed maximum lifetime (${maxNum}s)`,
          severity: 'error',
          rule: 'lifetime-relationship',
        });
      }
    }
  }

  if (field === 'maximum-application-lifetime') {
    const defaultLifetime = context.configData.get(
      `yarn.scheduler.capacity.${context.queuePath}.default-application-lifetime`,
    );

    if (defaultLifetime && defaultLifetime !== '-1') {
      const defaultNum = parseInt(defaultLifetime, 10);
      if (!isNaN(defaultNum) && lifetime < defaultNum) {
        errors.push({
          field: 'maximum-application-lifetime',
          message: `Maximum lifetime (${lifetime}s) must be greater than or equal to default lifetime (${defaultNum}s)`,
          severity: 'error',
          rule: 'lifetime-relationship',
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

export const validateUserLimitFactor: BusinessValidator<string> = (value, _context) => {
  if (!value || value.trim() === '') {
    return { valid: true, errors: [] };
  }

  const factor = parseFloat(value);
  if (isNaN(factor)) {
    return { valid: true, errors: [] };
  }

  const errors: BusinessValidationError[] = [];

  if (factor < 0 && factor != -1) {
    errors.push({
      field: 'user-limit-factor',
      message: 'User limit factor must be non-negative or -1 (as disabled)',
      severity: 'error',
      rule: 'user-limit-factor-range',
    });
  }

  if (factor === 0) {
    errors.push({
      field: 'user-limit-factor',
      message: 'User limit factor of 0 will prevent any user from submitting applications',
      severity: 'warning',
      rule: 'user-limit-factor-zero-warning',
    });
  }

  return {
    valid: errors.filter((e) => e.severity === 'error').length === 0,
    errors,
  };
};

export const validateMinimumUserLimitPercent: BusinessValidator<string> = (value, _context) => {
  if (!value || value.trim() === '') {
    return { valid: true, errors: [] };
  }

  const percent = parseFloat(value);
  if (isNaN(percent)) {
    return { valid: true, errors: [] };
  }

  const errors: BusinessValidationError[] = [];

  if (percent > 100) {
    errors.push({
      field: 'minimum-user-limit-percent',
      message: 'Minimum user limit percent cannot exceed 100%',
      severity: 'error',
      rule: 'minimum-user-limit-percent-max',
    });
  }

  if (percent === 100) {
    errors.push({
      field: 'minimum-user-limit-percent',
      message:
        'Setting minimum user limit to 100% means each user can get the entire queue capacity',
      severity: 'warning',
      rule: 'minimum-user-limit-percent-warning',
    });
  }

  return {
    valid: errors.filter((e) => e.severity === 'error').length === 0,
    errors,
  };
};
