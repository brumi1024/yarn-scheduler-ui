import React, { useState, useMemo } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Grid,
    Chip,
    Button,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormControlLabel,
    Switch,
    Checkbox,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    ListItemSecondaryAction,
    Divider,
    Alert,
    CircularProgress,
    Tooltip,
    Badge,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TableSortLabel,
    Fab,
    Snackbar,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
} from '@mui/material';
import {
    Add as AddIcon,
    Delete as DeleteIcon,
    Edit as EditIcon,
    Save as SaveIcon,
    Cancel as CancelIcon,
    Label as LabelIcon,
    Computer as ComputerIcon,
    Warning as WarningIcon,
    Check as CheckIcon,
} from '@mui/icons-material';
import { useDataStore } from '../store/dataStore';
import { useNodeLabelStore } from '../store/nodeLabelStore';
import type { NodeLabel, ClusterNode } from '../types/NodeLabel';

interface AddLabelDialogProps {
    open: boolean;
    onClose: () => void;
    onConfirm: (name: string, exclusivity: boolean) => void;
    existingLabels: string[];
}

const AddLabelDialog: React.FC<AddLabelDialogProps> = ({ open, onClose, onConfirm, existingLabels }) => {
    const [name, setName] = useState('');
    const [exclusivity, setExclusivity] = useState(false);
    const [error, setError] = useState('');

    const handleConfirm = () => {
        if (!name.trim()) {
            setError('Label name is required');
            return;
        }
        if (existingLabels.includes(name.trim())) {
            setError('Label already exists');
            return;
        }
        onConfirm(name.trim(), exclusivity);
        setName('');
        setExclusivity(false);
        setError('');
        onClose();
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
                        helperText={error}
                        autoFocus
                        margin="normal"
                    />
                    <FormControlLabel
                        control={
                            <Switch
                                checked={exclusivity}
                                onChange={(e) => setExclusivity(e.target.checked)}
                            />
                        }
                        label="Exclusive Label"
                        sx={{ mt: 2 }}
                    />
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Exclusive labels ensure that only containers requesting this label can run on nodes with this label.
                    </Typography>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>Cancel</Button>
                <Button onClick={handleConfirm} variant="contained">Add Label</Button>
            </DialogActions>
        </Dialog>
    );
};

const NodeLabelsPanel: React.FC = () => {
    const { nodeLabels } = useDataStore();
    const {
        pendingNewLabels,
        pendingLabelRemovals,
        selectedLabels,
        stageNewLabel,
        unstageNewLabel,
        stageLabelRemoval,
        unstageLabelRemoval,
        selectLabel,
        deselectLabel,
    } = useNodeLabelStore();

    const [addDialogOpen, setAddDialogOpen] = useState(false);

    const labels = useMemo(() => {
        const current = nodeLabels?.nodeLabelsInfo?.nodeLabelInfo || [];
        const pending = pendingNewLabels || [];
        const removing = pendingLabelRemovals || [];
        
        // Combine current and pending new labels, exclude those being removed
        const allLabels = [
            ...current.filter(label => !removing.includes(label.name)),
            ...pending.map(label => ({ ...label, isPending: true })),
        ];
        
        return allLabels;
    }, [nodeLabels, pendingNewLabels, pendingLabelRemovals]);

    const handleAddLabel = (name: string, exclusivity: boolean) => {
        stageNewLabel(name, exclusivity);
    };

    const handleRemoveLabel = (labelName: string) => {
        if (pendingNewLabels.some(label => label.name === labelName)) {
            unstageNewLabel(labelName);
        } else {
            stageLabelRemoval(labelName);
        }
    };

    const handleUndoRemoval = (labelName: string) => {
        unstageLabelRemoval(labelName);
    };

    const handleLabelSelect = (labelName: string, checked: boolean) => {
        if (checked) {
            selectLabel(labelName);
        } else {
            deselectLabel(labelName);
        }
    };

    const existingLabelNames = useMemo(() => {
        return labels.map(label => label.name);
    }, [labels]);

    return (
        <Card sx={{ height: '100%' }}>
            <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Box>
                        <Typography variant="h6" component="div">
                            <LabelIcon sx={{ mr: 1, verticalAlign: 'bottom' }} />
                            Node Labels ({labels.length})
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Select labels for bulk assignment
                        </Typography>
                    </Box>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => setAddDialogOpen(true)}
                        size="small"
                    >
                        Add Label
                    </Button>
                </Box>

                <List dense>
                    {labels.map((label) => {
                        const isSelected = selectedLabels.has(label.name);
                        const isPending = 'isPending' in label && label.isPending;
                        const isRemoving = pendingLabelRemovals.includes(label.name);

                        return (
                            <ListItem
                                key={label.name}
                                sx={{
                                    bgcolor: isSelected ? 'action.selected' : 'transparent',
                                    opacity: isRemoving ? 0.5 : 1,
                                    textDecoration: isRemoving ? 'line-through' : 'none',
                                }}
                            >
                                <ListItemIcon>
                                    <Checkbox
                                        checked={isSelected}
                                        onChange={(e) => handleLabelSelect(label.name, e.target.checked)}
                                        disabled={isRemoving}
                                    />
                                </ListItemIcon>
                                <ListItemText
                                    primary={
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Typography variant="body2">{label.name}</Typography>
                                            {label.exclusivity && (
                                                <Chip label="Exclusive" size="small" color="warning" />
                                            )}
                                            {isPending && (
                                                <Chip label="New" size="small" color="success" />
                                            )}
                                            {isRemoving && (
                                                <Chip label="Removing" size="small" color="error" />
                                            )}
                                        </Box>
                                    }
                                    secondary={
                                        'partitionInfo' in label && label.partitionInfo
                                            ? `Resources: ${label.partitionInfo.resourceAvailable.memory}MB, ${label.partitionInfo.resourceAvailable.vCores} cores`
                                            : undefined
                                    }
                                />
                                <ListItemSecondaryAction>
                                    {isRemoving ? (
                                        <Tooltip title="Undo removal">
                                            <IconButton
                                                size="small"
                                                onClick={() => handleUndoRemoval(label.name)}
                                            >
                                                <CheckIcon />
                                            </IconButton>
                                        </Tooltip>
                                    ) : (
                                        <Tooltip title="Remove label">
                                            <IconButton
                                                size="small"
                                                onClick={() => handleRemoveLabel(label.name)}
                                                color="error"
                                            >
                                                <DeleteIcon />
                                            </IconButton>
                                        </Tooltip>
                                    )}
                                </ListItemSecondaryAction>
                            </ListItem>
                        );
                    })}
                    {labels.length === 0 && (
                        <ListItem>
                            <ListItemText
                                primary="No node labels found"
                                secondary="Click 'Add Label' to create the first label"
                            />
                        </ListItem>
                    )}
                </List>
            </CardContent>

            <AddLabelDialog
                open={addDialogOpen}
                onClose={() => setAddDialogOpen(false)}
                onConfirm={handleAddLabel}
                existingLabels={existingLabelNames}
            />
        </Card>
    );
};

const NodesPanel: React.FC = () => {
    const { nodes } = useDataStore();
    const {
        pendingNodeChanges,
        selectedNodes,
        selectedLabels,
        selectNode,
        deselectNode,
        stageLabelChange,
        getNodePendingLabels,
        bulkAssignLabel,
        bulkRemoveLabels,
    } = useNodeLabelStore();

    const [sortField, setSortField] = useState<keyof ClusterNode>('id');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    const clusterNodes = useMemo(() => {
        return nodes?.nodes?.node || [];
    }, [nodes]);

    const sortedNodes = useMemo(() => {
        return [...clusterNodes].sort((a, b) => {
            const aVal = a[sortField];
            const bVal = b[sortField];
            const direction = sortDirection === 'asc' ? 1 : -1;
            
            if (typeof aVal === 'string' && typeof bVal === 'string') {
                return aVal.localeCompare(bVal) * direction;
            }
            if (typeof aVal === 'number' && typeof bVal === 'number') {
                return (aVal - bVal) * direction;
            }
            return 0;
        });
    }, [clusterNodes, sortField, sortDirection]);

    const handleSort = (field: keyof ClusterNode) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const handleNodeSelect = (nodeId: string, checked: boolean) => {
        if (checked) {
            selectNode(nodeId);
        } else {
            deselectNode(nodeId);
        }
    };

    const handleLabelChange = (nodeId: string, labelName: string, currentLabels: string[]) => {
        // Since each node can only have one label, replace the current label
        const newLabels = labelName === '' ? [] : [labelName];
        stageLabelChange(nodeId, currentLabels, newLabels);
    };

    const handleBulkAssign = () => {
        if (selectedNodes.size === 0 || selectedLabels.size === 0) return;
        // For single label assignment, only use the first selected label
        const labelToAssign = Array.from(selectedLabels)[0];
        bulkAssignLabel(Array.from(selectedNodes), labelToAssign);
    };

    const handleBulkRemove = () => {
        if (selectedNodes.size === 0) return;
        // Remove all labels from selected nodes
        bulkRemoveLabels(Array.from(selectedNodes));
    };

    const getNodeLabels = (node: ClusterNode) => {
        return getNodePendingLabels(node.id, node.nodeLabels || []);
    };

    const hasNodeChanges = (nodeId: string) => {
        return pendingNodeChanges.has(nodeId);
    };

    const availableLabels = useMemo(() => {
        const { nodeLabels } = useDataStore.getState();
        return nodeLabels?.nodeLabelsInfo?.nodeLabelInfo?.map(label => label.name) || [];
    }, []);

    return (
        <Card sx={{ height: '100%' }}>
            <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" component="div">
                        <ComputerIcon sx={{ mr: 1, verticalAlign: 'bottom' }} />
                        Cluster Nodes ({clusterNodes.length})
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Badge badgeContent={selectedNodes.size} color="primary">
                            <Tooltip title={selectedLabels.size > 1 ? "Only the first selected label will be assigned" : ""}>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={handleBulkAssign}
                                    disabled={selectedNodes.size === 0 || selectedLabels.size === 0}
                                >
                                    Assign Label
                                </Button>
                            </Tooltip>
                        </Badge>
                        <Badge badgeContent={selectedNodes.size} color="primary">
                            <Button
                                variant="outlined"
                                size="small"
                                onClick={handleBulkRemove}
                                disabled={selectedNodes.size === 0}
                            >
                                Remove Labels
                            </Button>
                        </Badge>
                    </Box>
                </Box>

                <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
                    <Table stickyHeader size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell padding="checkbox">
                                    <Checkbox
                                        indeterminate={selectedNodes.size > 0 && selectedNodes.size < clusterNodes.length}
                                        checked={clusterNodes.length > 0 && selectedNodes.size === clusterNodes.length}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                clusterNodes.forEach(node => selectNode(node.id));
                                            } else {
                                                clusterNodes.forEach(node => deselectNode(node.id));
                                            }
                                        }}
                                    />
                                </TableCell>
                                <TableCell>
                                    <TableSortLabel
                                        active={sortField === 'id'}
                                        direction={sortField === 'id' ? sortDirection : 'asc'}
                                        onClick={() => handleSort('id')}
                                    >
                                        Node ID
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell>
                                    <TableSortLabel
                                        active={sortField === 'state'}
                                        direction={sortField === 'state' ? sortDirection : 'asc'}
                                        onClick={() => handleSort('state')}
                                    >
                                        State
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell>Labels</TableCell>
                                <TableCell>Resources</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {sortedNodes.map((node) => {
                                const isSelected = selectedNodes.has(node.id);
                                const nodeLabels = getNodeLabels(node);
                                const hasChanges = hasNodeChanges(node.id);

                                return (
                                    <TableRow
                                        key={node.id}
                                        selected={isSelected}
                                        sx={{
                                            bgcolor: hasChanges ? 'action.hover' : 'transparent',
                                        }}
                                    >
                                        <TableCell padding="checkbox">
                                            <Checkbox
                                                checked={isSelected}
                                                onChange={(e) => handleNodeSelect(node.id, e.target.checked)}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Typography variant="body2">
                                                    {node.nodeHostName || node.id}
                                                </Typography>
                                                {hasChanges && (
                                                    <Chip label="Modified" size="small" color="info" />
                                                )}
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={node.state}
                                                size="small"
                                                color={node.state === 'RUNNING' ? 'success' : 'default'}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <FormControl size="small" sx={{ minWidth: 120 }}>
                                                <Select
                                                    value={nodeLabels.length > 0 ? nodeLabels[0] : ''}
                                                    onChange={(e) => handleLabelChange(
                                                        node.id,
                                                        e.target.value as string,
                                                        node.nodeLabels || []
                                                    )}
                                                    displayEmpty
                                                    variant="outlined"
                                                >
                                                    <MenuItem value="">
                                                        <em>No label</em>
                                                    </MenuItem>
                                                    {availableLabels.map((labelName) => (
                                                        <MenuItem key={labelName} value={labelName}>
                                                            {labelName}
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>
                                            {nodeLabels.length > 1 && (
                                                <Typography variant="caption" color="warning.main" sx={{ ml: 1 }}>
                                                    Multiple labels detected
                                                </Typography>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">
                                                {Math.round(node.usedMemoryMB)}/{Math.round(node.usedMemoryMB + node.availMemoryMB)}MB,{' '}
                                                {node.usedVirtualCores}/{node.usedVirtualCores + node.availableVirtualCores} cores
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                            {clusterNodes.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} align="center">
                                        <Typography color="text.secondary">
                                            No nodes found
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </CardContent>
        </Card>
    );
};

export const NodeLabels: React.FC = () => {
    const { loading, errors } = useDataStore();
    const {
        isLoading,
        error,
        hasChanges,
        getChangesSummary,
        applyChanges,
        clearAllChanges,
    } = useNodeLabelStore();

    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

    const changesSummary = getChangesSummary();
    const isLoadingData = loading.nodeLabels || loading.nodes;

    const handleApplyChanges = async () => {
        try {
            await applyChanges();
            setSnackbarMessage('Changes applied successfully');
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
            
            // Refresh data to get latest state
            const { refresh } = useDataStore.getState();
            await refresh();
        } catch (err) {
            setSnackbarMessage(err instanceof Error ? err.message : 'Failed to apply changes');
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        }
    };

    const handleClearChanges = () => {
        clearAllChanges();
        setSnackbarMessage('All changes cleared');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
    };

    if (isLoadingData) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (errors.nodeLabels || errors.nodes) {
        return (
            <Alert severity="error" sx={{ m: 2 }}>
                Failed to load node labels or nodes data: {errors.nodeLabels?.message || errors.nodes?.message}
            </Alert>
        );
    }

    return (
        <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', p: 2 }}>
            <Typography variant="h4" component="h1" gutterBottom>
                Node Labels Management
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Each node can be assigned to exactly one label. Use the dropdown in the Labels column to assign or change a node's label.
            </Typography>

            {(error || hasChanges()) && (
                <Box sx={{ mb: 2 }}>
                    {error && (
                        <Alert severity="error" sx={{ mb: 1 }}>
                            {error.message}
                        </Alert>
                    )}
                    {hasChanges() && (
                        <Alert 
                            severity="info" 
                            sx={{ mb: 1 }}
                            action={
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    <Button
                                        color="inherit"
                                        size="small"
                                        onClick={handleClearChanges}
                                        disabled={isLoading}
                                    >
                                        Clear All
                                    </Button>
                                    <Button
                                        color="inherit"
                                        size="small"
                                        onClick={handleApplyChanges}
                                        disabled={isLoading}
                                        startIcon={isLoading ? <CircularProgress size={16} /> : <SaveIcon />}
                                    >
                                        Apply Changes
                                    </Button>
                                </Box>
                            }
                        >
                            {changesSummary.nodeChanges > 0 && `${changesSummary.nodeChanges} node(s) modified`}
                            {changesSummary.newLabels > 0 && `, ${changesSummary.newLabels} label(s) to add`}
                            {changesSummary.removedLabels > 0 && `, ${changesSummary.removedLabels} label(s) to remove`}
                        </Alert>
                    )}
                </Box>
            )}

            <Grid container spacing={2} sx={{ flexGrow: 1, minHeight: 0 }}>
                <Grid item xs={12} md={4}>
                    <NodeLabelsPanel />
                </Grid>
                <Grid item xs={12} md={8}>
                    <NodesPanel />
                </Grid>
            </Grid>

            <Snackbar
                open={snackbarOpen}
                autoHideDuration={6000}
                onClose={() => setSnackbarOpen(false)}
            >
                <Alert
                    onClose={() => setSnackbarOpen(false)}
                    severity={snackbarSeverity}
                    sx={{ width: '100%' }}
                >
                    {snackbarMessage}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default NodeLabels;
