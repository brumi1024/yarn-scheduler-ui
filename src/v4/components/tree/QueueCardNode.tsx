import React, { useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Box, Typography, Card, CardContent, Checkbox } from '@mui/material';
import type { QueueNodeData } from './hooks/useQueueTreeData';
import { QueueContextMenu } from './components/QueueContextMenu';
import { useSchedulerStore } from '../../store/schedulerStore';
import { parseCapacityValue } from '../../../utils/capacity';

// Helper function to format memory
const formatMemory = (memoryMB: number): string => {
    if (memoryMB < 1024) {
        return `${memoryMB} MB`;
    }
    const gb = memoryMB / 1024;
    return gb % 1 === 0 ? `${gb} GB` : `${gb.toFixed(1)} GB`;
};

export const QueueCardNode: React.FC<NodeProps<QueueNodeData>> = ({ data, selected, id }) => {
    const [contextMenu, setContextMenu] = useState<{
        mouseX: number;
        mouseY: number;
    } | null>(null);
    
    // Store access for comparison functionality
    const comparisonQueues = useSchedulerStore(state => state.comparisonQueues);
    const toggleComparisonQueue = useSchedulerStore(state => state.toggleComparisonQueue);

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
        autoCreateChildQueueEnabled,
    } = data;
    
    const isSelectedForComparison = comparisonQueues.includes(queuePath);

    // Get border color based on staged status (matching original)
    const getBorderColor = () => {
        if (stagedStatus === 'new') return '#22c55e'; // Green for new
        if (stagedStatus === 'deleted') return '#ef4444'; // Red for deleted
        if (stagedStatus === 'modified') return '#f59e0b'; // Orange for modified
        return '#e0e0e0'; // Default
    };

    const getBorderWidth = () => (stagedStatus ? '2px' : '1px');

    // Get usage color using same logic as original
    const getUsageColor = (used: number): string => {
        if (capacity === 0) return '#94a3b8'; // Gray for no capacity
        if (used >= 90) return '#ef4444';
        if (used >= 75) return '#f97316';
        if (used >= 50) return '#eab308';
        if (used > 0) return '#22c55e';
        return '#84cc16';
    };

    // Determine the capacity mode based on the actual value
    const getCapacityModeInfo = () => {
        // Get the raw capacity value from node properties (not the parsed numeric value)
        const rawCapacity = data.queuePath ? 
            useSchedulerStore.getState().getQueueDisplayValue(data.queuePath, 'capacity').value : 
            `${capacity}%`;
        
        const parsed = parseCapacityValue(rawCapacity);
        
        switch (parsed.mode) {
            case 'weight':
                return { label: 'WEIGHT', color: '#10b981' };
            case 'absolute':
                return { label: 'ABSOLUTE', color: '#f59e0b' };
            case 'percentage':
            default:
                return { label: 'PERCENTAGE', color: '#3b82f6' };
        }
    };
    
    const capacityModeInfo = getCapacityModeInfo();

    const handleContextMenu = (event: React.MouseEvent) => {
        event.preventDefault();
        setContextMenu(
            contextMenu === null
                ? {
                      mouseX: event.clientX + 2,
                      mouseY: event.clientY - 6,
                  }
                : null,
        );
    };

    const handleCloseContextMenu = () => {
        setContextMenu(null);
    };
    
    const handleComparisonCheck = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation(); // Prevent card selection
        toggleComparisonQueue(queuePath);
    };

    return (
        <>
            <Card
                data-testid="queue-card"
                onContextMenu={handleContextMenu}
                sx={{
                    width: 280,
                    height: 220,
                    border: `${getBorderWidth()} solid ${getBorderColor()}`,
                    borderRadius: '12px',
                    boxShadow: selected ? '0 15px 30px rgba(0, 0, 0, 0.5)' : '0 2px 4px rgba(0, 0, 0, 0.15)',
                    transform: selected ? 'scale(1.02)' : 'scale(1)',
                    transition: 'all 0.2s ease-in-out',
                    backgroundColor: selected ? '#f0f8ff' : '#ffffff',
                    opacity: stagedStatus === 'deleted' ? 0.6 : 1,
                    textDecoration: stagedStatus === 'deleted' ? 'line-through' : 'none',
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

                {/* Header with queue name - exactly like original */}
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
                    {/* Badges section - exactly like original */}
                    <Box sx={{ p: '8px 16px 0 16px' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            {/* Capacity mode badge */}
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

                            {/* State badge */}
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
                            
                            {/* Auto creation badge if enabled */}
                            {autoCreateChildQueueEnabled && (
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

                            {/* Staged status badge if applicable */}
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

                        {/* Capacity info */}
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
                                    {capacity}%
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
                            
                            {/* Capacity bar - exactly like original */}
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
                                {/* Max capacity background */}
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

                                {/* Current capacity */}
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

                                {/* Used capacity */}
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

                            {/* Usage text */}
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                                <Typography
                                    sx={{
                                        fontSize: '11px',
                                        color: '#666666',
                                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                                    }}
                                >
                                    {usedCapacity}% used
                                </Typography>
                                <Typography
                                    sx={{
                                        fontSize: '11px',
                                        color: '#666666',
                                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                                    }}
                                >
                                    {maxCapacity}% max
                                </Typography>
                            </Box>
                        </Box>

                        {/* Resources section - only show if there are resources used */}
                        {(resourcesUsed && (resourcesUsed.memory > 0 || resourcesUsed.vCores > 0)) || numApplications > 0 ? (
                            <>
                                {/* Section divider */}
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

                        {/* Absolute used capacity if different from used capacity */}
                        {absoluteUsedCapacity !== usedCapacity && (
                            <Box sx={{ mt: 0.5 }}>
                                <Typography
                                    sx={{
                                        fontSize: '10px',
                                        color: '#999999',
                                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                                    }}
                                >
                                    {absoluteUsedCapacity}% used of cluster
                                </Typography>
                            </Box>
                        )}
                    </Box>
                </CardContent>
            </Card>

            {/* Context Menu */}
            <QueueContextMenu
                anchorEl={contextMenu ? (document.elementFromPoint(contextMenu.mouseX, contextMenu.mouseY) as HTMLElement) : null}
                open={contextMenu !== null}
                onClose={handleCloseContextMenu}
                queuePath={queuePath}
                queueState={state}
                onEditProperties={() => {
                    // TODO: Implement property editor opening
                    handleCloseContextMenu();
                }}
            />
        </>
    );
};