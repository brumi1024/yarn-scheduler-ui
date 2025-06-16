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
import { nanoid } from 'nanoid';
import { useGlobalProperties } from '../store';
import { useChangesStore } from '../store/changesStore';
import {
    globalProperties,
    getGlobalPropertyCategories,
    getGlobalPropertiesByCategory,
} from '../config/globalProperties';
import { ConfirmationModal } from '../components/ConfirmationModal';
import StagedChangesPanel from './queue-editor/components/StagedChangesPanel';

export default function GlobalSettings() {
    const globals = useGlobalProperties();
    const { stagedChanges, stageChange, unstageChange } = useChangesStore();
    const [isLegacyModeModalOpen, setLegacyModeModalOpen] = useState(false);

    const handleToggleLegacyMode = () => {
        const currentValue = globals['yarn.scheduler.capacity.legacy-queue-mode.enabled'] !== 'false';
        if (currentValue) {
            // Turning legacy mode off - show warning
            setLegacyModeModalOpen(true);
        } else {
            // Turning it back on - just stage the change
            stageChange({
                id: nanoid(),
                timestamp: new Date(),
                queuePath: '_global',
                property: 'yarn.scheduler.capacity.legacy-queue-mode.enabled',
                oldValue: 'false',
                newValue: 'true',
            });
        }
    };

    const confirmLegacyModeChange = () => {
        // This is where you would trigger the automatic conversion of auto-queue settings
        // TODO: Implement automatic conversion of auto-queue settings
        stageChange({
            id: nanoid(),
            timestamp: new Date(),
            queuePath: '_global',
            property: 'yarn.scheduler.capacity.legacy-queue-mode.enabled',
            oldValue: 'true',
            newValue: 'false',
        });
        setLegacyModeModalOpen(false);
    };

    const getCurrentValue = (key: string) => {
        // Check staged changes first, then global properties, then default
        const stagedChange = stagedChanges.find((change) => change.queuePath === '_global' && change.property === key);
        if (stagedChange) {
            return stagedChange.newValue;
        }
        return globals[key] || globalProperties[key]?.defaultValue || '';
    };

    const handlePropertyChange = (key: string, newValue: string) => {
        const currentValue = globals[key] || globalProperties[key]?.defaultValue || '';

        if (newValue === currentValue) {
            // Value reverted to original, unstage any changes
            // Find the staged change and remove it by ID
            const stagedChange = stagedChanges.find(
                (change) => change.queuePath === '_global' && change.property === key
            );
            if (stagedChange) {
                unstageChange(stagedChange.id);
            }
        } else {
            stageChange({
                id: nanoid(),
                timestamp: new Date(),
                queuePath: '_global',
                property: key,
                oldValue: currentValue,
                newValue,
            });
        }
    };

    const renderPropertyInput = (key: string, property: (typeof globalProperties)[string]) => {
        const currentValue = getCurrentValue(key);
        const hasChanged = stagedChanges.some((change) => change.queuePath === '_global' && change.property === key);

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
                        color={hasChanged ? 'primary' : 'inherit'}
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
                        color={hasChanged ? 'primary' : 'inherit'}
                    />
                );
        }
    };

    const categories = getGlobalPropertyCategories();

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
                                {categoryProperties.some(([key]) =>
                                    stagedChanges.some(
                                        (change) => change.queuePath === '_global' && change.property === key
                                    )
                                ) && <Chip label="Has Changes" size="small" color="primary" sx={{ ml: 2 }} />}
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
