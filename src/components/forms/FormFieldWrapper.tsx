import React from 'react';
import type { Control, FieldValues, ControllerRenderProps } from 'react-hook-form';
import {
    FormControl,
    FormLabel,
    FormHelperText,
    Tooltip,
    IconButton,
} from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { Controller, useFormContext } from 'react-hook-form';

interface FormFieldWrapperProps {
    name: string;
    label: string;
    description?: string;
    required?: boolean;
    children: (field: ControllerRenderProps<FieldValues, string>) => React.ReactNode;
    fullWidth?: boolean;
    rules?: Record<string, unknown>;
    control?: Control<FieldValues>;
}

export function FormFieldWrapper({
    name,
    label,
    description,
    required = false,
    children,
    fullWidth = true,
    rules = {},
    control: externalControl,
}: FormFieldWrapperProps) {
    // Always call useFormContext (hook rules), but only use it if no external control
    const formContext = useFormContext();
    const control = externalControl || formContext?.control;

    if (!control) {
        throw new Error('FormFieldWrapper must be used within a FormProvider or with a control prop');
    }

    return (
        <Controller
            name={name}
            control={control}
            rules={{ required: required && `${label} is required`, ...rules }}
            render={({ field, fieldState: { error } }) => (
                <FormControl fullWidth={fullWidth} error={!!error} margin="normal">
                    <FormLabel htmlFor={name}>
                        {label}
                        {required && <span style={{ color: 'error.main' }}> *</span>}
                        {description && (
                            <Tooltip title={description} placement="right">
                                <IconButton size="small" sx={{ ml: 0.5 }}>
                                    <HelpOutlineIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        )}
                    </FormLabel>
                    {children(field)}
                    {error && <FormHelperText>{error.message}</FormHelperText>}
                </FormControl>
            )}
        />
    );
}