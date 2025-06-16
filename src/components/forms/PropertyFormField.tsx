import React from 'react';
import { useController } from 'react-hook-form';
import type { Control } from 'react-hook-form';
import type { PropertyDefinition } from '../../config/properties';
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
} from '@mui/material';
import { CapacityEditor } from '../CapacityEditor';

interface PropertyFormFieldProps {
    property: PropertyDefinition;
    control: Control<any>;
    name: string;
    siblings?: Array<{ name: string; capacity: string }>;
    onCustomChange?: (value: any) => void;
}

export function PropertyFormField({ property, control, name, siblings, onCustomChange }: PropertyFormFieldProps) {
    const {
        field,
        fieldState: { error },
    } = useController({ control, name });

    switch (property.type) {
        case 'capacity':
            return (
                <CapacityEditor
                    label={property.label}
                    value={field.value || property.defaultValue}
                    onChange={field.onChange}
                    error={error?.message}
                    siblings={siblings}
                />
            );

        case 'select':
            return (
                <FormControl fullWidth margin="normal" error={!!error}>
                    <InputLabel>{property.label}</InputLabel>
                    <Select {...field} label={property.label}>
                        {property.options?.map((option) => (
                            <MenuItem key={option} value={option}>
                                {option}
                            </MenuItem>
                        ))}
                    </Select>
                    <FormHelperText>{error?.message || property.description}</FormHelperText>
                </FormControl>
            );

        case 'number':
            return (
                <TextField
                    {...field}
                    type="number"
                    label={property.label}
                    error={!!error}
                    helperText={error?.message || property.description}
                    fullWidth
                    margin="normal"
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                />
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
                    {(error || property.description) && (
                        <Typography variant="caption" color={error ? 'error' : 'text.secondary'} display="block">
                            {error?.message || property.description}
                        </Typography>
                    )}
                </Box>
            );

        case 'text':
        default:
            return (
                <TextField
                    {...field}
                    label={property.label}
                    error={!!error}
                    helperText={error?.message || property.description}
                    fullWidth
                    margin="normal"
                />
            );
    }
}
