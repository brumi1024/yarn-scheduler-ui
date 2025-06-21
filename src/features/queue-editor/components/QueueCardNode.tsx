import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Card, CardContent, Typography, Box, Menu, MenuItem, ListItemIcon, ListItemText, Checkbox, Tooltip, IconButton } from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Label } from '@mui/icons-material';
import { usePopupState, bindContextMenu, bindMenu } from 'material-ui-popup-state/hooks';
import type { LayoutQueue } from '../utils/layout/DagreLayout';
import type { Queue } from '../../../types/Queue';
import { useChangesStore, useUIStore } from '../../../store';
import { getInheritanceTooltip } from '../../../utils/nodeLabelUtils';

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
    const { openAddQueueModal, comparisonQueueNames, toggleComparisonQueue, selectedNodeLabel, selectQueue, openPropertyEditor } = useUIStore();
    const popupState = usePopupState({ variant: 'popover', popupId: `queue-menu-${data.queueName}` });
    
    const queuePath = data.queuePath || data.queueName;
    const isSelectedForComparison = comparisonQueueNames.includes(queuePath);
    
    // Node label filtering properties are now available directly from data
    const hasLabelAccess = data.hasLabelAccess ?? true;
    const effectiveCapacity = data.effectiveCapacity ?? data.capacity;
    const effectiveMaxCapacity = data.effectiveMaxCapacity ?? data.maxCapacity;
    const isLabelCapacityConfigured = data.isLabelCapacityConfigured ?? false;
    const isLabelMaxCapacityConfigured = data.isLabelMaxCapacityConfigured ?? false;

    const handleAddChildQueue = (event: React.MouseEvent) => {
        event.preventDefault();
        openAddQueueModal(data.queuePath || data.queueName);
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
            queuePath: data.queuePath || data.queueName, // Use full queue path
            property: data.queueName,
            oldValue: data, // Store full queue definition for undo
            newValue: null,
            timestamp: new Date()
        });
        popupState.close();
    };

    const handleComparisonCheck = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation(); // Prevent card selection
        toggleComparisonQueue(queuePath);
    };

    const liveCapacityData = {
        capacity: effectiveCapacity || 0,
        usedCapacity: data.usedCapacity || 0,
        maxCapacity: effectiveMaxCapacity || 100,
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
                    opacity: hasLabelAccess ? (data.stagedStatus === 'deleted' ? 0.6 : 1) : 0.5,
                    filter: hasLabelAccess ? 'none' : 'grayscale(50%)',
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
                    {data.queueName}
                </Typography>
                
                {/* Label indicators */}
                {selectedNodeLabel && hasLabelAccess && isLabelCapacityConfigured && (
                    <Tooltip title={`Capacity configured for ${selectedNodeLabel} label`}>
                        <Label 
                            sx={{ 
                                fontSize: 16,
                                color: 'primary.main',
                                mr: 1
                            }} 
                        />
                    </Tooltip>
                )}
                {selectedNodeLabel && !hasLabelAccess && (
                    <Tooltip title={`Click to grant access to ${selectedNodeLabel} label`}>
                        <IconButton
                            size="small"
                            sx={{ 
                                mr: 1,
                                backgroundColor: 'action.hover',
                                '&:hover': {
                                    backgroundColor: 'action.selected',
                                }
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                selectQueue(data.queuePath);
                                openPropertyEditor(data.queuePath, 'edit', 'node-labels');
                            }}
                        >
                            <AddIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                )}
                
                {/* Comparison checkbox */}
                <Checkbox
                    checked={isSelectedForComparison}
                    onChange={() => {}} // Handled by onClick
                    onClick={handleComparisonCheck}
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

                        {/* Staged status badge */}
                        {data.stagedStatus && (
                            <Box
                                sx={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    px: 1,
                                    py: 0.25,
                                    backgroundColor: 
                                        data.stagedStatus === 'new' ? '#dcfce7' :
                                        data.stagedStatus === 'deleted' ? '#fee2e2' :
                                        data.stagedStatus === 'modified' ? '#fef3c7' : '#f3f4f6',
                                    border: `1px solid ${
                                        data.stagedStatus === 'new' ? 'rgba(34, 197, 94, 0.2)' :
                                        data.stagedStatus === 'deleted' ? 'rgba(239, 68, 68, 0.2)' :
                                        data.stagedStatus === 'modified' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(156, 163, 175, 0.2)'
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
                                            data.stagedStatus === 'new' ? '#22c55e' :
                                            data.stagedStatus === 'deleted' ? '#ef4444' :
                                            data.stagedStatus === 'modified' ? '#f59e0b' : '#6b7280',
                                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                                        textTransform: 'uppercase',
                                    }}
                                >
                                    {data.stagedStatus === 'new' ? 'NEW' :
                                     data.stagedStatus === 'deleted' ? 'DELETED' :
                                     data.stagedStatus === 'modified' ? 'MODIFIED' : data.stagedStatus}
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

                    {/* Capacity text with label support */}
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 0.25 }}>
                        <Typography
                            sx={{
                                fontWeight: 'bold',
                                fontSize: '14px',
                                color: '#374151',
                                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                            }}
                        >
                            Capacity: {liveCapacityData.capacity}%
                            {liveCapacityData.maxCapacity !== 100 && (
                                <> / {liveCapacityData.maxCapacity}%</>
                            )}
                        </Typography>
                        {selectedNodeLabel && hasLabelAccess && (isLabelCapacityConfigured || isLabelMaxCapacityConfigured) && (
                            <Tooltip 
                                title={
                                    <Box component="div" sx={{ whiteSpace: 'pre-line' }}>
                                        {getInheritanceTooltip(
                                            data as Queue, 
                                            selectedNodeLabel,
                                            data.capacity,
                                            data.maxCapacity
                                            // Note: allQueues parameter omitted for now, will use fallback logic
                                        )}
                                    </Box>
                                }
                            >
                                <Label 
                                    sx={{ 
                                        fontSize: 14,
                                        color: 'primary.main'
                                    }} 
                                />
                            </Tooltip>
                        )}
                    </Box>
                    <Typography
                        sx={{
                            fontSize: '12px',
                            color: '#6b7280',
                            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                        }}
                    >
                        {liveCapacityData.usedCapacity.toFixed(1)}% in use
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