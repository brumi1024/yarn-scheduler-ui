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
import { useStagedChangesStore } from '../store/zustand/stagedChangesStore';
import type { ChangeSet } from '../types/Configuration';

interface StagedChangesPanelProps {
    onApplyChanges?: () => void;
}

interface GroupedChanges {
    [queueName: string]: ChangeSet[];
}

export function StagedChangesPanel({ onApplyChanges }: StagedChangesPanelProps) {
    const { changes, unstageChange, clearAllChanges, hasUnsavedChanges, conflicts } = useStagedChangesStore();

    const [isExpanded, setIsExpanded] = useState(false);
    const [groupBy, setGroupBy] = useState<'queue' | 'type'>('queue');

    // Group changes for better organization
    const groupedChanges = useMemo(() => {
        if (groupBy === 'queue') {
            // Group by queue name
            const grouped: GroupedChanges = {};
            changes.forEach((change) => {
                const key = change.queueName || 'global';
                if (!grouped[key]) {
                    grouped[key] = [];
                }
                grouped[key].push(change);
            });
            return grouped;
        } else {
            // Group by change type
            const grouped: GroupedChanges = {};
            changes.forEach((change) => {
                const key = change.type;
                if (!grouped[key]) {
                    grouped[key] = [];
                }
                grouped[key].push(change);
            });
            return grouped;
        }
    }, [changes, groupBy]);

    const changeCount = changes.length;
    const hasConflicts = conflicts.length > 0;

    if (changeCount === 0) {
        return null; // Don't show panel when no changes
    }

    const handleApplyChanges = () => {
        if (onApplyChanges) {
            onApplyChanges();
        }
    };

    const handleClearAll = () => {
        clearAllChanges();
        setIsExpanded(false);
    };

    const formatTimestamp = (timestamp: Date) => {
        return new Intl.DateTimeFormat('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        }).format(timestamp);
    };

    const getChangeTypeColor = (type: ChangeSet['type']) => {
        switch (type) {
            case 'add-queue':
                return 'success';
            case 'update-queue':
                return 'info';
            case 'remove-queue':
                return 'error';
            case 'global-update':
                return 'warning';
            default:
                return 'default';
        }
    };

    const getChangeTypeIcon = (type: ChangeSet['type']) => {
        switch (type) {
            case 'add-queue':
                return <EditIcon fontSize="small" />;
            case 'update-queue':
                return <InfoIcon fontSize="small" />;
            case 'remove-queue':
                return <DeleteIcon fontSize="small" />;
            case 'global-update':
                return <WarningIcon fontSize="small" />;
            default:
                return <InfoIcon fontSize="small" />;
        }
    };

    const renderChangeItem = (change: ChangeSet) => (
        <ListItem key={change.id} divider>
            <ListItemText
                primary={
                    <Box display="flex" alignItems="center" gap={1}>
                        <Chip
                            icon={getChangeTypeIcon(change.type)}
                            label={change.type.replace('-', ' ')}
                            size="small"
                            color={getChangeTypeColor(change.type) as any}
                            variant="outlined"
                        />
                        <Typography variant="body2" fontWeight="medium">
                            {change.property}
                        </Typography>
                    </Box>
                }
                secondary={
                    <Box component="div">
                        <Box component="div" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                            {change.description}
                        </Box>
                        <Box display="flex" alignItems="center" gap={2} mt={0.5}>
                            <Box
                                component="span"
                                sx={{
                                    fontSize: '0.75rem',
                                    color: 'text.secondary',
                                    display: 'flex',
                                    alignItems: 'center',
                                }}
                            >
                                <ScheduleIcon fontSize="inherit" sx={{ mr: 0.5 }} />
                                {formatTimestamp(change.timestamp)}
                            </Box>
                            {change.oldValue && (
                                <Box display="flex" alignItems="center" gap={0.5}>
                                    <Box component="span" sx={{ fontSize: '0.75rem', color: 'error.main' }}>
                                        From: {change.oldValue}
                                    </Box>
                                    <Box component="span" sx={{ fontSize: '0.75rem', color: 'success.main' }}>
                                        To: {change.newValue}
                                    </Box>
                                </Box>
                            )}
                        </Box>
                    </Box>
                }
            />
            <ListItemSecondaryAction>
                <Tooltip title="Remove change">
                    <IconButton edge="end" onClick={() => unstageChange(change.id)} size="small">
                        <DeleteIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            </ListItemSecondaryAction>
        </ListItem>
    );

    const renderGroupedChanges = () => {
        return Object.entries(groupedChanges).map(([groupKey, groupChanges]) => (
            <Accordion key={groupKey} defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="subtitle2" fontWeight="medium">
                            {groupBy === 'queue' ? `Queue: ${groupKey}` : `Type: ${groupKey}`}
                        </Typography>
                        <Chip label={groupChanges.length} size="small" color="primary" variant="outlined" />
                    </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 0 }}>
                    <List dense>{groupChanges.map(renderChangeItem)}</List>
                </AccordionDetails>
            </Accordion>
        ));
    };

    // Collapsed state - floating button/chip
    if (!isExpanded) {
        return (
            <Paper
                elevation={8}
                sx={{
                    position: 'fixed',
                    bottom: 24,
                    right: 24,
                    zIndex: 1300,
                    borderRadius: 3,
                    overflow: 'hidden',
                }}
            >
                <Button
                    onClick={() => setIsExpanded(true)}
                    variant="contained"
                    size="large"
                    startIcon={
                        <Badge badgeContent={changeCount} color="secondary" max={99}>
                            <EditIcon />
                        </Badge>
                    }
                    endIcon={<ExpandLessIcon />}
                    sx={{
                        px: 3,
                        py: 1.5,
                        textTransform: 'none',
                        fontWeight: 'medium',
                        bgcolor: hasConflicts ? 'warning.main' : 'primary.main',
                        '&:hover': {
                            bgcolor: hasConflicts ? 'warning.dark' : 'primary.dark',
                        },
                    }}
                >
                    {changeCount} Change{changeCount !== 1 ? 's' : ''} Staged
                </Button>
            </Paper>
        );
    }

    // Expanded state - drawer panel
    return (
        <Drawer
            anchor="bottom"
            open={isExpanded}
            onClose={() => setIsExpanded(false)}
            PaperProps={{
                sx: {
                    maxHeight: '70vh',
                    borderTopLeftRadius: 16,
                    borderTopRightRadius: 16,
                },
            }}
        >
            <Box sx={{ p: 2 }}>
                {/* Header */}
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                    <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="h6" fontWeight="bold">
                            Staged Changes
                        </Typography>
                        <Chip
                            label={`${changeCount} change${changeCount !== 1 ? 's' : ''}`}
                            color="primary"
                            size="small"
                        />
                    </Box>
                    <Box display="flex" alignItems="center" gap={1}>
                        <Button
                            size="small"
                            onClick={() => setGroupBy(groupBy === 'queue' ? 'type' : 'queue')}
                            variant="outlined"
                        >
                            Group by {groupBy === 'queue' ? 'Type' : 'Queue'}
                        </Button>
                        <IconButton onClick={() => setIsExpanded(false)} size="small">
                            <ExpandMoreIcon />
                        </IconButton>
                    </Box>
                </Box>

                {/* Conflicts Alert */}
                {hasConflicts && (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        <Typography variant="body2">
                            {conflicts.length} conflict{conflicts.length !== 1 ? 's' : ''} detected. Please resolve
                            before applying changes.
                        </Typography>
                    </Alert>
                )}

                {/* Changes List */}
                <Box sx={{ maxHeight: 400, overflow: 'auto', mb: 2 }}>{renderGroupedChanges()}</Box>

                {/* Actions */}
                <Stack direction="row" spacing={1} justifyContent="space-between">
                    <Button
                        variant="outlined"
                        color="error"
                        startIcon={<ClearIcon />}
                        onClick={handleClearAll}
                        size="small"
                    >
                        Clear All
                    </Button>

                    <Button
                        variant="contained"
                        startIcon={<SaveIcon />}
                        onClick={handleApplyChanges}
                        disabled={hasConflicts || !hasUnsavedChanges()}
                        size="small"
                    >
                        Apply Changes
                    </Button>
                </Stack>
            </Box>
        </Drawer>
    );
}

export default StagedChangesPanel;
