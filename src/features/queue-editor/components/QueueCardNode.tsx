import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Card, CardContent, Typography, Box, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { usePopupState, bindContextMenu, bindMenu } from 'material-ui-popup-state/hooks';
import type { LayoutQueue } from '../utils/layout/DagreLayout';
import { useChangesStore } from '../../../store';

const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export type QueueNodeData = LayoutQueue & Record<string, unknown> & {
    stagedStatus?: 'new' | 'deleted' | 'modified';
    isMatch?: boolean;
    isAncestorOfMatch?: boolean;
};

function QueueCardNode({ data, selected }: NodeProps<QueueNodeData>) {
    const { stageChange } = useChangesStore();
    const popupState = usePopupState({ variant: 'popover', popupId: `queue-menu-${data.queueName}` });

    const handleAddChildQueue = (event: React.MouseEvent) => {
        event.preventDefault();
        const newQueueName = `${data.queueName}_child_${Date.now()}`;
        stageChange({
            id: `add-${newQueueName}-${Date.now()}`,
            type: 'ADD_QUEUE',
            queuePath: data.queueName,
            property: newQueueName,
            oldValue: null,
            newValue: {
                capacity: 10,
                maxCapacity: 100,
                state: 'RUNNING'
            },
            timestamp: new Date()
        });
        popupState.close();
    };

    const handleDeleteQueue = (event: React.MouseEvent) => {
        event.preventDefault();
        // Don't allow deleting root queue
        if (data.queueName === 'root') {
            popupState.close();
            return;
        }

        stageChange({
            id: `delete-${data.queueName}-${Date.now()}`,
            type: 'DELETE_QUEUE',
            queuePath: data.queueName,
            property: data.queueName,
            oldValue: data, // Store full queue definition for undo
            newValue: null,
            timestamp: new Date()
        });
        popupState.close();
    };
    const liveCapacityData = {
        capacity: data.capacity || 0,
        usedCapacity: data.usedCapacity || 0,
        maxCapacity: data.maxCapacity || 100,
        absoluteCapacity: data.absoluteCapacity || 0,
        absoluteUsedCapacity: data.absoluteUsedCapacity || 0,
        absoluteMaxCapacity: data.absoluteMaxCapacity || 100,
    };


    // Get usage color using same logic as canvas renderer
    const getCanvasUsageColor = (used: number, total: number): string => {
        if (total === 0) return '#94a3b8';
        if (used >= 90) return '#ef4444';
        if (used >= 75) return '#f97316';
        if (used >= 50) return '#eab308';
        if (used > 0) return '#22c55e';
        return '#84cc16';
    };

    // Get border color based on staged status
    const getBorderColor = () => {
        if (data.stagedStatus === 'new') return '#22c55e'; // Green for new
        if (data.stagedStatus === 'deleted') return '#ef4444'; // Red for deleted
        if (data.stagedStatus === 'modified') return '#f59e0b'; // Orange for modified
        return '#e0e0e0'; // Default
    };

    const getBorderWidth = () => data.stagedStatus ? '2px' : '1px';

    return (
        <>
            <Card
                {...bindContextMenu(popupState)}
                sx={{
                    width: 280,
                    height: 220,
                    border: `${getBorderWidth()} solid ${getBorderColor()}`,
                    borderRadius: '12px',
                    boxShadow: selected 
                        ? '0 15px 30px rgba(0, 0, 0, 0.5)' 
                        : '0 2px 4px rgba(0, 0, 0, 0.15)',
                    transform: selected ? 'scale(1.02)' : 'scale(1)',
                    transition: 'all 0.2s ease-in-out',
                    backgroundColor: selected ? '#f0f8ff' : '#ffffff',
                    opacity: data.stagedStatus === 'deleted' ? 0.6 : 1,
                    textDecoration: data.stagedStatus === 'deleted' ? 'line-through' : 'none',
                    '&:hover': {
                        boxShadow: '0 12px 24px rgba(0, 0, 0, 0.4)',
                        transform: 'scale(1.02)',
                    },
                    overflow: 'hidden',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    cursor: 'pointer',
                }}
            >
            {/* React Flow Handles */}
            <Handle 
                type="target" 
                position={Position.Left} 
                style={{ 
                    background: '#555',
                    width: 8,
                    height: 8,
                    border: '2px solid #fff',
                }} 
            />
            <Handle 
                type="source" 
                position={Position.Right} 
                style={{ 
                    background: '#555',
                    width: 8,
                    height: 8,
                    border: '2px solid #fff',
                }} 
            />

            {/* Header with queue name - exactly like canvas */}
            <Box
                sx={{
                    padding: '8px 16px',
                    backgroundColor: '#f8fafc',
                    borderBottom: '1px solid #e5e7eb',
                    height: 40,
                    display: 'flex',
                    alignItems: 'center',
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
                    }}
                >
                    {data.queueName}
                </Typography>
            </Box>

            <CardContent sx={{ p: 0, height: 'calc(100% - 40px)' }}>
                {/* Badges section - exactly like canvas */}
                <Box sx={{ p: '8px 16px 0 16px' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        {/* Percentage mode badge */}
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
                                    color: '#3b82f6',
                                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                                    textTransform: 'uppercase',
                                }}
                            >
                                PERCENTAGE
                            </Typography>
                        </Box>

                        {/* State badge */}
                        <Box
                            sx={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                px: 1,
                                py: 0.25,
                                backgroundColor: data.state === 'RUNNING' ? '#d1fae5' : '#fee2e2',
                                border: `1px solid ${data.state === 'RUNNING' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                                borderRadius: '6px',
                                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                            }}
                        >
                            <Typography
                                sx={{
                                    fontWeight: 'bold',
                                    fontSize: '10px',
                                    color: data.state === 'RUNNING' ? '#10b981' : '#ef4444',
                                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                                }}
                            >
                                {data.state}
                            </Typography>
                        </Box>

                        {/* Auto creation badge if enabled */}
                        {data.autoCreateChildQueueEnabled && (
                            <Box
                                sx={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    px: 1,
                                    py: 0.25,
                                    backgroundColor: '#fef3c7',
                                    border: '1px solid rgba(245, 158, 11, 0.2)',
                                    borderRadius: '6px',
                                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                                }}
                            >
                                <Typography
                                    sx={{
                                        fontWeight: 'bold',
                                        fontSize: '10px',
                                        color: '#f59e0b',
                                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                                    }}
                                >
                                    AUTO
                                </Typography>
                            </Box>
                        )}
                    </Box>
                </Box>

                {/* Section divider - exactly like canvas */}
                <Box
                    sx={{
                        mx: 2,
                        height: '1px',
                        backgroundColor: '#e5e7eb',
                        mb: 1.5,
                    }}
                />

                {/* Capacity section */}
                <Box sx={{ px: 2, mb: 1.5 }}>
                    {/* Capacity bar - exactly like canvas */}
                    <Box
                        sx={{
                            position: 'relative',
                            height: 6,
                            backgroundColor: '#f0f0f0',
                            borderRadius: 3,
                            mb: 1.25,
                            overflow: 'hidden',
                        }}
                    >
                        {/* Max capacity background */}
                        {liveCapacityData.maxCapacity > liveCapacityData.capacity && (
                            <Box
                                sx={{
                                    position: 'absolute',
                                    left: 0,
                                    top: 0,
                                    height: '100%',
                                    width: `${Math.min(liveCapacityData.maxCapacity, 100)}%`,
                                    backgroundColor: '#e8f4ff',
                                    borderRadius: 3,
                                }}
                            />
                        )}
                        
                        {/* Current capacity */}
                        <Box
                            sx={{
                                position: 'absolute',
                                left: 0,
                                top: 0,
                                height: '100%',
                                width: `${Math.min(liveCapacityData.capacity, 100)}%`,
                                backgroundColor: '#bfdbfe',
                                borderRadius: 3,
                            }}
                        />
                        
                        {/* Used capacity */}
                        {liveCapacityData.usedCapacity > 0 && liveCapacityData.capacity > 0 && (
                            <Box
                                sx={{
                                    position: 'absolute',
                                    left: 0,
                                    top: 0,
                                    height: '100%',
                                    width: `${Math.min((liveCapacityData.usedCapacity / 100) * liveCapacityData.capacity, 100)}%`,
                                    backgroundColor: getCanvasUsageColor(liveCapacityData.usedCapacity, liveCapacityData.capacity),
                                    borderRadius: 3,
                                }}
                            />
                        )}
                    </Box>

                    {/* Capacity text - exactly like canvas */}
                    <Typography
                        sx={{
                            fontWeight: 'bold',
                            fontSize: '14px',
                            color: '#374151',
                            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                            mb: 0.25,
                        }}
                    >
                        Capacity: {liveCapacityData.capacity}%
                    </Typography>
                    <Typography
                        sx={{
                            fontSize: '12px',
                            color: '#6b7280',
                            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                            mb: 0.25,
                        }}
                    >
                        {liveCapacityData.usedCapacity.toFixed(1)}% in use
                    </Typography>
                    <Typography
                        sx={{
                            fontWeight: 'bold',
                            fontSize: '12px',
                            color: '#4b5563',
                            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                        }}
                    >
                        Max Capacity: {liveCapacityData.maxCapacity}%
                    </Typography>
                </Box>

                {/* Resources section - exactly like canvas */}
                {data.resourcesUsed && (data.resourcesUsed.memory > 0 || data.resourcesUsed.vCores > 0) && (
                    <Box sx={{ px: 2 }}>
                        {/* Section divider */}
                        <Box
                            sx={{
                                height: '1px',
                                backgroundColor: '#e5e7eb',
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
                                data.resourcesUsed.memory > 0 ? `Memory: ${formatBytes(data.resourcesUsed.memory * 1024 * 1024)}` : null,
                                data.resourcesUsed.vCores > 0 ? `vCores: ${data.resourcesUsed.vCores}` : null,
                                data.numApplications > 0 ? `Apps: ${data.numApplications}` : null
                            ].filter(Boolean).join(' • ')}
                        </Typography>
                    </Box>
                )}
            </CardContent>
        </Card>

        {/* Context Menu */}
        <Menu
            {...bindMenu(popupState)}
            anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'left',
            }}
            transformOrigin={{
                vertical: 'top',
                horizontal: 'left',
            }}
        >
            <MenuItem onClick={handleAddChildQueue}>
                <ListItemIcon>
                    <AddIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Add Child Queue</ListItemText>
            </MenuItem>
            {data.queueName !== 'root' && (
                <MenuItem onClick={handleDeleteQueue}>
                    <ListItemIcon>
                        <DeleteIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Delete Queue</ListItemText>
                </MenuItem>
            )}
        </Menu>
    </>
    );
}

export default React.memo(QueueCardNode);