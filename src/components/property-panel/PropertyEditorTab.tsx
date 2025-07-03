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
    Chip,
} from '@mui/material';
import {
    ExpandMore as ExpandMoreIcon,
    Refresh as RefreshIcon,
    Edit as EditIcon,
    Save as SaveIcon,
    Settings as SettingsIcon,
    Memory as MemoryIcon,
    Speed as SpeedIcon,
    Security as SecurityIcon,
    Schedule as ScheduleIcon,
    Label as LabelIcon,
    AdminPanelSettings as AdminIcon,
} from '@mui/icons-material';
import { useColorScheme } from '@mui/material/styles';
import { useNotifications } from '../../hooks/useNotifications';
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
    onFormDirtyChange?: (isDirty: boolean) => void;
    ref?: React.Ref<PropertyEditorTabHandle>;
}

// Category display configuration with icons and enhanced styling
const categoryConfig: Record<PropertyCategory, { 
    label: string; 
    description: string; 
    defaultExpanded: boolean;
    icon: React.ReactElement;
}> = {
    general: {
        label: 'General Configuration',
        description: 'Basic queue settings including capacity, state, and hierarchy',
        defaultExpanded: true,
        icon: <SettingsIcon fontSize="small" color="primary" />,
    },
    resource: {
        label: 'Resource Allocation',
        description: 'Memory, CPU, and other resource allocation settings',
        defaultExpanded: false,
        icon: <MemoryIcon fontSize="small" color="primary" />,
    },
    limits: {
        label: 'Application Limits',
        description: 'User limits, application counts, and resource constraints',
        defaultExpanded: false,
        icon: <SpeedIcon fontSize="small" color="primary" />,
    },
    scheduling: {
        label: 'Scheduling Policy',
        description: 'Application ordering and priority settings',
        defaultExpanded: false,
        icon: <ScheduleIcon fontSize="small" color="primary" />,
    },
    security: {
        label: 'Security & Access Control',
        description: 'User and group access permissions (ACLs)',
        defaultExpanded: false,
        icon: <SecurityIcon fontSize="small" color="primary" />,
    },
    advanced: {
        label: 'Advanced Features',
        description: 'Preemption, auto-queue creation, and other advanced settings',
        defaultExpanded: false,
        icon: <AdminIcon fontSize="small" color="primary" />,
    },
    nodeLabels: {
        label: 'Node Labels',
        description: 'Capacity allocation per node label partition',
        defaultExpanded: false,
        icon: <LabelIcon fontSize="small" color="primary" />,
    },
};

export const PropertyEditorTab: React.FC<PropertyEditorTabProps> = ({
    queue,
    onHasChangesChange,
    onIsSubmittingChange,
    onFormDirtyChange,
    ref
}) => {
    const { mode } = useColorScheme();
    const isLightMode = mode === 'light';
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { showSuccess, showError } = useNotifications();

    const {
        control,
        handleSubmit,
        handleReset,
        errors,
        isValid,
        hasChanges,
        watchedValues,
        propertiesByCategory,
        getStagedStatus,
        labelProperties,
        formState,
    } = usePropertyEditor({
        queuePath: queue.queuePath,
    });

    // Check if form is still initializing
    const isFormInitializing = !control || !propertiesByCategory || Object.keys(propertiesByCategory).length === 0;

    // Determine which labels this queue has access to
    const getAccessibleLabels = React.useCallback(() => {
        const accessibleLabelsValue = watchedValues?.['accessible-node-labels'];
        const accessibleLabelsString = typeof accessibleLabelsValue === 'string' ? accessibleLabelsValue : '';
        
        if (!accessibleLabelsString.trim()) {
            return []; // Default partition only
        }
        if (accessibleLabelsString.trim() === '*') {
            return ['*']; // All labels
        }
        return accessibleLabelsString.split(',').map(l => l.trim()).filter(l => l.length > 0);
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

    // Handle form submission (staging)
    const onSubmit = React.useCallback(async () => {
        setIsSubmitting(true);
        try {
            const result = await handleSubmit();
            if (result && result.success) {
                showSuccess(result.message);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to stage changes';
            showError(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    }, [handleSubmit, showSuccess, showError]);

    // Handle form reset
    const onReset = () => {
        handleReset();
        showSuccess('Form reset to current values');
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
            <Box sx={{ p: 1.5, pb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Typography variant="body1">
                        Queue Configuration
                    </Typography>
                    {formState.isDirty && (
                        <Chip
                            icon={<EditIcon />}
                            label="Unsaved Changes"
                            color="warning"
                            size="small"
                            variant="outlined"
                        />
                    )}
                    {hasChanges && (
                        <Chip
                            icon={<EditIcon />}
                            label="Changes Staged"
                            color="primary"
                            size="small"
                            variant="outlined"
                        />
                    )}
                </Box>
                <Typography variant="caption" color="text.secondary">
                    Configure properties for queue: <strong>{queue.queuePath}</strong>
                </Typography>
                {hasChanges && (
                    <Typography variant="caption" color="primary" sx={{ mt: 0.5, display: 'block' }}>
                        Changes are staged for review. Use the bottom drawer to apply all changes.
                    </Typography>
                )}
            </Box>

            <Divider />

            {/* Form Content - Scrollable */}
            <Box sx={{ flexGrow: 1, overflow: 'auto', p: 1.5 }}>
                {/* Loading State */}
                {isFormInitializing && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
                        <CircularProgress size={40} />
                    </Box>
                )}

                {/* Property Categories */}
                {!isFormInitializing && 
                categoryOrder.map((category) => {
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
                                sx={{ 
                                    mb: 1, 
                                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
                                    '&:before': { display: 'none' },
                                    borderRadius: 2,
                                }}
                            >
                                <AccordionSummary 
                                    expandIcon={<ExpandMoreIcon />}
                                    sx={{ 
                                        backgroundColor: isLightMode ? '#f8fafc' : '#2d2d2d',
                                        borderRadius: '8px 8px 0 0',
                                        minHeight: 36,
                                    }}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                        {config.icon}
                                        <Box>
                                            <Typography variant="body2" fontWeight="medium">
                                                {config.label}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Per-label capacity configuration for accessible labels
                                            </Typography>
                                        </Box>
                                    </Box>
                                </AccordionSummary>
                                <AccordionDetails>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                        {filteredLabelGroups.map(([labelName, labelProps]) => (
                                            <Box key={labelName} sx={{ mb: 1.5 }}>
                                                <Typography variant="body2" fontWeight="medium" sx={{ mb: 0.5 }}>
                                                    Label: {labelName}
                                                </Typography>
                                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pl: 1 }}>
                                                    {labelProps.map((property) => (
                                                        <PropertyFormField
                                                            key={property.name}
                                                            property={property}
                                                            control={control}
                                                            error={errors[property.name]}
                                                            isStaged={getStagedStatus(property.name)}
                                                            isDirty={!!formState.dirtyFields[property.name]}
                                                            dependentValues={watchedValues}
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
                            sx={{ 
                                mb: 1, 
                                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
                                '&:before': { display: 'none' },
                                borderRadius: 2,
                            }}
                        >
                            <AccordionSummary 
                                expandIcon={<ExpandMoreIcon />}
                                sx={{ 
                                    backgroundColor: isLightMode ? '#f8fafc' : '#2d2d2d',
                                    borderRadius: '8px 8px 0 0',
                                    minHeight: 36,
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    {config.icon}
                                    <Box>
                                        <Typography variant="body2" fontWeight="medium">
                                            {config.label}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {config.description}
                                        </Typography>
                                    </Box>
                                </Box>
                            </AccordionSummary>
                            <AccordionDetails>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                    {categoryProps.map((property) => (
                                        <PropertyFormField
                                            key={property.name}
                                            property={property}
                                            control={control}
                                            error={errors[property.name]}
                                            isStaged={getStagedStatus(property.name)}
                                            isDirty={!!formState.dirtyFields[property.name]}
                                            dependentValues={watchedValues}
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