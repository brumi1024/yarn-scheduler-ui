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
import { globalPropertyDefinitions } from '../../config/propertyDefinitions';
import type { PropertyDescriptor } from '../../types/property-descriptor';


export const GlobalSettings: React.FC = () => {
    const getGlobalDisplayValue = useSchedulerStore(state => state.getGlobalDisplayValue);
    const stageGlobalChange = useSchedulerStore(state => state.stageGlobalChange);
    const stagedChanges = useSchedulerStore(state => state.stagedChanges);

    // Create category management functions for V4 properties
    const getGlobalPropertyCategories = () => {
        const categories = new Set(globalPropertyDefinitions.map(prop => prop.category));
        return Array.from(categories).sort();
    };

    const getGlobalPropertiesByCategory = (category: string) => {
        return globalPropertyDefinitions.filter(prop => prop.category === category);
    };

    const categories = getGlobalPropertyCategories();
    const globalStagedChanges = stagedChanges.filter(c => c.queuePath === 'global');

    const handlePropertyChange = (propertyKey: string, value: string) => {
        stageGlobalChange(propertyKey, value);
    };

    const renderPropertyInput = (property: PropertyDescriptor) => {
        const { value, isStaged } = getGlobalDisplayValue(property.name);
        
        const commonProps = {
            fullWidth: true,
            size: 'small' as const,
            sx: { mb: 2 },
        };

        const commonTextFieldProps = {
            ...commonProps,
            helperText: property.description,
        };

        // Extract validation rules for min/max
        const rangeValidation = property.validationRules?.find(rule => rule.type === 'range');

        switch (property.type) {
            case 'boolean':
                return (
                    <FormControlLabel
                        control={
                            <Switch
                                checked={value === 'true'}
                                onChange={(e) => handlePropertyChange(property.name, e.target.checked ? 'true' : 'false')}
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

            case 'enum':
                return (
                    <Box sx={commonProps.sx}>
                        <FormControl {...commonProps} sx={{ mb: 0 }}>
                            <InputLabel>{property.displayName}</InputLabel>
                            <Select
                                value={value || property.defaultValue || ''}
                                onChange={(e) => handlePropertyChange(property.name, e.target.value)}
                                label={property.displayName}
                                endAdornment={isStaged && <Chip label="Modified" color="warning" size="small" sx={{ mr: 1 }} />}
                            >
                                {property.enumValues?.map((enumValue) => (
                                    <MenuItem key={enumValue} value={enumValue}>
                                        {enumValue}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                            {property.description}
                        </Typography>
                    </Box>
                );

            case 'number':
                return (
                    <TextField
                        {...commonTextFieldProps}
                        type="number"
                        label={property.displayName}
                        value={value || property.defaultValue || ''}
                        onChange={(e) => handlePropertyChange(property.name, e.target.value)}
                        inputProps={{
                            min: rangeValidation?.min,
                            max: rangeValidation?.max,
                        }}
                        InputLabelProps={{
                            shrink: true
                        }}
                        InputProps={{
                            endAdornment: isStaged && <Chip label="Modified" color="warning" size="small" />
                        }}
                    />
                );

            case 'string':
            default:
                return (
                    <TextField
                        {...commonTextFieldProps}
                        label={property.displayName}
                        value={value || property.defaultValue || ''}
                        onChange={(e) => handlePropertyChange(property.name, e.target.value)}
                        InputLabelProps={{
                            shrink: true
                        }}
                        InputProps={{
                            endAdornment: isStaged && <Chip label="Modified" color="warning" size="small" />
                        }}
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
                const hasChanges = categoryProperties.some(property => globalStagedChanges.some(c => c.property === property.name));

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
                                {categoryProperties.map((property, index) => (
                                    <Box key={property.name}>
                                        {renderPropertyInput(property)}
                                        {index < categoryProperties.length - 1 && (
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