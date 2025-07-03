import React from 'react';
import {
    TextField,
    FormControl,
    FormControlLabel,
    FormHelperText,
    Switch,
    Box,
    Typography,
    Chip,
    ToggleButtonGroup,
    ToggleButton,
    Tooltip,
} from '@mui/material';
import { Controller, Control, FieldError } from 'react-hook-form';
import type { PropertyDescriptor } from '../../types/property-descriptor';

interface PropertyFormFieldProps {
    property: PropertyDescriptor;
    control: Control<Record<string, string>>;
    error?: FieldError;
    isStaged?: boolean;
    isDirty?: boolean;
    dependentValues?: Record<string, any>;
}

export const PropertyFormField: React.FC<PropertyFormFieldProps> = ({
    property,
    control,
    error,
    isStaged = false,
    isDirty = false,
    dependentValues = {},
}) => {
    // Check if field should be enabled based on dependencies
    const isFieldEnabled = React.useMemo(() => {
        if (!property.enableWhen) return true;

        return Object.entries(property.enableWhen).every(([dependentField, condition]) => {
            const dependentValue = dependentValues[dependentField];
            return condition(dependentValue || '');
        });
    }, [property.enableWhen, dependentValues]);


    // Tooltip wrapper for fields with descriptions
    const wrapWithTooltip = React.useCallback((fieldComponent: React.ReactElement, description?: string) => {
        if (!description?.trim()) return fieldComponent;
        
        return (
            <Tooltip
                title={description}
                placement="top-start"
                arrow
                enterDelay={500}
                leaveDelay={200}
                sx={{
                    '& .MuiTooltip-tooltip': {
                        fontSize: '0.75rem',
                        maxWidth: 300,
                        backgroundColor: 'grey.800',
                        '& .MuiTooltip-arrow': {
                            color: 'grey.800',
                        },
                    },
                }}
            >
                <div>{fieldComponent}</div>
            </Tooltip>
        );
    }, []);

    // Create styling for different field states
    const getFieldStyling = React.useCallback(() => {
        let borderColor = undefined;
        let backgroundColor = undefined;

        if (isStaged) {
            borderColor = 'primary.main';
            backgroundColor = 'primary.50';
        } else if (isDirty) {
            borderColor = 'warning.main';
            backgroundColor = 'warning.50';
        }

        return {
            '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                ...(backgroundColor && { backgroundColor }),
                '& .MuiOutlinedInput-notchedOutline': {
                    ...(borderColor && { borderColor }),
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderWidth: 2,
                    ...(borderColor && { borderColor }),
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderWidth: 2,
                    ...(borderColor && { borderColor }),
                },
            },
        };
    }, [isStaged, isDirty]);

    // Render different input types based on property type
    const renderInput = (field: any, label: string) => {
        
        const commonProps = {
            fullWidth: true,
            disabled: !isFieldEnabled,
            error: !!error,
            helperText: error?.message || undefined,
            size: "small" as const,
            sx: {
                ...getFieldStyling(),
                '& .MuiFormHelperText-root': {
                    fontSize: '0.7rem',
                    marginTop: '2px',
                },
            },
        };

        switch (property.type) {
            case 'boolean':
                return wrapWithTooltip(
                    <FormControl component="fieldset" fullWidth>
                        <FormControlLabel
                            control={
                                <Switch
                                    name={field.name}
                                    checked={field.value === 'true' || field.value === true}
                                    onChange={(e) => field.onChange(e.target.checked ? 'true' : '')}
                                    onBlur={field.onBlur}
                                    disabled={!isFieldEnabled}
                                    size="small"
                                />
                            }
                            label=""
                        />
                        {error?.message && (
                            <FormHelperText error={!!error} sx={{ fontSize: '0.7rem', mt: 0.5 }}>
                                {error.message}
                            </FormHelperText>
                        )}
                    </FormControl>,
                    property.description
                );

            case 'enum':
                return wrapWithTooltip(
                    <FormControl fullWidth disabled={!isFieldEnabled} error={!!error}>
                        <ToggleButtonGroup
                            value={field.value || null}
                            exclusive
                            onChange={(_, newValue) => {
                                // Allow deselection by clicking the same button
                                const value = newValue || '';
                                field.onChange(value);
                            }}
                            aria-label={label}
                            disabled={!isFieldEnabled}
                            size="small"
                            sx={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: 0.5,
                                '& .MuiToggleButton-root': {
                                    border: 1,
                                    borderColor: 'divider',
                                    borderRadius: 1,
                                    textTransform: 'none',
                                    fontWeight: 500,
                                    fontSize: '0.75rem',
                                    padding: '4px 8px',
                                    minHeight: '24px',
                                    transition: 'all 0.2s ease-in-out',
                                    '&:hover': {
                                        borderColor: 'primary.main',
                                        backgroundColor: 'primary.50',
                                    },
                                    '&.Mui-selected': {
                                        backgroundColor: 'primary.main',
                                        color: 'primary.contrastText',
                                        borderColor: 'primary.main',
                                        fontWeight: 600,
                                        '&:hover': {
                                            backgroundColor: 'primary.dark',
                                            borderColor: 'primary.dark',
                                        },
                                    },
                                },
                            }}
                        >
                            {property.enumValues?.map((option) => (
                                <ToggleButton
                                    key={option}
                                    value={option}
                                >
                                    {option}
                                </ToggleButton>
                            ))}
                        </ToggleButtonGroup>
                        {error?.message && (
                            <FormHelperText error={!!error} sx={{ fontSize: '0.7rem', mt: 0.5 }}>
                                {error.message}
                            </FormHelperText>
                        )}
                    </FormControl>,
                    property.description
                );

            case 'number':
                return wrapWithTooltip(
                    <TextField
                        name={field.name}
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value)}
                        onBlur={field.onBlur}
                        ref={field.ref}
                        {...commonProps}
                        label={label}
                        type="number"
                        slotProps={{
                            input: {
                                inputProps: {
                                    step: property.displayFormat?.decimals ? 0.01 : 1,
                                    min: property.validationRules?.find(r => r.type === 'range')?.min,
                                    max: property.validationRules?.find(r => r.type === 'range')?.max,
                                },
                                endAdornment: property.displayFormat?.suffix && (
                                    <Typography variant="caption" color="text.secondary" sx={{ pr: 0.5, fontSize: '0.75rem' }}>
                                        {property.displayFormat.suffix}
                                    </Typography>
                                ),
                            },
                        }}
                    />,
                    property.description
                );

            default: // string and capacity types
                return wrapWithTooltip(
                    <TextField
                        name={field.name}
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value)}
                        onBlur={field.onBlur}
                        ref={field.ref}
                        {...commonProps}
                        label={label}
                        multiline={property.name.includes('acl')} // ACLs might be longer
                        rows={property.name.includes('acl') ? 2 : 1}
                        placeholder={property.defaultValue || undefined}
                    />,
                    property.description
                );
        }
    };

    // Create the label with required indicator
    const fieldLabel = `${property.displayName}${property.required ? ' *' : ''}`;

    return (
        <Box sx={{ mb: 0.75 }}>
            <Controller
                name={property.formFieldName || property.name}
                control={control}
                render={({ field }) => renderInput(field, fieldLabel)}
            />

            {/* Status chips and helper text below field */}
            {(isStaged || property.deprecated || property.deprecationMessage || !isFieldEnabled) && (
                <Box sx={{ mt: 0.25, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>
                    {isStaged && (
                        <Chip
                            label="Modified"
                            color="primary"
                            variant="outlined"
                            sx={{ 
                                fontSize: '0.65rem', 
                                height: 16,
                                fontWeight: 500,
                                '& .MuiChip-label': {
                                    px: 0.5,
                                },
                            }}
                        />
                    )}
                    {property.deprecated && (
                        <Chip
                            label="Deprecated"
                            color="warning"
                            variant="outlined"
                            sx={{ 
                                fontSize: '0.65rem', 
                                height: 16,
                                fontWeight: 500,
                                '& .MuiChip-label': {
                                    px: 0.5,
                                },
                            }}
                        />
                    )}
                    {property.deprecated && property.deprecationMessage && (
                        <Typography variant="caption" sx={{ color: 'warning.main', fontSize: '0.7rem', ml: 0.5 }}>
                            <strong>Deprecated:</strong> {property.deprecationMessage}
                        </Typography>
                    )}
                    {!isFieldEnabled && (
                        <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.7rem', ml: 0.5 }}>
                            This field is disabled based on current configuration
                        </Typography>
                    )}
                </Box>
            )}
        </Box>
    );
};