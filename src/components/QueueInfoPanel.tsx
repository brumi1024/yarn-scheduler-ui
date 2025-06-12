import React from 'react';
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
  CardContent
} from '@mui/material';
import {
  Close as CloseIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import type { Queue } from '../types/Queue';

export interface QueueInfoPanelProps {
  queue: Queue | null;
  open: boolean;
  onClose: () => void;
  onEdit?: (queuePath: string) => void;
  onDelete?: (queuePath: string) => void;
  onToggleState?: (queuePath: string, newState: 'RUNNING' | 'STOPPED') => void;
}

export const QueueInfoPanel: React.FC<QueueInfoPanelProps> = ({
  queue,
  open,
  onClose,
  onEdit,
  onDelete,
  onToggleState
}) => {
  if (!queue || !open) {
    return null;
  }

  const handleEdit = () => {
    if (onEdit) {
      onEdit(queue.queueName);
    }
  };

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
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2), 0 4px 16px rgba(0, 0, 0, 0.1)',
        pointerEvents: open ? 'auto' : 'none' // Allow clicks to pass through when closed
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          bgcolor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <InfoIcon color="action" />
          <Typography variant="h6" component="h2" color="text.primary">
            Queue Details
          </Typography>
        </Box>
        <IconButton
          onClick={onClose}
          sx={{ color: 'text.secondary' }}
        >
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {/* Basic Info */}
        <Card sx={{ 
          mb: 2, 
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.06)' 
        }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6" component="h3">
                {queue.queueName}
              </Typography>
              <Chip
                label={queue.state}
                color={getStateColor(queue.state)}
                size="small"
              />
            </Box>
            
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Applications
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {queue.numApplications}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Path
                </Typography>
                <Typography variant="body1" fontWeight="medium" sx={{ wordBreak: 'break-all' }}>
                  {(queue as any).queuePath || (queue as any).id || queue.queueName}
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Capacity Metrics */}
        <Card sx={{ 
          mb: 2, 
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.06)' 
        }}>
          <CardContent>
            <Typography variant="h6" component="h3" sx={{ mb: 2 }}>
              Capacity Metrics
            </Typography>
            
            {/* Capacity */}
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Capacity
                </Typography>
                <Typography variant="body2">
                  {queue.capacity}% (max: {queue.maxCapacity}%)
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={getCapacityPercentage(queue.capacity, queue.maxCapacity)}
                color={getUsageColor(getCapacityPercentage(queue.capacity, queue.maxCapacity))}
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Box>

            {/* Used Capacity */}
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Used Capacity
                </Typography>
                <Typography variant="body2">
                  {queue.usedCapacity}% of {queue.capacity}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={getCapacityPercentage(queue.usedCapacity, queue.capacity)}
                color={getUsageColor(getCapacityPercentage(queue.usedCapacity, queue.capacity))}
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Box>

            {/* Absolute Values */}
            <Divider sx={{ my: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Absolute Capacity
                </Typography>
                <Typography variant="body1">
                  {queue.absoluteCapacity}%
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Abs. Used Capacity
                </Typography>
                <Typography variant="body1">
                  {queue.absoluteUsedCapacity}%
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Resource Usage */}
        <Card sx={{ 
          mb: 2, 
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.06)' 
        }}>
          <CardContent>
            <Typography variant="h6" component="h3" sx={{ mb: 2 }}>
              Resource Usage
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Memory
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {formatBytes(queue.resourcesUsed.memory * 1024 * 1024)}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  vCores
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {queue.resourcesUsed.vCores}
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Child Queues */}
        {(() => {
          const childQueues = (queue as any).children || queue.queues?.queue;
          return childQueues && childQueues.length > 0 && (
            <Card sx={{ 
              mb: 2, 
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.06)' 
            }}>
              <CardContent>
                <Typography variant="h6" component="h3" sx={{ mb: 2 }}>
                  Child Queues ({childQueues.length})
                </Typography>
                
                {childQueues.map((child: any, index: number) => (
                  <Box
                    key={child.queueName}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      py: 1,
                      borderBottom: index < childQueues.length - 1 ? 1 : 0,
                      borderColor: 'divider'
                    }}
                  >
                  <Box>
                    <Typography variant="body2" fontWeight="medium">
                      {child.queueName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {child.capacity}% capacity, {child.numApplications} apps
                    </Typography>
                  </Box>
                  <Chip
                    label={child.state}
                    color={getStateColor(child.state)}
                    size="small"
                  />
                </Box>
              ))}
            </CardContent>
          </Card>
        );
        })()}
      </Box>

      {/* Quick Actions */}
      <Box
        sx={{
          p: 2,
          borderTop: 1,
          borderColor: 'divider',
          bgcolor: 'background.default'
        }}
      >
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Quick Actions
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Edit Queue">
            <IconButton
              onClick={handleEdit}
              color="primary"
              size="small"
            >
              <EditIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title={queue.state === 'RUNNING' ? 'Stop Queue' : 'Start Queue'}>
            <IconButton
              onClick={handleToggleState}
              color={queue.state === 'RUNNING' ? 'error' : 'success'}
              size="small"
            >
              {queue.state === 'RUNNING' ? <StopIcon /> : <PlayIcon />}
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Delete Queue">
            <IconButton
              onClick={handleDelete}
              color="error"
              size="small"
            >
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Paper>
  );
};

export default QueueInfoPanel;