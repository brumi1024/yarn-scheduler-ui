import React from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { Box, Typography, Alert, Divider } from '@mui/material';
import type { PropertyDefinition } from '../config';
import { PropertyFormField } from './PropertyFormField';

interface AutoQueueCreationSectionProps {
    properties: Record<string, PropertyDefinition>;
    siblings?: Array<{ name: string; capacity: string }>;
}

export function AutoQueueCreationSection({
    properties,
    siblings,
}: AutoQueueCreationSectionProps) {
    const { control, setValue } = useFormContext();
    
    // Watch for changes in auto-creation toggles
    const v1Enabled = useWatch({ control, name: 'auto-create-child-queue.enabled' }) === true;
    const v2Enabled = useWatch({ control, name: 'auto-queue-creation-v2.enabled' }) === true;

    const handleToggleChange = (propertyKey: string, value: any) => {
        // When enabling one mode, disable the other
        if (value === true) {
            if (propertyKey === 'auto-create-child-queue.enabled') {
                setValue('auto-queue-creation-v2.enabled', false);
            } else if (propertyKey === 'auto-queue-creation-v2.enabled') {
                setValue('auto-create-child-queue.enabled', false);
            }
        }
    };

    // Filter properties based on enabled mode
    const renderProperties = () => {
        return Object.entries(properties).map(([, property]) => {
            // Always show the enable toggles
            if (
                property.key === 'auto-create-child-queue.enabled' ||
                property.key === 'auto-queue-creation-v2.enabled'
            ) {
                return (
                    <PropertyFormField
                        key={property.key}
                        property={property}
                        control={control}
                        name={property.key}
                        siblings={siblings}
                        onCustomChange={(value) => handleToggleChange(property.key, value)}
                    />
                );
            }

            // Show v1 properties only when v1 is enabled
            if (v1Enabled && property.key.includes('leaf-queue-template')) {
                return (
                    <PropertyFormField
                        key={property.key}
                        property={property}
                        control={control}
                        name={property.key}
                        siblings={siblings}
                    />
                );
            }

            // Show v2 properties only when v2 is enabled
            if (v2Enabled && property.key.includes('auto-queue-creation-v2') && property.key !== 'auto-queue-creation-v2.enabled') {
                return (
                    <PropertyFormField
                        key={property.key}
                        property={property}
                        control={control}
                        name={property.key}
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