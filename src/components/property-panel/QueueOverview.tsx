import React from 'react';
import { 
    Box, 
    Typography, 
    Card, 
    CardContent, 
    LinearProgress, 
    Chip,
    Stack,
    Divider,
    Grid,
    Accordion,
    AccordionSummary,
    AccordionDetails
} from '@mui/material';
import { 
    ExpandMore as ExpandMoreIcon,
    AutoFixHigh as AutoIcon,
    Loop as LegacyIcon
} from '@mui/icons-material';
import { useColorScheme } from '@mui/material/styles';
import type { QueueInfo } from '../../types';
import { formatMemory } from '../../utils/formatUtils';

interface QueueOverviewProps {
    queue: QueueInfo;
}

export const QueueOverview: React.FC<QueueOverviewProps> = ({ queue }) => {
    const { mode } = useColorScheme();
    const isLightMode = mode === 'light';

    const getStateColor = (state: string) => {
        return state === 'RUNNING' ? 'success' : 'error';
    };

    const getUsageColor = (percentage: number) => {
        if (percentage >= 90) return '#ef4444';
        if (percentage >= 75) return '#f97316';
        if (percentage >= 50) return '#eab308';
        if (percentage > 0) return '#22c55e';
        return '#84cc16';
    };

    const capacityPercent = (queue.capacity / Math.max(queue.maxCapacity, 1)) * 100;
    const usagePercent = (queue.usedCapacity / Math.max(queue.capacity, 1)) * 100;

    return (
        <Box sx={{ p: 1.5 }}>
            {/* Queue Header Section */}
            <Box sx={{ mb: 1.5 }}>
                <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5 }}>
                    {queue.queueName}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                    Connected to <Typography component="span" color="primary.main">{queue.queuePath}</Typography>
                </Typography>
            </Box>

            {/* Status and Capacity Section */}
            <Card sx={{ 
                mb: 2, 
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
                backgroundColor: isLightMode ? '#f8fafc' : '#2d2d2d'
            }}>
                <CardContent sx={{ p: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                        <Chip
                            label={queue.state}
                            color={getStateColor(queue.state)}
                            size="small"
                            sx={{ fontWeight: 600 }}
                        />
                        {queue.autoCreationEligibility && queue.autoCreationEligibility !== 'off' && (
                            <Chip
                                icon={queue.autoCreationEligibility === 'flexible' ? <AutoIcon /> : <LegacyIcon />}
                                label={`Auto Creation: ${queue.autoCreationEligibility}`}
                                color="info"
                                size="small"
                                variant="outlined"
                            />
                        )}
                    </Box>

                    {/* Capacity Usage Progress */}
                    <Box sx={{ mb: 1.5 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 1 }}>
                            <Typography variant="caption" fontWeight="medium">
                                Capacity Usage
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                {queue.capacity.toFixed(1)}% of {queue.maxCapacity.toFixed(1)}%
                            </Typography>
                        </Box>
                        
                        <Box sx={{ position: 'relative', mb: 1 }}>
                            {/* Background bar */}
                            <LinearProgress
                                variant="determinate"
                                value={100}
                                sx={{
                                    height: 4,
                                    borderRadius: 2,
                                    backgroundColor: isLightMode ? '#f0f0f0' : '#424242',
                                    '& .MuiLinearProgress-bar': {
                                        backgroundColor: isLightMode ? '#e8f4ff' : 'rgba(59, 130, 246, 0.1)',
                                    }
                                }}
                            />
                            {/* Capacity bar */}
                            <LinearProgress
                                variant="determinate"
                                value={Math.min(capacityPercent, 100)}
                                sx={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    height: 4,
                                    borderRadius: 2,
                                    backgroundColor: 'transparent',
                                    '& .MuiLinearProgress-bar': {
                                        backgroundColor: isLightMode ? '#bfdbfe' : 'rgba(59, 130, 246, 0.2)',
                                    }
                                }}
                            />
                            {/* Usage bar */}
                            <LinearProgress
                                variant="determinate"
                                value={Math.min((queue.usedCapacity / Math.max(queue.maxCapacity, 1)) * 100, 100)}
                                sx={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    height: 4,
                                    borderRadius: 2,
                                    backgroundColor: 'transparent',
                                    '& .MuiLinearProgress-bar': {
                                        backgroundColor: getUsageColor(usagePercent),
                                    }
                                }}
                            />
                        </Box>
                        
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="caption" color="text.secondary">
                                {queue.usedCapacity.toFixed(1)}% used
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {queue.absoluteUsedCapacity?.toFixed(1)}% of cluster
                            </Typography>
                        </Box>
                    </Box>
                </CardContent>
            </Card>

            {/* Resource Information */}
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
                    <Typography variant="body2" fontWeight="medium">
                        Resource Usage
                    </Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0.75, pb: 0.75 }}>
                    <Grid container spacing={1}>
                        <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                Applications
                            </Typography>
                            <Typography variant="caption" fontWeight="medium" sx={{ fontSize: '0.75rem' }}>
                                {queue.numApplications}
                            </Typography>
                        </Grid>
                        <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                Active Apps
                            </Typography>
                            <Typography variant="caption" fontWeight="medium" sx={{ fontSize: '0.75rem' }}>
                                {queue.numActiveApplications || 0}
                            </Typography>
                        </Grid>
                        <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                Pending Apps
                            </Typography>
                            <Typography variant="caption" fontWeight="medium" sx={{ fontSize: '0.75rem' }}>
                                {queue.numPendingApplications || 0}
                            </Typography>
                        </Grid>
                        <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                Priority
                            </Typography>
                            <Typography variant="caption" fontWeight="medium" sx={{ fontSize: '0.75rem' }}>
                                {queue.queuePriority || 0}
                            </Typography>
                        </Grid>
                        {queue.resourcesUsed && (
                            <>
                                <Grid item xs={6}>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                        Memory Used
                                    </Typography>
                                    <Typography variant="caption" fontWeight="medium" sx={{ fontSize: '0.75rem' }}>
                                        {formatMemory(queue.resourcesUsed.memory)}
                                    </Typography>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                        vCores Used
                                    </Typography>
                                    <Typography variant="caption" fontWeight="medium" sx={{ fontSize: '0.75rem' }}>
                                        {queue.resourcesUsed.vCores}
                                    </Typography>
                                </Grid>
                            </>
                        )}
                    </Grid>
                </AccordionDetails>
            </Accordion>

            {/* Detailed Information */}
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
                    <Typography variant="body2" fontWeight="medium">
                        Queue Properties
                    </Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0.75, pb: 0.75 }}>
                    <Stack spacing={0.75}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                Queue Type
                            </Typography>
                            <Typography variant="caption" fontWeight="medium" sx={{ fontSize: '0.75rem' }}>
                                {queue.type || 'capacitySchedulerLeafQueueInfo'}
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                Absolute Capacity
                            </Typography>
                            <Typography variant="caption" fontWeight="medium" sx={{ fontSize: '0.75rem' }}>
                                {queue.absoluteCapacity?.toFixed(2)}%
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                Absolute Max Capacity
                            </Typography>
                            <Typography variant="caption" fontWeight="medium" sx={{ fontSize: '0.75rem' }}>
                                {queue.absoluteMaxCapacity?.toFixed(2)}%
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                Max Applications
                            </Typography>
                            <Typography variant="caption" fontWeight="medium" sx={{ fontSize: '0.75rem' }}>
                                {queue.maxApplications || 'Unlimited'}
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                Max AM Resource %
                            </Typography>
                            <Typography variant="caption" fontWeight="medium" sx={{ fontSize: '0.75rem' }}>
                                {queue.maxAMResourcePercent?.toFixed(1)}%
                            </Typography>
                        </Box>
                    </Stack>
                </AccordionDetails>
            </Accordion>
        </Box>
    );
};