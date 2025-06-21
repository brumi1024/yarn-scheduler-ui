import React from 'react';
import type { Control, FieldValues } from 'react-hook-form';
import { TextField, Select, MenuItem, Switch, FormControlLabel } from '@mui/material';
import { FormFieldWrapper } from './FormFieldWrapper';

interface TextFieldProps {
    name: string;
    label: string;
    description?: string;
    required?: boolean;
    multiline?: boolean;
    rows?: number;
    type?: string;
    control?: Control<FieldValues>;
}

export function FormTextField({
    name,
    label,
    description,
    required,
    multiline = false,
    rows = 1,
    type = 'text',
    control,
}: TextFieldProps) {
    return (
        <FormFieldWrapper
            name={name}
            label={label}
            description={description}
            required={required}
            control={control}
        >
            {(field) => (
                <TextField
                    {...field}
                    id={name}
                    type={type}
                    multiline={multiline}
                    rows={rows}
                    variant="outlined"
                    fullWidth
                />
            )}
        </FormFieldWrapper>
    );
}

interface SelectFieldProps {
    name: string;
    label: string;
    description?: string;
    required?: boolean;
    options: Array<{ value: string; label: string }>;
    control?: Control<FieldValues>;
}

export function FormSelectField({
    name,
    label,
    description,
    required,
    options,
    control,
}: SelectFieldProps) {
    return (
        <FormFieldWrapper
            name={name}
            label={label}
            description={description}
            required={required}
            control={control}
        >
            {(field) => (
                <Select {...field} id={name} variant="outlined">
                    {options.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                            {option.label}
                        </MenuItem>
                    ))}
                </Select>
            )}
        </FormFieldWrapper>
    );
}

interface SwitchFieldProps {
    name: string;
    label: string;
    description?: string;
    control?: Control<FieldValues>;
}

export function FormSwitchField({
    name,
    label,
    description,
    control,
}: SwitchFieldProps) {
    return (
        <FormFieldWrapper
            name={name}
            label={label}
            description={description}
            fullWidth={false}
            control={control}
        >
            {(field) => (
                <FormControlLabel
                    control={
                        <Switch
                            {...field}
                            checked={field.value || false}
                            id={name}
                        />
                    }
                    label=""
                />
            )}
        </FormFieldWrapper>
    );
}