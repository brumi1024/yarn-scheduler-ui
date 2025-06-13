import React from 'react';
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
    InputAdornment,
} from '@mui/material';
import { Help as HelpIcon } from '@mui/icons-material';
import type { ConfigProperty } from '../config';
import { CapacityEditor } from './CapacityEditor';

interface PropertyFormFieldProps {
    property: ConfigProperty;
    value: any;
    error?: string;
    onChange: (value: any) => void;
    siblings?: Array<{ name: string; capacity: string }>;
}

export function PropertyFormField({ property, value, error, onChange, siblings }: PropertyFormFieldProps) {
    const renderField = () => {
        // Special handling for capacity properties (including template capacity)
        if (
            property.key === 'capacity' ||
            property.key === 'maximum-capacity' ||
            property.key === 'leaf-queue-template.capacity' ||
            property.key === 'leaf-queue-template.maximum-capacity' ||
            property.key === 'auto-queue-creation-v2.template.capacity' ||
            property.key === 'auto-queue-creation-v2.template.maximum-capacity'
        ) {
            return (
                <CapacityEditor
                    label={property.displayName}
                    value={value || ''}
                    onChange={onChange}
                    error={error}
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
                                onChange={(e) => onChange(e.target.checked)}
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
                            onChange={(e) => onChange(e.target.value)}
                            label={property.displayName}
                        >
                            {property.options?.map((option) => (
                                <MenuItem key={option} value={option}>
                                    {option}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                );

            case 'number':
                return (
                    <TextField
                        fullWidth
                        type="number"
                        label={property.displayName}
                        value={value || ''}
                        onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : '')}
                        error={!!error}
                        helperText={error}
                        placeholder={property.placeholder}
                        inputProps={{
                            step: property.step || '1',
                        }}
                    />
                );

            case 'percentage': {
                const percentValue = value ? parseFloat(value) * 100 : 0;

                return (
                    <Box sx={{ px: 1 }}>
                        <Typography gutterBottom>
                            {property.displayName}: {percentValue.toFixed(1)}%
                        </Typography>
                        <Slider
                            value={percentValue}
                            onChange={(_, newValue) => onChange((newValue as number) / 100)}
                            min={0}
                            max={100}
                            step={0.1}
                            marks={[
                                { value: 0, label: '0%' },
                                { value: 50, label: '50%' },
                                { value: 100, label: '100%' },
                            ]}
                            sx={{ mt: 1 }}
                        />
                        {error && (
                            <Typography color="error" variant="caption">
                                {error}
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
                        onChange={(e) => onChange(e.target.value)}
                        error={!!error}
                        helperText={error}
                        placeholder={property.placeholder}
                        multiline={property.key.includes('description') || property.key.includes('policy')}
                        rows={property.key.includes('description') || property.key.includes('policy') ? 3 : 1}
                    />
                );
        }
    };

    // For capacity properties, the CapacityEditor handles its own layout
    if (
        property.key === 'capacity' ||
        property.key === 'maximum-capacity' ||
        property.key === 'leaf-queue-template.capacity' ||
        property.key === 'leaf-queue-template.maximum-capacity' ||
        property.key === 'auto-queue-creation-v2.template.capacity' ||
        property.key === 'auto-queue-creation-v2.template.maximum-capacity'
    ) {
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
