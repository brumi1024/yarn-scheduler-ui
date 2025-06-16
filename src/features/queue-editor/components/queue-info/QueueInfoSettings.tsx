import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Box, Typography, Accordion, AccordionSummary, AccordionDetails, Button, Alert } from '@mui/material';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import type { Queue } from '../../../../types/Queue';
import { getPropertyGroups } from '../../../../config';
import { PropertyFormField } from '../../../../components/forms/PropertyFormField';
import { AutoQueueCreationSection } from '../../../../components/forms/AutoQueueCreationSection';
import { NodeLabelsSection } from '../../../../components/forms/NodeLabelsSection';

interface QueueInfoSettingsProps {
    queue: Queue;
    saveError: string | null;
    onSave: (data: Record<string, any>) => void;
    onReset: () => void;
}

export const QueueInfoSettings: React.FC<QueueInfoSettingsProps> = ({ queue, saveError, onSave, onReset }) => {
    const {
        control,
        handleSubmit,
        formState: { errors, isDirty },
    } = useFormContext();
    const propertyGroups = getPropertyGroups();

    const renderPropertyGroup = (group: any) => {
        const siblings =
            queue && (queue as any).parent
                ? ((queue as any).parent.children || [])
                      .filter((child: any) => child.queueName !== queue.queueName)
                      .map((child: any) => ({ name: child.queueName, capacity: `${child.capacity}%` }))
                : [];

        if (group.name === 'Auto-Creation') {
            return <AutoQueueCreationSection key={group.name} properties={group.properties} siblings={siblings} />;
        }

        return (
            <Box key={group.name}>
                {group.properties.map((property: any) => (
                    <PropertyFormField
                        key={property.key}
                        property={property}
                        control={control}
                        name={property.key}
                        siblings={siblings}
                    />
                ))}
            </Box>
        );
    };

    return (
        <Box sx={{ p: 1.5 }}>
            {Object.keys(errors).length > 0 && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    Please fix the validation errors before saving.
                </Alert>
            )}
            {saveError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {saveError}
                </Alert>
            )}
            {propertyGroups.map((group: any, index: number) => (
                <Accordion
                    key={group.name}
                    defaultExpanded={index === 0}
                    sx={{ mb: 1, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)', '&:before': { display: 'none' } }}
                >
                    <AccordionSummary
                        expandIcon={<ExpandMoreIcon />}
                        sx={{ bgcolor: 'background.default', '&:hover': { bgcolor: 'action.hover' } }}
                    >
                        <Typography variant="subtitle2" fontWeight="medium">
                            {group.name}
                        </Typography>
                    </AccordionSummary>
                    <AccordionDetails sx={{ p: 2 }}>{renderPropertyGroup(group)}</AccordionDetails>
                </Accordion>
            ))}

            {/* Node Labels Section */}
            <Accordion
                key="node-labels"
                sx={{ mb: 1, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)', '&:before': { display: 'none' } }}
            >
                <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    sx={{ bgcolor: 'background.default', '&:hover': { bgcolor: 'action.hover' } }}
                >
                    <Typography variant="subtitle2" fontWeight="medium">
                        Node Labels
                    </Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 2 }}>
                    <NodeLabelsSection queue={queue} />
                </AccordionDetails>
            </Accordion>
            {isDirty && (
                <Box sx={{ mt: 2, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                    <Button variant="outlined" size="small" onClick={onReset}>
                        Reset
                    </Button>
                    <Button
                        variant="contained"
                        size="small"
                        onClick={handleSubmit(onSave)}
                        disabled={Object.keys(errors).length > 0}
                    >
                        Save Changes
                    </Button>
                </Box>
            )}
        </Box>
    );
};
