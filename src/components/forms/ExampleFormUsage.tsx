/**
 * Example demonstrating usage of new form components
 * This file shows how to use the new FormFieldWrapper and CommonFormFields components
 * in both FormProvider context and with direct control prop patterns
 */

import React from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Box, Button, Typography, Paper } from '@mui/material';
import { FormTextField, FormSelectField, FormSwitchField } from './CommonFormFields';

// Example schema for form validation
const exampleSchema = z.object({
    queueName: z.string().min(1, 'Queue name is required'),
    capacity: z.number().min(0).max(100),
    state: z.enum(['RUNNING', 'STOPPED']),
    autoCreate: z.boolean(),
});

type ExampleFormData = z.infer<typeof exampleSchema>;

// Example 1: Using FormProvider pattern (recommended for complex forms)
export function ExampleFormWithProvider() {
    const methods = useForm<ExampleFormData>({
        resolver: zodResolver(exampleSchema),
        defaultValues: {
            queueName: '',
            capacity: 50,
            state: 'RUNNING',
            autoCreate: false,
        },
    });

    const onSubmit = (data: ExampleFormData) => {
        console.log('Form submitted:', data);
    };

    return (
        <Paper sx={{ p: 3, maxWidth: 500 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
                Example: Form with Provider Pattern
            </Typography>
            
            <FormProvider {...methods}>
                <form onSubmit={methods.handleSubmit(onSubmit)}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <FormTextField
                            name="queueName"
                            label="Queue Name"
                            description="Enter a unique name for the queue"
                            required
                        />
                        
                        <FormTextField
                            name="capacity"
                            label="Capacity (%)"
                            description="Percentage of parent queue capacity"
                            type="number"
                            required
                        />
                        
                        <FormSelectField
                            name="state"
                            label="Queue State"
                            description="Initial state of the queue"
                            required
                            options={[
                                { value: 'RUNNING', label: 'Running' },
                                { value: 'STOPPED', label: 'Stopped' },
                            ]}
                        />
                        
                        <FormSwitchField
                            name="autoCreate"
                            label="Enable Auto-Creation"
                            description="Allow automatic creation of child queues"
                        />
                        
                        <Button
                            type="submit"
                            variant="contained"
                            disabled={!methods.formState.isValid}
                        >
                            Create Queue
                        </Button>
                    </Box>
                </form>
            </FormProvider>
        </Paper>
    );
}

// Example 2: Using direct control prop pattern (for simple forms or when FormProvider isn't suitable)
export function ExampleFormWithControl() {
    const { control, handleSubmit, formState } = useForm<ExampleFormData>({
        resolver: zodResolver(exampleSchema),
        defaultValues: {
            queueName: '',
            capacity: 30,
            state: 'RUNNING',
            autoCreate: true,
        },
    });

    const onSubmit = (data: ExampleFormData) => {
        console.log('Form submitted:', data);
    };

    return (
        <Paper sx={{ p: 3, maxWidth: 500 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
                Example: Form with Control Prop Pattern
            </Typography>
            
            <form onSubmit={handleSubmit(onSubmit)}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <FormTextField
                        name="queueName"
                        label="Queue Name"
                        description="Enter a unique name for the queue"
                        required
                        control={control}
                    />
                    
                    <FormTextField
                        name="capacity"
                        label="Capacity (%)"
                        description="Percentage of parent queue capacity"
                        type="number"
                        required
                        control={control}
                    />
                    
                    <FormSelectField
                        name="state"
                        label="Queue State"
                        description="Initial state of the queue"
                        required
                        control={control}
                        options={[
                            { value: 'RUNNING', label: 'Running' },
                            { value: 'STOPPED', label: 'Stopped' },
                        ]}
                    />
                    
                    <FormSwitchField
                        name="autoCreate"
                        label="Enable Auto-Creation"
                        description="Allow automatic creation of child queues"
                        control={control}
                    />
                    
                    <Button
                        type="submit"
                        variant="contained"
                        disabled={!formState.isValid}
                    >
                        Create Queue
                    </Button>
                </Box>
            </form>
        </Paper>
    );
}