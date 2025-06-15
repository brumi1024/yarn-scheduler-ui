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
import type { Queue } from '../../types/Queue';
import { getQueuePropertyGroups } from '../../config';
import { PropertyFormField } from './PropertyFormField';
import { AutoQueueCreationSection } from './AutoQueueCreationSection';
import { createFormSchema } from '../../schemas/propertySchemas';
import { useStagedChangesStore } from '../../store/zustand/stagedChangesStore';
import { createChangeSetsFromFormData } from '../../utils/configurationUtils';
import { getQueueFormDefaults } from '../../config/property-utils';

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
        <div role="tabpanel" hidden={value !== index} style={{ display: value !== index ? 'none' : 'block' }}>
            <Box sx={{ py: 2 }}>{children}</Box>
        </div>
    );
}

export function PropertyEditorModal({ open, onClose, queue, onSave }: PropertyEditorModalProps) {
    const [tabValue, setTabValue] = useState(0);
    const [saveError, setSaveError] = useState<string | null>(null);

    const propertyGroups = getQueuePropertyGroups();
    const { stageChange } = useStagedChangesStore();

    // Create combined properties object for schema generation
    const allProperties = propertyGroups.reduce((acc: any, group: any) => {
        // Convert properties array to object keyed by property key
        const propsObject = group.properties.reduce((obj: any, prop: any) => {
            obj[prop.key] = prop;
            return obj;
        }, {});
        return { ...acc, ...propsObject };
    }, {});
    const validationSchema = createFormSchema(allProperties);

    const form = useForm({
        resolver: zodResolver(validationSchema),
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
            const initialData = getQueueFormDefaults(queue);
            reset(initialData);
            setTabValue(0);
            setSaveError(null);
        }
    }, [queue, open, reset]);

    // No need for watch effect anymore since we use isDirty directly

    const onSubmit = (data: Record<string, any>) => {
        if (!queue?.queueName) return;

        try {
            setSaveError(null);

            // Create ChangeSet objects from form data
            const changes = createChangeSetsFromFormData(queue.queueName, data, queue);

            if (changes.length === 0) {
                // No actual changes detected
                onClose();
                return;
            }

            // Stage all changes
            changes.forEach((change) => stageChange(change));

            // Call the original onSave callback for backward compatibility
            onSave(queue.queueName, data);

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
        // Get sibling queues for capacity calculations
        const siblings =
            queue && (queue as any).parent
                ? ((queue as any).parent.children || [])
                      .filter((child: any) => child.queueName !== queue.queueName)
                      .map((child: any) => ({ name: child.queueName, capacity: `${child.capacity}%` }))
                : [];

        // Special handling for Auto-Queue Creation group
        if (group.groupName === 'Auto-Queue Creation') {
            return <AutoQueueCreationSection key={group.groupName} properties={group.properties} siblings={siblings} />;
        }

        return (
            <Box key={group.groupName} sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                    {group.groupName}
                </Typography>

                {group.properties.map((property: any) => (
                    <PropertyFormField
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
                        {propertyGroups.map((group: any) => (
                            <Tab key={group.groupName} label={group.groupName} />
                        ))}
                    </Tabs>

                    {propertyGroups.map((group: any, index: number) => (
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
