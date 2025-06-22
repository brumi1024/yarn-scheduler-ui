// src/features/queue-editor/components/queue-info/NodeLabelPropertiesSection.tsx
import React from 'react';
import { Box, Typography, Accordion, AccordionSummary, AccordionDetails, Chip } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useFormContext } from 'react-hook-form';
import { PropertyFormField } from '../../../../components/forms/PropertyFormField';
import { useQueueProperties } from '../../hooks/useQueueProperties';
import type { Queue } from '../../../../types/Queue';

interface NodeLabelPropertiesSectionProps {
    queue: Queue;
    queuePath: string;
}

export const NodeLabelPropertiesSection: React.FC<NodeLabelPropertiesSectionProps> = ({
    queue,
    queuePath,
}) => {
    const { control } = useFormContext();
    const { getNodeLabelProperties } = useQueueProperties(queue);

    // Get accessible node labels from queue
    const nodeLabels = queue.nodeLabels || queue.accessibleNodeLabels || [];

    if (nodeLabels.length === 0) {
        return (
            <Box sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                    No node labels configured for this queue.
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Add node labels in the Accessible Node Labels field to configure label-specific capacities.
                </Typography>
            </Box>
        );
    }

    return (
        <Box>
            <Typography variant="subtitle2" sx={{ mb: 2 }}>
                Configure capacity for each node label
            </Typography>
            
            {nodeLabels.map((label) => {
                const properties = getNodeLabelProperties(label);
                
                return (
                    <Accordion key={label} defaultExpanded={nodeLabels.length === 1}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography>Node Label:</Typography>
                                <Chip label={label} size="small" color="primary" />
                            </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {properties.map((property) => (
                                    <PropertyFormField
                                        key={property.key}
                                        property={property}
                                        control={control}
                                        name={property.key}
                                        queuePath={queuePath}
                                        showValidation
                                    />
                                ))}
                            </Box>
                        </AccordionDetails>
                    </Accordion>
                );
            })}
            
            <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                Note: In legacy mode, the sum of child queue capacities for each label must equal 100%.
            </Typography>
        </Box>
    );
};