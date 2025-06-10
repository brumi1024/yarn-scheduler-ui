import { Box, Typography, Chip, Divider } from '@mui/material';
import { useState, useEffect } from 'react';

export default function StatusBar() {
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [totalQueues] = useState<number>(0); // Will be connected to store later

  useEffect(() => {
    const interval = setInterval(() => {
      setLastRefresh(new Date());
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        px: 3,
        py: 1,
        backgroundColor: 'background.paper',
        borderTop: 1,
        borderColor: 'divider',
        minHeight: 48,
      }}
    >
      <Chip
        label={`${totalQueues} Queues`}
        variant="outlined"
        size="small"
        color={totalQueues > 0 ? 'primary' : 'default'}
      />
      
      <Divider orientation="vertical" flexItem />
      
      <Typography 
        variant="caption" 
        color="text.secondary"
        sx={{ display: { xs: 'none', sm: 'block' } }}
      >
        Last refresh: {formatTime(lastRefresh)}
      </Typography>
      
      <Box sx={{ flexGrow: 1 }} />
      
      <Typography 
        variant="caption" 
        color="text.secondary"
        sx={{ display: { xs: 'none', md: 'block' } }}
      >
        YARN Scheduler UI v2.0
      </Typography>
    </Box>
  );
}