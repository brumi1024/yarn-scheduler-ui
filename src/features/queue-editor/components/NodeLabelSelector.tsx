import React, { useMemo } from 'react';
import { FormControl, InputLabel, MenuItem, Box, Chip } from '@mui/material';
import Select from '@mui/material/Select';
import { useDataStore } from '../../../store/dataStore';
import { useUIStore } from '../../../store/uiStore';

export const NodeLabelSelector: React.FC = () => {
    const nodeLabels = useDataStore((state) => state.nodeLabels);
    const selectedNodeLabel = useUIStore((state) => state.selectedNodeLabel);
    const setSelectedNodeLabel = useUIStore((state) => state.setSelectedNodeLabel);

    // Extract available labels from the API response
    const availableLabels = useMemo(() => {
        return nodeLabels?.nodeLabelsInfo?.nodeLabelInfo?.map((label) => label.name) || [];
    }, [nodeLabels]);

    const handleChange = (event: React.ChangeEvent<{ value: unknown }>): void => {
        const value = event.target.value as string;
        setSelectedNodeLabel(value === 'default' ? null : value);
    };

    // Default to "default" label if none selected, or empty string if default not available
    const currentValue = selectedNodeLabel || (availableLabels.includes('default') ? 'default' : '');

    return (
        <Box sx={{ minWidth: 200 }}>
            <FormControl size="small" fullWidth>
                <InputLabel id="node-label-selector-label">Node Label</InputLabel>
                <Select
                    labelId="node-label-selector-label"
                    id="node-label-selector"
                    value={currentValue}
                    label="Node Label"
                    onChange={handleChange}
                    renderValue={(value) => (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip 
                                label={value || 'default'} 
                                size="small" 
                                color={(value === 'default' || !value) ? 'default' : 'primary'} 
                                variant="outlined"
                            />
                        </Box>
                    )}
                >
                    {availableLabels.map((label) => (
                        <MenuItem key={label} value={label}>
                            <Chip 
                                label={label} 
                                size="small" 
                                color={label === 'default' ? 'default' : 'primary'} 
                                variant="outlined"
                            />
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
        </Box>
    );
};