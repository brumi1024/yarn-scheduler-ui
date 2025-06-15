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
import { z } from 'zod';
import type { Queue } from '../../types/Queue';
import { getQueuePropertyGroups, QUEUE_PROPERTIES } from '../../config';
import { PropertyFormField } from './PropertyFormField';
import { useUIStore } from '../../store/zustand';

interface PropertyEditorModalProps {
    open: boolean;
    onClose: () => void;
    queue: Queue | null;
    onSave?: (queuePath: string, changes: Record<string, unknown>) => void;
}

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
    return (
        <div role="tabpanel" hidden={value !== index} style={{ display: value !== index ? 'none' : 'block' }}>
            <Box sx={{ py: 2 }}>{children}</Box>
        </div>
    );
}

export function PropertyEditorModal({ open, onClose, queue, onSave }: PropertyEditorModalProps) {
    const [tabValue, setTabValue] = useState(0);
    const [saveError, setSaveError] = useState<string | null>(null);

    const propertyGroups = getQueuePropertyGroups();
    const { addPendingChange } = useUIStore();

    // Create validation schema from property definitions
    const createValidationSchema = () => {
        const shape: Record<string, z.ZodType> = {};
        
        Object.entries(QUEUE_PROPERTIES).forEach(([key, prop]) => {
            shape[key] = prop.schema;
        });
        
        return z.object(shape);
    };

    const form = useForm({
        resolver: zodResolver(createValidationSchema()),
        defaultValues: {},
        mode: 'onChange',
        reValidateMode: 'onChange',
    });

    const {
        handleSubmit,
        reset,
        formState: { errors, isDirty },
    } = form;

    useEffect(() => {
        if (queue && open) {
            // Create initial form data from queue properties
            const initialData: Record<string, unknown> = {};
            Object.keys(QUEUE_PROPERTIES).forEach(key => {
                const queueValue = (queue as any)[key];
                if (queueValue !== undefined) {
                    initialData[key] = queueValue;
                } else {
                    initialData[key] = QUEUE_PROPERTIES[key as keyof typeof QUEUE_PROPERTIES].defaultValue;
                }
            });
            
            reset(initialData);
            setTabValue(0);
            setSaveError(null);
        }
    }, [queue, open, reset]);

    const onSubmit = (data: Record<string, unknown>) => {
        if (!queue?.queueName) return;

        try {
            setSaveError(null);

            // Add changes to pending changes
            Object.entries(data).forEach(([key, value]) => {
                const currentValue = (queue as any)[key];
                if (currentValue !== value) {
                    addPendingChange({
                        queuePath: queue.queueName,
                        property: key,
                        oldValue: currentValue,
                        newValue: value
                    });
                }
            });

            // Call the optional onSave callback
            if (onSave) {
                onSave(queue.queueName, data);
            }

            // Close the modal
            onClose();
        } catch (error) {
            setSaveError(error instanceof Error ? error.message : 'Failed to save changes');
        }
    };

    const handleClose = () => {
        if (isDirty) {
            if (window.confirm('You have unsaved changes. Are you sure you want to close?')) {
                onClose();
            }
        } else {
            onClose();
        }
    };

    const renderPropertyGroup = (group: any) => {
        return (
            <Box key={group.groupName} sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                    {group.groupName}
                </Typography>

                {group.properties.map((property: any) => (
                    <PropertyFormField
                        key={property.key}
                        propertyKey={property.key}
                        value={form.watch(property.key)}
                        onChange={(value) => form.setValue(property.key, value)}
                        error={errors[property.key]?.message as string}
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

                    {saveError && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {saveError}
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

                    {propertyGroups.map((group, index: number) => (
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
                    <Button onClick={handleSubmit(onSubmit)} variant="contained" disabled={hasErrors || !isDirty}>
                        Save Changes
                    </Button>
                </DialogActions>
            </Dialog>
        </FormProvider>
    );
}
