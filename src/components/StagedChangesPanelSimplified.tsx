import React from 'react';
import {
  Paper,
  Box,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
} from '@mui/material';
import { Delete as DeleteIcon, Save as SaveIcon } from '@mui/icons-material';
import { useDataStore } from '../store/zustand';

export function StagedChangesPanel() {
  const { stagedChanges, unstageChange, clearStagedChanges, applyChanges, applyingChanges } = useDataStore();
  
  if (stagedChanges.length === 0) return null;
  
  const handleApplyChanges = async () => {
    await applyChanges();
  };
  
  return (
    <Paper
      elevation={8}
      sx={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        maxWidth: 400,
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h6">
            Staged Changes
          </Typography>
          <Chip label={stagedChanges.length} size="small" color="secondary" />
        </Box>
      </Box>
      
      <List sx={{ maxHeight: 300, overflow: 'auto' }}>
        {stagedChanges.map(change => (
          <ListItem key={change.id} divider>
            <ListItemText
              primary={`${change.queuePath} - ${change.property}`}
              secondary={`${change.oldValue} → ${change.newValue}`}
            />
            <ListItemSecondaryAction>
              <IconButton edge="end" onClick={() => unstageChange(change.id)} size="small">
                <DeleteIcon />
              </IconButton>
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>
      
      <Box sx={{ p: 2, display: 'flex', gap: 1 }}>
        <Button variant="outlined" onClick={clearStagedChanges} size="small" disabled={applyingChanges}>
          Clear All
        </Button>
        <Button 
          variant="contained" 
          startIcon={<SaveIcon />} 
          onClick={handleApplyChanges}
          size="small"
          disabled={applyingChanges}
        >
          {applyingChanges ? 'Applying...' : 'Apply Changes'}
        </Button>
      </Box>
    </Paper>
  );
}