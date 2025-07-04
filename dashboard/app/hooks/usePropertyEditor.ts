import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import React, { useCallback, useEffect, useMemo } from 'react';
import { useSchedulerStore } from '~/store/schedulerStore';
import type { PropertyDescriptor, LabelPropertyDescriptor } from '~/lib/types/property-descriptor';
import { queuePropertyDefinitions } from '~/lib/config/propertyDefinitions';
import { generateLabelPropertyDescriptors, isLabelProperty, extractLabelFromPropertyName, extractBasePropertyFromLabelProperty } from '~/lib/utils/labelPropertyUtils';
import { toast } from 'sonner';

function createFormSchema(properties: any[]) {
    const schemaFields: Record<string, z.ZodType> = {};

    properties.forEach((property) => {
        let fieldSchema: z.ZodType = z.string();

        if (property.validationRules) {
            property.validationRules.forEach((rule) => {
                switch (rule.type) {
                    case 'range':
                        if (property.type === 'number') {
                            fieldSchema = z.string().refine(
                                (value) => {
                                    if (!value.trim()) return !property.required;
                                    const num = parseFloat(value);
                                    return !isNaN(num) &&
                                           (rule.min === undefined || num >= rule.min) &&
                                           (rule.max === undefined || num <= rule.max);
                                },
                                { message: rule.message }
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

export function usePropertyEditor({ queuePath, properties = queuePropertyDefinitions }: UsePropertyEditorOptions) {
    const {
        getQueuePropertyValue,
        stageQueueChange,
        stageLabelQueueChange,
        clearQueueChanges,
        applyChanges,
        nodeLabels,
    } = useSchedulerStore();

    const stagedChanges = useSchedulerStore(state => state.stagedChanges);
    
    // Generate dynamic label properties based on available node labels
    const labelProperties = useMemo(() => {
        return generateLabelPropertyDescriptors(nodeLabels);
    }, [nodeLabels]);
    
    // Combine base properties with label properties
    const allProperties = useMemo(() => {
        const combined = [...properties, ...labelProperties];
        
        // Fix: Escape dot notation in property names to prevent React Hook Form from treating them as nested paths
        const escapedProperties = combined.map(property => ({
            ...property,
            formFieldName: property.name.replace(/\./g, '__DOT__'), // Escape dots for React Hook Form
            originalName: property.name // Keep original name for staging
        }));
        
        return escapedProperties;
    }, [properties, labelProperties]);

    const formSchema = useMemo(() => createFormSchema(allProperties), [allProperties]);

    const form = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: {},
        mode: 'onBlur', // Changed from 'onChange' for better performance
        criteriaMode: 'all', // Show all validation errors
    });

    const { control, handleSubmit, reset, setValue, formState: { errors, isValid } } = form;

    const watchedValues = useWatch({ control });


    useEffect(() => {
        const initialValues: Record<string, string> = {};

        allProperties.forEach((property) => {
            const { value, isStaged } = getQueuePropertyValue(queuePath, property.originalName || property.name);
            
            // Use escaped field name for React Hook Form
            const fieldName = property.formFieldName || property.name;
            initialValues[fieldName] = value;
        });
        reset(initialValues);
    }, [queuePath, allProperties, getQueuePropertyValue, reset, stagedChanges]);

    const getStagedStatus = useCallback((propertyName: string): 'new' | 'modified' | 'deleted' | undefined => {
        const { isStaged } = getQueuePropertyValue(queuePath, propertyName);
        return isStaged ? 'modified' : undefined;
    }, [queuePath, getQueuePropertyValue]);

    const stageChange = useCallback((propertyName: string, value: string) => {
        const property = allProperties.find(p => p.name === propertyName);
        if (!property?.required && !value.trim()) {
            return;
        }

        // Handle label properties differently than regular properties
        if (isLabelProperty(propertyName)) {
            const labelName = extractLabelFromPropertyName(propertyName);
            const baseProperty = extractBasePropertyFromLabelProperty(propertyName);
            
            if (labelName && baseProperty) {
                stageLabelQueueChange(queuePath, labelName, baseProperty, value);
            }
        } else {
            stageQueueChange(queuePath, propertyName, value);
        }
    }, [queuePath, stageQueueChange, stageLabelQueueChange, allProperties]);

    const handleFieldChange = useCallback((propertyName: string) => (value: string) => {
        setValue(propertyName, value);
        // Note: No auto-staging - only update form state
    }, [setValue]);

    const onSubmit = useCallback(async (data: Record<string, string>) => {
        try {
            // Create mapping from escaped field names back to original property names
            const fieldNameMapping: Record<string, string> = {};
            allProperties.forEach(property => {
                const escapedName = property.formFieldName || property.name;
                const originalName = property.originalName || property.name;
                fieldNameMapping[escapedName] = originalName;
            });
            
            // Only stage fields that are actually dirty (changed by user)
            const dirtyFields = form.formState.dirtyFields;
            let stagedCount = 0;
            
            Object.entries(dirtyFields).forEach(([escapedFieldName, isDirty]) => {
                if (!isDirty) return; // Skip non-dirty fields
                
                const value = data[escapedFieldName];
                const originalPropertyName = fieldNameMapping[escapedFieldName] || escapedFieldName;
                
                // Type safety check - only stage string values
                if (typeof value !== 'string') {
                    return; // Skip this property
                }
                
                if (value !== undefined && value !== null) {
                    stageChange(originalPropertyName, value);
                    stagedCount++;
                }
            });

            const result = { 
                success: true, 
                message: `${stagedCount} change${stagedCount !== 1 ? 's' : ''} staged successfully!` 
            };
            
            // Show the toast here where we have the result
            toast.success(result.message);
            
            return result;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to stage changes';
            toast.error(errorMessage);
            throw error;
        }
    }, [stageChange, allProperties, form.formState.dirtyFields]);

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
        const queueChanges = stagedChanges.filter(c => c.queuePath === queuePath);
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

    return {
        form,
        control,
        handleSubmit: handleSubmit(onSubmit),
        handleReset,
        handleFieldChange,
        stageChange,
        errors,
        isValid,

        hasChanges,
        watchedValues,
        propertiesByCategory,

        getStagedStatus,

        properties: allProperties,
        labelProperties,
        formState: form.formState,
    };
}