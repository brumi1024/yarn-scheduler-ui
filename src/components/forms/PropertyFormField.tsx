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
    Chip,
} from '@mui/material';
import { CapacityEditor } from '../CapacityEditor';
import { useConfigField } from '../../hooks/useConfigField';

interface PropertyFormFieldProps {
    property: PropertyDefinition;
    control: Control<unknown>;
    name: string;
    queuePath?: string;
    siblings?: Array<{ name: string; capacity: string }>;
    onCustomChange?: (value: unknown) => void;
    showValidation?: boolean;
}

export function PropertyFormField({
    property,
    control,
    queuePath,
    siblings,
    onCustomChange,
    showValidation = true,
}: PropertyFormFieldProps) {
    // Use the new config field hook - no more key sanitization!
    const configField = useConfigField({
        path: property.key,
        queuePath,
        validateOnChange: showValidation,
    });

    // Still use react-hook-form for form management, but sync with config store
    const {
        field,
        fieldState: { error },
    } = useController({
        control,
        name: property.key, // Use the actual property key, no sanitization
        defaultValue: configField.value,
    });

    // Handle change - update both form and config store
    const handleChange = (value: unknown) => {
        field.onChange(value);
        configField.onChange(value);
        onCustomChange?.(value);
    };

    // Combine validation from form and config store
    const hasError = !!error || (showValidation && !configField.isValid);
    const validationErrors = configField.validation.filter((v) => v.severity === 'error');
    const validationWarnings = configField.validation.filter((v) => v.severity === 'warning');
    const errorMessage = error?.message || validationErrors[0]?.message;
    const helperText = errorMessage || property.description;

    // Show staged change indicator
    const ChangeIndicator = () =>
        configField.hasChanges ? (
            <Chip
                label="Modified"
                size="small"
                color="primary"
                sx={{ ml: 1 }}
                title={`Original: ${configField.originalValue}`}
            />
        ) : null;

    const ValidationMessages = () =>
        showValidation && validationWarnings.length > 0 ? (
            <Collapse in={true}>
                <Box sx={{ mt: 1 }}>
                    {validationWarnings.map((warning, index) => (
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
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <CapacityEditor
                            label={property.label}
                            value={field.value}
                            onChange={handleChange}
                            error={errorMessage}
                            siblings={siblings}
                        />
                        <ChangeIndicator />
                    </Box>
                    <ValidationMessages />
                </Box>
            );

        case 'select':
            return (
                <Box>
                    <FormControl fullWidth margin="normal" error={hasError}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <InputLabel>{property.label}</InputLabel>
                            <Select
                                {...field}
                                label={property.label}
                                onChange={(e) => handleChange(e.target.value)}
                                sx={{ flex: 1 }}
                            >
                                {property.options?.map((option) => (
                                    <MenuItem key={option} value={option}>
                                        {option}
                                    </MenuItem>
                                ))}
                            </Select>
                            <ChangeIndicator />
                        </Box>
                        <FormHelperText>{helperText}</FormHelperText>
                    </FormControl>
                    <ValidationMessages />
                </Box>
            );

        case 'number':
            return (
                <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <TextField
                            {...field}
                            type="number"
                            label={property.label}
                            error={hasError}
                            helperText={helperText}
                            fullWidth
                            margin="normal"
                            onChange={(e) => {
                                const val = e.target.value;
                                handleChange(val === '' ? undefined : parseFloat(val));
                            }}
                        />
                        <ChangeIndicator />
                    </Box>
                    <ValidationMessages />
                </Box>
            );

        case 'boolean':
            return (
                <Box sx={{ my: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <FormControlLabel
                            control={
                                <Switch
                                    {...field}
                                    checked={!!field.value}
                                    onChange={(e) => handleChange(e.target.checked)}
                                />
                            }
                            label={property.label}
                        />
                        <ChangeIndicator />
                    </Box>
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
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <TextField
                            {...field}
                            label={property.label}
                            error={hasError}
                            helperText={helperText}
                            fullWidth
                            margin="normal"
                            onChange={(e) => handleChange(e.target.value)}
                        />
                        <ChangeIndicator />
                    </Box>
                    <ValidationMessages />
                </Box>
            );
    }
}
