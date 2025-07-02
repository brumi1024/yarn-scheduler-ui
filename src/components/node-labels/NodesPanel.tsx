import React, { useMemo } from 'react';
import {
    Box,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Chip,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Tooltip,
    IconButton,
    LinearProgress,
} from '@mui/material';
import {
    Computer as ComputerIcon,
    Memory as MemoryIcon,
    Speed as SpeedIcon,
    Clear as ClearIcon,
} from '@mui/icons-material';
import { useSchedulerStore } from '../../store/schedulerStore';
import type { NodeInfo, NodeToLabelMapping } from '../../types';
import { formatMemory } from '../../utils/formatUtils';


interface NodesPanelProps {
    selectedLabel: string | null;
}

export const NodesPanel: React.FC<NodesPanelProps> = ({ selectedLabel }) => {
    const nodes = useSchedulerStore(state => state.nodes);
    const nodeToLabels = useSchedulerStore(state => state.nodeToLabels);
    const nodeLabels = useSchedulerStore(state => state.nodeLabels);
    const assignNodeToLabel = useSchedulerStore(state => state.assignNodeToLabel);
    const isLoading = useSchedulerStore(state => state.isLoading);

    // Create a map of nodeId -> labels for quick lookup
    const nodeLabelsMap = useMemo(() => {
        const map = new Map<string, string[]>();
        nodeToLabels.forEach((mapping: NodeToLabelMapping) => {
            map.set(mapping.nodeId, mapping.nodeLabels);
        });
        return map;
    }, [nodeToLabels]);

    // Filter nodes based on selected label
    const filteredNodes = useMemo(() => {
        if (!selectedLabel) {
            // When no label is selected, show all nodes (this is the "overview" mode)
            return nodes;
        }
        
        return nodes.filter((node: NodeInfo) => {
            const assignedLabels = nodeLabelsMap.get(node.id) || [];
            return assignedLabels.includes(selectedLabel);
        });
    }, [nodes, nodeLabelsMap, selectedLabel]);

    const handleLabelChange = async (nodeId: string, newLabel: string | null) => {
        try {
            await assignNodeToLabel(nodeId, newLabel);
        } catch (error) {
            console.error('Failed to assign node to label:', error);
        }
    };

    const getUtilizationColor = (used: number, total: number): 'primary' | 'warning' | 'error' => {
        const percentage = (used / total) * 100;
        if (percentage < 70) return 'primary';
        if (percentage < 90) return 'warning';
        return 'error';
    };

    const getNodeStateColor = (state: string): 'default' | 'success' | 'error' | 'warning' => {
        switch (state) {
            case 'RUNNING': return 'success';
            case 'UNHEALTHY': return 'error';
            case 'SHUTDOWN': return 'warning';
            default: return 'default';
        }
    };

    if (nodes.length === 0) {
        return (
            <Box sx={{ p: 2, textAlign: 'center' }}>
                <ComputerIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                <Typography variant="body2" color="text.secondary">
                    No cluster nodes found
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    Node information will appear here when available
                </Typography>
            </Box>
        );
    }

    return (
        <Box>
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle2" color="text.secondary">
                    {selectedLabel ? (
                        <>Nodes with label: <strong>{selectedLabel}</strong> ({filteredNodes.length})</>
                    ) : (
                        <>All cluster nodes ({nodes.length}) - showing default partition and labeled nodes</>
                    )}
                </Typography>
            </Box>

            <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
                <Table stickyHeader size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Node</TableCell>
                            <TableCell>State</TableCell>
                            <TableCell>Labels</TableCell>
                            <TableCell>Memory</TableCell>
                            <TableCell>Cores</TableCell>
                            <TableCell>Containers</TableCell>
                            <TableCell>Action</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredNodes.map((node: NodeInfo) => {
                            const assignedLabels = nodeLabelsMap.get(node.id) || [];
                            const memoryUsedPercent = (node.usedMemoryMB / (node.usedMemoryMB + node.availMemoryMB)) * 100;
                            const coresUsedPercent = (node.usedVirtualCores / (node.usedVirtualCores + node.availableVirtualCores)) * 100;

                            return (
                                <TableRow key={node.id} hover>
                                    <TableCell>
                                        <Box>
                                            <Typography variant="body2" fontWeight={500}>
                                                {node.nodeHostName}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {node.rack}
                                            </Typography>
                                        </Box>
                                    </TableCell>
                                    
                                    <TableCell>
                                        <Chip 
                                            label={node.state} 
                                            size="small"
                                            color={getNodeStateColor(node.state)}
                                            variant="outlined"
                                        />
                                    </TableCell>
                                    
                                    <TableCell>
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                            {assignedLabels.length > 0 ? (
                                                assignedLabels.map((label) => (
                                                    <Chip
                                                        key={label}
                                                        label={label}
                                                        size="small"
                                                        color={label === selectedLabel ? 'primary' : 'default'}
                                                        variant={label === selectedLabel ? 'filled' : 'outlined'}
                                                    />
                                                ))
                                            ) : (
                                                <Chip
                                                    label="Default"
                                                    size="small"
                                                    color={selectedLabel === null ? 'primary' : 'default'}
                                                    variant={selectedLabel === null ? 'filled' : 'outlined'}
                                                />
                                            )}
                                        </Box>
                                    </TableCell>
                                    
                                    <TableCell>
                                        <Box sx={{ minWidth: 120 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                                <MemoryIcon fontSize="small" color="action" />
                                                <Typography variant="caption">
                                                    {formatMemory(node.usedMemoryMB)} / {formatMemory(node.usedMemoryMB + node.availMemoryMB)}
                                                </Typography>
                                            </Box>
                                            <LinearProgress
                                                variant="determinate"
                                                value={memoryUsedPercent}
                                                color={getUtilizationColor(node.usedMemoryMB, node.usedMemoryMB + node.availMemoryMB)}
                                                sx={{ height: 4 }}
                                            />
                                        </Box>
                                    </TableCell>
                                    
                                    <TableCell>
                                        <Box sx={{ minWidth: 100 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                                <SpeedIcon fontSize="small" color="action" />
                                                <Typography variant="caption">
                                                    {node.usedVirtualCores} / {node.usedVirtualCores + node.availableVirtualCores}
                                                </Typography>
                                            </Box>
                                            <LinearProgress
                                                variant="determinate"
                                                value={coresUsedPercent}
                                                color={getUtilizationColor(node.usedVirtualCores, node.usedVirtualCores + node.availableVirtualCores)}
                                                sx={{ height: 4 }}
                                            />
                                        </Box>
                                    </TableCell>
                                    
                                    <TableCell>
                                        <Typography variant="body2">
                                            {node.numContainers}
                                        </Typography>
                                    </TableCell>
                                    
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <FormControl size="small" sx={{ minWidth: 120 }}>
                                                <InputLabel>Assign Label</InputLabel>
                                                <Select
                                                    value={assignedLabels[0] || ''}
                                                    label="Assign Label"
                                                    onChange={(e) => handleLabelChange(node.id, e.target.value || null)}
                                                    disabled={isLoading}
                                                >
                                                    <MenuItem value="">
                                                        <em>Default (no label)</em>
                                                    </MenuItem>
                                                    {nodeLabels.map((label) => (
                                                        <MenuItem key={label.name} value={label.name}>
                                                            {label.name}
                                                            {label.exclusivity && (
                                                                <Chip 
                                                                    label="Exclusive" 
                                                                    size="small" 
                                                                    color="warning" 
                                                                    variant="outlined"
                                                                    sx={{ ml: 1 }}
                                                                />
                                                            )}
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>
                                            
                                            {assignedLabels.length > 0 && (
                                                <Tooltip title="Remove all labels">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleLabelChange(node.id, null)}
                                                        disabled={isLoading}
                                                        color="error"
                                                    >
                                                        <ClearIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>

            {filteredNodes.length === 0 && selectedLabel && (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                        No nodes assigned to label "{selectedLabel}"
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        Nodes without this label operate on the default partition where regular capacity values apply
                    </Typography>
                </Box>
            )}
        </Box>
    );
};