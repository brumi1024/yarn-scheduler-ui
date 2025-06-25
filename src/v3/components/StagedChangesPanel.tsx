import React, { useState, useMemo } from 'react';
import {
    Paper,
    Drawer,
    Box,
    Typography,
    IconButton,
    Badge,
    Chip,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    Button,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Tooltip,
    Alert,
    Stack,
    Divider,
} from '@mui/material';
import {
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon,
    Delete as DeleteIcon,
    Clear as ClearIcon,
    Save as SaveIcon,
    Warning as WarningIcon,
    Info as InfoIcon,
    Edit as EditIcon,
    Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { useYarnSchedulerStore } from '../store/yarnSchedulerStore';
import { useUpdateConfig } from '../hooks/useSchedulerApi';
import { ValidationPreview } from './ValidationPreview';
import type { PropertyChange } from '../store/types';

interface StagedChangesPanelProps {
    onApplyChanges?: () => void;
}

interface GroupedChanges {
    [groupName: string]: Array<{
        key: string;
        change: PropertyChange;
        queueName: string;
        propertyName: string;
    }>;
}

export function StagedChangesPanel({ onApplyChanges }: StagedChangesPanelProps) {
    const propertyChanges = useYarnSchedulerStore((state) => state.propertyChanges);
    const updateProperty = useYarnSchedulerStore((state) => state.updateProperty);
    const revertAllChanges = useYarnSchedulerStore((state) => state.revertAllChanges);
    const hasChanges = useYarnSchedulerStore((state) => state.hasChanges);
    
    const updateConfigMutation = useUpdateConfig();

    const [isExpanded, setIsExpanded] = useState(false);
    const [groupBy, setGroupBy] = useState<'queue' | 'property'>('queue');
    const [showValidationPreview, setShowValidationPreview] = useState(false);

    // Convert Map to array for easier manipulation
    const stagedArray = useMemo(() => {
        const changes: Array<{
            key: string;
            change: PropertyChange;
            queueName: string;
            propertyName: string;
        }> = [];

        propertyChanges.forEach((change, key) => {
            // Parse key to extract queue and property names
            let queueName = 'Global Settings';
            let propertyName = key;

            if (key.startsWith('yarn.scheduler.capacity.')) {
                const pathWithoutPrefix = key.substring('yarn.scheduler.capacity.'.length);
                
                // Use the queuePath from PropertyChange to determine if it's a queue property
                // All queue paths contain "root" since every queue is a descendant of root
                // If PropertyChange has a queuePath, it's a queue property; otherwise it's global
                if (change.queuePath) {
                    // It's a queue property
                    queueName = change.queuePath;
                    // Extract property name by removing the queue prefix
                    const queuePrefix = `${change.queuePath}.`;
                    propertyName = pathWithoutPrefix.startsWith(queuePrefix) 
                        ? pathWithoutPrefix.substring(queuePrefix.length)
                        : pathWithoutPrefix;
                } else {
                    // It's a global property (no queuePath means global)
                    propertyName = pathWithoutPrefix;
                }
            }

            changes.push({
                key,
                change,
                queueName,
                propertyName,
            });
        });

        return changes;
    }, [propertyChanges]);

    // Group changes for better organization
    const groupedChanges = useMemo(() => {
        const grouped: GroupedChanges = {};

        if (groupBy === 'queue') {
            stagedArray.forEach((item) => {
                if (!grouped[item.queueName]) {
                    grouped[item.queueName] = [];
                }
                grouped[item.queueName].push(item);
            });
        } else {
            // Group by property type
            stagedArray.forEach((item) => {
                if (!grouped[item.propertyName]) {
                    grouped[item.propertyName] = [];
                }
                grouped[item.propertyName].push(item);
            });
        }

        return grouped;
    }, [stagedArray, groupBy]);

    const changeCount = propertyChanges.size;
    
    // TODO: Implement validation status check
    const hasValidationErrors = false;

    if (!hasChanges()) {
        return null; // Don't show panel when no changes
    }

    const handleApplyChanges = async () => {
        if (hasValidationErrors) {
            // Show validation preview before applying changes
            setShowValidationPreview(true);
            return;
        }

        try {
            await updateConfigMutation.mutateAsync();
            if (onApplyChanges) {
                onApplyChanges();
            }
            setIsExpanded(false);
        } catch (error) {
            console.error('Failed to apply changes:', error);
        }
    };

    const handleClearAll = () => {
        revertAllChanges();
        setIsExpanded(false);
    };

    const handleUnstageChange = (key: string, change: PropertyChange) => {
        // Revert to original value
        updateProperty(key, change.oldValue);
    };

    const formatValue = (value: any): string => {
        if (value === null || value === undefined) return 'empty';
        if (typeof value === 'boolean') return value ? 'true' : 'false';
        if (Array.isArray(value)) return value.join(', ');
        return String(value);
    };

    const renderChangeItem = (item: (typeof stagedArray)[0]) => (
        <ListItem key={item.key} divider>
            <ListItemText
                primaryTypographyProps={{ component: 'div' }}
                secondaryTypographyProps={{ component: 'div' }}
                primary={
                    <Box display="flex" alignItems="center" gap={1}>
                        <EditIcon fontSize="small" color="primary" />
                        <Typography variant="body2" fontWeight="medium">
                            {item.propertyName}
                        </Typography>
                        {groupBy === 'property' && <Chip label={item.queueName} size="small" variant="outlined" />}
                    </Box>
                }
                secondary={
                    <Box mt={0.5}>
                        <Typography variant="caption" color="text.secondary">
                            <span style={{ textDecoration: 'line-through' }}>{formatValue(item.change.oldValue)}</span>
                            {' → '}
                            <span style={{ fontWeight: 'bold' }}>{formatValue(item.change.newValue)}</span>
                        </Typography>
                    </Box>
                }
            />
            <ListItemSecondaryAction>
                <Tooltip title="Remove this change">
                    <IconButton edge="end" onClick={() => handleUnstageChange(item.key, item.change)} size="small">
                        <DeleteIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            </ListItemSecondaryAction>
        </ListItem>
    );

    return (
        <>
            {/* Floating Button */}
            <Paper
                elevation={3}
                sx={{
                    position: 'fixed',
                    bottom: 24,
                    right: 24,
                    borderRadius: 2,
                    overflow: 'hidden',
                    zIndex: 1200,
                }}
            >
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        p: 1.5,
                        bgcolor: 'background.paper',
                    }}
                >
                    <Badge badgeContent={changeCount} color="primary">
                        <EditIcon />
                    </Badge>
                    <Typography variant="body2" fontWeight="medium">
                        {changeCount} Staged {changeCount === 1 ? 'Change' : 'Changes'}
                    </Typography>
                    <IconButton onClick={() => setIsExpanded(!isExpanded)} size="small">
                        {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                </Box>
            </Paper>

            {/* Expanded Panel */}
            <Drawer
                anchor="right"
                open={isExpanded}
                onClose={() => setIsExpanded(false)}
                PaperProps={{
                    sx: {
                        width: 400,
                        p: 2,
                    },
                }}
            >
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                    <Typography variant="h6">Staged Changes</Typography>
                    <Box display="flex" gap={1}>
                        <Chip
                            label="By Queue"
                            onClick={() => setGroupBy('queue')}
                            color={groupBy === 'queue' ? 'primary' : 'default'}
                            size="small"
                        />
                        <Chip
                            label="By Property"
                            onClick={() => setGroupBy('property')}
                            color={groupBy === 'property' ? 'primary' : 'default'}
                            size="small"
                        />
                    </Box>
                </Box>

                {hasValidationErrors && (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        <Typography variant="body2">
                            There are validation errors. Please fix them before applying changes.
                        </Typography>
                    </Alert>
                )}

                {updateConfigMutation.isError && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        <Typography variant="body2">
                            Failed to apply changes: {updateConfigMutation.error?.message}
                        </Typography>
                    </Alert>
                )}

                <Box sx={{ flex: 1, overflow: 'auto', mb: 2 }}>
                    {Object.entries(groupedChanges).map(([groupName, items]) => (
                        <Accordion key={groupName} defaultExpanded>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Box display="flex" alignItems="center" gap={1} width="100%">
                                    <Typography variant="subtitle2">{groupName}</Typography>
                                    <Chip label={items.length} size="small" />
                                </Box>
                            </AccordionSummary>
                            <AccordionDetails sx={{ p: 0 }}>
                                <List dense disablePadding>
                                    {items.map(renderChangeItem)}
                                </List>
                            </AccordionDetails>
                        </Accordion>
                    ))}
                </Box>

                <Divider sx={{ my: 2 }} />

                <Stack spacing={1}>
                    <Button
                        variant="contained"
                        fullWidth
                        startIcon={<SaveIcon />}
                        onClick={handleApplyChanges}
                        disabled={updateConfigMutation.isPending || changeCount === 0}
                    >
                        {updateConfigMutation.isPending ? 'Applying...' : 'Apply Changes'}
                    </Button>
                    <Button
                        variant="outlined"
                        fullWidth
                        startIcon={<ClearIcon />}
                        onClick={handleClearAll}
                        disabled={updateConfigMutation.isPending}
                    >
                        Clear All Changes
                    </Button>
                </Stack>
            </Drawer>

            {/* Validation Preview Dialog */}
            {showValidationPreview && (
                <ValidationPreview
                    open={showValidationPreview}
                    onClose={() => {
                        setShowValidationPreview(false);
                    }}
                    onProceed={handleApplyChanges}
                />
            )}
        </>
    );
}