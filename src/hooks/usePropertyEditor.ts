import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCallback, useEffect, useMemo } from 'react';
import { useSchedulerStore } from '../store/schedulerStore';
import type { PropertyDescriptor, LabelPropertyDescriptor } from '../types/property-descriptor';
import { queuePropertyDefinitions } from '../config/propertyDefinitions';
import { generateLabelPropertyDescriptors, isLabelProperty, extractLabelFromPropertyName, extractBasePropertyFromLabelProperty } from '../utils/labelPropertyUtils';

function createFormSchema(properties: PropertyDescriptor[]) {
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
        stageLabelQueueChange,
        clearAllChanges,
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
        return [...properties, ...labelProperties];
    }, [properties, labelProperties]);

    const formSchema = useMemo(() => createFormSchema(allProperties), [allProperties]);

    const form = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: {},
        mode: 'onBlur', // Changed from 'onChange' for better performance
    });

    const { control, handleSubmit, reset, setValue, formState: { errors, isValid } } = form;

    const watchedValues = useWatch({ control });

    useEffect(() => {
        const initialValues: Record<string, string> = {};

        allProperties.forEach((property) => {
            const { value } = getQueueDisplayValue(queuePath, property.name);
            initialValues[property.name] = value;
        });

        reset(initialValues);
    }, [queuePath, allProperties, getQueueDisplayValue, reset]);

    const getStagedStatus = useCallback((propertyName: string) => {
        const { isStaged } = getQueueDisplayValue(queuePath, propertyName);
        return isStaged;
    }, [queuePath, getQueueDisplayValue]);

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
        stageChange(propertyName, value);
    }, [setValue, stageChange]);

    const onSubmit = useCallback(async (data: Record<string, string>) => {
        try {
            Object.entries(data).forEach(([propertyName, value]) => {
                if (value !== undefined && value !== null) {
                    stageChange(propertyName, value);
                }
            });

            await applyChanges();
        } catch (error) {
            console.error('Failed to apply changes:', error);
            throw error;
        }
    }, [stageChange, applyChanges]);

    const handleReset = useCallback(() => {
        if (Array.isArray(stagedChanges)) {
            const queueChanges = stagedChanges.filter(c => c.queuePath === queuePath);
            queueChanges.forEach((change) => {
                const { value } = getQueueDisplayValue(queuePath, change.property || '');
                setValue(change.property || '', value);
            });
        }

        clearAllChanges();

        const currentValues: Record<string, string> = {};
        allProperties.forEach((property) => {
            const { value } = getQueueDisplayValue(queuePath, property.name);
            currentValues[property.name] = value;
        });
        reset(currentValues);
    }, [queuePath, stagedChanges, getQueueDisplayValue, setValue, clearAllChanges, reset, allProperties]);

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
    };
}