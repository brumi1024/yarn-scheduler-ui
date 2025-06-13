import React, { useState, useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Tabs,
    Tab,
    Box,
    Alert,
    IconButton,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import type { Queue } from '../types/Queue';
import type { ConfigGroup } from '../config';
import { ConfigService } from '../config';
import { PropertyFormFieldHookForm } from './PropertyFormFieldHookForm';
import { AutoQueueCreationSectionHookForm } from './AutoQueueCreationSectionHookForm';
import { createFormSchema } from '../schemas/propertySchemas';

interface PropertyEditorModalProps {
    open: boolean;
    onClose: () => void;
    queue: Queue | null;
    onSave: (queuePath: string, changes: Record<string, any>) => void;
}

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
    return (
        <div role="tabpanel" hidden={value !== index}>
            {value === index && <Box sx={{ py: 2 }}>{children}</Box>}
        </div>
    );
}

export function PropertyEditorModal({ open, onClose, queue, onSave }: PropertyEditorModalProps) {
    const [tabValue, setTabValue] = useState(0);
    const [hasChanges, setHasChanges] = useState(false);

    const configService = ConfigService.getInstance();
    const propertyGroups = configService.getQueuePropertyGroups();
    
    // Create combined properties object for schema generation
    const allProperties = propertyGroups.reduce((acc, group) => ({ ...acc, ...group.properties }), {});
    const validationSchema = createFormSchema(allProperties);
    
    const form = useForm({
        resolver: zodResolver(validationSchema),
        defaultValues: {},
        mode: 'onChange',
    });

    const { handleSubmit, reset, watch, formState: { errors, isDirty } } = form;

    useEffect(() => {
        if (queue && open) {
            // Initialize form data with current queue configuration
            const initialData: Record<string, any> = {};

            // Map current queue properties to form data
            initialData['capacity'] = `${queue.capacity}%`;
            initialData['maximum-capacity'] = `${queue.maxCapacity}%`;
            initialData['state'] = queue.state;
            initialData['user-limit-factor'] = queue.userLimitFactor || 1;
            initialData['max-parallel-apps'] = queue.maxApplications || '';
            initialData['ordering-policy'] = queue.orderingPolicy || 'fifo';
            initialData['disable_preemption'] = queue.preemptionDisabled || false;

            // Auto-creation properties
            initialData['auto-create-child-queue.enabled'] = queue.autoCreateChildQueueEnabled || false;
            initialData['auto-queue-creation-v2.enabled'] = false; // Default to v1
            initialData['auto-queue-creation-v2.max-queues'] = 1000;

            // Template properties (if auto-creation is enabled)
            if (queue.leafQueueTemplate) {
                Object.entries(queue.leafQueueTemplate).forEach(([key, value]) => {
                    initialData[`leaf-queue-template.${key}`] = value;
                });
            }

            reset(initialData);
            setHasChanges(false);
            setTabValue(0);
        }
    }, [queue, open, reset]);

    // Watch for form changes
    useEffect(() => {
        const subscription = watch(() => {
            setHasChanges(isDirty);
        });
        return () => subscription.unsubscribe();
    }, [watch, isDirty]);

    const onSubmit = (data: Record<string, any>) => {
        if (!queue?.queueName) return;

        // For now, just pass the form data as changes
        // In a real implementation, this would map to YARN configuration keys
        onSave(queue.queueName, data);
        onClose();
    };

    const handleClose = () => {
        if (hasChanges) {
            if (window.confirm('You have unsaved changes. Are you sure you want to close?')) {
                onClose();
            }
        } else {
            onClose();
        }
    };

    const renderPropertyGroup = (group: ConfigGroup) => {
        // Get sibling queues for capacity calculations
        const siblings =
            queue && (queue as any).parent
                ? ((queue as any).parent.children || [])
                      .filter((child: any) => child.queueName !== queue.queueName)
                      .map((child: any) => ({ name: child.queueName, capacity: `${child.capacity}%` }))
                : [];

        // Special handling for Auto-Queue Creation group
        if (group.groupName === 'Auto-Queue Creation') {
            return (
                <AutoQueueCreationSectionHookForm
                    key={group.groupName}
                    properties={group.properties}
                    siblings={siblings}
                />
            );
        }

        return (
            <Box key={group.groupName} sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                    {group.groupName}
                </Typography>

                {Object.entries(group.properties).map(([, property]) => (
                    <PropertyFormFieldHookForm
                        key={property.key}
                        property={property}
                        control={form.control}
                        name={property.key}
                        siblings={siblings}
                    />
                ))}
            </Box>
        );
    };

    if (!queue) return null;

    const hasErrors = Object.keys(errors).length > 0;

    return (
        <FormProvider {...form}>
            <Dialog
                open={open}
                onClose={handleClose}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: { height: '80vh' },
                }}
            >
            <DialogTitle>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6">Edit Queue Properties: {queue.queueName}</Typography>
                    <IconButton onClick={handleClose} size="small">
                        <CloseIcon />
                    </IconButton>
                </Box>
            </DialogTitle>

            <DialogContent dividers>
                {hasErrors && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        Please fix the validation errors before saving.
                    </Alert>
                )}

                <Tabs
                    value={tabValue}
                    onChange={(_, newValue) => setTabValue(newValue)}
                    variant="scrollable"
                    scrollButtons="auto"
                >
                    {propertyGroups.map((group) => (
                        <Tab key={group.groupName} label={group.groupName} />
                    ))}
                </Tabs>

                {propertyGroups.map((group, index) => (
                    <TabPanel key={group.groupName} value={tabValue} index={index}>
                        {renderPropertyGroup(group)}
                    </TabPanel>
                ))}
            </DialogContent>

                <DialogActions sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                    {hasErrors && (
                        <Alert severity="error" sx={{ flex: 1, mr: 2 }}>
                            Please fix the validation errors before saving.
                        </Alert>
                    )}
                    <Button onClick={handleClose} color="inherit">
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleSubmit(onSubmit)} 
                        variant="contained" 
                        disabled={hasErrors || !hasChanges}
                    >
                        Save Changes
                    </Button>
                </DialogActions>
            </Dialog>
        </FormProvider>
    );
}
