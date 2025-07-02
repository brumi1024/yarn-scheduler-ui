import React, { useState, useMemo } from 'react';
import {
    Box,
    Typography,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    ListItemIcon,
    Chip,
    IconButton,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    FormControlLabel,
    Switch,
    Alert,
} from '@mui/material';
import {
    Label as LabelIcon,
    Add as AddIcon,
    Delete as DeleteIcon,
    Security as SecurityIcon,
} from '@mui/icons-material';
import { useSchedulerStore } from '../../store/schedulerStore';
import { validateLabelName, validateLabelRemoval } from '../../utils/labelValidation';

interface AddLabelDialogProps {
    open: boolean;
    onClose: () => void;
    onConfirm: (name: string, exclusivity: boolean) => void;
    existingLabels: string[];
    isLoading?: boolean;
}

const AddLabelDialog: React.FC<AddLabelDialogProps> = ({ 
    open, 
    onClose, 
    onConfirm, 
    existingLabels,
    isLoading = false
}) => {
    const [name, setName] = useState('');
    const [exclusivity, setExclusivity] = useState(false);
    const [error, setError] = useState('');

    const handleConfirm = () => {
        const validation = validateLabelName(name, existingLabels);
        
        if (!validation.valid) {
            setError(validation.error || 'Invalid label name');
            return;
        }
        
        onConfirm(name.trim(), exclusivity);
        handleClose();
    };

    const handleClose = () => {
        setName('');
        setExclusivity(false);
        setError('');
        onClose();
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>Add New Node Label</DialogTitle>
            <DialogContent>
                <Box sx={{ pt: 1 }}>
                    <TextField
                        fullWidth
                        label="Label Name"
                        value={name}
                        onChange={(e) => {
                            setName(e.target.value);
                            setError('');
                        }}
                        error={!!error}
                        helperText={error || 'Use letters, numbers, hyphens, and underscores only'}
                        autoFocus
                        margin="normal"
                        placeholder="e.g., gpu, highmem, ssd"
                    />
                    
                    <FormControlLabel
                        control={
                            <Switch 
                                checked={exclusivity} 
                                onChange={(e) => setExclusivity(e.target.checked)} 
                            />
                        }
                        label="Exclusive Label"
                        sx={{ mt: 2, display: 'block' }}
                    />
                    
                    <Alert severity="info" sx={{ mt: 2 }}>
                        <Typography variant="body2">
                            <strong>Exclusive labels:</strong> Only containers specifically requesting this label 
                            can run on nodes with this label. 
                            <br />
                            <strong>Non-exclusive labels:</strong> Any container can run on these nodes.
                        </Typography>
                    </Alert>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button 
                    onClick={handleClose} 
                    disabled={isLoading}
                    sx={{
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: 500,
                    }}
                >
                    Cancel
                </Button>
                <Button 
                    onClick={handleConfirm} 
                    variant="contained" 
                    disabled={isLoading}
                    sx={{
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: 600,
                        boxShadow: 2,
                        '&:hover': {
                            boxShadow: 4,
                        },
                    }}
                >
                    Add Label
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export const NodeLabelsPanel: React.FC = () => {
    const nodeLabels = useSchedulerStore(state => state.nodeLabels);
    const selectedNodeLabel = useSchedulerStore(state => state.selectedNodeLabel);
    const selectNodeLabel = useSchedulerStore(state => state.selectNodeLabel);
    const addNodeLabel = useSchedulerStore(state => state.addNodeLabel);
    const removeNodeLabel = useSchedulerStore(state => state.removeNodeLabel);
    const isLoading = useSchedulerStore(state => state.isLoading);

    const [addDialogOpen, setAddDialogOpen] = useState(false);

    const handleAddLabel = async (name: string, exclusivity: boolean) => {
        try {
            await addNodeLabel(name, exclusivity);
        } catch (error) {
            console.error('Failed to add node label:', error);
            // Error is already set in the store, will be displayed by parent component
        }
    };

    const handleRemoveLabel = async (labelName: string) => {
        try {
            // Get nodeToLabels from store to create nodeAssignments Map for validation
            const nodeToLabels = useSchedulerStore.getState().nodeToLabels;
            const nodeAssignments = new Map<string, string[]>();
            
            // Convert nodeToLabels object to Map format expected by validation
            Object.entries(nodeToLabels || {}).forEach(([nodeId, labels]) => {
                nodeAssignments.set(nodeId, labels);
            });
            
            // Validate that the label can be safely removed
            const validation = validateLabelRemoval(labelName, nodeAssignments);
            
            if (!validation.valid) {
                // Show error message through the store error system
                const setError = useSchedulerStore.getState().setError;
                setError(validation.error || 'Cannot remove label');
                return;
            }
            
            await removeNodeLabel(labelName);
        } catch (error) {
            console.error('Failed to remove node label:', error);
            // Error is already set in the store, will be displayed by parent component
        }
    };

    const handleLabelSelect = (labelName: string) => {
        selectNodeLabel(labelName === selectedNodeLabel ? null : labelName);
    };

    const existingLabelNames = useMemo(() => {
        return nodeLabels.map(label => label.name);
    }, [nodeLabels]);

    return (
        <Box>
            {/* Add Label Button */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">
                    {nodeLabels.length} label{nodeLabels.length !== 1 ? 's' : ''} available
                </Typography>
                <Button
                    variant="outlined"
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => setAddDialogOpen(true)}
                    disabled={isLoading}
                    sx={{
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: 500,
                        '&:hover': {
                            borderWidth: 2,
                        },
                    }}
                >
                    Add
                </Button>
            </Box>

            {/* Labels List */}
            <List dense>
                {nodeLabels.map((label) => {
                    const isSelected = selectedNodeLabel === label.name;
                    
                    return (
                        <ListItem
                            key={label.name}
                            disablePadding
                            secondaryAction={
                                <Tooltip title="Remove label">
                                    <IconButton
                                        edge="end"
                                        size="small"
                                        onClick={() => handleRemoveLabel(label.name)}
                                        color="error"
                                        disabled={isLoading}
                                    >
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            }
                        >
                            <ListItemButton
                                selected={isSelected}
                                onClick={() => handleLabelSelect(label.name)}
                                sx={{
                                    borderRadius: 1,
                                    mb: 0.5,
                                }}
                            >
                                <ListItemIcon sx={{ minWidth: 32 }}>
                                    {label.exclusivity ? (
                                        <SecurityIcon color="warning" fontSize="small" />
                                    ) : (
                                        <LabelIcon color="primary" fontSize="small" />
                                    )}
                                </ListItemIcon>
                                
                                <ListItemText
                                    primary={
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Typography variant="body2" fontWeight={isSelected ? 600 : 400}>
                                                {label.name}
                                            </Typography>
                                            
                                            {label.exclusivity && (
                                                <Chip 
                                                    label="Exclusive" 
                                                    size="small" 
                                                    color="warning"
                                                    variant="outlined"
                                                />
                                            )}
                                        </Box>
                                    }
                                    secondary={undefined}
                                />
                            </ListItemButton>
                        </ListItem>
                    );
                })}
                
                {nodeLabels.length === 0 && (
                    <ListItem>
                        <ListItemText
                            primary={
                                <Typography variant="body2" color="text.secondary" align="center">
                                    No node labels found
                                </Typography>
                            }
                            secondary={
                                <Typography variant="caption" color="text.secondary" align="center">
                                    Click 'Add' to create the first label
                                </Typography>
                            }
                        />
                    </ListItem>
                )}
            </List>

            <AddLabelDialog
                open={addDialogOpen}
                onClose={() => setAddDialogOpen(false)}
                onConfirm={handleAddLabel}
                existingLabels={existingLabelNames}
                isLoading={isLoading}
            />
        </Box>
    );
};