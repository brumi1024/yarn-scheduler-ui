import React from 'react';
import { useController, type Control } from 'react-hook-form';
import {
    TextField,
    FormControl,
    FormControlLabel,
    Switch,
    Select,
    MenuItem,
    InputLabel,
    Slider,
    Box,
    Typography,
    Tooltip,
    FormHelperText,
} from '@mui/material';
import { Help as HelpIcon } from '@mui/icons-material';
import type { PropertyDefinition } from '../config';
import { CapacityEditor } from './CapacityEditor';
import { isCapacityProperty } from '../schemas/propertySchemas';

interface PropertyFormFieldProps {
    property: PropertyDefinition;
    control: Control<any>;
    name: string;
    siblings?: Array<{ name: string; capacity: string }>;
    onCustomChange?: (value: any) => void;
}

export function PropertyFormField({ 
    property, 
    control, 
    name, 
    siblings,
    onCustomChange 
}: PropertyFormFieldProps) {
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
                <CapacityEditor
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
                    <FormControlLabel
                        control={
                            <Switch
                                checked={value === true || value === 'true'}
                                onChange={(e) => handleChange(e.target.checked)}
                                inputRef={ref}
                            />
                        }
                        label={property.displayName}
                    />
                );

            case 'enum':
                return (
                    <FormControl fullWidth error={!!error}>
                        <InputLabel>{property.displayName}</InputLabel>
                        <Select
                            value={value || ''}
                            onChange={(e) => handleChange(e.target.value)}
                            label={property.displayName}
                            inputRef={ref}
                        >
                            {property.options?.map((option) => (
                                <MenuItem key={option} value={option}>
                                    {option}
                                </MenuItem>
                            ))}
                        </Select>
                        {error && <FormHelperText>{error.message}</FormHelperText>}
                    </FormControl>
                );

            case 'number':
                return (
                    <TextField
                        fullWidth
                        type="number"
                        label={property.displayName}
                        value={value || ''}
                        onChange={(e) => {
                            const inputValue = e.target.value;
                            if (inputValue === '') {
                                handleChange('');
                            } else {
                                const parsed = parseFloat(inputValue);
                                if (!isNaN(parsed)) {
                                    handleChange(parsed);
                                }
                            }
                        }}
                        error={!!error}
                        helperText={error?.message}
                        placeholder={property.placeholder}
                        inputProps={{
                            step: property.step || '1',
                        }}
                        inputRef={ref}
                    />
                );

            case 'percentage': {
                const parsedValue = value ? parseFloat(value) : 0;
                const percentValue = isNaN(parsedValue) ? 0 : parsedValue * 100;

                return (
                    <Box sx={{ px: 1 }}>
                        <Typography gutterBottom>
                            {property.displayName}: {percentValue.toFixed(1)}%
                        </Typography>
                        <Slider
                            value={percentValue}
                            onChange={(_, newValue) => {
                                const numValue = newValue as number;
                                handleChange(numValue / 100);
                            }}
                            min={0}
                            max={100}
                            step={0.1}
                            marks={[
                                { value: 0, label: '0%' },
                                { value: 50, label: '50%' },
                                { value: 100, label: '100%' },
                            ]}
                            sx={{ mt: 1 }}
                            ref={ref}
                        />
                        {error && (
                            <Typography color="error" variant="caption">
                                {error.message}
                            </Typography>
                        )}
                    </Box>
                );
            }

            default: // 'string'
                return (
                    <TextField
                        fullWidth
                        label={property.displayName}
                        value={value || ''}
                        onChange={(e) => handleChange(e.target.value)}
                        error={!!error}
                        helperText={error?.message}
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
