import React, { useState, useImperativeHandle, forwardRef, useCallback } from 'react';
import { Settings, HardDrive, Gauge, Calendar, Shield, Sliders, Tag } from 'lucide-react';
import { Badge } from '~/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '~/components/ui/accordion';
import { usePropertyEditor } from '~/features/property-editor/hooks/usePropertyEditor';
import { PropertyFormField } from './PropertyFormField';
import type { QueueInfo } from '~/types';
import type { PropertyCategory, LabelPropertyDescriptor } from '~/types';
import { groupLabelPropertiesByLabel } from '~/features/node-labels/utils/labelPropertyUtils';
import { SPECIAL_VALUES } from '~/types';
import { toast } from 'sonner';
import { Form } from '~/components/ui/form';

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
  onErrorsChange?: (errors: Record<string, unknown>) => void;
}

// Category display configuration with icons and enhanced styling
const categoryConfig: Record<
  PropertyCategory,
  {
    label: string;
    description: string;
    defaultExpanded: boolean;
    icon: React.ReactElement;
  }
> = {
  general: {
    label: 'General Configuration',
    description: 'Basic queue settings including capacity, state, and hierarchy',
    defaultExpanded: true,
    icon: <Settings className="h-4 w-4 text-primary" />,
  },
  resource: {
    label: 'Resource Allocation',
    description: 'Memory, CPU, and other resource allocation settings',
    defaultExpanded: false,
    icon: <HardDrive className="h-4 w-4 text-primary" />,
  },
  limits: {
    label: 'Application Limits',
    description: 'User limits, application counts, and resource constraints',
    defaultExpanded: false,
    icon: <Gauge className="h-4 w-4 text-primary" />,
  },
  scheduling: {
    label: 'Scheduling Policy',
    description: 'Application ordering and priority settings',
    defaultExpanded: false,
    icon: <Calendar className="h-4 w-4 text-primary" />,
  },
  security: {
    label: 'Security & Access Control',
    description: 'User and group access permissions (ACLs)',
    defaultExpanded: false,
    icon: <Shield className="h-4 w-4 text-primary" />,
  },
  advanced: {
    label: 'Advanced Features',
    description: 'Preemption, auto-queue creation, and other advanced settings',
    defaultExpanded: false,
    icon: <Sliders className="h-4 w-4 text-primary" />,
  },
  nodeLabels: {
    label: 'Node Labels',
    description: 'Capacity allocation per node label partition',
    defaultExpanded: false,
    icon: <Tag className="h-4 w-4 text-primary" />,
  },
};

// Base category order for consistent display
const baseCategoryOrder: PropertyCategory[] = [
  'general',
  'resource',
  'limits',
  'scheduling',
  'security',
  'advanced',
];

export const PropertyEditorTab = forwardRef<PropertyEditorTabHandle, PropertyEditorTabProps>(
  ({ queue, onHasChangesChange, onIsSubmittingChange, onFormDirtyChange, onErrorsChange }, ref) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [expandedAccordions, setExpandedAccordions] = useState<string[]>(['general']);

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
    } = usePropertyEditor({
      queuePath: queue.queuePath,
    });

    // Check if form is still initializing
    const isFormInitializing =
      !control || !propertiesByCategory || Object.keys(propertiesByCategory).length === 0;

    // Determine which labels this queue has access to
    const getAccessibleLabels = React.useCallback(() => {
      const accessibleLabelsValue = watchedValues?.['accessible-node-labels'];
      const accessibleLabelsString =
        typeof accessibleLabelsValue === 'string' ? accessibleLabelsValue : '';

      if (!accessibleLabelsString.trim()) {
        return []; // Default partition only
      }
      if (accessibleLabelsString.trim() === SPECIAL_VALUES.ALL_USERS_ACL) {
        return [SPECIAL_VALUES.ALL_USERS_ACL]; // All labels
      }
      return accessibleLabelsString
        .split(',')
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
    }, [watchedValues]);

    const accessibleLabels = getAccessibleLabels();
    const hasAccessibleLabels = accessibleLabels.length > 0;

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

    // Notify parent about error changes
    React.useEffect(() => {
      onErrorsChange?.(errors);
    }, [errors, onErrorsChange]);

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

    // Only show nodeLabels category if queue has accessible labels
    const categoryOrder: PropertyCategory[] = React.useMemo(
      () => (hasAccessibleLabels ? [...baseCategoryOrder, 'nodeLabels'] : baseCategoryOrder),
      [hasAccessibleLabels],
    );

    // Find categories with errors
    const categoriesWithErrors = React.useMemo(() => {
      const errorCategories: Set<PropertyCategory> = new Set();

      if (!errors || Object.keys(errors).length === 0) {
        return errorCategories;
      }

      // Map error fields to their categories
      Object.keys(errors).forEach((fieldName) => {
        categoryOrder.forEach((category) => {
          const categoryProps = propertiesByCategory[category];
          if (categoryProps?.some((prop) => prop.name === fieldName)) {
            errorCategories.add(category);
          }
        });
      });

      return errorCategories;
    }, [errors, propertiesByCategory, categoryOrder]);

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
              {categoryOrder.map((category) => {
                const categoryProps = propertiesByCategory[category];
                if (!categoryProps || categoryProps.length === 0) return null;

                const config = categoryConfig[category];
                const hasErrors = categoriesWithErrors.has(category);
                const errorCount = Object.keys(errors).filter((fieldName) =>
                  categoryProps.some((prop) => prop.name === fieldName),
                ).length;

                // Special handling for nodeLabels category
                if (category === 'nodeLabels') {
                  const labelPropsTyped = categoryProps as LabelPropertyDescriptor[];
                  const labelGroups = groupLabelPropertiesByLabel(labelPropsTyped);

                  // Filter to only show properties for accessible labels
                  const filteredLabelGroups = Object.entries(labelGroups).filter(([labelName]) => {
                    if (accessibleLabels.includes(SPECIAL_VALUES.ALL_USERS_ACL)) return true; // All labels accessible
                    return accessibleLabels.includes(labelName);
                  });

                  if (filteredLabelGroups.length === 0) return null;

                  return (
                    <AccordionItem
                      key={category}
                      value={category}
                      className="border rounded-lg mb-2"
                    >
                      <AccordionTrigger className="px-4 py-3 hover:no-underline">
                        <div className="flex items-center gap-3 flex-1">
                          {config.icon}
                          <div className="text-left flex-1">
                            <div className="text-sm font-medium">{config.label}</div>
                            <div className="text-xs text-muted-foreground">
                              Per-label capacity configuration for accessible labels
                            </div>
                          </div>
                          {hasErrors && (
                            <Badge variant="destructive" className="text-xs px-1.5 py-0">
                              {errorCount}
                            </Badge>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4">
                        <div className="space-y-4">
                          {filteredLabelGroups.map(([labelName, labelProps]) => (
                            <div key={labelName} className="space-y-3">
                              <div className="flex items-center gap-2">
                                <Tag className="h-3 w-3" />
                                <span className="text-sm font-medium">
                                  {labelName === '' ? 'Default Partition' : `Label: ${labelName}`}
                                </span>
                              </div>
                              <div className="pl-5 space-y-3">
                                {labelProps.map((prop) => (
                                  <PropertyFormField
                                    key={prop.name}
                                    property={prop}
                                    control={control}
                                    stagedStatus={getStagedStatus(prop.originalName || prop.name)}
                                  />
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                }

                // Regular category handling
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
                        {categoryProps.map((prop) => (
                          <PropertyFormField
                            key={prop.name}
                            property={prop}
                            control={control}
                            stagedStatus={getStagedStatus(prop.originalName || prop.name)}
                          />
                        ))}
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
