import React from 'react';
import { useFormContext } from 'react-hook-form';
import { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Button,
    Alert,
    AlertTitle,
    Tabs,
    Tab,
    ToggleButtonGroup,
    ToggleButton,
    IconButton,
    Tooltip,
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon, ViewList as ViewListIcon, Tab as TabIcon } from '@mui/icons-material';
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
    saveError,
    onSave,
    onReset,
    expandedSection,
}) => {
    const {
        control,
        handleSubmit,
        formState: { errors, isDirty },
    } = useFormContext();
    const propertyGroups = getPropertyGroups();

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
                        queuePath={queue.queuePath}
                        siblings={siblings}
                    />
                ))}
            </Box>
        );
    };

    const renderAccordionView = () => (
        <>
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
        </>
    );

    const renderTabsView = () => {
        const allGroups = [...propertyGroups, { name: 'Node Labels', properties: [] }];

        return (
            <Box>
                <Tabs
                    value={selectedTab}
                    onChange={(_, newValue) => setSelectedTab(newValue)}
                    variant="scrollable"
                    scrollButtons="auto"
                    sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
                >
                    {allGroups.map((group, index) => (
                        <Tab
                            key={group.name}
                            label={group.name}
                            id={`property-tab-${index}`}
                            aria-controls={`property-tabpanel-${index}`}
                        />
                    ))}
                </Tabs>

                {propertyGroups.map((group, index) => (
                    <TabPanel key={group.name} value={selectedTab} index={index}>
                        {renderPropertyGroup(group)}
                    </TabPanel>
                ))}

                <TabPanel value={selectedTab} index={propertyGroups.length}>
                    <NodeLabelsSection queue={queue} />
                </TabPanel>
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

            {/* View Mode Toggle */}
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
                <ToggleButtonGroup
                    value={viewMode}
                    exclusive
                    onChange={(_, newMode) => newMode && setViewMode(newMode)}
                    size="small"
                >
                    <ToggleButton value="accordion">
                        <Tooltip title="Accordion View">
                            <ViewListIcon />
                        </Tooltip>
                    </ToggleButton>
                    <ToggleButton value="tabs">
                        <Tooltip title="Tabbed View">
                            <TabIcon />
                        </Tooltip>
                    </ToggleButton>
                </ToggleButtonGroup>
            </Box>

            {/* Render the appropriate view */}
            {viewMode === 'accordion' ? renderAccordionView() : renderTabsView()}

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
