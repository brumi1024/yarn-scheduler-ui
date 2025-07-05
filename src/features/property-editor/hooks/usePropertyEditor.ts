import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import React, { useCallback, useEffect, useMemo } from 'react';
import { useSchedulerStore } from '~/stores/schedulerStore';
import type {
  PropertyDescriptor,
  LabelPropertyDescriptor,
  ValidationRule,
} from '~/types/property-descriptor';
import { queuePropertyDefinitions } from '~/config/properties/queue-properties';
import {
  generateLabelPropertyDescriptors,
  isLabelProperty,
  extractLabelFromPropertyName,
  extractBasePropertyFromLabelProperty,
} from '~/features/node-labels/utils/labelPropertyUtils';
import { toast } from 'sonner';
import { useQueueValidation } from '~/hooks/useQueueValidation';
import type { BusinessValidationError } from '~/utils/validation/businessRules/types';
import { isBlockingError } from '~/utils/validation/businessRules/ruleCategories';
import { validatePropertyChange } from '~/utils/validation/crossQueueValidation';

function createFormSchema(
  properties: Array<
    (PropertyDescriptor | LabelPropertyDescriptor) & {
      formFieldName?: string;
      originalName?: string;
    }
  >,
) {
  const schemaFields: Record<string, z.ZodType> = {};

  properties.forEach((property) => {
    let fieldSchema: z.ZodType = z.string();

    if (property.validationRules) {
      property.validationRules.forEach((rule: ValidationRule) => {
        switch (rule.type) {
          case 'range':
            if (property.type === 'number') {
              fieldSchema = z.string().refine(
                (value) => {
                  if (!value.trim()) return !property.required;
                  const num = parseFloat(value);
                  return (
                    !isNaN(num) &&
                    (rule.min === undefined || num >= rule.min) &&
                    (rule.max === undefined || num <= rule.max)
                  );
                },
                { message: rule.message },
              );
            }
            break;
          case 'pattern':
            if (rule.pattern) {
              fieldSchema = z.string().regex(new RegExp(rule.pattern), rule.message);
            }
            break;
          case 'custom':
            if (rule.validator) {
              fieldSchema = z.string().refine(rule.validator, { message: rule.message });
            }
            break;
        }
      });
    }

    if (!property.required) {
      fieldSchema = fieldSchema.optional().or(z.literal(''));
    }

    // Use escaped field name for React Hook Form to prevent dot notation conflicts
    const fieldName = property.formFieldName || property.name;
    schemaFields[fieldName] = fieldSchema;
  });

  return z.object(schemaFields);
}

interface UsePropertyEditorOptions {
  queuePath: string;
  properties?: PropertyDescriptor[];
}

export function usePropertyEditor({
  queuePath,
  properties = queuePropertyDefinitions,
}: UsePropertyEditorOptions) {
  const {
    getQueuePropertyValue,
    stageQueueChange,
    stageLabelQueueChange,
    clearQueueChanges,
    nodeLabels,
    schedulerData,
    configData,
  } = useSchedulerStore();

  const stagedChanges = useSchedulerStore((state) => state.stagedChanges);

  // Generate dynamic label properties based on available node labels
  const labelProperties = useMemo(() => {
    return generateLabelPropertyDescriptors(nodeLabels);
  }, [nodeLabels]);

  // Combine base properties with label properties
  const allProperties = useMemo(() => {
    const combined = [...properties, ...labelProperties];

    // Fix: Escape dot notation in property names to prevent React Hook Form from treating them as nested paths
    const escapedProperties = combined.map((property) => ({
      ...property,
      formFieldName: property.name.replace(/\./g, '__DOT__'), // Escape dots for React Hook Form
      originalName: property.name, // Keep original name for staging
    }));

    return escapedProperties;
  }, [properties, labelProperties]);

  const formSchema = useMemo(() => createFormSchema(allProperties), [allProperties]);

  // Use the new validation hook for business rules
  const {
    businessErrors,
    handleBlur: handleBusinessBlur,
    getFieldErrors,
    getFieldWarnings,
    validateAll,
  } = useQueueValidation({
    queuePath,
    schema: formSchema,
    properties: allProperties,
    mode: 'onBlur',
  });

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {},
    mode: 'onBlur', // Changed from 'onChange' for better performance
    criteriaMode: 'all', // Show all validation errors
  });

  const { control, handleSubmit, reset, setValue } = form;

  const watchedValues = useWatch({ control });

  useEffect(() => {
    const initialValues: Record<string, string> = {};

    allProperties.forEach((property) => {
      const { value } = getQueuePropertyValue(queuePath, property.originalName || property.name);

      // Use escaped field name for React Hook Form
      const fieldName = property.formFieldName || property.name;
      initialValues[fieldName] = value;
    });
    reset(initialValues);
  }, [queuePath, allProperties, getQueuePropertyValue, reset, stagedChanges]);

  const getStagedStatus = useCallback(
    (propertyName: string): 'new' | 'modified' | 'deleted' | undefined => {
      const { isStaged } = getQueuePropertyValue(queuePath, propertyName);
      return isStaged ? 'modified' : undefined;
    },
    [queuePath, getQueuePropertyValue],
  );

  const stageChange = useCallback(
    (propertyName: string, value: string, validationErrors?: BusinessValidationError[]) => {
      const property = allProperties.find((p) => p.name === propertyName);
      if (!property?.required && !value.trim()) {
        return;
      }

      // Handle label properties differently than regular properties
      if (isLabelProperty(propertyName)) {
        const labelName = extractLabelFromPropertyName(propertyName);
        const baseProperty = extractBasePropertyFromLabelProperty(propertyName);

        if (labelName && baseProperty) {
          stageLabelQueueChange(queuePath, labelName, baseProperty, value, validationErrors);
        }
      } else {
        stageQueueChange(queuePath, propertyName, value, validationErrors);
      }
    },
    [queuePath, stageQueueChange, stageLabelQueueChange, allProperties],
  );

  const handleFieldChange = useCallback(
    (propertyName: string) => (value: string) => {
      setValue(propertyName, value);
      // Note: No auto-staging - only update form state
    },
    [setValue],
  );

  const handleFieldBlur = useCallback(
    (propertyName: string, value: string) => {
      // Find the original property name from the escaped name
      const property = allProperties.find(
        (p) => p.formFieldName === propertyName || p.name === propertyName,
      );
      const originalName = property?.originalName || propertyName;

      // Validate business rules on blur
      handleBusinessBlur(originalName, value);
    },
    [allProperties, handleBusinessBlur],
  );

  const onSubmit = useCallback(
    async (data: Record<string, string>) => {
      try {
        // Create mapping from escaped field names back to original property names
        const fieldNameMapping: Record<string, string> = {};
        const changedData: Record<string, string> = {};

        allProperties.forEach((property) => {
          const escapedName = property.formFieldName || property.name;
          const originalName = property.originalName || property.name;
          fieldNameMapping[escapedName] = originalName;
        });

        // Collect only dirty fields for validation
        const dirtyFields = form.formState.dirtyFields;
        Object.entries(dirtyFields).forEach(([escapedFieldName, isDirty]) => {
          if (isDirty && typeof data[escapedFieldName] === 'string') {
            const originalName = fieldNameMapping[escapedFieldName] || escapedFieldName;
            changedData[originalName] = data[escapedFieldName];
          }
        });

        // Run business validation on all changed fields
        const currentValues: Record<string, string> = {};
        allProperties.forEach((property) => {
          const originalName = property.originalName || property.name;
          const { value } = getQueuePropertyValue(queuePath, originalName);
          currentValues[originalName] = value;
        });

        // Merge current values with changes for validation
        const validationData = { ...currentValues, ...changedData };
        await validateAll(validationData);

        // Check for blocking errors
        const blockingErrors = businessErrors.filter(
          (error) => error.severity === 'error' && isBlockingError(error.rule, error.severity),
        );

        if (blockingErrors.length > 0) {
          toast.error(`Cannot stage changes: ${blockingErrors[0].message}`);
          return { success: false, message: blockingErrors[0].message };
        }

        // Get non-blocking validation errors to attach to changes
        const validationWarnings = businessErrors.filter(
          (error) => !isBlockingError(error.rule, error.severity),
        );

        // Stage changes with validation metadata including cross-queue errors
        let stagedCount = 0;
        Object.entries(changedData).forEach(([propertyName, value]) => {
          // Get cross-queue validation errors using shared logic
          const crossQueueErrors = validatePropertyChange({
            propertyName,
            propertyValue: value,
            queuePath,
            schedulerData,
            configData,
            stagedChanges,
            includeBlockingErrors: false,
          });

          // Also include field-specific errors from the main validation
          const fieldErrors = validationWarnings.filter((e) => e.field === propertyName);
          const allErrors = [...fieldErrors, ...crossQueueErrors];

          // Remove duplicates based on message and field
          const uniqueErrors = allErrors.filter(
            (error, index, self) =>
              index ===
              self.findIndex((e) => e.message === error.message && e.field === error.field),
          );

          stageChange(propertyName, value, uniqueErrors.length > 0 ? uniqueErrors : undefined);
          stagedCount++;
        });

        const result = {
          success: true,
          message: `${stagedCount} change${stagedCount !== 1 ? 's' : ''} staged successfully!`,
        };

        // Show success with warning if there are validation issues
        if (validationWarnings.length > 0) {
          toast.warning(
            `${result.message} (with ${validationWarnings.length} validation warning${validationWarnings.length !== 1 ? 's' : ''})`,
          );
        } else {
          toast.success(result.message);
        }

        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to stage changes';
        toast.error(errorMessage);
        throw error;
      }
    },
    [
      stageChange,
      allProperties,
      form.formState.dirtyFields,
      getQueuePropertyValue,
      queuePath,
      validateAll,
      businessErrors,
      schedulerData,
      configData,
      stagedChanges,
    ],
  );

  const handleReset = useCallback(() => {
    // Clear only the changes for the current queue
    clearQueueChanges(queuePath);

    // Reset form to original values
    const currentValues: Record<string, string> = {};
    allProperties.forEach((property) => {
      const { value } = getQueuePropertyValue(queuePath, property.originalName || property.name);
      const fieldName = property.formFieldName || property.name;
      currentValues[fieldName] = value;
    });
    reset(currentValues);
  }, [queuePath, getQueuePropertyValue, clearQueueChanges, reset, allProperties]);

  const hasChanges = useMemo(() => {
    if (!Array.isArray(stagedChanges)) {
      return false;
    }
    const queueChanges = stagedChanges.filter((c) => c.queuePath === queuePath);
    return queueChanges.length > 0;
  }, [stagedChanges, queuePath]);

  const propertiesByCategory = useMemo(() => {
    const categories: Record<string, PropertyDescriptor[]> = {};

    allProperties.forEach((property) => {
      if (!categories[property.category]) {
        categories[property.category] = [];
      }
      categories[property.category].push(property);
    });

    return categories;
  }, [allProperties]);

  // Get combined errors and validity state
  const combinedErrors = useMemo(() => {
    const zodErrors = form.formState.errors;
    const businessErrorsMap: Record<string, string[]> = {};

    // Map business errors to form field names
    businessErrors.forEach((error) => {
      const property = allProperties.find(
        (p) => p.originalName === error.field || p.name === error.field,
      );
      const fieldName = property?.formFieldName || error.field;

      if (!businessErrorsMap[fieldName]) {
        businessErrorsMap[fieldName] = [];
      }

      if (error.severity === 'error') {
        businessErrorsMap[fieldName].push(error.message);
      }
    });

    // Combine Zod and business errors
    const combined: Record<string, { type: string; message: string }> = {};

    // Copy Zod errors
    Object.entries(zodErrors).forEach(([field, error]) => {
      if (error) {
        combined[field] = {
          type: typeof error.type === 'string' ? error.type : 'validation',
          message: typeof error.message === 'string' ? error.message : 'Validation error',
        };
      }
    });

    Object.entries(businessErrorsMap).forEach(([field, messages]) => {
      if (combined[field]) {
        // If there's already a Zod error, append business errors
        const existingMessage = combined[field].message || '';
        combined[field] = {
          ...combined[field],
          message: existingMessage
            ? `${existingMessage}. ${messages.join('. ')}`
            : messages.join('. '),
        };
      } else {
        // Create new error entry for business errors
        combined[field] = {
          type: 'business',
          message: messages.join('. '),
        };
      }
    });

    return combined;
  }, [form.formState.errors, businessErrors, allProperties]);

  const isFormValid = useMemo(() => {
    const hasZodErrors = !form.formState.isValid;
    const hasBusinessErrors = businessErrors.some((e) => e.severity === 'error');
    return !hasZodErrors && !hasBusinessErrors;
  }, [form.formState.isValid, businessErrors]);

  return {
    form,
    control,
    handleSubmit: handleSubmit(onSubmit),
    handleReset,
    handleFieldChange,
    handleFieldBlur,
    stageChange,
    errors: combinedErrors,
    isValid: isFormValid,

    hasChanges,
    watchedValues,
    propertiesByCategory,

    getStagedStatus,

    properties: allProperties,
    labelProperties,
    formState: form.formState,

    // Business validation specific
    businessErrors,
    getFieldErrors,
    getFieldWarnings,
  };
}
