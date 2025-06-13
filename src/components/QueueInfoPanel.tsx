import React, { useState, useEffect } from 'react';
import {
    Box,
    Paper,
    Typography,
    Chip,
    LinearProgress,
    Divider,
    IconButton,
    Tooltip,
    Grid,
    Card,
    CardContent,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Button,
    Alert,
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import {
    Close as CloseIcon,
    Delete as DeleteIcon,
    PlayArrow as PlayIcon,
    Stop as StopIcon,
    Dashboard as OverviewIcon,
    TrendingUp as StatisticsIcon,
    Settings as SettingsIcon,
} from '@mui/icons-material';
import type { Queue } from '../types/Queue';
import type { ConfigGroup } from '../config';
import { ConfigService } from '../config';
import { PropertyFormField } from './PropertyFormField';
import { AutoQueueCreationSection } from './AutoQueueCreationSection';

export interface QueueInfoPanelProps {
    queue: Queue | null;
    open: boolean;
    onClose: () => void;
    onEdit?: (queuePath: string) => void;
    onDelete?: (queuePath: string) => void;
    onToggleState?: (queuePath: string, newState: 'RUNNING' | 'STOPPED') => void;
    onSaveProperties?: (queuePath: string, changes: Record<string, any>) => void;
    onQueueSelect?: (queue: Queue) => void;
}

export const QueueInfoPanel: React.FC<QueueInfoPanelProps> = ({
    queue,
    open,
    onClose,
    onEdit,
    onDelete,
    onToggleState,
    onSaveProperties,
    onQueueSelect,
}) => {
    const [activeTab, setActiveTab] = useState(0);
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [hasChanges, setHasChanges] = useState(false);

    const configService = ConfigService.getInstance();
    const propertyGroups = configService.getQueuePropertyGroups();

    useEffect(() => {
        if (queue && open) {
            // Initialize form data with current queue configuration
            const initialData: Record<string, any> = {};

            // Map current queue properties to form data
            initialData['capacity'] = `${queue.capacity}%`;
            initialData['maximum-capacity'] = `${queue.maxCapacity}%`;
            initialData['state'] = queue.state;
            initialData['user-limit-factor'] = queue.userLimitFactor || 1;
            initialData['max-parallel-apps'] = queue.maxApplications || '';
            initialData['ordering-policy'] = queue.orderingPolicy || 'fifo';
            initialData['disable_preemption'] = queue.preemptionDisabled || false;

            // Auto-creation properties
            initialData['auto-create-child-queue.enabled'] = queue.autoCreateChildQueueEnabled || false;
            initialData['auto-queue-creation-v2.enabled'] = false;
            initialData['auto-queue-creation-v2.max-queues'] = 1000;

            // Template properties (if auto-creation is enabled)
            if (queue.leafQueueTemplate) {
                Object.entries(queue.leafQueueTemplate).forEach(([key, value]) => {
                    initialData[`leaf-queue-template.${key}`] = value;
                });
            }

            setFormData(initialData);
            setErrors({});
            setHasChanges(false);
        }
    }, [queue, open]);

    const handleFieldChange = (propertyKey: string, value: any) => {
        const newFormData = { ...formData, [propertyKey]: value };
        setFormData(newFormData);
        setHasChanges(true);

        // Validate the field
        const validation = configService.validateProperty(propertyKey, value);
        const newErrors = { ...errors };

        if (validation.valid) {
            delete newErrors[propertyKey];
        } else {
            newErrors[propertyKey] = validation.error || 'Invalid value';
        }

        setErrors(newErrors);
    };

    const handleSaveSettings = () => {
        if (!queue?.queueName) return;

        // Final validation
        const finalErrors: Record<string, string> = {};

        Object.entries(formData).forEach(([key, value]) => {
            const validation = configService.validateProperty(key, value);
            if (!validation.valid) {
                finalErrors[key] = validation.error || 'Invalid value';
            }
        });

        if (Object.keys(finalErrors).length > 0) {
            setErrors(finalErrors);
            return;
        }

        // Call the onSaveProperties callback
        if (onSaveProperties) {
            onSaveProperties(queue.queueName, { ...formData });
        }
        setHasChanges(false);
    };

    const renderPropertyGroup = (group: ConfigGroup) => {
        // Get sibling queues for capacity calculations
        const siblings =
            queue && (queue as any).parent
                ? ((queue as any).parent.children || [])
                      .filter((child: any) => child.queueName !== queue.queueName)
                      .map((child: any) => ({ name: child.queueName, capacity: `${child.capacity}%` }))
                : [];

        // Special handling for Auto-Queue Creation group
        if (group.groupName === 'Auto-Queue Creation') {
            return (
                <AutoQueueCreationSection
                    key={group.groupName}
                    properties={group.properties}
                    formData={formData}
                    errors={errors}
                    onChange={handleFieldChange}
                    siblings={siblings}
                />
            );
        }

        return (
            <Box key={group.groupName}>
                {Object.entries(group.properties).map(([, property]) => (
                    <PropertyFormField
                        key={property.key}
                        property={property}
                        value={formData[property.key]}
                        error={errors[property.key]}
                        onChange={(value) => handleFieldChange(property.key, value)}
                        siblings={siblings}
                    />
                ))}
            </Box>
        );
    };

    if (!queue || !open) {
        return null;
    }


    const handleDelete = () => {
        if (onDelete) {
            onDelete(queue.queueName);
        }
    };

    const handleToggleState = () => {
        if (onToggleState) {
            const newState = queue.state === 'RUNNING' ? 'STOPPED' : 'RUNNING';
            onToggleState(queue.queueName, newState);
        }
    };

    const getStateColor = (state: string): 'success' | 'error' | 'default' => {
        switch (state) {
            case 'RUNNING':
                return 'success';
            case 'STOPPED':
                return 'error';
            default:
                return 'default';
        }
    };

    const formatBytes = (bytes: number): string => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const getCapacityPercentage = (used: number, max: number): number => {
        return max > 0 ? (used / max) * 100 : 0;
    };

    const getUsageColor = (percentage: number): 'primary' | 'warning' | 'error' => {
        if (percentage >= 90) return 'error';
        if (percentage >= 75) return 'warning';
        return 'primary';
    };

    // Get live capacity data from partitions for info panel
    const getLiveCapacityData = (queue: Queue) => {
        const defaultPartition = queue.capacities?.queueCapacitiesByPartition?.find(
            (p) => !p.partitionName || p.partitionName === ''
        );

        if (defaultPartition) {
            return {
                capacity: defaultPartition.capacity || 0,
                usedCapacity: defaultPartition.usedCapacity || 0,
                maxCapacity: defaultPartition.maxCapacity || 100,
                absoluteCapacity: defaultPartition.absoluteCapacity || 0,
                absoluteUsedCapacity: defaultPartition.absoluteUsedCapacity || 0,
                absoluteMaxCapacity: defaultPartition.absoluteMaxCapacity || 100,
            };
        }

        // Fallback to merged queue fields
        return {
            capacity: queue.capacity || 0,
            usedCapacity: queue.usedCapacity || 0,
            maxCapacity: queue.maxCapacity || 100,
            absoluteCapacity: queue.absoluteCapacity || 0,
            absoluteUsedCapacity: queue.absoluteUsedCapacity || 0,
            absoluteMaxCapacity: queue.absoluteMaxCapacity || 100,
        };
    };

    const liveCapacityData = getLiveCapacityData(queue);

    return (
        <Paper
            elevation={0}
            sx={{
                position: 'fixed',
                top: '112px', // Position below AppBar (64px) + TabNavigation (48px)
                right: open ? 0 : '-400px',
                width: 400,
                height: 'calc(100vh - 112px)',
                transition: 'right 0.3s ease-in-out',
                zIndex: 1300,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                bgcolor: 'grey.50',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2), 0 4px 16px rgba(0, 0, 0, 0.1)',
                pointerEvents: open ? 'auto' : 'none', // Allow clicks to pass through when closed
            }}
        >
            {/* Header */}
            <Box
                sx={{
                    p: 1.5,
                    bgcolor: 'background.paper',
                    borderBottom: 1,
                    borderColor: 'divider',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                }}
            >
                <Typography variant="subtitle1" component="h2" color="text.primary" sx={{ fontWeight: 600 }}>
                    {queue?.queueName}
                </Typography>
                <IconButton
                    onClick={onClose}
                    size="small"
                    sx={{
                        color: 'text.secondary',
                        position: 'absolute',
                        right: 12,
                    }}
                >
                    <CloseIcon fontSize="small" />
                </IconButton>
            </Box>

            {/* Tab Selector Card */}
            <Box sx={{ p: 1.5 }}>
                <Card sx={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)' }}>
                    <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <Tooltip title="Overview">
                                <Button
                                    variant="text"
                                    size="small"
                                    onClick={() => setActiveTab(0)}
                                    startIcon={<OverviewIcon fontSize="small" />}
                                    sx={{ 
                                        flex: 1, 
                                        minWidth: 0,
                                        fontSize: '0.75rem',
                                        py: 0.75,
                                        border: 'none',
                                        bgcolor: activeTab === 0 ? 'action.selected' : 'transparent',
                                        color: activeTab === 0 ? 'primary.main' : 'text.secondary',
                                        '&:hover': {
                                            bgcolor: 'action.hover',
                                            border: 'none'
                                        }
                                    }}
                                >
                                    Overview
                                </Button>
                            </Tooltip>
                            <Tooltip title="Statistics">
                                <Button
                                    variant="text"
                                    size="small"
                                    onClick={() => setActiveTab(1)}
                                    startIcon={<StatisticsIcon fontSize="small" />}
                                    sx={{ 
                                        flex: 1, 
                                        minWidth: 0,
                                        fontSize: '0.75rem',
                                        py: 0.75,
                                        border: 'none',
                                        bgcolor: activeTab === 1 ? 'action.selected' : 'transparent',
                                        color: activeTab === 1 ? 'primary.main' : 'text.secondary',
                                        '&:hover': {
                                            bgcolor: 'action.hover',
                                            border: 'none'
                                        }
                                    }}
                                >
                                    Stats
                                </Button>
                            </Tooltip>
                            <Tooltip title="Settings">
                                <Button
                                    variant="text"
                                    size="small"
                                    onClick={() => setActiveTab(2)}
                                    startIcon={<SettingsIcon fontSize="small" />}
                                    sx={{ 
                                        flex: 1, 
                                        minWidth: 0,
                                        fontSize: '0.75rem',
                                        py: 0.75,
                                        border: 'none',
                                        bgcolor: activeTab === 2 ? 'action.selected' : 'transparent',
                                        color: activeTab === 2 ? 'primary.main' : 'text.secondary',
                                        '&:hover': {
                                            bgcolor: 'action.hover',
                                            border: 'none'
                                        }
                                    }}
                                >
                                    Settings
                                </Button>
                            </Tooltip>
                        </Box>
                    </CardContent>
                </Card>
            </Box>

            {/* Content */}
            <Box sx={{ flex: 1, overflow: 'auto' }}>
                {/* Overview Tab */}
                {activeTab === 0 && (
                    <Box sx={{ p: 1.5 }}>
                        {/* Basic Info */}
                        <Card
                            sx={{
                                mb: 1.5,
                                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
                            }}
                        >
                            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        mb: 1,
                                    }}
                                >
                                    <Typography variant="subtitle2" component="h3">
                                        {queue.queueName}
                                    </Typography>
                                    <Chip
                                        label={queue.state}
                                        color={getStateColor(queue.state)}
                                        size="small"
                                        sx={{ height: 20, fontSize: '0.75rem' }}
                                    />
                                </Box>

                                <Grid container spacing={1}>
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="text.secondary">
                                            Applications
                                        </Typography>
                                        <Typography variant="body2" fontWeight="medium">
                                            {queue.numApplications}
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="text.secondary">
                                            Path
                                        </Typography>
                                        <Typography
                                            variant="body2"
                                            fontWeight="medium"
                                            sx={{ wordBreak: 'break-all', fontSize: '0.75rem' }}
                                        >
                                            {(queue as any).queuePath || (queue as any).id || queue.queueName}
                                        </Typography>
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>

                        {/* Capacity Metrics */}
                        <Card
                            sx={{
                                mb: 1.5,
                                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
                            }}
                        >
                            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                                <Typography variant="subtitle2" component="h3" sx={{ mb: 1.5 }}>
                                    Capacity Metrics
                                </Typography>

                                {/* Capacity */}
                                <Box sx={{ mb: 2 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                        <Typography variant="caption" color="text.secondary">
                                            Capacity
                                        </Typography>
                                        <Typography variant="caption">
                                            {liveCapacityData.capacity}% (max: {liveCapacityData.maxCapacity}%)
                                        </Typography>
                                    </Box>
                                    <LinearProgress
                                        variant="determinate"
                                        value={getCapacityPercentage(
                                            liveCapacityData.capacity,
                                            liveCapacityData.maxCapacity
                                        )}
                                        color={getUsageColor(
                                            getCapacityPercentage(
                                                liveCapacityData.capacity,
                                                liveCapacityData.maxCapacity
                                            )
                                        )}
                                        sx={{ height: 6, borderRadius: 3 }}
                                    />
                                </Box>

                                {/* Used Capacity */}
                                <Box sx={{ mb: 2 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                        <Typography variant="caption" color="text.secondary">
                                            Used Capacity
                                        </Typography>
                                        <Typography variant="caption">
                                            {liveCapacityData.usedCapacity}% of {liveCapacityData.capacity}%
                                        </Typography>
                                    </Box>
                                    <LinearProgress
                                        variant="determinate"
                                        value={getCapacityPercentage(
                                            liveCapacityData.usedCapacity,
                                            liveCapacityData.capacity
                                        )}
                                        color={getUsageColor(
                                            getCapacityPercentage(
                                                liveCapacityData.usedCapacity,
                                                liveCapacityData.capacity
                                            )
                                        )}
                                        sx={{ height: 6, borderRadius: 3 }}
                                    />
                                </Box>

                                {/* Absolute Values (Cluster-wide) */}
                                <Divider sx={{ my: 1.5 }} />
                                <Typography variant="caption" sx={{ mb: 1, fontWeight: 'medium', display: 'block' }}>
                                    Cluster-wide Capacity
                                </Typography>
                                <Grid container spacing={1}>
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="text.secondary">
                                            Absolute Capacity
                                        </Typography>
                                        <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                                            {liveCapacityData.absoluteCapacity}%
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="text.secondary">
                                            Absolute Used
                                        </Typography>
                                        <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                                            {liveCapacityData.absoluteUsedCapacity}%
                                        </Typography>
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>

                        {/* Resource Usage */}
                        <Card
                            sx={{
                                mb: 1.5,
                                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
                            }}
                        >
                            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                                <Typography variant="subtitle2" component="h3" sx={{ mb: 1.5 }}>
                                    Resource Usage
                                </Typography>

                                <Grid container spacing={1}>
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="text.secondary">
                                            Memory
                                        </Typography>
                                        <Typography variant="body2" fontWeight="medium" sx={{ fontSize: '0.75rem' }}>
                                            {formatBytes(queue.resourcesUsed.memory * 1024 * 1024)}
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="text.secondary">
                                            vCores
                                        </Typography>
                                        <Typography variant="body2" fontWeight="medium" sx={{ fontSize: '0.75rem' }}>
                                            {queue.resourcesUsed.vCores}
                                        </Typography>
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>

                        {/* Child Queues */}
                        {(() => {
                            const childQueues = (queue as any).children || queue.queues?.queue;
                            return (
                                childQueues &&
                                childQueues.length > 0 && (
                                    <Card
                                        sx={{
                                            mb: 1.5,
                                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
                                        }}
                                    >
                                        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                                            <Typography variant="subtitle2" component="h3" sx={{ mb: 1.5 }}>
                                                Child Queues ({childQueues.length})
                                            </Typography>

                                            {childQueues.map((child: any, index: number) => (
                                                <Box
                                                    key={child.queueName}
                                                    onClick={() => onQueueSelect?.(child)}
                                                    sx={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        py: 0.75,
                                                        px: 1,
                                                        mx: -1,
                                                        borderBottom: index < childQueues.length - 1 ? 1 : 0,
                                                        borderColor: 'divider',
                                                        borderRadius: 1,
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s ease-in-out',
                                                        '&:hover': {
                                                            bgcolor: 'action.hover',
                                                            transform: 'translateX(2px)',
                                                        }
                                                    }}
                                                >
                                                    <Box>
                                                        <Typography
                                                            variant="body2"
                                                            fontWeight="medium"
                                                            sx={{ fontSize: '0.8rem' }}
                                                        >
                                                            {child.queueName}
                                                        </Typography>
                                                        <Typography
                                                            variant="caption"
                                                            color="text.secondary"
                                                            sx={{ fontSize: '0.7rem' }}
                                                        >
                                                            {child.capacity}% capacity, {child.numApplications} apps
                                                        </Typography>
                                                    </Box>
                                                    <Chip
                                                        label={child.state}
                                                        color={getStateColor(child.state)}
                                                        size="small"
                                                        sx={{ height: 18, fontSize: '0.7rem' }}
                                                    />
                                                </Box>
                                            ))}
                                        </CardContent>
                                    </Card>
                                )
                            );
                        })()}

                        {/* Quick Actions */}
                        <Card sx={{ mt: 1.5, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)' }}>
                            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                                <Typography variant="subtitle2" component="h3" sx={{ mb: 1.5 }}>
                                    Quick Actions
                                </Typography>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        onClick={handleToggleState}
                                        startIcon={queue.state === 'RUNNING' ? <StopIcon fontSize="small" /> : <PlayIcon fontSize="small" />}
                                        color="primary"
                                        fullWidth
                                        sx={{ 
                                            py: 0.75,
                                            fontSize: '0.75rem'
                                        }}
                                    >
                                        {queue.state === 'RUNNING' ? 'Stop Queue' : 'Start Queue'}
                                    </Button>
                                    
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        onClick={handleDelete}
                                        startIcon={<DeleteIcon fontSize="small" />}
                                        color="error"
                                        fullWidth
                                        sx={{ 
                                            py: 0.75,
                                            fontSize: '0.75rem'
                                        }}
                                    >
                                        Delete Queue
                                    </Button>
                                </Box>
                            </CardContent>
                        </Card>
                    </Box>
                )}

                {/* Statistics Tab */}
                {activeTab === 1 && (
                    <Box sx={{ p: 1.5 }}>
                        <Typography variant="h6" sx={{ mb: 2 }}>
                            Performance Statistics
                        </Typography>

                        <Card sx={{ mb: 1.5, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)' }}>
                            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                                <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                                    Application Metrics
                                </Typography>
                                <Grid container spacing={2}>
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="text.secondary">
                                            Running Apps
                                        </Typography>
                                        <Typography variant="h6" color="success.main">
                                            {queue.numApplications || 0}
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="text.secondary">
                                            Pending Apps
                                        </Typography>
                                        <Typography variant="h6" color="warning.main">
                                            {(queue as any).numPendingApplications || 0}
                                        </Typography>
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>

                        <Card sx={{ mb: 1.5, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)' }}>
                            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                                <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                                    Resource Allocation
                                </Typography>
                                <Box sx={{ mb: 2 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                        <Typography variant="caption" color="text.secondary">
                                            Memory Utilization
                                        </Typography>
                                        <Typography variant="caption">
                                            {formatBytes(queue.resourcesUsed.memory * 1024 * 1024)} /{' '}
                                            {formatBytes((queue.resourcesUsed.memory + 1000) * 1024 * 1024)}
                                        </Typography>
                                    </Box>
                                    <LinearProgress
                                        variant="determinate"
                                        value={Math.min(
                                            85,
                                            (queue.resourcesUsed.memory / (queue.resourcesUsed.memory + 1000)) * 100
                                        )}
                                        color="primary"
                                        sx={{ height: 6, borderRadius: 3 }}
                                    />
                                </Box>
                                <Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                        <Typography variant="caption" color="text.secondary">
                                            CPU Utilization
                                        </Typography>
                                        <Typography variant="caption">
                                            {queue.resourcesUsed.vCores} / {queue.resourcesUsed.vCores + 5} cores
                                        </Typography>
                                    </Box>
                                    <LinearProgress
                                        variant="determinate"
                                        value={Math.min(
                                            75,
                                            (queue.resourcesUsed.vCores / (queue.resourcesUsed.vCores + 5)) * 100
                                        )}
                                        color="secondary"
                                        sx={{ height: 6, borderRadius: 3 }}
                                    />
                                </Box>
                            </CardContent>
                        </Card>
                    </Box>
                )}

                {/* Settings Tab */}
                {activeTab === 2 && (
                    <Box sx={{ p: 1.5 }}>
                        {Object.keys(errors).length > 0 && (
                            <Alert severity="error" sx={{ mb: 2 }}>
                                Please fix the validation errors before saving.
                            </Alert>
                        )}

                        {propertyGroups.map((group, index) => (
                            <Accordion
                                key={group.groupName}
                                defaultExpanded={index === 0}
                                sx={{
                                    mb: 1,
                                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
                                    '&:before': { display: 'none' },
                                }}
                            >
                                <AccordionSummary
                                    expandIcon={<ExpandMoreIcon />}
                                    sx={{
                                        bgcolor: 'background.default',
                                        '&:hover': { bgcolor: 'action.hover' },
                                    }}
                                >
                                    <Typography variant="subtitle2" fontWeight="medium">
                                        {group.groupName}
                                    </Typography>
                                </AccordionSummary>
                                <AccordionDetails sx={{ p: 2 }}>{renderPropertyGroup(group)}</AccordionDetails>
                            </Accordion>
                        ))}

                        {hasChanges && (
                            <Box sx={{ mt: 2, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={() => {
                                        setFormData({});
                                        setHasChanges(false);
                                        setErrors({});
                                    }}
                                >
                                    Reset
                                </Button>
                                <Button
                                    variant="contained"
                                    size="small"
                                    onClick={handleSaveSettings}
                                    disabled={Object.keys(errors).length > 0}
                                >
                                    Save Changes
                                </Button>
                            </Box>
                        )}
                    </Box>
                )}
            </Box>
        </Paper>
    );
};
