import React, { useState, useImperativeHandle } from 'react';
import {
    Box,
    Typography,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Button,
    Paper,
    Alert,
    CircularProgress,
    Divider,
} from '@mui/material';
import {
    ExpandMore as ExpandMoreIcon,
    Save as SaveIcon,
    Refresh as RefreshIcon,
} from '@mui/icons-material';
import { usePropertyEditor } from '../../hooks/usePropertyEditor';
import { PropertyFormField } from './PropertyFormField';
import type { QueueInfo } from '../../types/queue';
import type { PropertyCategory, LabelPropertyDescriptor } from '../../types/property-descriptor';
import { groupLabelPropertiesByLabel } from '../../utils/labelPropertyUtils';

export interface PropertyEditorTabHandle {
    submit: () => Promise<void>;
    reset: () => void;
}

interface PropertyEditorTabProps {
    queue: QueueInfo;
    onHasChangesChange?: (hasChanges: boolean) => void;
    onIsSubmittingChange?: (isSubmitting: boolean) => void;
    ref?: React.Ref<PropertyEditorTabHandle>;
}

// Category display configuration
const categoryConfig: Record<PropertyCategory, { label: string; description: string; defaultExpanded: boolean }> = {
    general: {
        label: 'General Configuration',
        description: 'Basic queue settings including capacity, state, and hierarchy',
        defaultExpanded: true,
    },
    resource: {
        label: 'Resource Allocation',
        description: 'Memory, CPU, and other resource allocation settings',
        defaultExpanded: false,
    },
    limits: {
        label: 'Application Limits',
        description: 'User limits, application counts, and resource constraints',
        defaultExpanded: false,
    },
    scheduling: {
        label: 'Scheduling Policy',
        description: 'Application ordering and priority settings',
        defaultExpanded: false,
    },
    security: {
        label: 'Security & Access Control',
        description: 'User and group access permissions (ACLs)',
        defaultExpanded: false,
    },
    advanced: {
        label: 'Advanced Features',
        description: 'Preemption, auto-queue creation, and other advanced settings',
        defaultExpanded: false,
    },
    nodeLabels: {
        label: 'Node Labels',
        description: 'Capacity allocation per node label partition',
        defaultExpanded: false,
    },
};

export const PropertyEditorTab: React.FC<PropertyEditorTabProps> = ({
    queue,
    onHasChangesChange,
    onIsSubmittingChange,
    ref
}) => {
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [submitSuccess, setSubmitSuccess] = useState(false);

    const {
        control,
        handleSubmit,
        handleReset,
        stageChange,
        errors,
        hasChanges,
        watchedValues,
        propertiesByCategory,
        getStagedStatus,
        labelProperties,
    } = usePropertyEditor({
        queuePath: queue.queuePath,
    });

    // Determine which labels this queue has access to
    const getAccessibleLabels = React.useCallback(() => {
        const accessibleLabelsValue = watchedValues?.['accessible-node-labels'] || '';
        if (!accessibleLabelsValue.trim()) {
            return []; // Default partition only
        }
        if (accessibleLabelsValue.trim() === '*') {
            return ['*']; // All labels
        }
        return accessibleLabelsValue.split(',').map(l => l.trim()).filter(l => l.length > 0);
    }, [watchedValues]);

    const accessibleLabels = getAccessibleLabels();
    const hasAccessibleLabels = accessibleLabels.length > 0;

    // Notify parent about hasChanges state
    React.useEffect(() => {
        onHasChangesChange?.(hasChanges);
    }, [hasChanges, onHasChangesChange]);

    // Handle form submission with loading states
    const onSubmit = async () => {
        onIsSubmittingChange?.(true);
        setSubmitError(null);
        setSubmitSuccess(false);

        try {
            await handleSubmit();
            setSubmitSuccess(true);
            setTimeout(() => setSubmitSuccess(false), 3000); // Clear success message after 3 seconds
        } catch (error) {
            setSubmitError(error instanceof Error ? error.message : 'Failed to apply changes');
        } finally {
            onIsSubmittingChange?.(false);
        }
    };

    // Handle form reset
    const onReset = () => {
        handleReset();
        setSubmitError(null);
        setSubmitSuccess(false);
    };

    // Expose handlers to parent via ref
    useImperativeHandle(ref, () => ({
        submit: onSubmit,
        reset: onReset,
    }), [onSubmit, onReset]);

    // Get category order for consistent display
    const baseCategoryOrder: PropertyCategory[] = ['general', 'resource', 'limits', 'scheduling', 'security', 'advanced'];
    
    // Only show nodeLabels category if queue has accessible labels
    const categoryOrder: PropertyCategory[] = hasAccessibleLabels 
        ? [...baseCategoryOrder, 'nodeLabels']
        : baseCategoryOrder;

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Header */}
            <Box sx={{ p: 2, pb: 1 }}>
                <Typography variant="h6" gutterBottom>
                    Queue Configuration
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Configure properties for queue: <strong>{queue.queuePath}</strong>
                </Typography>
            </Box>

            <Divider />

            {/* Form Content - Scrollable */}
            <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
                {/* Success/Error Messages */}
                {submitSuccess && (
                    <Alert severity="success" sx={{ mb: 2 }}>
                        Configuration changes applied successfully!
                    </Alert>
                )}

                {submitError && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {submitError}
                    </Alert>
                )}

                {/* Property Categories */}
                {categoryOrder.map((category) => {
                    const categoryProps = propertiesByCategory[category];
                    if (!categoryProps || categoryProps.length === 0) return null;

                    const config = categoryConfig[category];

                    // Special handling for nodeLabels category - group by label and filter by accessible labels
                    if (category === 'nodeLabels') {
                        const labelPropsTyped = categoryProps as LabelPropertyDescriptor[];
                        const labelGroups = groupLabelPropertiesByLabel(labelPropsTyped);
                        
                        // Filter to only show properties for accessible labels
                        const filteredLabelGroups = Object.entries(labelGroups).filter(([labelName]) => {
                            if (accessibleLabels.includes('*')) return true; // All labels accessible
                            return accessibleLabels.includes(labelName);
                        });

                        if (filteredLabelGroups.length === 0) return null;
                        
                        return (
                            <Accordion
                                key={category}
                                defaultExpanded={config.defaultExpanded}
                                sx={{ mb: 1 }}
                            >
                                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                    <Box>
                                        <Typography variant="subtitle1" fontWeight="medium">
                                            {config.label}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Per-label capacity configuration for accessible labels
                                        </Typography>
                                    </Box>
                                </AccordionSummary>
                                <AccordionDetails>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        {filteredLabelGroups.map(([labelName, labelProps]) => (
                                            <Box key={labelName} sx={{ mb: 2 }}>
                                                <Typography variant="subtitle2" fontWeight="medium" sx={{ mb: 1 }}>
                                                    Label: {labelName}
                                                </Typography>
                                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pl: 2 }}>
                                                    {labelProps.map((property) => (
                                                        <PropertyFormField
                                                            key={property.name}
                                                            property={property}
                                                            control={control}
                                                            error={errors[property.name]}
                                                            isStaged={getStagedStatus(property.name)}
                                                            dependentValues={watchedValues}
                                                            onFieldChange={stageChange}
                                                        />
                                                    ))}
                                                </Box>
                                            </Box>
                                        ))}
                                    </Box>
                                </AccordionDetails>
                            </Accordion>
                        );
                    }

                    // Regular category rendering
                    return (
                        <Accordion
                            key={category}
                            defaultExpanded={config.defaultExpanded}
                            sx={{ mb: 1 }}
                        >
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Box>
                                    <Typography variant="subtitle1" fontWeight="medium">
                                        {config.label}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {config.description}
                                    </Typography>
                                </Box>
                            </AccordionSummary>
                            <AccordionDetails>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    {categoryProps.map((property) => (
                                        <PropertyFormField
                                            key={property.name}
                                            property={property}
                                            control={control}
                                            error={errors[property.name]}
                                            isStaged={getStagedStatus(property.name)}
                                            dependentValues={watchedValues}
                                            onFieldChange={stageChange}
                                        />
                                    ))}
                                </Box>
                            </AccordionDetails>
                        </Accordion>
                    );
                })}

            </Box>
    </Box>
    );
};