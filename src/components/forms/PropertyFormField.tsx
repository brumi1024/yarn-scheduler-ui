import React from 'react';
import { useController } from 'react-hook-form';
import type { Control } from 'react-hook-form';
import type { PropertyDefinition } from '../../config';
import {
    TextField,
    Select,
    MenuItem,
    Switch,
    FormControl,
    InputLabel,
    FormControlLabel,
    Box,
    Typography,
    FormHelperText,
    Alert,
    Collapse,
} from '@mui/material';
import { CapacityEditor } from '../CapacityEditor';
import { usePropertyValidation } from '../../hooks/usePropertyValidation';

interface PropertyFormFieldProps {
    property: PropertyDefinition;
    control: Control<any>;
    name: string;
    queuePath?: string;
    siblings?: Array<{ name: string; capacity: string }>;
    onCustomChange?: (value: any) => void;
    showValidation?: boolean;
}

export function PropertyFormField({
    property,
    control,
    name,
    queuePath,
    siblings,
    onCustomChange,
    showValidation = true,
}: PropertyFormFieldProps) {
    // For dynamic properties, we need to use a sanitized name for the form
    const formFieldName = property.key.replace(/\./g, '_').replace(/\[/g, '_').replace(/\]/g, '_');
    const {
        field,
        fieldState: { error },
    } = useController({
        control,
        name: formFieldName,
        defaultValue: property.defaultValue,
    });

    // Get real-time validation
    const validation = usePropertyValidation(
        queuePath || '',
        property.key,
        field.value || property.defaultValue?.toString() || ''
    );

    // Combine form errors with validation errors
    const hasError = !!error || (showValidation && !validation.isValid);
    const errorMessage = error?.message || (showValidation && validation.errors[0]?.message);
    const helperText = errorMessage || property.description;

    const ValidationMessages = () =>
        showValidation && validation.warnings.length > 0 ? (
            <Collapse in={true}>
                <Box sx={{ mt: 1 }}>
                    {validation.warnings.map((warning, index) => (
                        <Alert key={index} severity="warning" size="small" sx={{ mb: 1 }}>
                            {warning.message}
                        </Alert>
                    ))}
                </Box>
            </Collapse>
        ) : null;

    switch (property.type) {
        case 'capacity':
            return (
                <Box>
                    <CapacityEditor
                        label={property.label}
                        value={field.value || property.defaultValue}
                        onChange={field.onChange}
                        error={errorMessage}
                        siblings={siblings}
                    />
                    <ValidationMessages />
                </Box>
            );

        case 'select':
            return (
                <Box>
                    <FormControl fullWidth margin="normal" error={hasError}>
                        <InputLabel>{property.label}</InputLabel>
                        <Select {...field} label={property.label}>
                            {property.options?.map((option) => (
                                <MenuItem key={option} value={option}>
                                    {option}
                                </MenuItem>
                            ))}
                        </Select>
                        <FormHelperText>{helperText}</FormHelperText>
                    </FormControl>
                    <ValidationMessages />
                </Box>
            );

        case 'number':
            return (
                <Box>
                    <TextField
                        {...field}
                        type="number"
                        label={property.label}
                        error={hasError}
                        helperText={helperText}
                        fullWidth
                        margin="normal"
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                    <ValidationMessages />
                </Box>
            );

        case 'boolean':
            return (
                <Box sx={{ my: 2 }}>
                    <FormControlLabel
                        control={
                            <Switch
                                {...field}
                                checked={field.value || false}
                                onChange={(e) => {
                                    field.onChange(e.target.checked);
                                    onCustomChange?.(e.target.checked);
                                }}
                            />
                        }
                        label={property.label}
                    />
                    {(hasError || property.description) && (
                        <Typography variant="caption" color={hasError ? 'error' : 'text.secondary'} display="block">
                            {helperText}
                        </Typography>
                    )}
                    <ValidationMessages />
                </Box>
            );

        case 'text':
        default:
            return (
                <Box>
                    <TextField
                        {...field}
                        label={property.label}
                        error={hasError}
                        helperText={helperText}
                        fullWidth
                        margin="normal"
                    />
                    <ValidationMessages />
                </Box>
            );
    }
}
