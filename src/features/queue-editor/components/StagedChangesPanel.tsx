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
import { useConfigStore } from '../../../store/configStore';
import { ValidationPreview } from '../../../components/validation/ValidationPreview';

interface StagedChangesPanelProps {
    onApplyChanges?: () => void;
}

interface GroupedChanges {
    [queueName: string]: Array<{
        path: string;
        oldValue: any;
        newValue: any;
        propertyName: string;
    }>;
}

export function StagedChangesPanel({ onApplyChanges }: StagedChangesPanelProps) {
    const { staged, unstageChange, clearAllChanges, applyChanges, isApplying, validationStatus, getFieldChanges } =
        useConfigStore();

    const [isExpanded, setIsExpanded] = useState(false);
    const [groupBy, setGroupBy] = useState<'queue' | 'property'>('queue');
    const [showValidationPreview, setShowValidationPreview] = useState(false);

    // Convert Map to array for easier manipulation
    const stagedArray = useMemo(() => {
        const changes: Array<{
            path: string;
            oldValue: any;
            newValue: any;
            queueName: string;
            propertyName: string;
        }> = [];

        staged.forEach((value, path) => {
            const changeInfo = getFieldChanges(path);
            if (!changeInfo) return;

            // Parse path to extract queue and property names
            let queueName = 'Global Settings';
            let propertyName = path;

            if (path.startsWith('queues.')) {
                const parts = path.split('.');
                // Format: queues.root.a.b.property
                const propertyIdx = parts.findIndex(
                    (p) => p.includes('-') || p === 'capacity' || p === 'maximum-capacity' || p === 'state'
                );
                if (propertyIdx > 0) {
                    queueName = parts.slice(1, propertyIdx).join('.');
                    propertyName = parts.slice(propertyIdx).join('.');
                }
            } else if (path.startsWith('global.')) {
                propertyName = path.substring(7);
            }

            changes.push({
                path,
                oldValue: changeInfo.originalValue,
                newValue: value,
                queueName,
                propertyName,
            });
        });

        return changes;
    }, [staged, getFieldChanges]);

    // Group changes for better organization
    const groupedChanges = useMemo(() => {
        const grouped: GroupedChanges = {};

        if (groupBy === 'queue') {
            stagedArray.forEach((change) => {
                if (!grouped[change.queueName]) {
                    grouped[change.queueName] = [];
                }
                grouped[change.queueName].push(change);
            });
        } else {
            // Group by property type
            stagedArray.forEach((change) => {
                if (!grouped[change.propertyName]) {
                    grouped[change.propertyName] = [];
                }
                grouped[change.propertyName].push(change);
            });
        }

        return grouped;
    }, [stagedArray, groupBy]);

    const changeCount = staged.size;
    const hasValidationErrors = validationStatus === 'invalid';

    if (changeCount === 0) {
        return null; // Don't show panel when no changes
    }

    const handleApplyChanges = async () => {
        if (hasValidationErrors) {
            // Show validation preview before applying changes
            setShowValidationPreview(true);
            return;
        }

        try {
            await applyChanges();
            if (onApplyChanges) {
                onApplyChanges();
            }
        } catch (error) {
            console.error('Failed to apply changes:', error);
        }
    };

    const handleClearAll = () => {
        clearAllChanges();
        setIsExpanded(false);
    };

    const formatValue = (value: any): string => {
        if (value === null || value === undefined) return 'empty';
        if (typeof value === 'boolean') return value ? 'true' : 'false';
        if (Array.isArray(value)) return value.join(', ');
        return String(value);
    };

    const renderChangeItem = (change: (typeof stagedArray)[0]) => (
        <ListItem key={change.path} divider>
            <ListItemText
                primaryTypographyProps={{ component: 'div' }}
                secondaryTypographyProps={{ component: 'div' }}
                primary={
                    <Box display="flex" alignItems="center" gap={1}>
                        <EditIcon fontSize="small" color="primary" />
                        <Typography variant="body2" fontWeight="medium">
                            {change.propertyName}
                        </Typography>
                        {groupBy === 'property' && <Chip label={change.queueName} size="small" variant="outlined" />}
                    </Box>
                }
                secondary={
                    <Box mt={0.5}>
                        <Typography variant="caption" color="text.secondary">
                            <span style={{ textDecoration: 'line-through' }}>{formatValue(change.oldValue)}</span>
                            {' → '}
                            <span style={{ fontWeight: 'bold' }}>{formatValue(change.newValue)}</span>
                        </Typography>
                    </Box>
                }
            />
            <ListItemSecondaryAction>
                <Tooltip title="Remove this change">
                    <IconButton edge="end" onClick={() => unstageChange(change.path)} size="small">
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

                <Box sx={{ flex: 1, overflow: 'auto', mb: 2 }}>
                    {Object.entries(groupedChanges).map(([groupName, changes]) => (
                        <Accordion key={groupName} defaultExpanded>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Box display="flex" alignItems="center" gap={1} width="100%">
                                    <Typography variant="subtitle2">{groupName}</Typography>
                                    <Chip label={changes.length} size="small" />
                                </Box>
                            </AccordionSummary>
                            <AccordionDetails sx={{ p: 0 }}>
                                <List dense disablePadding>
                                    {changes.map(renderChangeItem)}
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
                        disabled={isApplying || changeCount === 0}
                    >
                        {isApplying ? 'Applying...' : 'Apply Changes'}
                    </Button>
                    <Button
                        variant="outlined"
                        fullWidth
                        startIcon={<ClearIcon />}
                        onClick={handleClearAll}
                        disabled={isApplying}
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
