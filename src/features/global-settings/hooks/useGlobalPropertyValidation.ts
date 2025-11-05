import { SPECIAL_VALUES } from '~/types';
import type { ValidationIssue } from '~/types';
import { useValidation } from '~/contexts/ValidationContext';

export function useGlobalPropertyValidation() {
  const { validateField } = useValidation();

  const validateGlobalProperty = (property: string, value: string): ValidationIssue[] => {
    return validateField(SPECIAL_VALUES.GLOBAL_QUEUE_PATH, property, value);
  };

  return { validateGlobalProperty };
}
