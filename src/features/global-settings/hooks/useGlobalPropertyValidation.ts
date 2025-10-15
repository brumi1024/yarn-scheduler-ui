import { useCallback } from 'react';
import { SPECIAL_VALUES } from '~/types';
import type { ValidationIssue } from '~/features/validation/types';
import { useValidation } from '~/contexts/ValidationContext';

export function useGlobalPropertyValidation() {
  const { validateField } = useValidation();

  const validateGlobalProperty = useCallback(
    (property: string, value: string): ValidationIssue[] => {
      return validateField(SPECIAL_VALUES.GLOBAL_QUEUE_PATH, property, value);
    },
    [validateField],
  );

  return { validateGlobalProperty };
}
