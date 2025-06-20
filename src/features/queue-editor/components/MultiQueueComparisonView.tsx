import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Typography,
    Box,
    IconButton,
    Chip,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { useUIStore } from '../../../store';
import { useConfigurationQuery, useSchedulerQuery } from '../../../hooks/useYarnApi';
import { useQueueDataProcessor } from '../hooks/useQueueDataProcessor';
import type { LayoutQueue } from '../utils/layout/DagreLayout';

interface MultiQueueComparisonViewProps {
    open: boolean;
    onClose: () => void;
}

interface ComparisonProperty {
    key: string;
    label: string;
    format?: (value: unknown, queue: LayoutQueue) => string;
    highlight?: (values: unknown[]) => boolean; // Whether to highlight differences
}

const COMPARISON_PROPERTIES: ComparisonProperty[] = [
    {
        key: 'queueName',
        label: 'Queue Name',
    },
    {
        key: 'queuePath',
        label: 'Queue Path',
    },
    {
        key: 'state',
        label: 'State',
        format: (value) => value || 'N/A',
        highlight: (values) => new Set(values).size > 1,
    },
    {
        key: 'capacity',
        label: 'Capacity (%)',
        format: (value) => `${value || 0}%`,
        highlight: (values) => new Set(values).size > 1,
    },
    {
        key: 'usedCapacity',
        label: 'Used Capacity (%)',
        format: (value) => `${(value || 0).toFixed(1)}%`,
        highlight: (values) => new Set(values).size > 1,
    },
    {
        key: 'maxCapacity',
        label: 'Max Capacity (%)',
        format: (value) => `${value || 0}%`,
        highlight: (values) => new Set(values).size > 1,
    },
    {
        key: 'absoluteCapacity',
        label: 'Absolute Capacity (%)',
        format: (value) => `${(value || 0).toFixed(2)}%`,
        highlight: (values) => new Set(values).size > 1,
    },
    {
        key: 'absoluteUsedCapacity',
        label: 'Absolute Used (%)',
        format: (value) => `${(value || 0).toFixed(2)}%`,
        highlight: (values) => new Set(values).size > 1,
    },
    {
        key: 'absoluteMaxCapacity',
        label: 'Absolute Max (%)',
        format: (value) => `${(value || 0).toFixed(2)}%`,
        highlight: (values) => new Set(values).size > 1,
    },
    {
        key: 'numApplications',
        label: 'Applications',
        format: (value) => `${value || 0}`,
        highlight: (values) => new Set(values).size > 1,
    },
    {
        key: 'memory',
        label: 'Memory Used (MB)',
        format: (value, queue) => `${queue.resourcesUsed?.memory || 0}`,
        highlight: (values) => new Set(values).size > 1,
    },
    {
        key: 'vCores',
        label: 'vCores Used',
        format: (value, queue) => `${queue.resourcesUsed?.vCores || 0}`,
        highlight: (values) => new Set(values).size > 1,
    },
    {
        key: 'autoCreateChildQueueEnabled',
        label: 'Auto Create Children',
        format: (value) => value ? 'Yes' : 'No',
        highlight: (values) => new Set(values).size > 1,
    },
    {
        key: 'userLimitFactor',
        label: 'User Limit Factor',
        format: (value) => value ? `${value}` : 'N/A',
        highlight: (values) => new Set(values.filter(v => v != null)).size > 1,
    },
    {
        key: 'maxApplications',
        label: 'Max Applications',
        format: (value) => value ? `${value}` : 'N/A',
        highlight: (values) => new Set(values.filter(v => v != null)).size > 1,
    },
    {
        key: 'preemptionDisabled',
        label: 'Preemption Disabled',
        format: (value) => value ? 'Yes' : 'No',
        highlight: (values) => new Set(values).size > 1,
    },
];

export default function MultiQueueComparisonView({ open, onClose }: MultiQueueComparisonViewProps) {
    // Use the same data source as the main queue visualization
    const configQuery = useConfigurationQuery();
    const schedulerQuery = useSchedulerQuery();
    const { nodes } = useQueueDataProcessor(configQuery, schedulerQuery);
    
    // Extract queue data from the processed nodes
    const allQueues = React.useMemo(() => {
        return nodes.map(node => node.data as LayoutQueue);
    }, [nodes]);
    
    const { comparisonQueueNames, clearComparison } = useUIStore();

    // Get queue data for selected queues
    const selectedQueues = React.useMemo(() => {
        return comparisonQueueNames
            .map(queuePath => {
                // First try exact queuePath match (preferred)
                let queue = allQueues.find(q => q.queuePath === queuePath);
                
                // If no exact queuePath match, try queueName only if it's unambiguous
                if (!queue) {
                    const queuesByName = allQueues.filter(q => q.queueName === queuePath);
                    if (queuesByName.length === 1) {
                        queue = queuesByName[0];
                    }
                }
                
                return queue;
            })
            .filter(Boolean) as LayoutQueue[];
    }, [comparisonQueueNames, allQueues]);

    const handleClose = () => {
        onClose();
    };

    const handleClearSelection = () => {
        clearComparison();
        onClose();
    };

    const getPropertyValue = (queue: LayoutQueue, property: ComparisonProperty) => {
        if (property.key === 'memory') {
            return queue.resourcesUsed?.memory || 0;
        }
        if (property.key === 'vCores') {
            return queue.resourcesUsed?.vCores || 0;
        }
        return (queue as Record<string, unknown>)[property.key];
    };

    const shouldHighlightRow = (property: ComparisonProperty) => {
        if (!property.highlight) return false;
        const values = selectedQueues.map(queue => getPropertyValue(queue, property));
        return property.highlight(values);
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="lg"
            fullWidth
            PaperProps={{
                sx: { height: '80vh' }
            }}
        >
            <DialogTitle>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Typography variant="h6">
                        Queue Comparison ({selectedQueues.length} queues)
                    </Typography>
                    <IconButton
                        edge="end"
                        color="inherit"
                        onClick={handleClose}
                        aria-label="close"
                    >
                        <CloseIcon />
                    </IconButton>
                </Box>
            </DialogTitle>

            <DialogContent dividers>
                {comparisonQueueNames.length === 0 ? (
                    <Box textAlign="center" py={4}>
                        <Typography variant="body1" color="text.secondary">
                            No queues selected for comparison
                        </Typography>
                    </Box>
                ) : selectedQueues.length === 0 ? (
                    <Box textAlign="center" py={4}>
                        <Typography variant="body1" color="error">
                            Could not find any of the selected queues ({comparisonQueueNames.length} selected)
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            Selected queue paths: {comparisonQueueNames.join(', ')}
                        </Typography>
                    </Box>
                ) : comparisonQueueNames.length !== selectedQueues.length ? (
                    <Box>
                        <Typography variant="body2" color="warning.main" sx={{ mb: 2 }}>
                            Warning: {comparisonQueueNames.length - selectedQueues.length} selected queue(s) could not be found
                        </Typography>
                        <TableContainer component={Paper} variant="outlined">
                            <Table stickyHeader size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 'bold', minWidth: 200 }}>
                                            Property
                                        </TableCell>
                                        {selectedQueues.map((queue) => (
                                            <TableCell
                                                key={queue.queuePath || queue.queueName}
                                                sx={{ 
                                                    fontWeight: 'bold',
                                                    minWidth: 150,
                                                    maxWidth: 200,
                                                }}
                                            >
                                                <Box>
                                                    <Typography variant="subtitle2" noWrap>
                                                        {queue.queueName}
                                                    </Typography>
                                                    {queue.stagedStatus && (
                                                        <Chip
                                                            label={queue.stagedStatus}
                                                            size="small"
                                                            color={
                                                                queue.stagedStatus === 'new' ? 'success' :
                                                                queue.stagedStatus === 'deleted' ? 'error' :
                                                                'warning'
                                                            }
                                                            sx={{ mt: 0.5 }}
                                                        />
                                                    )}
                                                </Box>
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {COMPARISON_PROPERTIES.map((property) => {
                                        const highlight = shouldHighlightRow(property);
                                        return (
                                            <TableRow
                                                key={property.key}
                                                sx={{
                                                    backgroundColor: highlight ? 'rgba(255, 193, 7, 0.1)' : 'inherit',
                                                    '&:hover': {
                                                        backgroundColor: highlight 
                                                            ? 'rgba(255, 193, 7, 0.2)' 
                                                            : 'rgba(0, 0, 0, 0.04)',
                                                    },
                                                }}
                                            >
                                                <TableCell
                                                    sx={{
                                                        fontWeight: highlight ? 'bold' : 'normal',
                                                        backgroundColor: 'rgba(0, 0, 0, 0.02)',
                                                    }}
                                                >
                                                    {property.label}
                                                </TableCell>
                                                {selectedQueues.map((queue) => {
                                                    const value = getPropertyValue(queue, property);
                                                    const formattedValue = property.format
                                                        ? property.format(value, queue)
                                                        : value?.toString() || 'N/A';

                                                    return (
                                                        <TableCell
                                                            key={`${queue.queuePath || queue.queueName}-${property.key}`}
                                                            sx={{
                                                                fontWeight: highlight ? 'bold' : 'normal',
                                                                color: highlight ? 'warning.dark' : 'inherit',
                                                            }}
                                                        >
                                                            {formattedValue}
                                                        </TableCell>
                                                    );
                                                })}
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                ) : (
                    <TableContainer component={Paper} variant="outlined">
                        <Table stickyHeader size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 'bold', minWidth: 200 }}>
                                        Property
                                    </TableCell>
                                    {selectedQueues.map((queue) => (
                                        <TableCell
                                            key={queue.queuePath || queue.queueName}
                                            sx={{ 
                                                fontWeight: 'bold',
                                                minWidth: 150,
                                                maxWidth: 200,
                                            }}
                                        >
                                            <Box>
                                                <Typography variant="subtitle2" noWrap>
                                                    {queue.queueName}
                                                </Typography>
                                                {queue.stagedStatus && (
                                                    <Chip
                                                        label={queue.stagedStatus}
                                                        size="small"
                                                        color={
                                                            queue.stagedStatus === 'new' ? 'success' :
                                                            queue.stagedStatus === 'deleted' ? 'error' :
                                                            'warning'
                                                        }
                                                        sx={{ mt: 0.5 }}
                                                    />
                                                )}
                                            </Box>
                                        </TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {COMPARISON_PROPERTIES.map((property) => {
                                    const highlight = shouldHighlightRow(property);
                                    return (
                                        <TableRow
                                            key={property.key}
                                            sx={{
                                                backgroundColor: highlight ? 'rgba(255, 193, 7, 0.1)' : 'inherit',
                                                '&:hover': {
                                                    backgroundColor: highlight 
                                                        ? 'rgba(255, 193, 7, 0.2)' 
                                                        : 'rgba(0, 0, 0, 0.04)',
                                                },
                                            }}
                                        >
                                            <TableCell
                                                sx={{
                                                    fontWeight: highlight ? 'bold' : 'normal',
                                                    backgroundColor: 'rgba(0, 0, 0, 0.02)',
                                                }}
                                            >
                                                {property.label}
                                            </TableCell>
                                            {selectedQueues.map((queue) => {
                                                const value = getPropertyValue(queue, property);
                                                const formattedValue = property.format
                                                    ? property.format(value, queue)
                                                    : value?.toString() || 'N/A';

                                                return (
                                                    <TableCell
                                                        key={`${queue.queuePath || queue.queueName}-${property.key}`}
                                                        sx={{
                                                            fontWeight: highlight ? 'bold' : 'normal',
                                                            color: highlight ? 'warning.dark' : 'inherit',
                                                        }}
                                                    >
                                                        {formattedValue}
                                                    </TableCell>
                                                );
                                            })}
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </DialogContent>

            <DialogActions>
                <Button onClick={handleClearSelection} color="secondary">
                    Clear Selection
                </Button>
                <Button onClick={handleClose} variant="contained">
                    Close
                </Button>
            </DialogActions>
        </Dialog>
    );
}