import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCallback, useEffect, useMemo } from 'react';
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
import { useValidation } from '~/contexts/ValidationContext';
import { validateQueue } from '~/features/validation/service';
import type { ValidationIssue } from '~/features/validation/types';
import { isBlockingError } from '~/features/validation/ruleCategories';
import { validatePropertyChange } from '~/features/validation/crossQueue';
import { buildPropertyKey } from '~/utils/propertyUtils';

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

  const { errors: validationState, replaceQueueIssues, clearQueueErrors } = useValidation();

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {},
    mode: 'onBlur', // Changed from 'onChange' for better performance
    criteriaMode: 'all', // Show all validation errors
  });

  const { control, handleSubmit, reset, setValue } = form;

  const watchedValues = useWatch({ control });

  const normalizeFieldName = useCallback(
    (field: string): string => {
      const property = allProperties.find(
        (p) => p.formFieldName === field || p.originalName === field || p.name === field,
      );

      if (property) {
        return property.originalName || property.name;
      }

      return field.replace(/__DOT__/g, '.');
    },
    [allProperties],
  );

  const getFieldIssues = useCallback(
    (field: string): ValidationIssue[] => {
      const normalized = normalizeFieldName(field);
      const queueIssues = validationState[queuePath];
      return queueIssues?.[normalized] ?? [];
    },
    [normalizeFieldName, validationState, queuePath],
  );

  const getFieldErrors = useCallback(
    (field: string): string[] => {
      return getFieldIssues(field)
        .filter((issue) => issue.severity === 'error')
        .map((issue) => issue.message);
    },
    [getFieldIssues],
  );

  const getFieldWarnings = useCallback(
    (field: string): string[] => {
      return getFieldIssues(field)
        .filter((issue) => issue.severity === 'warning')
        .map((issue) => issue.message);
    },
    [getFieldIssues],
  );

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
    (propertyName: string, value: string, validationErrors?: ValidationIssue[]) => {
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
    },
    [setValue],
  );

  const handleFieldBlur = useCallback(() => {
    // Validation now runs on save; blur handler intentionally left blank
  }, []);

  const onSubmit = useCallback(
    async (data: Record<string, string>) => {
      try {
        const fieldNameMapping: Record<string, string> = {};
        const changedData: Record<string, string> = {};

        allProperties.forEach((property) => {
          const escapedName = property.formFieldName || property.name;
          const originalName = property.originalName || property.name;
          fieldNameMapping[escapedName] = originalName;
        });

        Object.entries(form.formState.dirtyFields).forEach(([escapedFieldName, isDirty]) => {
          if (isDirty && typeof data[escapedFieldName] === 'string') {
            const originalName = fieldNameMapping[escapedFieldName] || escapedFieldName;
            changedData[originalName] = data[escapedFieldName];
          }
        });

        const pendingEntries = Object.entries(changedData);

        const previewConfigData = new Map(configData);
        pendingEntries.forEach(([propertyName, value]) => {
          const propertyKey = buildPropertyKey(queuePath, propertyName);
          if (!value.trim()) {
            previewConfigData.delete(propertyKey);
          } else {
            previewConfigData.set(propertyKey, value);
          }
        });

        const queueValidation = validateQueue({
          queuePath,
          properties: changedData,
          configData,
          stagedChanges,
          schedulerData,
        });

        replaceQueueIssues(queuePath, queueValidation.issues);

        const blockingIssues = queueValidation.issues.filter((issue) =>
          isBlockingError(issue.rule, issue.severity),
        );

        const nonBlockingIssues = queueValidation.issues.filter(
          (issue) => !isBlockingError(issue.rule, issue.severity),
        );

        if (blockingIssues.length > 0) {
          toast.error(`Cannot stage changes: ${blockingIssues[0].message}`);
          return { success: false, message: blockingIssues[0].message };
        }

        let stagedCount = 0;
        pendingEntries.forEach(([propertyName, value]) => {
          const fieldIssues = nonBlockingIssues.filter((issue) => issue.field === propertyName);

          const crossQueueIssues = validatePropertyChange({
            propertyName,
            propertyValue: value,
            queuePath,
            schedulerData,
            configData: previewConfigData,
            stagedChanges,
            includeBlockingErrors: false,
          });

          const allIssues = [...fieldIssues, ...crossQueueIssues];

          const uniqueIssues = allIssues.filter(
            (issue, index, self) =>
              index ===
              self.findIndex(
                (candidate) =>
                  candidate.queuePath === issue.queuePath &&
                  candidate.field === issue.field &&
                  candidate.message === issue.message &&
                  candidate.severity === issue.severity,
              ),
          );

          stageChange(propertyName, value, uniqueIssues.length > 0 ? uniqueIssues : undefined);
          stagedCount += 1;
        });

        const result = {
          success: true,
          message: `${stagedCount} change${stagedCount !== 1 ? 's' : ''} staged successfully!`,
        };

        if (nonBlockingIssues.length > 0) {
          toast.warning(
            `${result.message} (with ${nonBlockingIssues.length} validation warning${nonBlockingIssues.length !== 1 ? 's' : ''})`,
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
      queuePath,
      replaceQueueIssues,
      schedulerData,
      configData,
      stagedChanges,
    ],
  );

  const handleReset = useCallback(() => {
    // Clear only the changes for the current queue
    clearQueueChanges(queuePath);
    clearQueueErrors(queuePath);

    // Reset form to original values
    const currentValues: Record<string, string> = {};
    allProperties.forEach((property) => {
      const { value } = getQueuePropertyValue(queuePath, property.originalName || property.name);
      const fieldName = property.formFieldName || property.name;
      currentValues[fieldName] = value;
    });
    reset(currentValues);
  }, [queuePath, getQueuePropertyValue, clearQueueChanges, clearQueueErrors, reset, allProperties]);

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
    const queueIssues = validationState[queuePath] ?? {};

    const combined: Record<string, { type: string; message: string }> = {};

    Object.entries(zodErrors).forEach(([field, error]) => {
      if (!error) {
        return;
      }

      const normalizedField = normalizeFieldName(field);
      const message = typeof error.message === 'string' ? error.message : 'Validation error';

      combined[normalizedField] = {
        type: typeof error.type === 'string' ? error.type : 'validation',
        message,
      };
    });

    Object.entries(queueIssues).forEach(([field, issues]) => {
      const errorMessages = issues
        .filter((issue) => issue.severity === 'error')
        .map((issue) => issue.message);

      if (errorMessages.length === 0) {
        return;
      }

      if (combined[field]) {
        const existingMessage = combined[field].message || '';
        combined[field] = {
          ...combined[field],
          message: existingMessage
            ? `${existingMessage}. ${errorMessages.join('. ')}`
            : errorMessages.join('. '),
        };
      } else {
        combined[field] = {
          type: 'business',
          message: errorMessages.join('. '),
        };
      }
    });

    return combined;
  }, [form.formState.errors, validationState, queuePath, normalizeFieldName]);

  const isFormValid = useMemo(() => {
    const hasZodErrors = !form.formState.isValid;
    const queueIssues = validationState[queuePath] ?? {};
    const hasValidationErrors = Object.values(queueIssues).some((issues) =>
      issues.some((issue) => issue.severity === 'error'),
    );
    return !hasZodErrors && !hasValidationErrors;
  }, [form.formState.isValid, validationState, queuePath]);

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

    getFieldErrors,
    getFieldWarnings,
  };
}
