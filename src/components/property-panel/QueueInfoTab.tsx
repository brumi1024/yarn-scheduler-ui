import React from 'react';
import { 
    Box, 
    Typography, 
    Card, 
    CardContent, 
    LinearProgress, 
    Chip,
    Stack,
    Grid,
    Accordion,
    AccordionSummary,
    AccordionDetails
} from '@mui/material';
import { 
    ExpandMore as ExpandMoreIcon,
    Memory as MemoryIcon,
    Speed as SpeedIcon,
    Apps as AppsIcon,
    Security as SecurityIcon,
    Schedule as ScheduleIcon,
    Info as InfoIcon
} from '@mui/icons-material';
import { useColorScheme } from '@mui/material/styles';
import type { QueueInfo } from '../../types';
import { formatMemory } from '../../utils/formatUtils';

interface QueueInfoTabProps {
    queue: QueueInfo;
}

export const QueueInfoTab: React.FC<QueueInfoTabProps> = ({ queue }) => {
    const { mode } = useColorScheme();
    const isLightMode = mode === 'light';

    const getUsageColor = (percentage: number) => {
        if (percentage >= 90) return '#ef4444';
        if (percentage >= 75) return '#f97316';
        if (percentage >= 50) return '#eab308';
        if (percentage > 0) return '#22c55e';
        return '#84cc16';
    };

    const formatPercentage = (value: number | undefined) => {
        return value ? `${value.toFixed(2)}%` : 'N/A';
    };

    const formatNumber = (value: number | undefined) => {
        return value !== undefined ? value.toString() : 'N/A';
    };

    return (
        <Box sx={{ p: 1.5 }}>
            {/* Resource Usage Section */}
            <Accordion defaultExpanded={true} sx={{ mb: 1, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)' }}>
                <AccordionSummary 
                    expandIcon={<ExpandMoreIcon />}
                    sx={{ 
                        backgroundColor: isLightMode ? '#f8fafc' : '#2d2d2d',
                        borderRadius: '8px 8px 0 0',
                        alignItems: 'flex-start',
                        py: 1
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <MemoryIcon fontSize="small" color="primary" />
                        <Typography variant="body2" fontWeight="medium">
                            Resource Utilization
                        </Typography>
                    </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0.75, pb: 0.75 }}>
                    <Stack spacing={0.75}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                Memory
                            </Typography>
                            <Typography variant="caption" fontWeight="medium" sx={{ fontSize: '0.75rem' }}>
                                {queue.resourcesUsed ? formatMemory(queue.resourcesUsed.memory) : '0 MB'}
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                vCores
                            </Typography>
                            <Typography variant="caption" fontWeight="medium" sx={{ fontSize: '0.75rem' }}>
                                {queue.resourcesUsed?.vCores || 0}
                            </Typography>
                        </Box>
                        <Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                    Capacity Usage
                                </Typography>
                                <Typography variant="caption" fontWeight="medium" sx={{ fontSize: '0.75rem' }}>
                                    {queue.usedCapacity.toFixed(1)}%
                                </Typography>
                            </Box>
                            <LinearProgress
                                variant="determinate"
                                value={Math.min(queue.usedCapacity, 100)}
                                sx={{
                                    height: 4,
                                    borderRadius: 2,
                                    backgroundColor: isLightMode ? '#f0f0f0' : '#424242',
                                    '& .MuiLinearProgress-bar': {
                                        backgroundColor: getUsageColor(queue.usedCapacity),
                                        borderRadius: 2,
                                    }
                                }}
                            />
                        </Box>
                    </Stack>
                </AccordionDetails>
            </Accordion>

            {/* Application Statistics */}
            <Accordion defaultExpanded={true} sx={{ mb: 1, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)' }}>
                <AccordionSummary 
                    expandIcon={<ExpandMoreIcon />}
                    sx={{ 
                        backgroundColor: isLightMode ? '#f8fafc' : '#2d2d2d',
                        borderRadius: '8px 8px 0 0',
                        alignItems: 'flex-start',
                        py: 1
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AppsIcon fontSize="small" color="primary" />
                        <Typography variant="body2" fontWeight="medium">
                            Application Statistics
                        </Typography>
                    </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0.75, pb: 0.75 }}>
                    <Grid container spacing={1}>
                        <Grid item xs={4}>
                            <Box sx={{ textAlign: 'center' }}>
                                <Typography variant="body2" fontWeight="bold" color="primary.main">
                                    {queue.numApplications}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                    Total Apps
                                </Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={4}>
                            <Box sx={{ textAlign: 'center' }}>
                                <Typography variant="body2" fontWeight="bold" color="success.main">
                                    {queue.numActiveApplications || 0}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                    Active
                                </Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={4}>
                            <Box sx={{ textAlign: 'center' }}>
                                <Typography variant="body2" fontWeight="bold" color="warning.main">
                                    {queue.numPendingApplications || 0}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                    Pending
                                </Typography>
                            </Box>
                        </Grid>
                    </Grid>
                </AccordionDetails>
            </Accordion>

            {/* Capacity Details */}
            <Accordion defaultExpanded={false} sx={{ mb: 1, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)' }}>
                <AccordionSummary 
                    expandIcon={<ExpandMoreIcon />}
                    sx={{ 
                        backgroundColor: isLightMode ? '#f8fafc' : '#2d2d2d',
                        borderRadius: '8px 8px 0 0',
                        alignItems: 'flex-start',
                        py: 1
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <SpeedIcon fontSize="small" color="primary" />
                        <Typography variant="body2" fontWeight="medium">
                            Capacity Configuration
                        </Typography>
                    </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0.75, pb: 0.75 }}>
                    <Stack spacing={0.75}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                Capacity
                            </Typography>
                            <Typography variant="caption" fontWeight="medium" sx={{ fontSize: '0.75rem' }}>
                                {formatPercentage(queue.capacity)}
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                Max Capacity
                            </Typography>
                            <Typography variant="caption" fontWeight="medium" sx={{ fontSize: '0.75rem' }}>
                                {formatPercentage(queue.maxCapacity)}
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                Used Capacity
                            </Typography>
                            <Typography 
                                variant="caption" 
                                fontWeight="medium" 
                                sx={{ fontSize: '0.75rem' }}
                                color={queue.usedCapacity > 80 ? 'error.main' : 'text.primary'}
                            >
                                {formatPercentage(queue.usedCapacity)}
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                Absolute Capacity
                            </Typography>
                            <Typography variant="caption" fontWeight="medium" sx={{ fontSize: '0.75rem' }}>
                                {formatPercentage(queue.absoluteCapacity)}
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                Absolute Max Capacity
                            </Typography>
                            <Typography variant="caption" fontWeight="medium" sx={{ fontSize: '0.75rem' }}>
                                {formatPercentage(queue.absoluteMaxCapacity)}
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                Absolute Used Capacity
                            </Typography>
                            <Typography 
                                variant="caption" 
                                fontWeight="medium" 
                                sx={{ fontSize: '0.75rem' }}
                                color={queue.absoluteUsedCapacity && queue.absoluteUsedCapacity > 80 ? 'error.main' : 'text.primary'}
                            >
                                {formatPercentage(queue.absoluteUsedCapacity)}
                            </Typography>
                        </Box>
                    </Stack>
                </AccordionDetails>
            </Accordion>

            {/* Queue Configuration */}
            <Accordion defaultExpanded={false} sx={{ mb: 1, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)' }}>
                <AccordionSummary 
                    expandIcon={<ExpandMoreIcon />}
                    sx={{ 
                        backgroundColor: isLightMode ? '#f8fafc' : '#2d2d2d',
                        borderRadius: '8px 8px 0 0',
                        alignItems: 'flex-start',
                        py: 1
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <SecurityIcon fontSize="small" color="primary" />
                        <Typography variant="body2" fontWeight="medium">
                            Queue Configuration
                        </Typography>
                    </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0.75, pb: 0.75 }}>
                    <Stack spacing={0.75}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                Queue Type
                            </Typography>
                            <Chip 
                                label={queue.type || 'Capacity Scheduler'} 
                                size="small" 
                                variant="outlined"
                                color="primary"
                            />
                        </Box>
                        
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                Queue State
                            </Typography>
                            <Chip 
                                label={queue.state} 
                                size="small" 
                                color={queue.state === 'RUNNING' ? 'success' : 'error'}
                            />
                        </Box>

                        {queue.autoCreationEligibility && (
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                    Auto Creation
                                </Typography>
                                <Chip 
                                    label={queue.autoCreationEligibility} 
                                    size="small" 
                                    color="info"
                                    variant="outlined"
                                />
                            </Box>
                        )}

                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                Queue Path
                            </Typography>
                            <Typography variant="caption" fontWeight="medium" sx={{ 
                                fontSize: '0.75rem',
                                wordBreak: 'break-all', 
                                textAlign: 'right',
                                maxWidth: '60%'
                            }}>
                                {queue.queuePath}
                            </Typography>
                        </Box>
                    </Stack>
                </AccordionDetails>
            </Accordion>

            {/* Additional Information */}
            <Accordion defaultExpanded={false} sx={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)' }}>
                <AccordionSummary 
                    expandIcon={<ExpandMoreIcon />}
                    sx={{ 
                        backgroundColor: isLightMode ? '#f8fafc' : '#2d2d2d',
                        borderRadius: '8px 8px 0 0',
                        alignItems: 'flex-start',
                        py: 1
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <InfoIcon fontSize="small" color="primary" />
                        <Typography variant="body2" fontWeight="medium">
                            Additional Information
                        </Typography>
                    </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0.75, pb: 0.75 }}>
                    <Stack spacing={0.75}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                Queue Name
                            </Typography>
                            <Typography variant="caption" fontWeight="medium" sx={{ fontSize: '0.75rem' }}>
                                {queue.queueName}
                            </Typography>
                        </Box>

                        {queue.queues?.queue && queue.queues.queue.length > 0 && (
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                    Child Queues
                                </Typography>
                                <Typography variant="caption" fontWeight="medium" sx={{ fontSize: '0.75rem' }}>
                                    {queue.queues.queue.length}
                                </Typography>
                            </Box>
                        )}

                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                Is Leaf Queue
                            </Typography>
                            <Typography variant="caption" fontWeight="medium" sx={{ fontSize: '0.75rem' }}>
                                {!queue.queues?.queue || queue.queues.queue.length === 0 ? 'Yes' : 'No'}
                            </Typography>
                        </Box>
                    </Stack>
                </AccordionDetails>
            </Accordion>
        </Box>
    );
};