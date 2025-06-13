import React from 'react';
import { Box, Typography, Alert, Divider } from '@mui/material';
import type { ConfigProperty } from '../config';
import { PropertyFormField } from './PropertyFormField';

interface AutoQueueCreationSectionProps {
  properties: Record<string, ConfigProperty>;
  formData: Record<string, any>;
  errors: Record<string, string>;
  onChange: (propertyKey: string, value: any) => void;
  siblings?: Array<{ name: string; capacity: string }>;
}

export function AutoQueueCreationSection({ 
  properties, 
  formData, 
  errors, 
  onChange,
  siblings 
}: AutoQueueCreationSectionProps) {
  const v1Enabled = formData['auto-create-child-queue.enabled'] === true;
  const v2Enabled = formData['auto-queue-creation-v2.enabled'] === true;

  // Filter properties based on enabled mode
  const renderProperties = () => {
    return Object.entries(properties).map(([, property]) => {
      // Always show the enable toggles
      if (property.key === 'auto-create-child-queue.enabled' || 
          property.key === 'auto-queue-creation-v2.enabled') {
        return (
          <PropertyFormField
            key={property.key}
            property={property}
            value={formData[property.key]}
            error={errors[property.key]}
            onChange={(value) => {
              // When enabling one mode, disable the other
              if (value === true) {
                if (property.key === 'auto-create-child-queue.enabled') {
                  onChange('auto-queue-creation-v2.enabled', false);
                } else {
                  onChange('auto-create-child-queue.enabled', false);
                }
              }
              onChange(property.key, value);
            }}
            siblings={siblings}
          />
        );
      }

      // Show v1 properties only when v1 is enabled
      if (!property.v2Property && v1Enabled && property.key.includes('leaf-queue-template')) {
        return (
          <PropertyFormField
            key={property.key}
            property={property}
            value={formData[property.key]}
            error={errors[property.key]}
            onChange={(value) => onChange(property.key, value)}
            siblings={siblings}
          />
        );
      }

      // Show v2 properties only when v2 is enabled
      if (property.v2Property && v2Enabled && property.key !== 'auto-queue-creation-v2.enabled') {
        return (
          <PropertyFormField
            key={property.key}
            property={property}
            value={formData[property.key]}
            error={errors[property.key]}
            onChange={(value) => onChange(property.key, value)}
            siblings={siblings}
          />
        );
      }

      return null;
    });
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Auto-Queue Creation
      </Typography>

      {v1Enabled && v2Enabled && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Both auto-creation modes cannot be enabled at the same time. Please choose one.
        </Alert>
      )}

      <Alert severity="info" sx={{ mb: 2 }}>
        <Typography variant="body2" gutterBottom>
          <strong>Legacy Mode (v1):</strong> Creates leaf queues only, requires percentage-based capacity.
        </Typography>
        <Typography variant="body2">
          <strong>Flexible Mode (v2):</strong> Creates parent or leaf queues, supports weight-based capacity.
        </Typography>
      </Alert>

      {renderProperties()}

      {v1Enabled && (
        <>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle1" gutterBottom>
            Legacy Template Properties
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            These properties define the default settings for auto-created leaf queues.
          </Typography>
        </>
      )}

      {v2Enabled && (
        <>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle1" gutterBottom>
            Flexible Mode Properties
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Configure advanced auto-queue creation with support for hierarchical structures.
          </Typography>
        </>
      )}
    </Box>
  );
}