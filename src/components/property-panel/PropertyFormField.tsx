import React from 'react';
import {
    TextField,
    FormControl,
    FormControlLabel,
    FormHelperText,
    InputLabel,
    Select,
    MenuItem,
    Switch,
    Box,
    Typography,
    Chip,
    ToggleButtonGroup,
    ToggleButton,
} from '@mui/material';
import { Controller, Control, FieldError } from 'react-hook-form';
import type { PropertyDescriptor } from '../../types/property-descriptor';

interface PropertyFormFieldProps {
    property: PropertyDescriptor;
    control: Control<Record<string, string>>;
    error?: FieldError;
    isStaged?: boolean;
    dependentValues?: Record<string, any>;
    onFieldChange?: (propertyName: string, value: string) => void;
}

export const PropertyFormField: React.FC<PropertyFormFieldProps> = ({
    property,
    control,
    error,
    isStaged = false,
    dependentValues = {},
    onFieldChange,
}) => {
    // Check if field should be enabled based on dependencies
    const isFieldEnabled = React.useMemo(() => {
        if (!property.enableWhen) return true;

        return Object.entries(property.enableWhen).every(([dependentField, condition]) => {
            const dependentValue = dependentValues[dependentField];
            return condition(dependentValue || '');
        });
    }, [property.enableWhen, dependentValues]);

    // Create a custom onChange handler that triggers both form and staging
    const createCustomOnChange = React.useCallback(
        (originalOnChange: (value: any) => void) => (value: any) => {
            // Update form state
            originalOnChange(value);

            // Trigger staging if callback provided
            if (onFieldChange) {
                const stringValue = typeof value === 'boolean' ? (value ? 'true' : '') : String(value || '');
                onFieldChange(property.name, stringValue);
            }
        },
        [onFieldChange, property.name]
    );

    // Render different input types based on property type
    const renderInput = (field: any) => {
        const commonProps = {
            fullWidth: true,
            disabled: !isFieldEnabled,
            error: !!error,
            helperText: error?.message || property.description,
        };

        switch (property.type) {
            case 'boolean':
                return (
                    <FormControl component="fieldset" fullWidth>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={field.value === 'true' || field.value === true}
                                    onChange={(e) => createCustomOnChange(field.onChange)(e.target.checked ? 'true' : '')}
                                    disabled={!isFieldEnabled}
                                />
                            }
                            label=""
                        />
                        {(error?.message || property.description) && (
                            <FormHelperText error={!!error}>
                                {error?.message || property.description}
                            </FormHelperText>
                        )}
                    </FormControl>
                );

            case 'enum':
                return (
                    <FormControl fullWidth disabled={!isFieldEnabled} error={!!error}>
                        <ToggleButtonGroup
                            {...field}
                            value={field.value || null}
                            exclusive
                            onChange={(_, newValue) => {
                                // Allow deselection by clicking the same button
                                const value = newValue || '';
                                createCustomOnChange(field.onChange)(value);
                            }}
                            aria-label={property.displayName}
                            disabled={!isFieldEnabled}
                            sx={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: 1,
                                '& .MuiToggleButton-root': {
                                    border: 1,
                                    borderColor: 'divider',
                                    '&.Mui-selected': {
                                        backgroundColor: 'primary.main',
                                        color: 'primary.contrastText',
                                        '&:hover': {
                                            backgroundColor: 'primary.dark',
                                        },
                                    },
                                },
                            }}
                        >
                            {property.enumValues?.map((option) => (
                                <ToggleButton
                                    key={option}
                                    value={option}
                                    size="small"
                                >
                                    {option}
                                </ToggleButton>
                            ))}
                        </ToggleButtonGroup>
                        {(error?.message || property.description) && (
                            <FormHelperText>
                                {error?.message || property.description}
                            </FormHelperText>
                        )}
                    </FormControl>
                );

            case 'number':
                return (
                    <TextField
                        {...field}
                        {...commonProps}
                        label={property.displayName}
                        type="number"
                        onChange={(e) => createCustomOnChange(field.onChange)(e.target.value)}
                        InputProps={{
                            inputProps: {
                                step: property.displayFormat?.decimals ? 0.01 : 1,
                                min: property.validationRules?.find(r => r.type === 'range')?.min,
                                max: property.validationRules?.find(r => r.type === 'range')?.max,
                            },
                            endAdornment: property.displayFormat?.suffix && (
                                <Typography variant="body2" color="text.secondary">
                                    {property.displayFormat.suffix}
                                </Typography>
                            ),
                        }}
                        value={field.value || ''}
                    />
                );

            default: // string and capacity types
                return (
                    <TextField
                        {...field}
                        {...commonProps}
                        label={property.displayName}
                        multiline={property.name.includes('acl')} // ACLs might be longer
                        rows={property.name.includes('acl') ? 2 : 1}
                        onChange={(e) => createCustomOnChange(field.onChange)(e.target.value)}
                        value={field.value || ''}
                        placeholder={property.defaultValue || undefined}
                    />
                );
        }
    };

    return (
        <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography variant="subtitle2" component="label" sx={{ flexGrow: 1 }}>
                    {property.displayName}
                    {property.required && (
                        <Typography component="span" color="error.main" sx={{ ml: 0.5 }}>
                            *
                        </Typography>
                    )}
                </Typography>
                {isStaged && (
                    <Chip
                        label="Modified"
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{ fontSize: '0.7rem', height: 20 }}
                    />
                )}
                {property.deprecated && (
                    <Chip
                        label="Deprecated"
                        size="small"
                        color="warning"
                        variant="outlined"
                        sx={{ fontSize: '0.7rem', height: 20 }}
                    />
                )}
            </Box>

            <Controller
                name={property.name}
                control={control}
                render={({ field }) => renderInput(field)}
            />

            {property.deprecated && property.deprecationMessage && (
                <FormHelperText sx={{ color: 'warning.main', mt: 1 }}>
                    <strong>Deprecated:</strong> {property.deprecationMessage}
                </FormHelperText>
            )}

            {!isFieldEnabled && (
                <FormHelperText sx={{ color: 'text.disabled', mt: 1 }}>
                    This field is disabled based on current configuration
                </FormHelperText>
            )}
        </Box>
    );
};