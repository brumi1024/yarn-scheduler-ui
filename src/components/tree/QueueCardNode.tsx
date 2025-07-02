import React, { useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Box, Typography, Card, CardContent, Checkbox, Menu, MenuItem, ListItemIcon, ListItemText, Divider, Tooltip } from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon, PlayArrow as PlayIcon, Stop as StopIcon, AutoFixHigh as AutoIcon, Loop as LegacyIcon } from '@mui/icons-material';
import { usePopupState, bindContextMenu, bindMenu } from 'material-ui-popup-state/hooks';
import { useNavigate } from '@tanstack/react-router';
import type { QueueCardData } from './hooks/useQueueTreeData';
import { useQueueActions } from './hooks/useQueueActions';
import { useSchedulerStore } from '../../store/schedulerStore';
// Simple capacity parsing for display purposes
const parseCapacityValue = (input: string) => {
    const trimmed = input.trim();
    
    if (trimmed.endsWith('w')) {
        return { mode: 'weight' as const, value: trimmed };
    }
    
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        return { mode: 'absolute' as const, value: trimmed };
    }
    
    return { mode: 'percentage' as const, value: trimmed };
};
import { formatMemory } from '../../utils/formatUtils';

export const QueueCardNode: React.FC<NodeProps<QueueCardData>> = ({ data, selected, id }) => {
    const navigate = useNavigate();
    const popupState = usePopupState({ variant: 'popover', popupId: `queue-menu-${data.queueName}` });

    const comparisonQueues = useSchedulerStore(state => state.comparisonQueues);
    const selectedQueuePath = useSchedulerStore(state => state.selectedQueuePath);
    const toggleComparisonQueue = useSchedulerStore(state => state.toggleComparisonQueue);
    const selectQueue = useSchedulerStore(state => state.selectQueue);
    const setPropertyPanelOpen = useSchedulerStore(state => state.setPropertyPanelOpen);

    const { canAddChildQueue, canDeleteQueue, updateQueueProperty } = useQueueActions();

    const {
        queuePath,
        queueName,
        capacity,
        maxCapacity,
        state,
        usedCapacity,
        numApplications,
        resourcesUsed,
        stagedStatus,
        isLeaf,
        absoluteUsedCapacity,
        capacityConfig,
        maxCapacityConfig,
        stagedState,
        autoCreationStatus,
    } = data;

    const isSelectedForComparison = comparisonQueues.includes(queuePath);
    const isSelectedQueue = selectedQueuePath === queuePath;

    const getBorderColor = () => {
        if (stagedStatus === 'new') return '#22c55e';
        if (stagedStatus === 'deleted') return '#ef4444';
        if (stagedStatus === 'modified') return '#f59e0b';
        if (isSelectedQueue) return '#1976d2';
        return '#e0e0e0';
    };

    const getBorderWidth = () => {
        if (stagedStatus) return '2px';
        if (isSelectedQueue) return '2px';
        return '1px';
    };

    const getUsageColor = (used: number): string => {
        if (capacity === 0) return '#94a3b8';
        if (used >= 90) return '#ef4444';
        if (used >= 75) return '#f97316';
        if (used >= 50) return '#eab308';
        if (used > 0) return '#22c55e';
        return '#84cc16';
    };

    const getCapacityBarWidth = (): number => {
        if (maxCapacity === 0) return 0;
        return Math.min((capacity / maxCapacity) * 100, 100);
    };

    const getUsageBarWidth = (): number => {
        if (capacity === 0) return 0;
        return Math.min((usedCapacity / capacity) * 100, 100);
    };

    const getCapacityModeInfo = () => {
        const parsed = parseCapacityValue(capacityConfig);
        if (parsed.mode === 'weight') {
            return { label: 'WEIGHT', color: '#8b5cf6' };
        } else if (parsed.mode === 'absolute') {
            return { label: 'ABSOLUTE', color: '#f59e0b' };
        } else {
            return { label: 'PERCENT', color: '#3b82f6' };
        }
    };

    const capacityModeInfo = getCapacityModeInfo();
    const canAdd = canAddChildQueue(queuePath);
    const canDelete = canDeleteQueue(queuePath);
    const isRunning = state === 'RUNNING';

    const handleClick = (event: React.MouseEvent) => {
        event.stopPropagation();
        
        // Navigate to the queue route with property panel open
        const encodedQueuePath = encodeURIComponent(queuePath);
        navigate({
            to: '/queue/$queuePath',
            params: { queuePath: encodedQueuePath },
            search: {
                panel: true,
            },
        }).catch((error) => {
            console.error('Failed to navigate to queue:', error);
            // Fallback to store-only updates
            selectQueue(queuePath);
            setPropertyPanelOpen(true);
        });
    };

    const handleComparisonToggle = (event: React.MouseEvent) => {
        event.stopPropagation();
        toggleComparisonQueue(queuePath);
    };

    const handleAddChildQueue = () => {
        console.log('Add child queue to:', queuePath);
        popupState.close();
    };

    const handleDeleteQueue = () => {
        console.log('Delete queue:', queuePath);
        popupState.close();
    };

    const handleToggleState = () => {
        const newState = isRunning ? 'STOPPED' : 'RUNNING';
        updateQueueProperty(queuePath, 'state', newState);
        popupState.close();
    };

    const handleEditProperties = () => {
        // Navigate to the queue route with configuration tab open
        const encodedQueuePath = encodeURIComponent(queuePath);
        navigate({
            to: '/queue/$queuePath',
            params: { queuePath: encodedQueuePath },
            search: {
                panel: true,
            },
        }).catch((error) => {
            console.error('Failed to navigate to queue configuration:', error);
            // Fallback to store-only updates
            selectQueue(queuePath);
            setPropertyPanelOpen(true);
        });
        popupState.close();
    };

    return (
        <>
            <Card
                {...bindContextMenu(popupState)}
                sx={{
                    width: 320,
                    height: 220,
                    cursor: 'pointer',
                    border: `${getBorderWidth()} solid ${getBorderColor()}`,
                    borderRadius: 2,
                    boxShadow: isSelectedQueue ? 4 : (selected ? 3 : 1),
                    '&:hover': {
                        boxShadow: 3,
                        borderColor: '#1976d2',
                    },
                    transition: 'all 0.2s ease-in-out',
                    bgcolor: isSelectedQueue
                        ? 'rgba(25, 118, 210, 0.08)' // Light blue for selected
                        : isSelectedForComparison
                            ? 'action.selected'
                            : 'background.paper',
                }}
                onClick={handleClick}
            >
                <Box
                    sx={{
                        padding: '8px 16px',
                        backgroundColor: '#f8fafc',
                        borderBottom: '1px solid #e5e7eb',
                        height: 40,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}
                >
                    <Typography
                        sx={{
                            fontWeight: 'bold',
                            fontSize: '16px',
                            color: '#333333',
                            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            flex: 1,
                        }}
                    >
                        {queueName}
                    </Typography>

                    {autoCreationStatus && autoCreationStatus.status !== 'off' && (
                        <Tooltip title={`Auto Queue Creation: ${autoCreationStatus.status}${autoCreationStatus.isStaged ? ' (staged)' : ''}`}>
                            <Box
                                sx={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    ml: 1,
                                    color: autoCreationStatus.isStaged
                                        ? '#ff9800'
                                        : autoCreationStatus.status === 'flexible' ? '#10b981' : '#f59e0b',
                                    opacity: autoCreationStatus.isStaged ? 0.8 : 1,
                                }}
                            >
                                {autoCreationStatus.isStaged && '→'}
                                {autoCreationStatus.status === 'flexible' ?
                                    <AutoIcon sx={{ fontSize: '14px' }} /> :
                                    <LegacyIcon sx={{ fontSize: '14px' }} />
                                }
                            </Box>
                        </Tooltip>
                    )}

                    <Checkbox
                        checked={isSelectedForComparison}
                        onChange={handleComparisonToggle}
                        onClick={(e) => e.stopPropagation()}
                        size="small"
                        sx={{
                            padding: '2px',
                            '& .MuiSvgIcon-root': {
                                fontSize: '16px',
                            },
                        }}
                    />
                </Box>

                <CardContent sx={{ p: 0, height: 'calc(100% - 40px)' }}>
                    <Box sx={{ p: '8px 16px 0 16px' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <Box
                                sx={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    px: 1,
                                    py: 0.25,
                                    backgroundColor: '#dbeafe',
                                    border: '1px solid rgba(59, 130, 246, 0.2)',
                                    borderRadius: '6px',
                                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                                }}
                            >
                                <Typography
                                    sx={{
                                        fontWeight: 'bold',
                                        fontSize: '10px',
                                        color: capacityModeInfo.color,
                                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                                        textTransform: 'uppercase',
                                    }}
                                >
                                    {capacityModeInfo.label}
                                </Typography>
                            </Box>

                            <Box
                                sx={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    px: 1,
                                    py: 0.25,
                                    backgroundColor: state === 'RUNNING' ? '#d1fae5' : '#fee2e2',
                                    border: `1px solid ${state === 'RUNNING' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                                    borderRadius: '6px',
                                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                                }}
                            >
                                <Typography
                                    sx={{
                                        fontWeight: 'bold',
                                        fontSize: '10px',
                                        color: state === 'RUNNING' ? '#10b981' : '#ef4444',
                                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                                    }}
                                >
                                    {state}
                                </Typography>
                            </Box>

                            {stagedState && (
                                <Box
                                    sx={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        px: 0.5,
                                        py: 0.25,
                                        backgroundColor: '#fff7ed',
                                        border: '1px solid rgba(251, 146, 60, 0.3)',
                                        borderRadius: '6px',
                                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                                    }}
                                >
                                    <Typography
                                        sx={{
                                            fontWeight: 'bold',
                                            fontSize: '9px',
                                            color: '#ea580c',
                                            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                                            textTransform: 'uppercase',
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        →{stagedState}
                                    </Typography>
                                </Box>
                            )}

                            {stagedStatus && (
                                <Box
                                    sx={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        px: 1,
                                        py: 0.25,
                                        backgroundColor:
                                            stagedStatus === 'new' ? '#dcfce7' :
                                            stagedStatus === 'modified' ? '#fef3c7' :
                                            '#fee2e2',
                                        border: `1px solid ${
                                            stagedStatus === 'new' ? 'rgba(34, 197, 94, 0.2)' :
                                            stagedStatus === 'modified' ? 'rgba(245, 158, 11, 0.2)' :
                                            'rgba(239, 68, 68, 0.2)'
                                        }`,
                                        borderRadius: '6px',
                                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                                    }}
                                >
                                    <Typography
                                        sx={{
                                            fontWeight: 'bold',
                                            fontSize: '10px',
                                            color:
                                                stagedStatus === 'new' ? '#22c55e' :
                                                stagedStatus === 'modified' ? '#f59e0b' :
                                                '#ef4444',
                                            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                                            textTransform: 'uppercase',
                                        }}
                                    >
                                        {stagedStatus}
                                    </Typography>
                                </Box>
                            )}
                        </Box>

                        <Box sx={{ mb: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                                <Typography
                                    sx={{
                                        fontSize: '24px',
                                        fontWeight: 'bold',
                                        color: '#333333',
                                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                                    }}
                                >
                                    {(() => {
                                        const parsed = parseCapacityValue(capacityConfig);
                                        if (parsed.mode === 'weight') {
                                            return capacityConfig;
                                        } else if (parsed.mode === 'absolute') {
                                            return capacityConfig;
                                        } else {
                                            return capacityConfig.endsWith('%') ? capacityConfig : `${capacityConfig}%`;
                                        }
                                    })()}
                                </Typography>
                                <Typography
                                    sx={{
                                        fontSize: '12px',
                                        color: '#666666',
                                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                                    }}
                                >
                                    capacity
                                </Typography>
                            </Box>

                            <Box
                                sx={{
                                    position: 'relative',
                                    height: 6,
                                    backgroundColor: '#f0f0f0',
                                    borderRadius: 3,
                                    mt: 0.5,
                                    mb: 1.25,
                                    overflow: 'hidden',
                                }}
                            >
                                {maxCapacity > capacity && (
                                    <Box
                                        sx={{
                                            position: 'absolute',
                                            left: 0,
                                            top: 0,
                                            height: '100%',
                                            width: `${Math.min(maxCapacity, 100)}%`,
                                            backgroundColor: '#e8f4ff',
                                            borderRadius: 3,
                                        }}
                                    />
                                )}

                                <Box
                                    sx={{
                                        position: 'absolute',
                                        left: 0,
                                        top: 0,
                                        height: '100%',
                                        width: `${Math.min(capacity, 100)}%`,
                                        backgroundColor: '#bfdbfe',
                                        borderRadius: 3,
                                    }}
                                />

                                {usedCapacity > 0 && capacity > 0 && (
                                    <Box
                                        sx={{
                                            position: 'absolute',
                                            left: 0,
                                            top: 0,
                                            height: '100%',
                                            width: `${Math.min((usedCapacity / 100) * capacity, 100)}%`,
                                            backgroundColor: getUsageColor(usedCapacity),
                                            borderRadius: 3,
                                        }}
                                    />
                                )}
                            </Box>

                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                                <Typography
                                    sx={{
                                        fontSize: '11px',
                                        color: '#666666',
                                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                                    }}
                                >
                                    {usedCapacity.toFixed(1)}% used
                                </Typography>
                                <Typography
                                    sx={{
                                        fontSize: '11px',
                                        color: '#666666',
                                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                                    }}
                                >
                                    {(() => {
                                        const parsed = parseCapacityValue(maxCapacityConfig);
                                        if (parsed.mode === 'weight') {
                                            return `${maxCapacityConfig} max`;
                                        } else if (parsed.mode === 'absolute') {
                                            return `${maxCapacityConfig} max`;
                                        } else {
                                            const value = maxCapacityConfig.endsWith('%') ? maxCapacityConfig : `${maxCapacityConfig}%`;
                                            return `${value} max`;
                                        }
                                    })()}
                                </Typography>
                            </Box>
                        </Box>

                        {(resourcesUsed && (resourcesUsed.memory > 0 || resourcesUsed.vCores > 0)) || numApplications > 0 ? (
                            <>
                                <Box
                                    sx={{
                                        height: '1px',
                                        backgroundColor: '#e5e7eb',
                                        mt: 1,
                                        mb: 1,
                                    }}
                                />

                                <Typography
                                    sx={{
                                        fontSize: '12px',
                                        color: '#6b7280',
                                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                                    }}
                                >
                                    {[
                                        resourcesUsed?.memory && resourcesUsed.memory > 0
                                            ? `Memory: ${formatMemory(resourcesUsed.memory)}`
                                            : null,
                                        resourcesUsed?.vCores && resourcesUsed.vCores > 0
                                            ? `vCores: ${resourcesUsed.vCores}`
                                            : null,
                                        numApplications > 0 ? `Apps: ${numApplications}` : null,
                                    ]
                                        .filter(Boolean)
                                        .join(' • ')}
                                </Typography>
                            </>
                        ) : null}

                        {absoluteUsedCapacity !== usedCapacity && (
                            <Box sx={{ mt: 0.5 }}>
                                <Typography
                                    sx={{
                                        fontSize: '10px',
                                        color: '#999999',
                                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                                    }}
                                >
                                    {absoluteUsedCapacity.toFixed(1)}% used of cluster
                                </Typography>
                            </Box>
                        )}
                    </Box>
                </CardContent>

                {/* Full-height invisible handles for Sankey connections */}
                <Handle
                    type="target"
                    position={Position.Left}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        width: 8,
                        height: 220, // Full card height
                        top: '0px',
                        left: '-4px',
                        opacity: 0,
                    }}
                />
                <Handle
                    type="source"
                    position={Position.Right}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        width: 8,
                        height: 220, // Full card height
                        top: '0px',
                        right: '-4px',
                        opacity: 0,
                    }}
                />
            </Card>

            <Menu
                {...bindMenu(popupState)}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                }}
            >
                {canAdd && (
                    <MenuItem onClick={handleAddChildQueue}>
                        <ListItemIcon>
                            <AddIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>Add Child Queue</ListItemText>
                    </MenuItem>
                )}

                <MenuItem onClick={handleEditProperties}>
                    <ListItemIcon>
                        <EditIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Edit Properties</ListItemText>
                </MenuItem>

                <Divider />

                <MenuItem onClick={handleToggleState}>
                    <ListItemIcon>
                        {isRunning ? <StopIcon fontSize="small" /> : <PlayIcon fontSize="small" />}
                    </ListItemIcon>
                    <ListItemText>{isRunning ? 'Stop Queue' : 'Start Queue'}</ListItemText>
                </MenuItem>

                {canDelete && <Divider />}
                {canDelete && (
                    <MenuItem onClick={handleDeleteQueue}>
                        <ListItemIcon>
                            <DeleteIcon fontSize="small" color="error" />
                        </ListItemIcon>
                        <ListItemText>Delete Queue</ListItemText>
                    </MenuItem>
                )}
            </Menu>
        </>
    );
};