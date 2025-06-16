import React, { useState, useMemo } from 'react';
import { useFormContext } from 'react-hook-form';
import {
    Box,
    Typography,
    Chip,
    TextField,
    Alert,
    Autocomplete,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tooltip,
} from '@mui/material';
import {
    Info as InfoIcon,
} from '@mui/icons-material';
import { useDataStore } from '../../store/dataStore';
import { getCapacityMode } from '../../utils/capacity';
import type { Queue } from '../../types/Queue';

interface NodeLabelsSectionProps {
    queue: Queue;
}

interface NodeLabelCapacity {
    label: string;
    capacity: string;
    maximumCapacity?: string;
}

export const NodeLabelsSection: React.FC<NodeLabelsSectionProps> = ({ queue }) => {
    const { nodeLabels } = useDataStore();
    const { watch, setValue } = useFormContext();
    
    const availableLabels = useMemo(() => {
        return nodeLabels?.nodeLabelsInfo?.nodeLabelInfo?.map(label => label.name) || [];
    }, [nodeLabels]);

    // Watch the accessible node labels field
    const accessibleNodeLabels = useMemo(() => watch('accessible-node-labels') || [], [watch]);
    
    // Get existing node label capacities from queue configuration
    const existingNodeLabelCapacities = useMemo(() => {
        const capacities: NodeLabelCapacity[] = [];
        
        // Look for properties like yarn.scheduler.capacity.root.default.accessible-node-labels.GPU.capacity
        // Note: queue.queuePath is for future use when integrating with actual config
        availableLabels.forEach(labelName => {
            // Check if this queue has capacity defined for this label
            // This would come from the configuration data
            // For now, we'll use default values if the label is in accessibleNodeLabels
            if (accessibleNodeLabels.includes(labelName)) {
                capacities.push({
                    label: labelName,
                    capacity: '0%', // Default capacity
                    maximumCapacity: '100%', // Default max capacity
                });
            }
        });
        
        return capacities;
    }, [availableLabels, accessibleNodeLabels, queue.queuePath]);

    const [nodeLabelCapacities, setNodeLabelCapacities] = useState<NodeLabelCapacity[]>(existingNodeLabelCapacities);

    const handleAccessibleLabelsChange = (newLabels: string[]) => {
        setValue('accessible-node-labels', newLabels, { shouldDirty: true });
        
        // Update node label capacities based on selected labels
        const updatedCapacities = newLabels.map(labelName => {
            const existing = nodeLabelCapacities.find(cap => cap.label === labelName);
            return existing || {
                label: labelName,
                capacity: '0%',
                maximumCapacity: '100%',
            };
        });
        
        setNodeLabelCapacities(updatedCapacities);
        
        // Update form values for each label's capacity
        updatedCapacities.forEach(({ label, capacity, maximumCapacity }) => {
            setValue(`accessible-node-labels.${label}.capacity`, capacity, { shouldDirty: true });
            if (maximumCapacity) {
                setValue(`accessible-node-labels.${label}.maximum-capacity`, maximumCapacity, { shouldDirty: true });
            }
        });
    };

    const handleCapacityChange = (labelName: string, field: 'capacity' | 'maximumCapacity', value: string) => {
        setNodeLabelCapacities(prev => 
            prev.map(cap => 
                cap.label === labelName 
                    ? { ...cap, [field]: value }
                    : cap
            )
        );
        
        // Update form value
        const formKey = field === 'capacity' 
            ? `accessible-node-labels.${labelName}.capacity`
            : `accessible-node-labels.${labelName}.maximum-capacity`;
        setValue(formKey, value, { shouldDirty: true });
    };

    const getCapacityModeForLabel = (capacity: string) => {
        return getCapacityMode(capacity);
    };

    const renderCapacityInput = (labelCapacity: NodeLabelCapacity, field: 'capacity' | 'maximumCapacity') => {
        const value = field === 'capacity' ? labelCapacity.capacity : labelCapacity.maximumCapacity || '';
        const mode = getCapacityModeForLabel(value);
        
        return (
            <TextField
                size="small"
                value={value}
                onChange={(e) => handleCapacityChange(labelCapacity.label, field, e.target.value)}
                placeholder={field === 'capacity' ? '10%' : '100%'}
                helperText={`Mode: ${mode}`}
                sx={{ minWidth: 120 }}
            />
        );
    };

    if (!nodeLabels || availableLabels.length === 0) {
        return (
            <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                    No node labels are available in the cluster. 
                    Node labels must be created and assigned to nodes before they can be used by queues.
                </Typography>
            </Alert>
        );
    }

    return (
        <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Configure which node labels this queue can access and specify capacity allocations for each label.
            </Typography>

            {/* Accessible Node Labels Selection */}
            <FormControl fullWidth sx={{ mb: 3 }}>
                <Autocomplete
                    multiple
                    options={availableLabels}
                    value={accessibleNodeLabels}
                    onChange={(_, newValue) => handleAccessibleLabelsChange(newValue)}
                    renderTags={(value, getTagProps) =>
                        value.map((option, index) => (
                            <Chip
                                variant="outlined"
                                label={option}
                                {...getTagProps({ index })}
                                key={option}
                            />
                        ))
                    }
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label="Accessible Node Labels"
                            placeholder="Select node labels this queue can use"
                            helperText="Choose which node labels this queue is allowed to request containers on"
                        />
                    )}
                />
            </FormControl>

            {/* Node Label Capacities Table */}
            {nodeLabelCapacities.length > 0 && (
                <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                        Node Label Capacities
                        <Tooltip title="Define capacity allocations for each accessible node label. These capacities work independently of the default queue capacity.">
                            <InfoIcon fontSize="small" color="action" />
                        </Tooltip>
                    </Typography>
                    
                    <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                        <Table size="small" stickyHeader>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Node Label</TableCell>
                                    <TableCell>Capacity</TableCell>
                                    <TableCell>Maximum Capacity</TableCell>
                                    <TableCell>Info</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {nodeLabelCapacities.map((labelCapacity) => {
                                    const labelInfo = nodeLabels?.nodeLabelsInfo?.nodeLabelInfo?.find(
                                        label => label.name === labelCapacity.label
                                    );
                                    
                                    return (
                                        <TableRow key={labelCapacity.label}>
                                            <TableCell>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Typography variant="body2" fontWeight="medium">
                                                        {labelCapacity.label}
                                                    </Typography>
                                                    {labelInfo?.exclusivity && (
                                                        <Chip label="Exclusive" size="small" color="warning" />
                                                    )}
                                                </Box>
                                            </TableCell>
                                            <TableCell>
                                                {renderCapacityInput(labelCapacity, 'capacity')}
                                            </TableCell>
                                            <TableCell>
                                                {renderCapacityInput(labelCapacity, 'maximumCapacity')}
                                            </TableCell>
                                            <TableCell>
                                                {labelInfo?.partitionInfo && (
                                                    <Typography variant="caption" color="text.secondary">
                                                        Available: {labelInfo.partitionInfo.resourceAvailable.memory}MB, 
                                                        {labelInfo.partitionInfo.resourceAvailable.vCores} cores
                                                    </Typography>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Box>
            )}

            {accessibleNodeLabels.length === 0 && (
                <Alert severity="info" sx={{ mt: 1 }}>
                    <Typography variant="body2">
                        Select node labels above to configure capacity allocations for this queue.
                    </Typography>
                </Alert>
            )}
        </Box>
    );
};