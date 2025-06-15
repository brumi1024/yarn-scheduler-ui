import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Box,
  Paper,
  Typography,
  Chip,
  LinearProgress,
  Divider,
  IconButton,
  Button,
  Alert,
  Tabs,
  Tab,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import type { Queue } from '../types/Queue';
import { QUEUE_PROPERTIES, getPropertyGroups } from '../config/properties';
import { PropertyFormField } from './forms/PropertyFormField';
import { useDataStore } from '../store/zustand';
import { nanoid } from 'nanoid';

interface QueueInfoPanelProps {
  queue: Queue | null;
  open: boolean;
  onClose: () => void;
}

export function QueueInfoPanel({ queue, open, onClose }: QueueInfoPanelProps) {
  const [activeTab, setActiveTab] = useState(0);
  const { stageChange } = useDataStore();
  
  // Create validation schema from properties
  const validationSchema = z.object(
    Object.entries(QUEUE_PROPERTIES).reduce((acc, [key, prop]) => ({
      ...acc,
      [key]: prop.validation
    }), {})
  );
  
  const form = useForm({
    resolver: zodResolver(validationSchema),
    defaultValues: {},
  });
  
  const { handleSubmit, reset, formState: { errors, isDirty } } = form;
  
  useEffect(() => {
    if (queue && open) {
      // Map queue data to form fields
      const formData: Record<string, any> = {};
      
      formData.capacity = `${queue.capacity}%`;
      formData['maximum-capacity'] = `${queue.maxCapacity}%`;
      formData.state = queue.state;
      formData['user-limit-factor'] = queue.userLimitFactor || 1;
      formData['ordering-policy'] = queue.orderingPolicy || 'fifo';
      formData['disable_preemption'] = queue.preemptionDisabled || false;
      formData['maximum-applications'] = queue.maxApplications || 0;
      formData['maximum-am-resource-percent'] = (queue as any).maxAMResourcePercent || 0.1;
      formData['auto-create-child-queue.enabled'] = queue.autoCreateChildQueueEnabled || false;
      
      reset(formData);
      setActiveTab(0);
    }
  }, [queue, open, reset]);
  
  const onSubmit = (data: Record<string, any>) => {
    if (!queue) return;
    
    // Stage changes
    Object.entries(data).forEach(([key, value]) => {
      const currentValue = (form.getValues() as any)[key];
      if (value !== currentValue) {
        stageChange({
          id: nanoid(),
          queuePath: queue.queuePath || queue.queueName,
          property: key,
          oldValue: String(currentValue),
          newValue: String(value),
          timestamp: new Date(),
        });
      }
    });
    
    onClose();
  };
  
  if (!queue || !open) return null;
  
  const propertyGroups = getPropertyGroups();
  
  return (
    <Paper
      elevation={3}
      sx={{
        position: 'fixed',
        top: 112,
        right: open ? 0 : -400,
        width: 400,
        height: 'calc(100vh - 112px)',
        transition: 'right 0.3s',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center' }}>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          {queue.queueName}
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>
      
      {/* Tabs */}
      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
        <Tab label="Overview" />
        <Tab label="Settings" />
      </Tabs>
      
      {/* Content */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
        {activeTab === 0 && (
          <Box>
            {/* State */}
            <Chip 
              label={queue.state} 
              color={queue.state === 'RUNNING' ? 'success' : 'error'} 
              size="small"
              sx={{ mb: 2 }}
            />
            
            {/* Capacity */}
            <Typography variant="subtitle2" gutterBottom>Capacity</Typography>
            <LinearProgress 
              variant="determinate" 
              value={queue.usedCapacity} 
              sx={{ mb: 1 }}
            />
            <Typography variant="caption" color="text.secondary">
              {queue.usedCapacity}% of {queue.capacity}% used (max: {queue.maxCapacity}%)
            </Typography>
            
            <Divider sx={{ my: 2 }} />
            
            {/* Resources */}
            <Typography variant="subtitle2" gutterBottom>Resources</Typography>
            <Typography variant="body2">
              Memory: {queue.resourcesUsed.memory} MB
            </Typography>
            <Typography variant="body2">
              vCores: {queue.resourcesUsed.vCores}
            </Typography>
            <Typography variant="body2">
              Applications: {queue.numApplications}
            </Typography>
          </Box>
        )}
        
        {activeTab === 1 && (
          <form onSubmit={handleSubmit(onSubmit)}>
            {propertyGroups.map(group => (
              <Box key={group.name} sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  {group.name}
                </Typography>
                {group.properties.map(prop => (
                  <PropertyFormField
                    key={prop.key}
                    property={prop}
                    control={form.control}
                    name={prop.key}
                  />
                ))}
              </Box>
            ))}
            
            {Object.keys(errors).length > 0 && (
              <Alert severity="error" sx={{ mt: 2 }}>
                Please fix validation errors
              </Alert>
            )}
            
            {isDirty && (
              <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                <Button variant="outlined" onClick={() => reset()}>
                  Reset
                </Button>
                <Button variant="contained" type="submit">
                  Save Changes
                </Button>
              </Box>
            )}
          </form>
        )}
      </Box>
    </Paper>
  );
}