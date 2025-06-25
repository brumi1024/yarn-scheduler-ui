import React, { useState } from 'react';
import {
    Box,
    Typography,
    Card,
    CardContent,
    FormGroup,
    FormControlLabel,
    Switch,
    TextField,
    Button,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Alert,
    Chip,
    Divider,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useYarnSchedulerStore } from '../store/yarnSchedulerStore';
import { useSchedulerConfig } from '../hooks/useSchedulerApi';
import {
    globalProperties,
    getGlobalPropertyCategories,
    getGlobalPropertiesByCategory,
} from '../../config/globalProperties';
import { ConfirmationModal } from '../../components/ConfirmationModal';
import { StagedChangesPanel } from './StagedChangesPanel';

export default function GlobalSettings() {
    // Load configuration data
    const { isLoading, error } = useSchedulerConfig();
    
    // V3 store access
    const originalConfig = useYarnSchedulerStore((state) => state.originalConfig);
    const propertyChanges = useYarnSchedulerStore((state) => state.propertyChanges);
    const updateProperty = useYarnSchedulerStore((state) => state.updateProperty);
    
    const [isLegacyModeModalOpen, setLegacyModeModalOpen] = useState(false);

    const handleToggleLegacyMode = () => {
        const currentValue = getCurrentValue('yarn.scheduler.capacity.legacy-queue-mode.enabled') !== 'false';
        if (currentValue) {
            // Turning legacy mode off - show warning
            setLegacyModeModalOpen(true);
        } else {
            // Turning it back on - just stage the change
            updateProperty('yarn.scheduler.capacity.legacy-queue-mode.enabled', 'true');
        }
    };

    const confirmLegacyModeChange = () => {
        // This is where you would trigger the automatic conversion of auto-queue settings
        // TODO: Implement automatic conversion of auto-queue settings
        updateProperty('yarn.scheduler.capacity.legacy-queue-mode.enabled', 'false');
        setLegacyModeModalOpen(false);
    };

    const getCurrentValue = (key: string) => {
        // Check staged changes first, then original config, then default
        const change = propertyChanges.get(key);
        if (change) {
            return String(change.newValue);
        }
        return originalConfig[key] || globalProperties[key]?.defaultValue || '';
    };

    const handlePropertyChange = (key: string, newValue: string) => {
        updateProperty(key, newValue);
    };

    const renderPropertyInput = (key: string, property: (typeof globalProperties)[string]) => {
        const currentValue = getCurrentValue(key);
        const hasChanged = propertyChanges.has(key);

        switch (property.type) {
            case 'boolean':
                return (
                    <FormControlLabel
                        control={
                            <Switch
                                checked={currentValue === 'true'}
                                onChange={(e) => handlePropertyChange(key, String(e.target.checked))}
                            />
                        }
                        label={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {property.displayName}
                                {hasChanged && <Chip label="Changed" size="small" color="primary" />}
                            </Box>
                        }
                    />
                );

            case 'select':
                return (
                    <FormControl fullWidth margin="normal">
                        <InputLabel>
                            {property.displayName}
                            {hasChanged && ' (Changed)'}
                        </InputLabel>
                        <Select
                            value={currentValue}
                            onChange={(e) => handlePropertyChange(key, e.target.value as string)}
                            label={property.displayName}
                        >
                            {property.options?.map((option) => (
                                <MenuItem key={option.value} value={option.value}>
                                    {option.label}
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
                        value={currentValue}
                        onChange={(e) => handlePropertyChange(key, e.target.value)}
                        margin="normal"
                        inputProps={{
                            min: property.validation?.min,
                            max: property.validation?.max,
                        }}
                        helperText={hasChanged ? 'Changed from original' : ''}
                        color={hasChanged ? 'primary' : undefined}
                    />
                );

            case 'string':
            default:
                return (
                    <TextField
                        fullWidth
                        label={property.displayName}
                        value={currentValue}
                        onChange={(e) => handlePropertyChange(key, e.target.value)}
                        margin="normal"
                        multiline={key === 'yarn.scheduler.capacity.queue-mappings'}
                        rows={key === 'yarn.scheduler.capacity.queue-mappings' ? 3 : 1}
                        helperText={hasChanged ? 'Changed from original' : ''}
                        color={hasChanged ? 'primary' : undefined}
                    />
                );
        }
    };

    const categories = getGlobalPropertyCategories();

    if (isLoading) {
        return (
            <Box sx={{ p: 3 }}>
                <Typography variant="h4" gutterBottom>
                    Global Scheduler Settings
                </Typography>
                <Typography>Loading configuration...</Typography>
            </Box>
        );
    }

    if (error) {
        return (
            <Box sx={{ p: 3 }}>
                <Typography variant="h4" gutterBottom>
                    Global Scheduler Settings
                </Typography>
                <Alert severity="error">Failed to load configuration: {error.message}</Alert>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
                Global Scheduler Settings
            </Typography>

            {/* Legacy Mode Prominent Section */}
            <Card sx={{ mb: 3, border: '2px solid', borderColor: 'primary.main' }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom color="primary">
                        Legacy Queue Mode
                    </Typography>
                    <Alert severity="info" sx={{ mb: 2 }}>
                        This setting affects how capacity allocation works throughout the scheduler. Changes require
                        careful consideration.
                    </Alert>
                    <FormGroup>
                        {renderPropertyInput(
                            'yarn.scheduler.capacity.legacy-queue-mode.enabled',
                            globalProperties['yarn.scheduler.capacity.legacy-queue-mode.enabled']
                        )}
                    </FormGroup>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {globalProperties['yarn.scheduler.capacity.legacy-queue-mode.enabled'].description}
                    </Typography>
                </CardContent>
            </Card>

            {/* Categorized Settings */}
            {categories
                .filter((category) => category !== 'core') // Core settings are handled above
                .map((category) => {
                    const categoryProperties = getGlobalPropertiesByCategory(category);

                    return (
                        <Accordion key={category} sx={{ mb: 1 }}>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Typography variant="h6" sx={{ textTransform: 'capitalize' }}>
                                    {category} Settings
                                </Typography>
                                {categoryProperties.some(([key]) => propertyChanges.has(key)) && (
                                    <Chip label="Has Changes" size="small" color="primary" sx={{ ml: 2 }} />
                                )}
                            </AccordionSummary>
                            <AccordionDetails>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    {categoryProperties.map(([key, property]) => (
                                        <Box key={key}>
                                            {renderPropertyInput(key, property)}
                                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                                {property.description}
                                            </Typography>
                                            <Divider sx={{ mt: 2 }} />
                                        </Box>
                                    ))}
                                </Box>
                            </AccordionDetails>
                        </Accordion>
                    );
                })}

            <ConfirmationModal
                open={isLegacyModeModalOpen}
                onClose={() => setLegacyModeModalOpen(false)}
                onConfirm={confirmLegacyModeChange}
                title="Disable Legacy Queue Mode?"
                message="Disabling legacy mode will enable flexible capacity configurations but requires converting all auto-queue-creation settings to the new format. This may be irreversible. Do you want to proceed?"
                confirmText="Disable Legacy Mode"
                cancelText="Keep Legacy Mode"
                severity="warning"
                confirmColor="warning"
            />

            <StagedChangesPanel />
        </Box>
    );
}