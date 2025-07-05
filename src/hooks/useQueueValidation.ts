import { useState, useCallback, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSchedulerStore } from '~/stores/schedulerStore';
import { businessValidation } from '~/utils/validation/businessRules/service';
import { getMergedConfigData } from '~/utils/validation/stagedChangesUtils';
import { createValidationContext } from '~/utils/validation/contextFactory';
import type { 
  BusinessValidationError, 
  QueueValidationContext 
} from '~/utils/validation/businessRules/types';
import type { PropertyDescriptor } from '~/types';

interface UseQueueValidationOptions {
  queuePath: string;
  schema?: z.ZodObject<Record<string, z.ZodType>>;
  properties?: PropertyDescriptor[];
  mode?: 'onBlur' | 'onChange' | 'onSubmit';
}

interface UseQueueValidationReturn {
  form: ReturnType<typeof useForm>;
  businessErrors: BusinessValidationError[];
  handleBlur: (field: string, value: string) => void;
  validateBusinessRules: (field: string, value: string) => boolean;
  getFieldErrors: (field: string) => string[];
  getFieldWarnings: (field: string) => string[];
  validateAll: (data: Record<string, string>) => Promise<boolean>;
  isValid: boolean;
  hasWarnings: boolean;
  clearBusinessErrors: () => void;
}

export function useQueueValidation({
  queuePath,
  schema,
  properties: _properties = [],
  mode = 'onBlur'
}: UseQueueValidationOptions): UseQueueValidationReturn {
  const { configData, schedulerData, stagedChanges } = useSchedulerStore();
  const [businessErrors, setBusinessErrors] = useState<BusinessValidationError[]>([]);

  const form = useForm({
    resolver: schema ? zodResolver(schema) : undefined,
    mode,
    criteriaMode: 'all'
  });

  // Merge staged changes with config data for validation
  const mergedConfigData = useMemo(() => {
    return getMergedConfigData(configData, stagedChanges);
  }, [configData, stagedChanges]);

  const context = useMemo((): QueueValidationContext => {
    return createValidationContext({
      queuePath,
      schedulerData,
      configData: mergedConfigData
    });
  }, [queuePath, mergedConfigData, schedulerData]);

  const validateBusinessRules = useCallback((field: string, value: string) => {
    const result = businessValidation.validateField(field, value, context);
    
    setBusinessErrors(prev => {
      const otherErrors = prev.filter(e => e.field !== field);
      return [...otherErrors, ...result.errors];
    });

    return result.valid;
  }, [context]);

  const handleBlur = useCallback((field: string, value: string) => {
    validateBusinessRules(field, value);
  }, [validateBusinessRules]);

  const getFieldErrors = useCallback((field: string): string[] => {
    const formatError = form.formState.errors[field]?.message;
    const businessFieldErrors = businessErrors
      .filter(e => e.field === field && e.severity === 'error')
      .map(e => e.message);
    
    return [
      ...(formatError && typeof formatError === 'string' ? [formatError] : []),
      ...businessFieldErrors
    ];
  }, [form.formState.errors, businessErrors]);

  const getFieldWarnings = useCallback((field: string): string[] => {
    return businessErrors
      .filter(e => e.field === field && e.severity === 'warning')
      .map(e => e.message);
  }, [businessErrors]);

  const validateAll = useCallback(async (data: Record<string, string>) => {
    const zodValid = schema ? await form.trigger() : true;
    
    const businessResult = businessValidation.validateQueue(queuePath, data, context);
    setBusinessErrors(businessResult.errors);
    
    return zodValid && businessResult.valid;
  }, [form, schema, queuePath, context]);

  const clearBusinessErrors = useCallback(() => {
    setBusinessErrors([]);
  }, []);

  useEffect(() => {
    setBusinessErrors([]);
  }, [queuePath]);

  const isValid = useMemo(() => {
    const hasFormatErrors = schema ? !form.formState.isValid : false;
    const hasBusinessErrors = businessErrors.some(e => e.severity === 'error');
    return !hasFormatErrors && !hasBusinessErrors;
  }, [schema, form.formState.isValid, businessErrors]);

  const hasWarnings = useMemo(() => {
    return businessErrors.some(e => e.severity === 'warning');
  }, [businessErrors]);

  return {
    form,
    businessErrors,
    handleBlur,
    validateBusinessRules,
    getFieldErrors,
    getFieldWarnings,
    validateAll,
    isValid,
    hasWarnings,
    clearBusinessErrors
  };
}