import React from 'react';
import { useController, type Control } from 'react-hook-form';
import { Box, Typography, Tooltip } from '@mui/material';
import { Help as HelpIcon } from '@mui/icons-material';
import type { PropertyDefinition } from '../../config';
import { isCapacityProperty } from '../../schemas/propertySchemas';
import { BooleanField } from './fields/BooleanField';
import { EnumField } from './fields/EnumField';
import { NumberField } from './fields/NumberField';
import { StringField } from './fields/StringField';
import { PercentageField } from './fields/PercentageField';
import { CapacityField } from './fields/CapacityField';

interface PropertyFormFieldProps {
    property: PropertyDefinition;
    control: Control<any>;
    name: string;
    siblings?: Array<{ name: string; capacity: string }>;
    onCustomChange?: (value: any) => void;
}

export function PropertyFormField({ property, control, name, siblings, onCustomChange }: PropertyFormFieldProps) {
    const {
        field: { onChange, value, ref },
        fieldState: { error },
    } = useController({
        name,
        control,
        defaultValue: property.defaultValue || '',
    });

    const handleChange = (newValue: any) => {
        onChange(newValue);
        if (onCustomChange) {
            onCustomChange(newValue);
        }
    };

    const renderField = () => {
        // Special handling for capacity properties (including template capacity)
        if (isCapacityProperty(property.key)) {
            return (
                <CapacityField
                    label={property.displayName}
                    value={value || ''}
                    onChange={handleChange}
                    error={error?.message}
                    siblings={siblings}
                />
            );
        }

        switch (property.type) {
            case 'boolean':
                return (
                    <BooleanField value={value} onChange={handleChange} label={property.displayName} inputRef={ref} />
                );

            case 'enum':
                return (
                    <EnumField
                        value={value || ''}
                        onChange={handleChange}
                        label={property.displayName}
                        options={property.options}
                        error={error?.message}
                        inputRef={ref}
                    />
                );

            case 'number':
                return (
                    <NumberField
                        value={value || ''}
                        onChange={handleChange}
                        label={property.displayName}
                        error={error?.message}
                        placeholder={property.placeholder}
                        step={property.step || '1'}
                        inputRef={ref}
                    />
                );

            case 'percentage':
                return (
                    <PercentageField
                        value={value}
                        onChange={handleChange}
                        label={property.displayName}
                        error={error?.message}
                        inputRef={ref}
                    />
                );

            default: // 'string'
                return (
                    <StringField
                        value={value || ''}
                        onChange={handleChange}
                        label={property.displayName}
                        error={error?.message}
                        placeholder={property.placeholder}
                        multiline={property.key.includes('description') || property.key.includes('policy')}
                        rows={property.key.includes('description') || property.key.includes('policy') ? 3 : 1}
                        inputRef={ref}
                    />
                );
        }
    };

    // For capacity properties, the CapacityEditor handles its own layout
    if (isCapacityProperty(property.key)) {
        return renderField();
    }

    return (
        <Box sx={{ mb: 3 }}>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
                {property.type !== 'boolean' && property.type !== 'percentage' && (
                    <Typography variant="body2" color="text.secondary">
                        {property.displayName}
                    </Typography>
                )}

                {property.description && (
                    <Tooltip title={property.description} arrow>
                        <HelpIcon fontSize="small" color="action" />
                    </Tooltip>
                )}
            </Box>

            {renderField()}

            {property.defaultValue && property.type !== 'percentage' && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    Default: {property.defaultValue}
                </Typography>
            )}
        </Box>
    );
}
