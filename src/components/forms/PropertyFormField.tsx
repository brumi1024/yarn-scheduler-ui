import React from 'react';
import { QUEUE_PROPERTIES } from '../../config/queueProperties';
import { TextField, Select, MenuItem, Switch, FormControl, InputLabel, FormControlLabel, Box, Typography } from '@mui/material';

interface PropertyFormFieldProps {
  propertyKey: string;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
}

export function PropertyFormField({ propertyKey, value, onChange, error }: PropertyFormFieldProps) {
  const property = QUEUE_PROPERTIES[propertyKey as keyof typeof QUEUE_PROPERTIES];
  if (!property) return null;
  
  // Direct rendering based on type - no abstraction layers
  switch (property.type) {
    case 'capacity':
      return (
        <TextField
          label={property.label}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          error={!!error}
          helperText={error || property.description}
          fullWidth
          margin="normal"
        />
      );
      
    case 'select':
      return (
        <FormControl fullWidth margin="normal" error={!!error}>
          <InputLabel>{property.label}</InputLabel>
          <Select
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            label={property.label}
          >
            {property.options?.map(option => (
              <MenuItem key={option} value={option}>{option}</MenuItem>
            ))}
          </Select>
          {(error || property.description) && (
            <Typography variant="caption" color={error ? 'error' : 'text.secondary'} sx={{ mt: 0.5 }}>
              {error || property.description}
            </Typography>
          )}
        </FormControl>
      );
      
    case 'number':
      return (
        <TextField
          type="number"
          label={property.label}
          value={value || ''}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          error={!!error}
          helperText={error || property.description}
          fullWidth
          margin="normal"
        />
      );
      
    case 'boolean':
      return (
        <Box sx={{ my: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={value || false}
                onChange={(e) => onChange(e.target.checked)}
              />
            }
            label={property.label}
          />
          {(error || property.description) && (
            <Typography variant="caption" color={error ? 'error' : 'text.secondary'} display="block">
              {error || property.description}
            </Typography>
          )}
        </Box>
      );

    case 'text':
      return (
        <TextField
          label={property.label}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          error={!!error}
          helperText={error || property.description}
          fullWidth
          margin="normal"
        />
      );
      
    default:
      return null;
  }
}