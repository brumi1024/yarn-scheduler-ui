import { Box, Typography, Chip, Divider, CircularProgress } from '@mui/material';
import { useState, useEffect } from 'react';
import { useAllQueues } from '../store';
import { useSchedulerQuery } from '../hooks/useYarnApi';
import { useValidationStatus } from '../hooks/useValidationStatus';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

export default function StatusBar() {
    const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

    const allQueues = useAllQueues();
    const schedulerQuery = useSchedulerQuery();
    const { errors, warnings, isValidating } = useValidationStatus();

    // Derive health status from scheduler query
    const healthStatus = schedulerQuery.isLoading ? 'loading' : schedulerQuery.isError ? 'error' : 'ok';

    const totalQueues = allQueues.length;

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

            <Chip
                label={healthStatus === 'ok' ? 'Healthy' : healthStatus === 'error' ? 'Error' : 'Loading'}
                variant="outlined"
                size="small"
                color={healthStatus === 'ok' ? 'success' : healthStatus === 'error' ? 'error' : 'default'}
            />

            {/* Validation Status */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {isValidating ? (
                    <CircularProgress size={16} />
                ) : errors > 0 ? (
                    <Chip
                        icon={<ErrorIcon />}
                        label={`${errors} error${errors !== 1 ? 's' : ''}`}
                        color="error"
                        size="small"
                        variant="outlined"
                    />
                ) : warnings > 0 ? (
                    <Chip
                        icon={<WarningIcon />}
                        label={`${warnings} warning${warnings !== 1 ? 's' : ''}`}
                        color="warning"
                        size="small"
                        variant="outlined"
                    />
                ) : (
                    <Chip icon={<CheckCircleIcon />} label="Valid" color="success" size="small" variant="outlined" />
                )}
            </Box>

            <Divider orientation="vertical" flexItem />

            <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
                Last refresh: {formatTime(lastRefresh)}
            </Typography>

            <Box sx={{ flexGrow: 1 }} />

            <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', md: 'block' } }}>
                YARN Scheduler UI v2.0
            </Typography>
        </Box>
    );
}
