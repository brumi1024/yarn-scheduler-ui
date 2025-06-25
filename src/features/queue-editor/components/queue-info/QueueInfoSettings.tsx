import React from 'react';
import { useFormContext } from 'react-hook-form';
import { useState, useEffect, useMemo } from 'react';
import {
    Box,
    Typography,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Button,
    Alert,
    Tabs,
    Tab,
    ToggleButtonGroup,
    ToggleButton,
    Divider,
} from '@mui/material';
import {
    ExpandMore as ExpandMoreIcon,
    ViewList as ViewListIcon,
    Tab as TabIcon,
    Warning as WarningIcon,
    Error as ErrorIcon,
} from '@mui/icons-material';
import { useQueueProperties } from '../../hooks/useQueueProperties';
import { PropertyDefinition } from '../../../../config';
import type { Queue, PropertyGroup } from '../../types';
import { PropertyFormField } from '../../../../components/forms/PropertyFormField';
import { AutoQueueCreationSection } from '../../../../components/forms/AutoQueueCreationSection';
import { NodeLabelsSection } from '../../../../components/forms/NodeLabelsSection';
import { NodeLabelPropertiesSection } from './NodeLabelPropertiesSection';
import { AutoQueueTemplatesSection } from './AutoQueueTemplatesSection';
import { useConfigStore } from '../../../../store/configStore';
import { useHasConfigChanges } from '../../../../hooks/useConfigField';

interface QueueInfoSettingsProps {
    queue: Queue;
    selectedNodeLabel?: string | null;
    onReset: () => void;
    expandedSection?: string;
}

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`property-tabpanel-${index}`}
            aria-labelledby={`property-tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{ py: 2 }}>{children}</Box>}
        </div>
    );
}

export const QueueInfoSettings: React.FC<QueueInfoSettingsProps> = ({
    queue,
    selectedNodeLabel,
    onReset,
    expandedSection,
}) => {
    const { control } = useFormContext();
    const { groupedProperties } = useQueueProperties(queue);

    // Get validation status from config store
    const validationStatus = useConfigStore((state) => state.validationStatus);
    const validationResults = useConfigStore((state) => state.validationResults);

    // Check if this queue has any changes
    const queuePropertyPaths = Object.keys(groupedProperties).flatMap((group) =>
        groupedProperties[group].map((p) => `queues.${queue.path}.${p.key}`)
    );
    const hasChanges = useHasConfigChanges(queuePropertyPaths);

    // Transform grouped properties to match expected format
    const propertyGroups = useMemo(() => {
        return Object.entries(groupedProperties).map(([groupName, properties]) => ({
            name: groupName.charAt(0).toUpperCase() + groupName.slice(1).replace('-', ' '),
            properties,
        }));
    }, [groupedProperties]);

    // Count validation issues per group
    const groupValidationCounts = useMemo(() => {
        const counts: Record<string, { errors: number; warnings: number }> = {};

        propertyGroups.forEach((group) => {
            let errors = 0;
            let warnings = 0;

            group.properties.forEach((prop) => {
                const path = `queues.${queue.path}.${prop.key}`;
                const issues = validationResults.get(path) || [];
                errors += issues.filter((i) => i.severity === 'error').length;
                warnings += issues.filter((i) => i.severity === 'warning').length;
            });

            counts[group.name] = { errors, warnings };
        });

        return counts;
    }, [propertyGroups, queue.path, validationResults]);

    // State to manage which accordion sections are expanded
    const [expandedAccordions, setExpandedAccordions] = useState<Set<string>>(new Set(['node-labels']));

    // State for view mode (accordion vs tabs)
    const [viewMode, setViewMode] = useState<'accordion' | 'tabs'>('accordion');
    const [selectedTab, setSelectedTab] = useState(0);

    // Handle expandedSection prop changes
    useEffect(() => {
        if (expandedSection) {
            setExpandedAccordions((prev) => new Set([...prev, expandedSection]));
        }
    }, [expandedSection]);

    // Auto-expand sections with errors
    useEffect(() => {
        const sectionsWithErrors = Object.entries(groupValidationCounts)
            .filter(([_, counts]) => counts.errors > 0)
            .map(([name]) => name);

        if (sectionsWithErrors.length > 0) {
            setExpandedAccordions((prev) => new Set([...prev, ...sectionsWithErrors]));
        }
    }, [groupValidationCounts]);

    const handleAccordionChange = (section: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
        setExpandedAccordions((prev) => {
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
            return (
                <Box key={group.name}>
                    {group.properties.map((property: PropertyDefinition) => (
                        <PropertyFormField
                            key={property.key}
                            property={property}
                            control={control}
                            name={property.key}
                            queuePath={queue.queuePath}
                            siblings={siblings}
                        />
                    ))}
                </Box>
            );
        }

        return (
            <Box key={group.name}>
                {group.properties.map((property: PropertyDefinition) => (
                    <PropertyFormField
                        key={property.key}
                        property={property}
                        control={control}
                        name={property.key}
                        queuePath={queue.queuePath}
                        siblings={siblings}
                    />
                ))}
            </Box>
        );
    };

    const renderAccordionView = () => (
        <>
            {propertyGroups.map((group: PropertyGroup, index: number) => {
                const counts = groupValidationCounts[group.name] || { errors: 0, warnings: 0 };
                const hasErrors = counts.errors > 0;
                const hasWarnings = counts.warnings > 0;

                return (
                    <Accordion
                        key={group.name}
                        expanded={expandedAccordions.has(group.name)}
                        onChange={handleAccordionChange(group.name)}
                        sx={{
                            mb: 1,
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
                            '&:before': { display: 'none' },
                            ...(hasErrors && {
                                borderLeft: '3px solid',
                                borderLeftColor: 'error.main',
                            }),
                        }}
                    >
                        <AccordionSummary
                            expandIcon={<ExpandMoreIcon />}
                            sx={{
                                bgcolor: 'background.default',
                                '&:hover': { bgcolor: 'action.hover' },
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                                <Typography variant="subtitle2" fontWeight="medium">
                                    {group.name}
                                </Typography>
                                {hasErrors && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <ErrorIcon color="error" fontSize="small" />
                                        <Typography variant="caption" color="error">
                                            {counts.errors}
                                        </Typography>
                                    </Box>
                                )}
                                {hasWarnings && !hasErrors && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <WarningIcon color="warning" fontSize="small" />
                                        <Typography variant="caption" color="warning.main">
                                            {counts.warnings}
                                        </Typography>
                                    </Box>
                                )}
                            </Box>
                        </AccordionSummary>
                        <AccordionDetails sx={{ pt: 0 }}>{renderPropertyGroup(group)}</AccordionDetails>
                    </Accordion>
                );
            })}

            {/* Node Labels Section */}
            <Accordion
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
                <AccordionDetails sx={{ pt: 0 }}>
                    <NodeLabelsSection queue={queue} />
                    {selectedNodeLabel && selectedNodeLabel !== '*' && (
                        <Box sx={{ mt: 2 }}>
                            <Typography variant="subtitle2" gutterBottom>
                                Properties for Label: {selectedNodeLabel}
                            </Typography>
                            <NodeLabelPropertiesSection queue={queue} nodeLabel={selectedNodeLabel} control={control} />
                        </Box>
                    )}
                </AccordionDetails>
            </Accordion>

            {/* Auto Queue Templates Section */}
            <Accordion
                expanded={expandedAccordions.has('auto-queue-templates')}
                onChange={handleAccordionChange('auto-queue-templates')}
                sx={{ mb: 1, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)', '&:before': { display: 'none' } }}
            >
                <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    sx={{ bgcolor: 'background.default', '&:hover': { bgcolor: 'action.hover' } }}
                >
                    <Typography variant="subtitle2" fontWeight="medium">
                        Auto Queue Templates
                    </Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0 }}>
                    <AutoQueueTemplatesSection queue={queue} />
                </AccordionDetails>
            </Accordion>
        </>
    );

    return (
        <Box sx={{ p: 1.5 }}>
            {/* Validation Summary */}
            {validationStatus === 'invalid' && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    <Typography variant="body2" fontWeight="medium">
                        Validation errors found
                    </Typography>
                    <Typography variant="caption">
                        Please fix the highlighted fields before applying changes.
                    </Typography>
                </Alert>
            )}

            {/* View Mode Toggle */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" fontWeight="medium">
                    Queue Settings
                </Typography>
                <ToggleButtonGroup
                    value={viewMode}
                    exclusive
                    onChange={(_, newMode) => newMode && setViewMode(newMode)}
                    size="small"
                >
                    <ToggleButton value="accordion">
                        <ViewListIcon fontSize="small" />
                    </ToggleButton>
                    <ToggleButton value="tabs">
                        <TabIcon fontSize="small" />
                    </ToggleButton>
                </ToggleButtonGroup>
            </Box>

            {/* Property Groups */}
            {viewMode === 'accordion' ? (
                renderAccordionView()
            ) : (
                <>
                    <Tabs
                        value={selectedTab}
                        onChange={(_, newValue) => setSelectedTab(newValue)}
                        variant="scrollable"
                        scrollButtons="auto"
                        sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
                    >
                        {propertyGroups.map((group, index) => (
                            <Tab key={group.name} label={group.name} />
                        ))}
                        <Tab label="Node Labels" />
                        <Tab label="Auto Queue Templates" />
                    </Tabs>
                    {propertyGroups.map((group, index) => (
                        <TabPanel key={group.name} value={selectedTab} index={index}>
                            {renderPropertyGroup(group)}
                        </TabPanel>
                    ))}
                    <TabPanel value={selectedTab} index={propertyGroups.length}>
                        <NodeLabelsSection queue={queue} />
                        {selectedNodeLabel && selectedNodeLabel !== '*' && (
                            <Box sx={{ mt: 2 }}>
                                <Typography variant="subtitle2" gutterBottom>
                                    Properties for Label: {selectedNodeLabel}
                                </Typography>
                                <NodeLabelPropertiesSection
                                    queue={queue}
                                    nodeLabel={selectedNodeLabel}
                                    control={control}
                                />
                            </Box>
                        )}
                    </TabPanel>
                    <TabPanel value={selectedTab} index={propertyGroups.length + 1}>
                        <AutoQueueTemplatesSection queue={queue} />
                    </TabPanel>
                </>
            )}

            {/* Action Buttons */}
            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                <Button variant="outlined" onClick={onReset} disabled={!hasChanges}>
                    Reset Changes
                </Button>
                <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', ml: 1 }}>
                    Changes are staged automatically
                </Typography>
            </Box>
        </Box>
    );
};
