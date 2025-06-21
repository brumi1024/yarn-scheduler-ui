import React from 'react';
import { useFormContext } from 'react-hook-form';
import { useState, useEffect } from 'react';
import { Box, Typography, Accordion, AccordionSummary, AccordionDetails, Button, Alert, AlertTitle } from '@mui/material';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import { getPropertyGroups } from '../../../../config';
import type { Queue, QueueChild, PropertyGroup } from '../../types';
import { PropertyFormField } from '../../../../components/forms/PropertyFormField';
import { AutoQueueCreationSection } from '../../../../components/forms/AutoQueueCreationSection';
import { NodeLabelsSection } from '../../../../components/forms/NodeLabelsSection';

interface QueueInfoSettingsProps {
    queue: Queue;
    selectedNodeLabel?: string | null;
    saveError: string | null;
    onSave: (data: Record<string, any>) => void;
    onReset: () => void;
    expandedSection?: string;
}

export const QueueInfoSettings: React.FC<QueueInfoSettingsProps> = ({ 
    queue, 
    selectedNodeLabel, 
    saveError, 
    onSave, 
    onReset,
    expandedSection 
}) => {
    const {
        control,
        handleSubmit,
        formState: { errors, isDirty },
    } = useFormContext();
    const propertyGroups = getPropertyGroups();

    // State to manage which accordion sections are expanded
    const [expandedAccordions, setExpandedAccordions] = useState<Set<string>>(new Set(['node-labels']));

    // Handle expandedSection prop changes
    useEffect(() => {
        if (expandedSection) {
            setExpandedAccordions(prev => new Set([...prev, expandedSection]));
        }
    }, [expandedSection]);

    const handleAccordionChange = (section: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
        setExpandedAccordions(prev => {
            const newSet = new Set(prev);
            if (isExpanded) {
                newSet.add(section);
            } else {
                newSet.delete(section);
            }
            return newSet;
        });
    };

    const renderPropertyGroup = (group: PropertyGroup) => {
        const siblings = queue?.queues?.queue
            ? queue.queues.queue
                  .filter((child: Queue) => child.queueName !== queue.queueName)
                  .map((child: Queue) => ({ name: child.queueName, capacity: `${child.capacity}%` }))
            : [];

        if (group.name === 'Auto-Creation') {
            return <AutoQueueCreationSection key={group.name} properties={group.properties} siblings={siblings} />;
        }

        return (
            <Box key={group.name}>
                {group.properties.map((property: PropertyDefinition) => (
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
            {selectedNodeLabel && (
                <Alert severity="info" sx={{ mb: 2 }}>
                    <AlertTitle>Node Label View</AlertTitle>
                    Showing configuration for label: <strong>{selectedNodeLabel}</strong>
                    {queue['accessible-node-labels']?.includes(selectedNodeLabel) ? (
                        <>. Capacity values shown are specific to this label.</>
                    ) : (
                        <>. This queue does not have access to this label.</>
                    )}
                </Alert>
            )}
            
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
            {propertyGroups.map((group: PropertyGroup, index: number) => (
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
                expanded={expandedAccordions.has('node-labels')}
                onChange={handleAccordionChange('node-labels')}
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
