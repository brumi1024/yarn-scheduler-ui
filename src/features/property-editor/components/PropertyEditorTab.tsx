import React, { useState, useImperativeHandle, forwardRef, useCallback } from 'react';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '~/components/ui/accordion';
import { usePropertyEditor } from '~/features/property-editor/hooks/usePropertyEditor';
import { PropertyFormField } from './PropertyFormField';
import type { QueueInfo } from '~/types';
import type { PropertyCategory } from '~/types';
import { toast } from 'sonner';
import { Form } from '~/components/ui/form';
import { useSchedulerStore } from '~/stores/schedulerStore';
import { shouldShowProperty, isPropertyEnabled } from '~/utils/propertyConditions';
import { globalPropertyDefinitions } from '~/config/properties/global-properties';
import {
  baseCategoryOrder,
  categoryConfig,
} from '~/features/property-editor/constants/categoryConfig';

export interface PropertyEditorTabHandle {
  submit: () => Promise<void>;
  reset: () => void;
  isValid: () => boolean;
  getErrors: () => Record<string, unknown>;
}

interface PropertyEditorTabProps {
  queue: QueueInfo;
  onHasChangesChange?: (hasChanges: boolean) => void;
  onIsSubmittingChange?: (isSubmitting: boolean) => void;
  onFormDirtyChange?: (isDirty: boolean) => void;
  templateConfigControls?: {
    canManageTemplates: boolean;
    legacyAvailable: boolean;
    flexibleAvailable: boolean;
    onOpenTemplateConfig: () => void;
  };
}

export const PropertyEditorTab = forwardRef<PropertyEditorTabHandle, PropertyEditorTabProps>(
  (
    { queue, onHasChangesChange, onIsSubmittingChange, onFormDirtyChange, templateConfigControls },
    ref,
  ) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [expandedAccordions, setExpandedAccordions] = useState<string[]>(['general']);

    const getGlobalPropertyValue = useSchedulerStore((state) => state.getGlobalPropertyValue);
    const getQueuePropertyValue = useSchedulerStore((state) => state.getQueuePropertyValue);
    const stagedChanges = useSchedulerStore((state) => state.stagedChanges);
    const configData = useSchedulerStore((state) => state.configData);
    const schedulerInfo = useSchedulerStore((state) => state.schedulerData);

    const {
      form,
      control,
      handleSubmit,
      handleReset,
      errors,
      isValid,
      hasChanges,
      watchedValues,
      propertiesByCategory,
      getStagedStatus,
      formState,
      handleFieldBlur,
      getFieldErrors,
      getFieldWarnings,
      properties,
    } = usePropertyEditor({
      queuePath: queue.queuePath,
    });

    // Check if form is still initializing
    const isFormInitializing =
      !control || !propertiesByCategory || Object.keys(propertiesByCategory).length === 0;

    const parentQueuePath = React.useMemo(() => {
      const parts = queue.queuePath.split('.');
      if (parts.length <= 1) {
        return undefined;
      }

      return parts.slice(0, -1).join('.');
    }, [queue.queuePath]);

    // Notify parent about hasChanges state
    React.useEffect(() => {
      onHasChangesChange?.(hasChanges);
    }, [hasChanges, onHasChangesChange]);

    // Notify parent about submission state
    React.useEffect(() => {
      onIsSubmittingChange?.(isSubmitting);
    }, [isSubmitting, onIsSubmittingChange]);

    // Notify parent about form dirty state
    React.useEffect(() => {
      onFormDirtyChange?.(formState.isDirty);
    }, [formState.isDirty, onFormDirtyChange]);

    // Handle form submission (staging)
    const onSubmit = React.useCallback(async () => {
      setIsSubmitting(true);
      try {
        await handleSubmit();
        // Toast is now handled in the actual onSubmit callback
      } catch (error) {
        // Error toast is also handled in the callback
        console.error('Form submission error:', error);
      } finally {
        setIsSubmitting(false);
      }
    }, [handleSubmit]);

    // Handle form reset
    const onReset = useCallback(() => {
      handleReset();
      toast.success('Form reset to current values');
    }, [handleReset]);

    // Expose handlers to parent via ref
    useImperativeHandle(
      ref,
      () => ({
        submit: onSubmit,
        reset: onReset,
        isValid: () => isValid,
        getErrors: () => errors,
      }),
      [onSubmit, onReset, isValid, errors],
    );

    const categoryOrder = React.useMemo<PropertyCategory[]>(() => [...baseCategoryOrder], []);

    const queueValues = React.useMemo(() => {
      const values: Record<string, string> = {};
      const watchedRecord = (watchedValues ?? {}) as Record<string, unknown>;

      properties.forEach((property) => {
        const fieldName = property.formFieldName || property.name;
        const rawValue = watchedRecord[fieldName];
        let normalized = '';
        if (typeof rawValue === 'string') {
          normalized = rawValue;
        } else if (rawValue != null) {
          normalized = String(rawValue);
        } else if (property.defaultValue) {
          normalized = property.defaultValue;
        }
        values[property.originalName || property.name] = normalized;
      });

      return values;
    }, [properties, watchedValues]);

    const globalValues = React.useMemo(() => {
      const values: Record<string, string> = {};
      globalPropertyDefinitions.forEach((property) => {
        const { value } = getGlobalPropertyValue(property.name);
        values[property.name] = value;
      });
      return values;
    }, [getGlobalPropertyValue]);

    const conditionBase = React.useMemo(() => {
      const queueValueCache = new Map<string, string | undefined>();
      const globalValueCache = new Map<string, string | undefined>();

      const getQueueValue = (targetQueuePath: string, name: string) => {
        if (!targetQueuePath) return undefined;

        if (targetQueuePath === queue.queuePath) {
          return queueValues[name];
        }

        const cacheKey = `${targetQueuePath}::${name}`;
        if (!queueValueCache.has(cacheKey)) {
          const { value } = getQueuePropertyValue(targetQueuePath, name);
          queueValueCache.set(cacheKey, value);
        }
        return queueValueCache.get(cacheKey);
      };

      const getValue = (name: string) => {
        if (name in queueValues) {
          return queueValues[name];
        }
        return getQueueValue(queue.queuePath, name);
      };

      const getGlobalValue = (name: string) => {
        if (name in globalValues) {
          return globalValues[name];
        }
        if (!globalValueCache.has(name)) {
          const { value } = getGlobalPropertyValue(name);
          globalValueCache.set(name, value);
        }
        return globalValueCache.get(name);
      };

      return {
        scope: 'queue' as const,
        values: queueValues,
        globalValues,
        queuePath: queue.queuePath,
        queueInfo: queue,
        schedulerInfo,
        stagedChanges,
        configData,
        getValue,
        getGlobalValue,
        getQueueValue,
        getConfigValue: (key: string) => configData.get(key),
      };
    }, [
      queue,
      queueValues,
      globalValues,
      getQueuePropertyValue,
      getGlobalPropertyValue,
      schedulerInfo,
      stagedChanges,
      configData,
    ]);

    const propertyStates = React.useMemo(() => {
      const states = new Map<
        string,
        {
          visible: boolean;
          enabled: boolean;
        }
      >();

      properties.forEach((property) => {
        const propertyName = property.originalName || property.name;
        const propertyValue = conditionBase.getValue(propertyName) ?? '';
        const options = {
          ...conditionBase,
          property,
          propertyValue,
        };
        const visible = shouldShowProperty(property, options);
        const enabled = visible ? isPropertyEnabled(property, options) : false;

        states.set(propertyName, { visible, enabled });
      });

      return states;
    }, [properties, conditionBase]);

    const visiblePropertiesByCategory = React.useMemo(() => {
      const result: Partial<Record<PropertyCategory, typeof properties>> = {};

      Object.entries(propertiesByCategory).forEach(([categoryKey, props]) => {
        const typedCategory = categoryKey as PropertyCategory;
        const filtered = props.filter((property) => {
          const propertyName = property.originalName || property.name;
          return propertyStates.get(propertyName)?.visible ?? true;
        }) as typeof properties;

        if (filtered.length > 0) {
          result[typedCategory] = filtered;
        }
      });

      return result;
    }, [propertiesByCategory, propertyStates]);

    const availableCategories = React.useMemo(
      () =>
        categoryOrder.filter(
          (category) => (visiblePropertiesByCategory[category]?.length ?? 0) > 0,
        ),
      [categoryOrder, visiblePropertiesByCategory],
    );

    // Find categories with errors
    const categoriesWithErrors = React.useMemo(() => {
      const errorCategories: Set<PropertyCategory> = new Set();

      if (!errors || Object.keys(errors).length === 0) {
        return errorCategories;
      }

      Object.keys(errors).forEach((fieldName) => {
        availableCategories.forEach((category) => {
          const categoryProps = visiblePropertiesByCategory[category] ?? [];
          if (
            categoryProps.some(
              (prop) => (prop.originalName || prop.name) === fieldName || prop.name === fieldName,
            )
          ) {
            errorCategories.add(category);
          }
        });
      });

      return errorCategories;
    }, [errors, availableCategories, visiblePropertiesByCategory]);

    // Auto-expand categories with errors
    React.useEffect(() => {
      if (categoriesWithErrors.size > 0) {
        setExpandedAccordions((prev) => {
          const newExpanded = new Set(prev);
          categoriesWithErrors.forEach((cat) => newExpanded.add(cat));
          return Array.from(newExpanded);
        });
      }
    }, [categoriesWithErrors]);

    return (
      <Form {...form}>
        <div className="flex flex-col h-full">
          {/* Loading State */}
          {isFormInitializing && (
            <div className="flex justify-center items-center min-h-[200px] p-4">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}

          {/* Property Categories */}
          {!isFormInitializing && (
            <Accordion
              type="multiple"
              value={expandedAccordions}
              onValueChange={setExpandedAccordions}
              className="p-4 pb-20"
            >
              {availableCategories.map((category) => {
                const categoryProps = visiblePropertiesByCategory[category] ?? [];
                const config = categoryConfig[category];
                const hasErrors = categoriesWithErrors.has(category);
                const errorCount = Object.keys(errors).filter((fieldName) =>
                  categoryProps.some(
                    (prop) =>
                      (prop.originalName || prop.name) === fieldName || prop.name === fieldName,
                  ),
                ).length;

                return (
                  <AccordionItem key={category} value={category} className="border rounded-lg mb-2">
                    <AccordionTrigger className="px-4 py-3 hover:no-underline">
                      <div className="flex items-center gap-3 flex-1">
                        {config.icon}
                        <div className="text-left flex-1">
                          <div className="text-sm font-medium">{config.label}</div>
                          <div className="text-xs text-muted-foreground">{config.description}</div>
                        </div>
                        {hasErrors && (
                          <Badge variant="destructive" className="text-xs px-1.5 py-0">
                            {errorCount}
                          </Badge>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      <div className="space-y-3">
                        {categoryProps.map((prop) => {
                          const propertyKey = prop.originalName || prop.name;
                          const propertyState = propertyStates.get(propertyKey);
                          if (propertyState && !propertyState.visible) {
                            return null;
                          }
                          const supportsLegacyButton =
                            propertyKey === 'auto-create-child-queue.enabled';
                          const supportsFlexibleButton =
                            propertyKey === 'auto-queue-creation-v2.enabled';
                          const shouldRenderTemplateButton =
                            Boolean(templateConfigControls?.canManageTemplates) &&
                            ((supportsLegacyButton && templateConfigControls?.legacyAvailable) ||
                              (supportsFlexibleButton &&
                                templateConfigControls?.flexibleAvailable));

                          return (
                            <div key={prop.name} className="space-y-2">
                              <PropertyFormField
                                property={prop}
                                control={control}
                                stagedStatus={getStagedStatus(prop.originalName || prop.name)}
                                isEnabled={propertyState?.enabled ?? true}
                                onBlur={handleFieldBlur}
                                errors={getFieldErrors(prop.formFieldName || prop.name)}
                                warnings={getFieldWarnings(prop.formFieldName || prop.name)}
                                queuePath={queue.queuePath}
                                queueName={queue.queueName}
                                parentQueuePath={parentQueuePath}
                                currentValues={watchedValues}
                                setFormValue={form.setValue}
                              />
                              {shouldRenderTemplateButton && (
                                <div className="pt-1">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="text-xs"
                                    onClick={templateConfigControls?.onOpenTemplateConfig}
                                  >
                                    Manage template properties
                                  </Button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </div>
      </Form>
    );
  },
);

PropertyEditorTab.displayName = 'PropertyEditorTab';
