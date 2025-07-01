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
import type { PropertyCategory } from '../../types/property-descriptor';

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
    } = usePropertyEditor({
        queuePath: queue.queuePath,
    });

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
    const categoryOrder: PropertyCategory[] = ['general', 'resource', 'limits', 'scheduling', 'security', 'advanced'];

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