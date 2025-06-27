import React, { useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Box, Typography, Chip, LinearProgress } from '@mui/material';
import type { QueueNodeData } from './hooks/useQueueTreeData';
import { QueueContextMenu } from './components/QueueContextMenu';

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
    } = data;

    // Calculate usage percentage relative to capacity
    const usagePercentage = capacity > 0 ? (usedCapacity / capacity) * 100 : 0;

    // Determine border style based on state
    const getBorderStyle = () => {
        if (stagedStatus === 'deleted') return '2px dashed #ef5350';
        if (stagedStatus === 'new') return '2px solid #4caf50';
        if (stagedStatus === 'modified') return '2px solid #ff9800';
        if (selected) return '2px solid #1976d2';
        if (isLeaf) return '1px dashed #ccc';
        return '1px solid #e0e0e0';
    };

    const handleContextMenu = (event: React.MouseEvent) => {
        event.preventDefault();
        setContextMenu(
            contextMenu === null
                ? {
                      mouseX: event.clientX + 2,
                      mouseY: event.clientY - 6,
                  }
                : null
        );
    };

    const handleCloseContextMenu = () => {
        setContextMenu(null);
    };

    return (
        <>
            <Box
                data-testid="queue-card"
                className={`queue-card ${selected ? 'selected' : ''} ${isLeaf ? 'leaf-queue' : ''} ${stagedStatus === 'deleted' ? 'queue-deleted' : ''}`}
                onContextMenu={handleContextMenu}
                sx={{
                width: 280,
                bgcolor: 'background.paper',
                border: getBorderStyle(),
                borderRadius: 2,
                p: 2,
                opacity: stagedStatus === 'deleted' ? 0.6 : 1,
                textDecoration: stagedStatus === 'deleted' ? 'line-through' : 'none',
                boxShadow: selected ? 3 : 1,
                transition: 'all 0.2s',
                '&:hover': {
                    boxShadow: 3,
                },
            }}
        >
            {/* React Flow Handles */}
            <Handle 
                type="target" 
                position={Position.Left}
                style={{ background: '#555', width: 8, height: 8 }}
            />
            <Handle 
                type="source" 
                position={Position.Right}
                style={{ background: '#555', width: 8, height: 8 }}
            />

            {/* Header */}
            <Typography variant="h6" component="h3" className="queue-name" gutterBottom>
                {queueName}
            </Typography>

            {/* Badges */}
            <Box display="flex" gap={1} mb={2} className="queue-badges">
                {/* State Badge */}
                <Chip
                    label={state}
                    size="small"
                    className={`queue-state-badge ${state === 'RUNNING' ? 'queue-state-running' : 'queue-state-stopped'}`}
                    color={state === 'RUNNING' ? 'success' : 'error'}
                    variant="outlined"
                />

                {/* Staged Status Badge */}
                {stagedStatus && (
                    <Chip
                        label={stagedStatus.toUpperCase()}
                        size="small"
                        className={`staged-badge staged-${stagedStatus}`}
                        color={
                            stagedStatus === 'new' ? 'success' :
                            stagedStatus === 'modified' ? 'warning' :
                            'error'
                        }
                    />
                )}
            </Box>

            {/* Capacity Section */}
            <Box mb={2} className="capacity-section">
                <Box display="flex" justifyContent="space-between" mb={0.5} className="capacity-info">
                    <Typography variant="body2">{capacity}%</Typography>
                    <Typography variant="caption" color="text.secondary" className="usage-text">
                        {usedCapacity}% used
                    </Typography>
                </Box>

                {/* Capacity Bar using MUI LinearProgress */}
                <Box position="relative">
                    <LinearProgress
                        variant="determinate"
                        value={100}
                        sx={{
                            height: 8,
                            borderRadius: 1,
                            bgcolor: 'grey.200',
                            '& .MuiLinearProgress-bar': {
                                bgcolor: 'primary.light',
                            },
                        }}
                        data-testid="capacity-bar"
                        style={{ width: `${capacity}%` }}
                    />
                    <LinearProgress
                        variant="determinate"
                        value={usagePercentage}
                        sx={{
                            height: 8,
                            borderRadius: 1,
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: `${capacity}%`,
                            bgcolor: 'transparent',
                            '& .MuiLinearProgress-bar': {
                                bgcolor: 'primary.main',
                            },
                        }}
                        data-testid="usage-bar"
                        style={{ width: `${(usedCapacity / 100) * capacity}%` }}
                    />
                </Box>
            </Box>

            {/* Resources Section */}
            {resourcesUsed && (
                <Box display="flex" gap={2} className="resources-section">
                    <Typography variant="caption" color="text.secondary">
                        {formatMemory(resourcesUsed.memory)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        {resourcesUsed.vCores} vCores
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        {numApplications} apps
                    </Typography>
                </Box>
            )}
            </Box>

            <QueueContextMenu
                anchorEl={contextMenu ? document.elementFromPoint(contextMenu.mouseX, contextMenu.mouseY) as HTMLElement : null}
                open={contextMenu !== null}
                onClose={handleCloseContextMenu}
                queuePath={queuePath || id}
                queueState={state}
                onEditProperties={() => {
                    // TODO: Open property editor
                    console.log('Edit properties for', queuePath);
                    handleCloseContextMenu();
                }}
            />
        </>
    );
};

