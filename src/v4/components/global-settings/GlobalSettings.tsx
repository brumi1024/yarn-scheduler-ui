import React from 'react';
import {
    Box,
    Typography,
    Card,
    CardContent,
    Alert,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    TextField,
    FormControlLabel,
    Switch,
    MenuItem,
    Select,
    FormControl,
    InputLabel,
    Chip,
    Divider,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useSchedulerStore } from '../../store/schedulerStore';
import {
    globalProperties,
    GlobalPropertyDefinition,
    getGlobalPropertyCategories,
    getGlobalPropertiesByCategory,
} from '../../../config/globalProperties';


export const GlobalSettings: React.FC = () => {
    const getGlobalDisplayValue = useSchedulerStore(state => state.getGlobalDisplayValue);
    const stageGlobalChange = useSchedulerStore(state => state.stageGlobalChange);
    const stagedChanges = useSchedulerStore(state => state.stagedChanges);

    const categories = getGlobalPropertyCategories();
    const globalStagedChanges = stagedChanges.filter(c => c.queuePath === 'global');

    const handlePropertyChange = (propertyKey: string, value: string) => {
        stageGlobalChange(propertyKey, value);
    };

    const renderPropertyInput = (propertyKey: string, property: GlobalPropertyDefinition) => {
        const { value, isStaged } = getGlobalDisplayValue(propertyKey);
        
        const commonProps = {
            fullWidth: true,
            size: 'small' as const,
            helperText: property.description,
            sx: { mb: 2 },
        };

        switch (property.type) {
            case 'boolean':
                return (
                    <FormControlLabel
                        control={
                            <Switch
                                checked={value === 'true'}
                                onChange={(e) => handlePropertyChange(propertyKey, e.target.checked ? 'true' : 'false')}
                            />
                        }
                        label={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {property.displayName}
                                {isStaged && <Chip label="Modified" color="warning" size="small" />}
                            </Box>
                        }
                        sx={commonProps.sx}
                    />
                );

            case 'select':
                return (
                    <FormControl {...commonProps}>
                        <InputLabel>
                            {property.displayName}
                            {isStaged && <Chip label="Modified" color="warning" size="small" sx={{ ml: 1 }} />}
                        </InputLabel>
                        <Select
                            value={value || property.defaultValue || ''}
                            onChange={(e) => handlePropertyChange(propertyKey, e.target.value)}
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
                        {...commonProps}
                        type="number"
                        label={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {property.displayName}
                                {isStaged && <Chip label="Modified" color="warning" size="small" />}
                            </Box>
                        }
                        value={value || property.defaultValue || ''}
                        onChange={(e) => handlePropertyChange(propertyKey, e.target.value)}
                        inputProps={{
                            min: property.validation?.min,
                            max: property.validation?.max,
                        }}
                    />
                );

            case 'string':
            default:
                return (
                    <TextField
                        {...commonProps}
                        label={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {property.displayName}
                                {isStaged && <Chip label="Modified" color="warning" size="small" />}
                            </Box>
                        }
                        value={value || property.defaultValue || ''}
                        onChange={(e) => handlePropertyChange(propertyKey, e.target.value)}
                    />
                );
        }
    };

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
                Global Scheduler Settings
            </Typography>

            {globalStagedChanges.length > 0 && (
                <Alert severity="info" sx={{ mb: 3 }}>
                    You have {globalStagedChanges.length} unsaved global setting{globalStagedChanges.length !== 1 ? 's' : ''}. 
                    Apply changes to make them active.
                </Alert>
            )}

            {categories.map((category) => {
                const categoryProperties = getGlobalPropertiesByCategory(category);
                const hasChanges = categoryProperties.some(([key]) => globalStagedChanges.some(c => c.property === key));

                return (
                    <Accordion key={category} defaultExpanded>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="h6" sx={{ textTransform: 'capitalize' }}>
                                    {category} Settings
                                </Typography>
                                {hasChanges && <Chip label="Has Changes" size="small" color="warning" />}
                            </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                {categoryProperties.map(([propertyKey, property]) => (
                                    <Box key={propertyKey}>
                                        {renderPropertyInput(propertyKey, property)}
                                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
                                            {property.description}
                                        </Typography>
                                        {categoryProperties.indexOf([propertyKey, property]) < categoryProperties.length - 1 && (
                                            <Divider sx={{ my: 2 }} />
                                        )}
                                    </Box>
                                ))}
                            </Box>
                        </AccordionDetails>
                    </Accordion>
                );
            })}

            {categories.length === 0 && (
                <Card sx={{ mt: 3, border: '1px solid', borderColor: 'divider' }}>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            No Global Properties Available
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Global properties configuration is not available. Please check the configuration setup.
                        </Typography>
                    </CardContent>
                </Card>
            )}
        </Box>
    );
};