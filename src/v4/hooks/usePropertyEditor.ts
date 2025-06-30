import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCallback, useEffect, useMemo } from 'react';
import { useSchedulerStore } from '../store/schedulerStore';
import type { PropertyDescriptor } from '../types/property-descriptor';
import { queuePropertyDefinitions } from '../config/propertyDefinitions';

// Create a dynamic schema based on property definitions
function createFormSchema(properties: PropertyDescriptor[]) {
    const schemaFields: Record<string, z.ZodType> = {};
    
    properties.forEach((property) => {
        let fieldSchema: z.ZodType = z.string();
        
        // Apply validation rules based on property configuration
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
        
        // Make field optional if not required
        if (!property.required) {
            fieldSchema = fieldSchema.optional().or(z.literal(''));
        }
        
        schemaFields[property.name] = fieldSchema;
    });
    
    return z.object(schemaFields);
}

interface UsePropertyEditorOptions {
    queuePath: string;
    properties?: PropertyDescriptor[];
}

export function usePropertyEditor({ queuePath, properties = queuePropertyDefinitions }: UsePropertyEditorOptions) {
    const {
        getQueueDisplayValue,
        stageQueueChange,
        clearAllChanges,
        applyChanges,
    } = useSchedulerStore();
    
    // Use reactive store selector for staged changes
    const stagedChanges = useSchedulerStore(state => state.stagedChanges);

    // Create form schema
    const formSchema = useMemo(() => createFormSchema(properties), [properties]);
    
    // Initialize form with current values
    const form = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: {},
        mode: 'onChange',
    });

    const { control, handleSubmit, reset, setValue, formState: { errors, isValid } } = form;

    // Watch all form values to track dependencies
    const watchedValues = useWatch({ control });

    // Load initial values from store
    useEffect(() => {
        const initialValues: Record<string, string> = {};
        
        properties.forEach((property) => {
            const { value } = getQueueDisplayValue(queuePath, property.name);
            initialValues[property.name] = value;
        });
        
        reset(initialValues);
    }, [queuePath, properties, getQueueDisplayValue, reset]);

    // Get staged status for each property
    const getStagedStatus = useCallback((propertyName: string) => {
        const { isStaged } = getQueueDisplayValue(queuePath, propertyName);
        return isStaged;
    }, [queuePath, getQueueDisplayValue]);

    // Stage changes when form values change
    const stageChange = useCallback((propertyName: string, value: string) => {
        // Only stage non-empty values for optional fields
        const property = properties.find(p => p.name === propertyName);
        if (!property?.required && !value.trim()) {
            // For optional fields, empty values should not be staged
            // This allows them to remain unset in the YARN configuration
            return;
        }
        
        stageQueueChange(queuePath, propertyName, value);
    }, [queuePath, stageQueueChange, properties]);

    // Handle form field changes
    const handleFieldChange = useCallback((propertyName: string) => (value: string) => {
        setValue(propertyName, value);
        stageChange(propertyName, value);
    }, [setValue, stageChange]);

    // Handle form submission (apply changes)
    const onSubmit = useCallback(async (data: Record<string, string>) => {
        try {
            // Stage all form values
            Object.entries(data).forEach(([propertyName, value]) => {
                if (value !== undefined && value !== null) {
                    stageChange(propertyName, value);
                }
            });
            
            // Apply changes via store
            await applyChanges();
        } catch (error) {
            console.error('Failed to apply changes:', error);
            throw error;
        }
    }, [stageChange, applyChanges]);

    // Handle form reset (clear staged changes)
    const handleReset = useCallback(() => {
        // Clear all staged changes for this queue
        if (Array.isArray(stagedChanges)) {
            const queueChanges = stagedChanges.filter(c => c.queuePath === queuePath);
            queueChanges.forEach((change) => {
                // Reset form field to original value
                const { value } = getQueueDisplayValue(queuePath, change.property || '');
                setValue(change.property || '', value);
            });
        }
        
        // Clear staged changes from store
        clearAllChanges();
        
        // Reset form to current values
        const currentValues: Record<string, string> = {};
        properties.forEach((property) => {
            const { value } = getQueueDisplayValue(queuePath, property.name);
            currentValues[property.name] = value;
        });
        reset(currentValues);
    }, [queuePath, stagedChanges, getQueueDisplayValue, setValue, clearAllChanges, reset, properties]);

    // Check if there are unsaved changes (reactive to store state)
    const hasChanges = useMemo(() => {
        if (!Array.isArray(stagedChanges)) {
            return false;
        }
        const queueChanges = stagedChanges.filter(c => c.queuePath === queuePath);
        return queueChanges.length > 0;
    }, [stagedChanges, queuePath]);

    // Get properties grouped by category
    const propertiesByCategory = useMemo(() => {
        const categories: Record<string, PropertyDescriptor[]> = {};
        
        properties.forEach((property) => {
            if (!categories[property.category]) {
                categories[property.category] = [];
            }
            categories[property.category].push(property);
        });
        
        return categories;
    }, [properties]);

    return {
        // Form methods
        control,
        handleSubmit: handleSubmit(onSubmit),
        handleReset,
        handleFieldChange,
        stageChange,
        errors,
        isValid,
        
        // State
        hasChanges,
        watchedValues,
        propertiesByCategory,
        
        // Helpers
        getStagedStatus,
        
        // Properties
        properties,
    };
}