// src/features/queue-editor/components/queue-info/AutoQueueTemplatesSection.tsx
import React, { useState } from 'react';
import { 
    Box, 
    Typography, 
    Tabs, 
    Tab, 
    Paper,
    Alert,
    Divider
} from '@mui/material';
import { useFormContext } from 'react-hook-form';
import { PropertyFormField } from '../../../../components/forms/PropertyFormField';
import { useQueueProperties } from '../../hooks/useQueueProperties';
import type { Queue } from '../../../../types/Queue';

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
            id={`template-tabpanel-${index}`}
            aria-labelledby={`template-tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
        </div>
    );
}

interface AutoQueueTemplatesSectionProps {
    queue: Queue;
    queuePath: string;
}

export const AutoQueueTemplatesSection: React.FC<AutoQueueTemplatesSectionProps> = ({
    queue,
    queuePath,
}) => {
    const { control } = useFormContext();
    const { getTemplateProperties } = useQueueProperties(queue);
    const [selectedTab, setSelectedTab] = useState(0);

    const templateTypes = [
        { key: 'template', label: 'All Queues', description: 'Properties applied to all auto-created queues' },
        { key: 'leaf-template', label: 'Leaf Queues', description: 'Properties specific to auto-created leaf queues' },
        { key: 'parent-template', label: 'Parent Queues', description: 'Properties specific to auto-created parent queues' },
    ] as const;

    return (
        <Box>
            <Alert severity="info" sx={{ mb: 2 }}>
                Configure default properties for auto-created queues. More specific templates override general ones.
            </Alert>

            <Paper sx={{ borderRadius: 1 }}>
                <Tabs 
                    value={selectedTab} 
                    onChange={(_, newValue) => setSelectedTab(newValue)}
                    sx={{ borderBottom: 1, borderColor: 'divider' }}
                >
                    {templateTypes.map((type, index) => (
                        <Tab key={type.key} label={type.label} />
                    ))}
                </Tabs>

                {templateTypes.map((type, index) => {
                    const properties = getTemplateProperties(type.key);
                    
                    return (
                        <TabPanel key={type.key} value={selectedTab} index={index}>
                            <Box sx={{ px: 2, pb: 2 }}>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                    {type.description}
                                </Typography>
                                
                                {properties.length === 0 ? (
                                    <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
                                        No template properties available
                                    </Typography>
                                ) : (
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        {/* Group properties by category */}
                                        {['capacity', 'resource', 'advanced'].map(group => {
                                            const groupProps = properties.filter(p => {
                                                // Special handling for capacity properties
                                                if (group === 'capacity') {
                                                    return p.key.endsWith('.capacity') || 
                                                           p.key.endsWith('.maximum-capacity');
                                                }
                                                return p.group === group;
                                            });

                                            if (groupProps.length === 0) return null;

                                            return (
                                                <Box key={group}>
                                                    <Typography 
                                                        variant="overline" 
                                                        color="text.secondary"
                                                        sx={{ mb: 1, display: 'block' }}
                                                    >
                                                        {group.charAt(0).toUpperCase() + group.slice(1)} Settings
                                                    </Typography>
                                                    <Divider sx={{ mb: 2 }} />
                                                    {groupProps.map(property => (
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
                                            );
                                        })}
                                    </Box>
                                )}
                            </Box>
                        </TabPanel>
                    );
                })}
            </Paper>
        </Box>
    );
};