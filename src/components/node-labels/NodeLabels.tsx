import React from 'react';
import {
    Box,
    Typography,
    Card,
    CardContent,
    Grid,
    Alert,
    Button,
    Chip,
    Divider,
    CircularProgress,
} from '@mui/material';
import {
    Refresh as RefreshIcon,
    Label as LabelIcon,
} from '@mui/icons-material';
import { useSchedulerStore } from '../../store/schedulerStore';
import { NodeLabelsPanel } from './NodeLabelsPanel';
import { NodesPanel } from './NodesPanel';

export const NodeLabels: React.FC = () => {
    const isLoading = useSchedulerStore(state => state.isLoading);
    const error = useSchedulerStore(state => state.error);
    const nodeLabels = useSchedulerStore(state => state.nodeLabels);
    const selectedNodeLabel = useSchedulerStore(state => state.selectedNodeLabel);
    const refreshSchedulerData = useSchedulerStore(state => state.refreshSchedulerData);
    
    const handleRefresh = async () => {
        try {
            await refreshSchedulerData();
        } catch (err) {
            console.error('Failed to refresh node labels data:', err);
        }
    };

    if (isLoading && nodeLabels.length === 0) {
        return (
            <Box sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '400px' 
            }}>
                <CircularProgress />
                <Typography sx={{ ml: 2 }}>Loading node labels...</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <LabelIcon sx={{ mr: 1, color: 'primary.main' }} />
                        <Typography variant="h5" component="h1">
                            Node Labels Management
                        </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                            variant="outlined"
                            startIcon={<RefreshIcon />}
                            onClick={handleRefresh}
                            disabled={isLoading}
                            size="small"
                            sx={{
                                borderRadius: 2,
                                textTransform: 'none',
                                fontWeight: 500,
                                '&:hover': {
                                    borderWidth: 2,
                                },
                            }}
                        >
                            Refresh
                        </Button>
                        
                    </Box>
                </Box>

                <Typography variant="body2" color="text.secondary">
                    Manage node labels for the YARN cluster. Each node can be assigned to node labels 
                    which help with resource allocation and application placement.
                </Typography>
            </Box>

            {/* Error Display */}
            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}


            {/* Main Content */}
            <Box sx={{ flexGrow: 1, minHeight: 0 }}>
                <Grid container spacing={3} sx={{ height: '100%' }}>
                    {/* Labels Panel */}
                    <Grid item xs={12} md={4}>
                        <Card sx={{ height: '100%' }}>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    Available Labels
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                    Select labels to configure queue capacity for each label
                                </Typography>
                                <Divider sx={{ mb: 2 }} />
                                <NodeLabelsPanel />
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Nodes Panel */}
                    <Grid item xs={12} md={8}>
                        <Card sx={{ height: '100%' }}>
                            <CardContent sx={{ height: '100%' }}>
                                <Typography variant="h6" gutterBottom>
                                    Node Label Configuration
                                    {selectedNodeLabel && (
                                        <Chip 
                                            label={selectedNodeLabel} 
                                            size="small" 
                                            color="primary" 
                                            sx={{ ml: 2 }}
                                        />
                                    )}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                    Assign nodes to labels for resource allocation
                                </Typography>
                                <Divider sx={{ mb: 2 }} />
                                <NodesPanel selectedLabel={selectedNodeLabel} />
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            </Box>
        </Box>
    );
};